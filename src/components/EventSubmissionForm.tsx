"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import Image from "next/image";

import Notice from "@/components/Notice";
import { eventImageAlt } from "@/lib/image-alt";
import { useAuth } from "@/lib/useAuth";

type RecurrenceType = "single" | "weekly" | "monthly" | "monthly_weekday" | "annual" | "specific";

const weekDays = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
const months = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const nthOptions = [1, 2, 3, 4, 5];

type MessageState = { type: "success" | "error"; text: string } | null;

export default function EventSubmissionForm() {
  const { token, user } = useAuth();
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("single");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState<MessageState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [featuredUntil, setFeaturedUntil] = useState("");

  const infoMessage = useMemo(
    () =>
      "Envie seu encontro com horario de inicio e fim, recorrencia e opcao de transmissao ao vivo no YouTube.",
    []
  );

  function buildRecurrence(form: FormData) {
    const toNumber = (value: FormDataEntryValue | null, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    switch (recurrenceType) {
      case "weekly":
        return {
          type: "weekly" as const,
          dayOfWeek: toNumber(form.get("weeklyDay"), 0),
          generateWeeks: toNumber(form.get("occurrences"), 12)
        };
      case "monthly":
        return {
          type: "monthly" as const,
          dayOfMonth: toNumber(form.get("monthlyDay"), 1),
          generateMonths: toNumber(form.get("occurrences"), 12)
        };
      case "monthly_weekday":
        return {
          type: "monthly_weekday" as const,
          weekday: toNumber(form.get("monthlyWeekdayDay"), 0),
          nth: toNumber(form.get("monthlyWeekdayNth"), 1),
          generateMonths: toNumber(form.get("occurrences"), 12)
        };
      case "annual":
        return {
          type: "annual" as const,
          month: toNumber(form.get("annualMonth"), 1),
          day: toNumber(form.get("annualDay"), 1),
          generateYears: toNumber(form.get("occurrences"), 5)
        };
      case "specific":
        return {
          type: "specific" as const,
          dates: (form.get("specificDates")?.toString() || "")
            .split(/\r?\n/)
            .map((d) => d.trim())
            .map((d) => (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(d) ? d.replace(/\s+/, "T") : d))
            .filter(Boolean)
        };
      default:
        return { type: "single" as const };
    }
  }

  async function uploadEventImage(file: File) {
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("type", "event");

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: uploadForm
    });
    const data = await response.json();

    if (!response.ok || typeof data.url !== "string" || !data.url.trim()) {
      throw new Error(data?.error || "Erro ao enviar capa do evento.");
    }

    return data.url.trim();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      const contactPhone = form.get("contactPhone")?.toString().trim();
      const contactPhoneSecondary = form.get("contactPhoneSecondary")?.toString().trim();
      const contactEmail = form.get("contactEmail")?.toString().trim();
      const startDate = form.get("startDate")?.toString();
      const startTime = form.get("startTime")?.toString() || "00:00";
      const endTime = form.get("endTime")?.toString() || "";
      const liveUrl = form.get("liveUrl")?.toString().trim();

      if (!title || !description || !city || !state || !location || !startDate || !contactName || !contactPhone) {
        throw new Error("Preencha todos os campos obrigatorios.");
      }

      const startAt = new Date(`${startDate}T${startTime}`);
      if (Number.isNaN(startAt.getTime())) {
        throw new Error("Data ou horario de inicio invalidos.");
      }

      if (!endTime) {
        throw new Error("Informe o horario de termino.");
      }

      const endDate = isMultiDay ? form.get("endDate")?.toString() : startDate;
      let endAt: string | undefined;
      if (endDate) {
        const end = new Date(`${endDate}T${endTime}`);
        if (Number.isNaN(end.getTime())) {
          throw new Error("Data ou horario de termino invalidos.");
        }
        if (end.getTime() < startAt.getTime()) {
          throw new Error("A data de termino nao pode ser anterior ao inicio.");
        }
        endAt = end.toISOString();
      }

      const recurrence = buildRecurrence(form);
      const uploadedCoverImage = coverImageFile
        ? await uploadEventImage(coverImageFile)
        : undefined;
      const payload = {
        title,
        description,
        city,
        state,
        location,
        contactName,
        contactPhone,
        contactPhoneSecondary: contactPhoneSecondary || undefined,
        contactEmail: contactEmail || undefined,
        startAt: startAt.toISOString(),
        endAt,
        websiteUrl: form.get("websiteUrl")?.toString().trim() || undefined,
        liveUrl: liveUrl || undefined,
        recurrence,
        coverImage: uploadedCoverImage || undefined,
        featured: user?.role === "admin" ? featured : false,
        featuredUntil: user?.role === "admin" && featured ? featuredUntil || undefined : undefined
      };

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar evento.");
      }

      setMessage({ type: "success", text: data.message || "Evento enviado com sucesso." });
      formElement.reset();
      setRecurrenceType("single");
      setIsMultiDay(false);
      setFeatured(false);
      setFeaturedUntil("");
      setCoverImagePreview(null);
      setCoverImageFile(null);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao enviar evento."
      });
    } finally {
      setSubmitting(false);
    }
  }

  function onCoverImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverImageFile(null);
      setCoverImagePreview(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      {message ? (
        <Notice title={message.type === "success" ? "Envio concluido" : "Erro"} variant={message.type === "success" ? "success" : "warning"}>
          {message.text}
        </Notice>
      ) : (
        <Notice title="Regras" variant="info">
          {infoMessage}
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Titulo do evento</span>
          <input
            required
            name="title"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Ex.: Encontro de Classicos"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">URL do organizador (opcional)</span>
          <input
            name="websiteUrl"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="https://..."
            type="url"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Organizador</span>
          <input
            required
            name="contactName"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Nome do organizador"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Cidade</span>
          <input
            required
            name="city"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Cidade"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">UF</span>
          <input
            required
            name="state"
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
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Nome do local / endereco"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Telefone principal (obrigatorio)</span>
          <input
            required
            name="contactPhone"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="(11) 99999-9999"
            type="tel"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Telefone secundario (opcional)</span>
          <input
            name="contactPhoneSecondary"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="(11) 98888-8888"
            type="tel"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">E-mail (opcional)</span>
          <input
            name="contactEmail"
            type="email"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="contato@evento.com"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">URL do YouTube ao vivo (opcional)</span>
          <input
            name="liveUrl"
            type="url"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Data de inicio</span>
          <input
            required
            name="startDate"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="date"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Horario de inicio</span>
          <input
            required
            name="startTime"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="time"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Horario de termino</span>
          <input
            required
            name="endTime"
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
            <span className="text-sm font-semibold text-slate-900">Evento com multiplos dias</span>
          </div>
        </label>

        {isMultiDay && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Data de termino</span>
            <input
              required
              name="endDate"
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              type="date"
            />
          </label>
        )}

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Recorrencia</span>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={recurrenceType}
            name="recurrenceType"
            onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
          >
            <option value="single">Evento unico</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
            <option value="monthly_weekday">Mensal (ex.: 3o domingo)</option>
            <option value="annual">Anual</option>
            <option value="specific">Datas especificas</option>
          </select>
        </label>

        {recurrenceType === "weekly" && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Dia da semana</span>
            <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="weeklyDay">
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
            <span className="text-sm font-semibold text-slate-900">Dia do mes</span>
            <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="monthlyDay">
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
              <span className="text-sm font-semibold text-slate-900">Semana do mes</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="monthlyWeekdayNth">
                {nthOptions.map((nth) => (
                  <option key={nth} value={nth}>
                    {nth}o encontro do mes
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Dia da semana</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="monthlyWeekdayDay">
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
              <span className="text-sm font-semibold text-slate-900">Mes</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="annualMonth">
                {months.map((month, i) => (
                  <option key={month} value={i + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Dia</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required name="annualDay">
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
            <span className="text-sm font-semibold text-slate-900">Datas especificas (uma por linha, AAAA-MM-DD ou AAAA-MM-DD HH:MM)</span>
            <textarea
              required
              name="specificDates"
              className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              placeholder="2026-03-15 09:00&#10;2026-04-20 10:00&#10;2026-05-10"
            />
          </label>
        )}

        {recurrenceType !== "single" && recurrenceType !== "specific" && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Quantas ocorrencias gerar?</span>
            <input
              required
              name="occurrences"
              type="number"
              min="1"
              max="52"
              defaultValue="12"
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            />
          </label>
        )}

        {user?.role === "admin" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Destacar evento no site
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Data de destaque ate</span>
              <input
                type="datetime-local"
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                value={featuredUntil}
                onChange={(e) => setFeaturedUntil(e.target.value)}
                disabled={!featured}
                placeholder="Deixe em branco para preencher automatico"
              />
              <span className="text-xs text-slate-500">Deixe em branco para preencher automatico.</span>
            </label>
          </>
        ) : null}

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Capa do evento (opcional)</span>
          <input
            type="file"
            accept="image/*"
            name="coverImage"
            onChange={onCoverImageChange}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-slate-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
          />
          <span className="text-xs text-slate-500">Medida recomendada da capa: 1200 x 675 px (16:9).</span>
          {coverImagePreview && (
            <div className="mt-2">
              <Image
                src={coverImagePreview}
                alt={eventImageAlt("capa do evento")}
                className="h-32 w-48 rounded-lg border border-slate-200 object-cover"
                width={192}
                height={128}
                unoptimized
              />
            </div>
          )}
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Descricao</span>
          <textarea
            required
            name="description"
            className="min-h-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Conte detalhes do evento, regras, clubes convidados etc."
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
      >
        {submitting
          ? "Enviando..."
          : user?.role === "admin"
            ? "Publicar (admin)"
            : "Enviar para aprovacao"}
      </button>
    </form>
  );
}
