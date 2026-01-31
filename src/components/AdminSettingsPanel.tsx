"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { type SiteSettings, getVehicleMaxAllowedYear, normalizeSiteSettings } from "@/lib/siteSettings";
import { useSiteSettings } from "@/lib/useSiteSettings";

function durationsToText(values: number[]) {
  return values.join(", ");
}

function parseDurations(text: string) {
  return text
    .split(/[^0-9]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value));
}

export default function AdminSettingsPanel() {
  const { settings, isReady, saveSettings, resetSettings } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings>(() =>
    normalizeSiteSettings(undefined)
  );
  const [featuredDurationsText, setFeaturedDurationsText] = useState(() =>
    durationsToText(draft.listingFeaturedDurationsDays)
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    setDraft(settings);
    setFeaturedDurationsText(durationsToText(settings.listingFeaturedDurationsDays));
    setSaved(false);
  }, [isReady, settings]);

  const maxAllowedYear = useMemo(() => getVehicleMaxAllowedYear(draft), [draft]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const durations = parseDurations(featuredDurationsText);

    const next = normalizeSiteSettings({
      ...draft,
      listingFeaturedDurationsDays: durations
    });

    saveSettings(next);
    setDraft(next);
    setFeaturedDurationsText(durationsToText(next.listingFeaturedDurationsDays));
    setSaved(true);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Configurações do sistema
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Protótipo: as configurações ficam salvas neste navegador.
          </div>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            resetSettings();
            setSaved(false);
          }}
        >
          Restaurar padrão
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-5">
        {saved ? (
          <Notice title="Salvo" variant="success">
            As configurações foram atualizadas.
          </Notice>
        ) : null}

        {!isReady ? (
          <Notice title="Carregando" variant="info">
            Lendo configurações salvas.
          </Notice>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Idade mínima do veículo (anos)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              type="number"
              inputMode="numeric"
              min={0}
              max={80}
              value={draft.vehicleMinAgeYears}
              onChange={(e) => {
                setSaved(false);
                setDraft((current) => ({
                  ...current,
                  vehicleMinAgeYears: Number(e.target.value || 0)
                }));
              }}
            />
            <span className="text-xs text-slate-500">
              Ano máximo permitido hoje: {maxAllowedYear}
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Ano mínimo (ano-modelo)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              type="number"
              inputMode="numeric"
              min={1908}
              value={draft.vehicleModelYearMin}
              onChange={(e) => {
                setSaved(false);
                setDraft((current) => ({
                  ...current,
                  vehicleModelYearMin: Number(e.target.value || 1908)
                }));
              }}
            />
            <span className="text-xs text-slate-500">Padrão: 1908</span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Limite por CPF (anúncios ativos)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={draft.listingLimits.cpf}
              onChange={(e) => {
                setSaved(false);
                setDraft((current) => ({
                  ...current,
                  listingLimits: {
                    ...current.listingLimits,
                    cpf: Number(e.target.value || 0)
                  }
                }));
              }}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Limite por CNPJ (anúncios ativos)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={draft.listingLimits.cnpj}
              onChange={(e) => {
                setSaved(false);
                setDraft((current) => ({
                  ...current,
                  listingLimits: {
                    ...current.listingLimits,
                    cnpj: Number(e.target.value || 0)
                  }
                }));
              }}
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-semibold text-slate-900">
              Durações de destaque (dias)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              placeholder="Ex.: 7, 14, 21, 30"
              value={featuredDurationsText}
              onChange={(e) => {
                setSaved(false);
                setFeaturedDurationsText(e.target.value);
              }}
            />
            <span className="text-xs text-slate-500">
              Separar por vírgula (ex.: 7, 14, 21, 30).
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Inativar anúncio após (dias)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              type="number"
              inputMode="numeric"
              min={0}
              max={3650}
              value={draft.listingAutoExpireDays}
              onChange={(e) => {
                setSaved(false);
                setDraft((current) => ({
                  ...current,
                  listingAutoExpireDays: Number(e.target.value || 0)
                }));
              }}
            />
            <span className="text-xs text-slate-500">
              120 dias 34 meses. Use 0 para desativar.
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Notificar antes (dias)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              value={draft.listingExpireNoticeDays}
              onChange={(e) => {
                setSaved(false);
                setDraft((current) => ({
                  ...current,
                  listingExpireNoticeDays: Number(e.target.value || 0)
                }));
              }}
            />
            <span className="text-xs text-slate-500">
              Protótipo: sem envio de e-mail.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Salvar configurações
          </button>
        </div>
      </form>
    </div>
  );
}
