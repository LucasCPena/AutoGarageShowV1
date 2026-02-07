"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import Image from "next/image";
import Notice from "@/components/Notice";
import { useAuth } from "@/lib/useAuth";
import type { Event, EventRecurrence } from "@/lib/database";
import { formatDateShort } from "@/lib/date";

type RecurrenceType = "single" | "weekly" | "monthly" | "monthly_weekday" | "annual" | "specific";

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const nthOptions = [1, 2, 3, 4, 5];

type MessageState = { type: "success" | "error"; text: string } | null;

type Props = {
  eventId: string;
};

function isoToDate(iso: string) {
  return iso ? iso.slice(0, 10) : "";
}

function isoToTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(11, 16);
}

export default function EventEditForm({ eventId }: Props) {
  const { token, user } = useAuth();
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("single");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<Event | null>(null);
  const [status, setStatus] = useState<Event["status"]>("pending");

  const infoMessage = useMemo(
    () =>
      "Edição de evento. Admin mantém status; criador comum volta para pendente.",
    []
  );

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar evento.");
        setEventData(data.event);
        setStatus(data.event.status);
        setRecurrenceType(data.event.recurrence.type as RecurrenceType);
        setIsMultiDay(Boolean(data.event.endAt));
        setCoverImagePreview(data.event.coverImage || null);
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Erro ao carregar evento."
        });
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId, token]);

  function buildRecurrence(form: FormData): EventRecurrence {
    const toNumber = (value: FormDataEntryValue | null, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    switch (recurrenceType) {
      case "weekly":
        return {
          type: "weekly",
          dayOfWeek: toNumber(form.get("weeklyDay"), 0),
          generateWeeks: toNumber(form.get("occurrences"), 12)
        };
      case "monthly":
        return {
          type: "monthly",
          dayOfMonth: toNumber(form.get("monthlyDay"), 1),
          generateMonths: toNumber(form.get("occurrences"), 12)
        };
      case "monthly_weekday":
        return {
          type: "monthly_weekday",
          weekday: toNumber(form.get("monthlyWeekdayDay"), 0),
          nth: toNumber(form.get("monthlyWeekdayNth"), 1),
          generateMonths: toNumber(form.get("occurrences"), 12)
        };
      case "annual":
        return {
          type: "annual",
          month: toNumber(form.get("annualMonth"), 1),
          day: toNumber(form.get("annualDay"), 1),
          generateYears: toNumber(form.get("occurrences"), 5)
        };
      case "specific":
        return {
          type: "specific",
          dates: (form.get("specificDates")?.toString() || "")
            .split(/\r?\n/)
            .map((d) => d.trim())
            .map((d) => (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(d) ? d.replace(/\s+/, "T") : d))
            .filter(Boolean)
        };
      default:
        return { type: "single" };
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!eventData) return;
    setSubmitting(true);
    setMessage(null);

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    try {
      const title = form.get("title")?.toString().trim();
      const description = form.get("description")?.toString().trim();
      const city = form.get("city")?.toString().trim();
      const state = form.get("state")?.toString().trim();
      const location = form.get("location")?.toString().trim();
      const contactName = form.get("contactName")?.toString().trim();
      const contactDocument = form.get("contactDocument")?.toString().trim();
      const contactPhone = form.get("contactPhone")?.toString().trim();
      const contactEmail = form.get("contactEmail")?.toString().trim();
      const startDate = form.get("startDate")?.toString();
      const startTime = form.get("startTime")?.toString() || "00:00";

      if (!title || !description || !city || !state || !location || !startDate || !contactName || !contactDocument) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }

      const startAt = new Date(`${startDate}T${startTime}`);
      if (Number.isNaN(startAt.getTime())) {
        throw new Error("Data ou horário de início inválidos.");
      }

      let endAt: string | undefined;
      if (isMultiDay) {
        const endDate = form.get("endDate")?.toString();
        const endTime = form.get("endTime")?.toString() || startTime;
        if (endDate) {
          const end = new Date(`${endDate}T${endTime}`);
          if (Number.isNaN(end.getTime())) {
            throw new Error("Data ou horário de término inválidos.");
          }
          if (end.getTime() < startAt.getTime()) {
            throw new Error("A data de término não pode ser anterior ao início.");
          }
          endAt = end.toISOString();
        }
      }

      const recurrence = buildRecurrence(form);
      const payload = {
        title,
        description,
        city,
        state,
        location,
        contactName,
        contactDocument,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        startAt: startAt.toISOString(),
        endAt,
        websiteUrl: form.get("websiteUrl")?.toString().trim() || undefined,
        recurrence,
        coverImage: coverImagePreview || undefined,
        status: user?.role === "admin" ? status : undefined
      };

      const response = await fetch(`/api/events/${eventData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar evento.");
      }

      setMessage({ type: "success", text: data.message || "Evento atualizado com sucesso." });
      setEventData(data.event);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao atualizar evento."
      });
    } finally {
      setSubmitting(false);
    }
  }

  function onCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverImagePreview(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Carregando dados do evento...
      </div>
    );
  }

  if (!eventData) {
    return (
      <Notice title="Erro" variant="warning">
        Evento não encontrado ou sem permissão.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      {message ? (
        <Notice title={message.type === "success" ? "Sucesso" : "Erro"} variant={message.type === "success" ? "success" : "warning"}>
          {message.text}
        </Notice>
      ) : (
        <Notice title="Edição" variant="info">
          {infoMessage}
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Título do evento</span>
          <input
            required
            name="title"
            defaultValue={eventData.title}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Ex.: Encontro de Clássicos"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">URL do organizador (opcional)</span>
          <input
            name="websiteUrl"
            defaultValue={eventData.websiteUrl}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="https://..."
            type="url"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Nome do contato / proprietário</span>
          <input
            required
            name="contactName"
            defaultValue={eventData.contactName}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Quem responde pelo evento"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">CPF ou CNPJ</span>
          <input
            required
            name="contactDocument"
            defaultValue={eventData.contactDocument}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="000.000.000-00"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Telefone (opcional)</span>
          <input
            name="contactPhone"
            defaultValue={eventData.contactPhone}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="(11) 99999-9999"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">E-mail (opcional)</span>
          <input
            name="contactEmail"
            defaultValue={eventData.contactEmail}
            type="email"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="contato@evento.com"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Cidade</span>
          <input
            required
            name="city"
            defaultValue={eventData.city}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Cidade"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">UF</span>
          <input
            required
            name="state"
            defaultValue={eventData.state}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="SP"
            maxLength={2}
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Local</span>
          <input
            required
            name="location"
            defaultValue={eventData.location}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Nome do local / endereço"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Data de início</span>
          <input
            required
            name="startDate"
            defaultValue={isoToDate(eventData.startAt)}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="date"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Horário de início</span>
          <input
            required
            name="startTime"
            defaultValue={isoToTime(eventData.startAt)}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="time"
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="multiDay"
              checked={isMultiDay}
              onChange={(e) => setIsMultiDay(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-semibold text-slate-900">Evento com múltiplos dias</span>
          </div>
        </label>

        {isMultiDay && (
          <>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Data de término</span>
              <input
                required
                name="endDate"
                defaultValue={eventData.endAt ? isoToDate(eventData.endAt) : ""}
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                type="date"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Horário de término</span>
              <input
                required
                name="endTime"
                defaultValue={eventData.endAt ? isoToTime(eventData.endAt) : isoToTime(eventData.startAt)}
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                type="time"
              />
            </label>
          </>
        )}

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Recorrência</span>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={recurrenceType}
            name="recurrenceType"
            onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
          >
            <option value="single">Evento único</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
            <option value="monthly_weekday">Mensal (ex.: 3º domingo)</option>
            <option value="annual">Anual</option>
            <option value="specific">Datas específicas</option>
          </select>
        </label>

        {recurrenceType === "weekly" && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Dia da semana</span>
            <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="weeklyDay" defaultValue={eventData.recurrence.dayOfWeek ?? 0}>
              {weekDays.map((day, i) => (
                <option key={day} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        )}

        {recurrenceType === "monthly" && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Dia do mês</span>
            <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="monthlyDay" defaultValue={eventData.recurrence.dayOfMonth ?? 1}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  Dia {day}
                </option>
              ))}
            </select>
          </label>
        )}

        {recurrenceType === "monthly_weekday" && (
          <>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Semana do mês</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="monthlyWeekdayNth" defaultValue={(eventData.recurrence as any).nth ?? 1}>
                {nthOptions.map((nth) => (
                  <option key={nth} value={nth}>
                    {nth}º encontro do mês
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Dia da semana</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="monthlyWeekdayDay" defaultValue={(eventData.recurrence as any).weekday ?? 0}>
                {weekDays.map((day, i) => (
                  <option key={day} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {recurrenceType === "annual" && (
          <>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Mês</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="annualMonth" defaultValue={eventData.recurrence.month ?? 1}>
                {months.map((month, i) => (
                  <option key={month} value={i + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Dia</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="annualDay" defaultValue={eventData.recurrence.day ?? 1}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {recurrenceType === "specific" && (
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Datas específicas (uma por linha, AAAA-MM-DD ou AAAA-MM-DD HH:MM)</span>
            <textarea
              required
              name="specificDates"
              className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              defaultValue={
                eventData.recurrence.type === "specific" && eventData.recurrence.dates
                  ? eventData.recurrence.dates.map((d) => formatDateShort(d)).join("\n")
                  : ""
              }
              placeholder="2026-03-15 09:00&#10;2026-04-20 10:00&#10;2026-05-10"
            />
          </label>
        )}

        {recurrenceType !== "single" && recurrenceType !== "specific" && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Quantas ocorrências gerar?</span>
            <input
              required
              name="occurrences"
              type="number"
              min="1"
              max="52"
              defaultValue={
                (eventData.recurrence as any).generateWeeks ||
                (eventData.recurrence as any).generateMonths ||
                (eventData.recurrence as any).generateYears ||
                12
              }
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            />
          </label>
        )}

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Capa do evento (opcional)</span>
          <input
            type="file"
            accept="image/*"
            name="coverImage"
            onChange={onCoverImageChange}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-slate-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
          />
          {coverImagePreview && (
            <div className="mt-2">
              <Image src={coverImagePreview} alt="Preview" className="h-32 w-48 rounded-lg object-cover border border-slate-200" width={192} height={128} />
            </div>
          )}
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Descrição</span>
          <textarea
            required
            name="description"
            defaultValue={eventData.description}
            className="min-h-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Conte detalhes do evento, regras, clubes convidados etc."
          />
        </label>

        {user?.role === "admin" ? (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Event["status"])}
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            >
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="completed">Realizado</option>
            </select>
          </label>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
      >
        {submitting ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
