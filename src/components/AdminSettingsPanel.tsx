"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import {
  type SiteSettings,
  getVehicleMaxAllowedYear,
  normalizeSiteSettings
} from "@/lib/siteSettings";
import {
  SITE_BRANDING_EVENT,
  normalizeSiteBranding,
  type SiteBranding
} from "@/lib/siteBranding";
import { useAuth } from "@/lib/useAuth";
import { useSiteSettings } from "@/lib/useSiteSettings";

type BrandingDraft = {
  logoUrl: string;
  faviconUrl: string;
};

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

function toBrandingDraft(branding: SiteBranding): BrandingDraft {
  return {
    logoUrl: branding.logoUrl ?? "",
    faviconUrl: branding.faviconUrl ?? ""
  };
}

export default function AdminSettingsPanel() {
  const { settings, isReady, saveSettings, resetSettings } = useSiteSettings();
  const { token } = useAuth();

  const [draft, setDraft] = useState<SiteSettings>(() =>
    normalizeSiteSettings(undefined)
  );
  const [featuredDurationsText, setFeaturedDurationsText] = useState(() =>
    durationsToText(draft.listingFeaturedDurationsDays)
  );
  const [saved, setSaved] = useState(false);

  const [brandingDraft, setBrandingDraft] = useState<BrandingDraft>({
    logoUrl: "",
    faviconUrl: ""
  });
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    setDraft(settings);
    setFeaturedDurationsText(durationsToText(settings.listingFeaturedDurationsDays));
    setSaved(false);
  }, [isReady, settings]);

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      setBrandingLoading(true);
      setBrandingError(null);

      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string" && data.error
              ? data.error
              : "Nao foi possivel carregar identidade visual."
          );
        }

        if (!active) return;

        const branding = normalizeSiteBranding(data?.settings?.branding);
        setBrandingDraft(toBrandingDraft(branding));
      } catch (error) {
        if (!active) return;
        setBrandingError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar identidade visual."
        );
      } finally {
        if (active) {
          setBrandingLoading(false);
        }
      }
    }

    loadBranding();

    return () => {
      active = false;
    };
  }, []);

  const maxAllowedYear = useMemo(() => getVehicleMaxAllowedYear(draft), [draft]);

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function handleBrandingUpload(file: File, field: keyof BrandingDraft) {
    const setUploading = field === "logoUrl" ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);
    setBrandingError(null);
    setBrandingSaved(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "site");

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error
            ? data.error
            : "Erro ao enviar arquivo."
        );
      }

      if (typeof data?.url !== "string" || !data.url.trim()) {
        throw new Error("Upload concluido sem URL valida.");
      }

      const uploadedUrl = data.url.trim();

      setBrandingDraft((current) => ({
        ...current,
        [field]: uploadedUrl
      }));
    } catch (error) {
      setBrandingError(
        error instanceof Error ? error.message : "Erro ao enviar arquivo."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleBrandingFileChange(
    event: ChangeEvent<HTMLInputElement>,
    field: keyof BrandingDraft
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await handleBrandingUpload(file, field);
  }

  async function saveBranding() {
    if (!token) {
      setBrandingError("Sessao expirada. Faca login novamente como admin.");
      return;
    }

    setBrandingSaving(true);
    setBrandingSaved(false);
    setBrandingError(null);

    try {
      const payload = normalizeSiteBranding(brandingDraft);

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({
          branding: payload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error
            ? data.error
            : "Nao foi possivel salvar identidade visual."
        );
      }

      const normalized = normalizeSiteBranding(data?.settings?.branding ?? payload);
      setBrandingDraft(toBrandingDraft(normalized));
      setBrandingSaved(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SITE_BRANDING_EVENT));
      }
    } catch (error) {
      setBrandingError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar identidade visual."
      );
    } finally {
      setBrandingSaving(false);
    }
  }

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
          <div className="text-sm font-semibold text-slate-900">Configuracao sistema</div>
          <div className="mt-1 text-sm text-slate-600">
            Regras de classificados ficam neste navegador. Logo e favicon sao salvos no
            backend.
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
          Restaurar padrao
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-5">
        {saved ? (
          <Notice title="Salvo" variant="success">
            As configuracoes locais foram atualizadas.
          </Notice>
        ) : null}

        {!isReady ? (
          <Notice title="Carregando" variant="info">
            Lendo configuracoes salvas.
          </Notice>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Idade minima do veiculo (anos)
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
              Ano maximo permitido hoje: {maxAllowedYear}
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Ano minimo (ano-modelo)
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
            <span className="text-xs text-slate-500">Padrao: 1908</span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Limite por CPF (anuncios ativos)
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
              Limite por CNPJ (anuncios ativos)
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
              Duracoes de destaque (dias)
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
              Separar por virgula (ex.: 7, 14, 21, 30).
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Inativar anuncio apos (dias)
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
              Use 0 para desativar.
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
              Prototipo: sem envio de e-mail.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Salvar configuracoes locais
          </button>
        </div>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="text-sm font-semibold text-slate-900">Identidade visual do site</div>
        <div className="mt-1 text-sm text-slate-600">
          Defina a logo do topo e o favicon exibido no navegador.
        </div>

        {brandingSaved ? (
          <div className="mt-4">
            <Notice title="Salvo" variant="success">
              Identidade visual atualizada com sucesso.
            </Notice>
          </div>
        ) : null}

        {brandingError ? (
          <div className="mt-4">
            <Notice title="Erro" variant="warning">
              {brandingError}
            </Notice>
          </div>
        ) : null}

        {brandingLoading ? (
          <div className="mt-4">
            <Notice title="Carregando" variant="info">
              Lendo identidade visual atual.
            </Notice>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Upload da logo</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.ico,image/jpeg,image/png,image/webp,image/x-icon"
              className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
              disabled={brandingLoading || brandingSaving || uploadingLogo}
              onChange={(event) => handleBrandingFileChange(event, "logoUrl")}
            />
            <span className="text-xs text-slate-500">
              Formatos aceitos: jpg, jpeg, png, webp e ico (ate 5MB).
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Logo (URL)</span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              placeholder="https://... ou /uploads/site/logo.png"
              value={brandingDraft.logoUrl}
              onChange={(e) => {
                setBrandingSaved(false);
                setBrandingDraft((current) => ({
                  ...current,
                  logoUrl: e.target.value
                }));
              }}
            />
          </label>

          {brandingDraft.logoUrl ? (
            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">Pre-visualizacao da logo</div>
              <img
                src={brandingDraft.logoUrl}
                alt="Pre-visualizacao da logo"
                className="mt-2 h-14 w-auto max-w-full object-contain"
              />
            </div>
          ) : null}

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Upload do favicon</span>
            <input
              type="file"
              accept=".ico,.png,.jpg,.jpeg,.webp,image/x-icon,image/png,image/jpeg,image/webp"
              className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
              disabled={brandingLoading || brandingSaving || uploadingFavicon}
              onChange={(event) => handleBrandingFileChange(event, "faviconUrl")}
            />
            <span className="text-xs text-slate-500">
              Use preferencialmente .ico ou .png quadrado.
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Favicon (URL)</span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              placeholder="https://... ou /uploads/site/favicon.ico"
              value={brandingDraft.faviconUrl}
              onChange={(e) => {
                setBrandingSaved(false);
                setBrandingDraft((current) => ({
                  ...current,
                  faviconUrl: e.target.value
                }));
              }}
            />
          </label>

          {brandingDraft.faviconUrl ? (
            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">Pre-visualizacao do favicon</div>
              <img
                src={brandingDraft.faviconUrl}
                alt="Pre-visualizacao do favicon"
                className="mt-2 h-10 w-10 rounded object-contain"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveBranding}
            disabled={
              brandingLoading ||
              brandingSaving ||
              uploadingLogo ||
              uploadingFavicon
            }
            className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {brandingSaving
              ? "Salvando..."
              : uploadingLogo || uploadingFavicon
                ? "Enviando arquivo..."
                : "Salvar logo e favicon"}
          </button>
        </div>
      </div>
    </div>
  );
}
