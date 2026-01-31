"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import Image from "next/image";
import Notice from "@/components/Notice";

type RecurrenceType = "single" | "weekly" | "monthly" | "annual" | "specific";

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function EventSubmissionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("single");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const successMessage = useMemo(
    () =>
      "Protótipo: envio simulado. No sistema final, o evento ficará pendente até aprovação manual e validação de e-mail.",
    []
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
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

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      {submitted ? (
        <Notice title="Envio concluído" variant="success">
          {successMessage}
        </Notice>
      ) : (
        <Notice title="Regras (planejado)" variant="info">
          Envio gratuito. Eventos aprovados geram URL amigável. No calendário público, aparecem apenas eventos aprovados dos próximos 21 dias.
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Título do evento</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Ex.: Encontro de Clássicos"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">URL do organizador (opcional)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="https://..."
            type="url"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Cidade</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Cidade"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">UF</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="SP"
            maxLength={2}
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Local</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Nome do local / endereço"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Data de início</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="date"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Horário de início</span>
          <input
            required
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
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                type="date"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Horário de término</span>
              <input
                required
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
            onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
          >
            <option value="single">Evento único</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
            <option value="specific">Datas específicas</option>
          </select>
        </label>

        {recurrenceType === "weekly" && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Dia da semana</span>
            <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required>
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
            <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  Dia {day}
                </option>
              ))}
            </select>
          </label>
        )}

        {recurrenceType === "annual" && (
          <>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Mês</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required>
                {months.map((month, i) => (
                  <option key={month} value={i + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Dia</span>
              <select className="h-11 rounded-md border border-slate-300 px-3 text-sm" required>
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
            <span className="text-sm font-semibold text-slate-900">Datas específicas (uma por linha, formato AAAA-MM-DD)</span>
            <textarea
              required
              className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              placeholder="2026-03-15&#10;2026-04-20&#10;2026-05-10"
            />
          </label>
        )}

        {recurrenceType !== "single" && recurrenceType !== "specific" && (
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Quantas ocorrências gerar?</span>
            <input
              required
              type="number"
              min="1"
              max="52"
              defaultValue="12"
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            />
          </label>
        )}

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Capa do evento (opcional)</span>
          <input
            type="file"
            accept="image/*"
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
            className="min-h-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Conte detalhes do evento, regras, clubes convidados etc."
          />
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Enviar para aprovação
      </button>
    </form>
  );
}
