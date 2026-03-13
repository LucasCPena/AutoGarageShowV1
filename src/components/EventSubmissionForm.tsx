"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";

import Notice from "@/components/Notice";
import { eventImageAlt } from "@/lib/image-alt";
import { useAuth } from "@/lib/useAuth";

type MessageState = { type: "success" | "error"; text: string } | null;

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

const WEEK_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function buildMonthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function EventSubmissionForm() {
  const { token, user } = useAuth();
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [organizerLogoPreview, setOrganizerLogoPreview] = useState<string | null>(null);
  const [organizerLogoFile, setOrganizerLogoFile] = useState<File | null>(null);
  const [titlePreview, setTitlePreview] = useState("");
  const [contactNamePreview, setContactNamePreview] = useState("");
  const [message, setMessage] = useState<MessageState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [featuredUntil, setFeaturedUntil] = useState("");
  const [useAnnualCalendar, setUseAnnualCalendar] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>([]);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const selectedDatesSorted = useMemo(
    () => [...selectedDateKeys].sort((a, b) => a.localeCompare(b)),
    [selectedDateKeys]
  );

  const infoMessage = useMemo(
    () =>
      "Envie seu encontro com data unica ou selecione varias datas no calendario anual.",
    []
  );

  useEffect(() => {
    if (!message) return;
    feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [message]);

  function buildRecurrence(_form: FormData) {
    return { type: "single" as const };
  }

  function toggleCalendarDate(dateKey: string) {
    setSelectedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((item) => item !== dateKey)
        : [...current, dateKey]
    );
  }

  function addWeekdayDates(weekday: number) {
    const allDates: string[] = [];

    for (let month = 0; month < 12; month += 1) {
      const totalDays = new Date(calendarYear, month + 1, 0).getDate();
      for (let day = 1; day <= totalDays; day += 1) {
        if (new Date(calendarYear, month, day).getDay() === weekday) {
          allDates.push(toDateKey(calendarYear, month, day));
        }
      }
    }

    setSelectedDateKeys((current) => Array.from(new Set([...current, ...allDates])));
  }
  async function uploadEventImage(file: File, altLabel?: string) {
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("type", "event");
    if (altLabel?.trim()) {
      uploadForm.append("alt", altLabel.trim());
    }

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

      if (!title || !description || !city || !state || !location || !contactName) {
        throw new Error("Preencha todos os campos obrigatorios.");
      }

      if (useAnnualCalendar && selectedDatesSorted.length === 0) {
        throw new Error("Selecione pelo menos uma data no calendario anual.");
      }

      if (!useAnnualCalendar && !startDate) {
        throw new Error("Informe a data de inicio.");
      }

      const effectiveStartDate = useAnnualCalendar ? selectedDatesSorted[0] : startDate;

      if (!effectiveStartDate) {
        throw new Error("Data de inicio invalida.");
      }

      const startAt = new Date(`${effectiveStartDate}T${startTime}`);
      if (Number.isNaN(startAt.getTime())) {
        throw new Error("Data ou horario de inicio invalidos.");
      }

      if (!endTime) {
        throw new Error("Informe o horario de termino.");
      }

      const endDate = effectiveStartDate;
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

      const recurrence = useAnnualCalendar
        ? {
            type: "specific" as const,
            dates: selectedDatesSorted.map((date) => `${date}T${startTime}`)
          }
        : buildRecurrence(form);
      const uploadedCoverImage = coverImageFile
        ? await uploadEventImage(coverImageFile, eventImageAlt(title))
        : undefined;
      const uploadedOrganizerLogo = organizerLogoFile
        ? await uploadEventImage(organizerLogoFile, eventImageAlt(`logo do organizador ${contactName}`))
        : undefined;
      const payload = {
        title,
        description,
        city,
        state,
        location,
        contactName,
        contactPhone: contactPhone || undefined,
        contactPhoneSecondary: contactPhoneSecondary || undefined,
        contactEmail: contactEmail || undefined,
        startAt: startAt.toISOString(),
        endAt,
        websiteUrl: form.get("websiteUrl")?.toString().trim() || undefined,
        liveUrl: liveUrl || undefined,
        organizerLogo:
          uploadedOrganizerLogo ||
          form.get("organizerLogoUrl")?.toString().trim() ||
          undefined,
        coverImage: uploadedCoverImage || undefined,
        featured: user?.role === "admin" ? featured : false,
        featuredUntil: user?.role === "admin" && featured ? featuredUntil || undefined : undefined,
        recurrence
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
      setFeatured(false);
      setFeaturedUntil("");
      setUseAnnualCalendar(false);
      setCalendarYear(new Date().getFullYear());
      setSelectedDateKeys([]);
      setCoverImagePreview(null);
      setCoverImageFile(null);
      setOrganizerLogoPreview(null);
      setOrganizerLogoFile(null);
      setTitlePreview("");
      setContactNamePreview("");
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

  function onOrganizerLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setOrganizerLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setOrganizerLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setOrganizerLogoFile(null);
      setOrganizerLogoPreview(null);
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
            onChange={(event) => setTitlePreview(event.target.value)}
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
            onChange={(event) => setContactNamePreview(event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Logo do organizador (URL opcional)</span>
          <input
            name="organizerLogoUrl"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="https://... ou /uploads/event/..."
            type="text"
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
          <span className="text-sm font-semibold text-slate-900">Telefone principal (opcional)</span>
          <input
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
            required={!useAnnualCalendar}
            name="startDate"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="date"
            disabled={useAnnualCalendar}
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
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">Modo das datas</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUseAnnualCalendar(false)}
              className={
                useAnnualCalendar
                  ? "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  : "rounded-md border border-brand-500 bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-800"
              }
            >
              Data unica
            </button>
            <button
              type="button"
              onClick={() => setUseAnnualCalendar(true)}
              className={
                useAnnualCalendar
                  ? "rounded-md border border-brand-500 bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-800"
                  : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              }
            >
              Calendario anual
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {useAnnualCalendar
              ? "Selecione varias datas do ano no calendario abaixo sem precisar duplicar o evento."
              : "Use data unica para encontros que acontecem uma vez so."}
          </p>
        </div>

        {useAnnualCalendar ? (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                Calendario anual {calendarYear} - selecione as datas desejadas
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarYear((current) => current - 1)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ano anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarYear((current) => current + 1)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Proximo ano
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDateKeys([])}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-600">
              {selectedDatesSorted.length} data(s) selecionada(s).
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Atalho rapido por dia da semana (ano inteiro)
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => addWeekdayDates(index)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>

              {MONTH_LABELS.map((monthLabel, monthIndex) => {
                const cells = buildMonthCells(calendarYear, monthIndex);
                return (
                  <div key={monthLabel} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {monthLabel}
                    </p>
                    <div className="mb-1 grid grid-cols-7 gap-1">
                      {WEEK_LABELS.map((weekday) => (
                        <span key={`${monthLabel}-${weekday}`} className="text-center text-[10px] font-semibold text-slate-500">
                          {weekday}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {cells.map((day, index) => {
                        if (!day) {
                          return <span key={`${monthLabel}-empty-${index}`} className="h-7" />;
                        }

                        const dateKey = toDateKey(calendarYear, monthIndex, day);
                        const selected = selectedDateKeys.includes(dateKey);

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            onClick={() => toggleCalendarDate(dateKey)}
                            className={
                              selected
                                ? "h-7 rounded-md border border-brand-500 bg-brand-100 text-xs font-semibold text-brand-800"
                                : "h-7 rounded-md border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-100"
                            }
                            aria-pressed={selected}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <textarea
              readOnly
              value={selectedDatesSorted.join("\n")}
              className="mt-4 min-h-20 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
              aria-label="Datas selecionadas"
            />
          </div>
        ) : null}

        <input type="hidden" name="recurrenceType" value={useAnnualCalendar ? "specific" : "single"} />
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
                alt={eventImageAlt(titlePreview || "capa do evento")}
                className="h-32 w-48 rounded-lg border border-slate-200 object-cover"
                width={192}
                height={128}
                unoptimized
              />
            </div>
          )}
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Logo do organizador (arquivo opcional)</span>
          <input
            type="file"
            accept="image/*"
            name="organizerLogoFile"
            onChange={onOrganizerLogoChange}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-slate-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
          />
          <span className="text-xs text-slate-500">Medida recomendada: 400 x 400 px.</span>
          {organizerLogoPreview ? (
            <div className="mt-2">
              <Image
                src={organizerLogoPreview}
                alt={eventImageAlt(`logo do organizador ${contactNamePreview || "do evento"}`)}
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                width={96}
                height={96}
                unoptimized
              />
            </div>
          ) : null}
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

      <div ref={feedbackRef}>
        {message ? (
          <Notice
            title={message.type === "success" ? "Envio concluido" : "Erro"}
            variant={message.type === "success" ? "success" : "warning"}
          >
            {message.text}
          </Notice>
        ) : null}
      </div>
    </form>
  );
}
