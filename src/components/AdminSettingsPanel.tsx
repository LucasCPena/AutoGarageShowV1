"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { getAboutPageContent } from "@/lib/siteContent";
import {
  SITE_BRANDING_EVENT,
  normalizeSiteBranding,
  type SiteBranding
} from "@/lib/siteBranding";
import {
  type SiteSettings,
  getVehicleMaxAllowedYear,
  normalizeSiteSettings
} from "@/lib/siteSettings";
import { SITE_SETTINGS_EVENT, useSiteSettings } from "@/lib/useSiteSettings";
import { useAuth } from "@/lib/useAuth";

type BrandingDraft = {
  logoUrl: string;
  faviconUrl: string;
  youtubeLiveUrl: string;
};

type AboutPageDraft = {
  title: string;
  subtitle: string;
  body: string;
  footerSummary: string;
};

function durationsToText(values: number[]) {
  return values.join(", ");
}

function toBrandingDraft(branding: SiteBranding): BrandingDraft {
  return {
    logoUrl: branding.logoUrl ?? "",
    faviconUrl: branding.faviconUrl ?? "",
    youtubeLiveUrl: branding.youtubeLiveUrl ?? ""
  };
}

function toAboutDraft(input: ReturnType<typeof getAboutPageContent>): AboutPageDraft {
  return {
    title: input.title,
    subtitle: input.subtitle,
    body: input.body,
    footerSummary: input.footerSummary ?? ""
  };
}

export default function AdminSettingsPanel() {
  const { settings, isReady, error, saveSettings, resetSettings } = useSiteSettings();
  const { token } = useAuth();

  const [draft, setDraft] = useState<SiteSettings>(() =>
    normalizeSiteSettings(undefined)
  );
  const [featuredDurationsText, setFeaturedDurationsText] = useState(() =>
    durationsToText(draft.listingFeaturedDurationsDays)
  );
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [brandingDraft, setBrandingDraft] = useState<BrandingDraft>({
    logoUrl: "",
    faviconUrl: "",
    youtubeLiveUrl: ""
  });
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const [aboutDraft, setAboutDraft] = useState<AboutPageDraft>(() =>
    toAboutDraft(getAboutPageContent(undefined))
  );
  const [aboutLoading, setAboutLoading] = useState(true);
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutSaved, setAboutSaved] = useState(false);
  const [aboutError, setAboutError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    setDraft(settings);
    setFeaturedDurationsText(durationsToText(settings.listingFeaturedDurationsDays));
    setSaved(false);
    setSaveError(null);
  }, [isReady, settings]);

  useEffect(() => {
    let active = true;

    async function loadAdminContent() {
      setBrandingLoading(true);
      setAboutLoading(true);
      setBrandingError(null);
      setAboutError(null);

      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string" && data.error
              ? data.error
              : "Nao foi possivel carregar configuracoes do admin."
          );
        }

        if (!active) return;

        const branding = normalizeSiteBranding(data?.settings?.branding);
        setBrandingDraft(toBrandingDraft(branding));
        setAboutDraft(toAboutDraft(getAboutPageContent(data?.settings)));
      } catch (loadError) {
        if (!active) return;
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar configuracoes do admin.";
        setBrandingError(message);
        setAboutError(message);
      } finally {
        if (active) {
          setBrandingLoading(false);
          setAboutLoading(false);
        }
      }
    }

    loadAdminContent();

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
      const brandingAlt =
        field === "logoUrl"
          ? "logo do auto garage show"
          : field === "faviconUrl"
            ? "favicon do auto garage show"
            : "arquivo do site";
      formData.append("alt", brandingAlt);

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

      setBrandingDraft((current) => ({
        ...current,
        [field]: data.url.trim()
      }));
    } catch (uploadError) {
      setBrandingError(
        uploadError instanceof Error ? uploadError.message : "Erro ao enviar arquivo."
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
    } catch (brandingSaveError) {
      setBrandingError(
        brandingSaveError instanceof Error
          ? brandingSaveError.message
          : "Nao foi possivel salvar identidade visual."
      );
    } finally {
      setBrandingSaving(false);
    }
  }

  async function saveAboutPage() {
    if (!token) {
      setAboutError("Sessao expirada. Faca login novamente como admin.");
      return;
    }

    setAboutSaving(true);
    setAboutSaved(false);
    setAboutError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({
          content: {
            about: {
              title: aboutDraft.title.trim(),
              subtitle: aboutDraft.subtitle.trim(),
              body: aboutDraft.body.trim(),
              footerSummary: aboutDraft.footerSummary.trim()
            }
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error
            ? data.error
            : "Nao foi possivel salvar a pagina Auto Garage Show."
        );
      }

      setAboutDraft(toAboutDraft(getAboutPageContent(data?.settings)));
      setAboutSaved(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SITE_SETTINGS_EVENT));
      }
    } catch (aboutSaveError) {
      setAboutError(
        aboutSaveError instanceof Error
          ? aboutSaveError.message
          : "Nao foi possivel salvar a pagina Auto Garage Show."
      );
    } finally {
      setAboutSaving(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = normalizeSiteSettings({
      ...draft,
      listingFeaturedDurationsDays: [30]
    });

    setSavingSettings(true);
    setSaved(false);
    setSaveError(null);

    try {
      const persisted = await saveSettings(next, token);
      setDraft(persisted);
      setFeaturedDurationsText(durationsToText(persisted.listingFeaturedDurationsDays));
      setSaved(true);
    } catch (settingsError) {
      setSaveError(
        settingsError instanceof Error
          ? settingsError.message
          : "Nao foi possivel salvar configuracoes."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleResetDefaults() {
    setSavingSettings(true);
    setSaved(false);
    setSaveError(null);

    try {
      const persisted = await resetSettings(token);
      setDraft(persisted);
      setFeaturedDurationsText(durationsToText(persisted.listingFeaturedDurationsDays));
      setSaved(true);
    } catch (resetError) {
      setSaveError(
        resetError instanceof Error
          ? resetError.message
          : "Nao foi possivel restaurar configuracoes."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Configuracao do sistema</div>
          <div className="mt-1 text-sm text-slate-600">
            As regras abaixo agora sao salvas no backend e lidas pelo site publico.
          </div>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={handleResetDefaults}
          disabled={savingSettings}
        >
          Restaurar padrao
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-5">
        {saved ? (
          <Notice title="Salvo" variant="success">
            As configuracoes de classificados foram atualizadas no backend.
          </Notice>
        ) : null}

        {saveError ? (
          <Notice title="Erro" variant="warning">
            {saveError}
          </Notice>
        ) : null}

        {error ? (
          <Notice title="Atencao" variant="warning">
            {error}
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
              Limite por CPF
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
              Limite por CNPJ
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
              Duracao de destaque (dias)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              value={featuredDurationsText}
              readOnly
            />
            <span className="text-xs text-slate-500">
              A duracao do destaque permanece fixa em 30 dias.
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
            <span className="text-xs text-slate-500">Use 0 para desativar.</span>
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
              Prototipo atual: sem envio automatico de e-mail.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {savingSettings ? "Salvando..." : "Salvar configuracoes"}
          </button>
        </div>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="text-sm font-semibold text-slate-900">Pagina Auto Garage Show</div>
        <div className="mt-1 text-sm text-slate-600">
          Conteudo usado no link do rodape para apresentar o canal e o projeto.
        </div>

        {aboutSaved ? (
          <div className="mt-4">
            <Notice title="Salvo" variant="success">
              A pagina Auto Garage Show foi atualizada com sucesso.
            </Notice>
          </div>
        ) : null}

        {aboutError ? (
          <div className="mt-4">
            <Notice title="Erro" variant="warning">
              {aboutError}
            </Notice>
          </div>
        ) : null}

        {aboutLoading ? (
          <div className="mt-4">
            <Notice title="Carregando" variant="info">
              Lendo conteudo atual da pagina Auto Garage Show.
            </Notice>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Titulo</span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              value={aboutDraft.title}
              onChange={(e) => {
                setAboutSaved(false);
                setAboutDraft((current) => ({ ...current, title: e.target.value }));
              }}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Subtitulo</span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              value={aboutDraft.subtitle}
              onChange={(e) => {
                setAboutSaved(false);
                setAboutDraft((current) => ({ ...current, subtitle: e.target.value }));
              }}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Resumo curto do rodape</span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              value={aboutDraft.footerSummary}
              onChange={(e) => {
                setAboutSaved(false);
                setAboutDraft((current) => ({
                  ...current,
                  footerSummary: e.target.value
                }));
              }}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Conteudo da pagina</span>
            <textarea
              className="min-h-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={aboutDraft.body}
              onChange={(e) => {
                setAboutSaved(false);
                setAboutDraft((current) => ({ ...current, body: e.target.value }));
              }}
            />
            <span className="text-xs text-slate-500">
              Use linhas em branco para separar paragrafos.
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveAboutPage}
            disabled={aboutLoading || aboutSaving}
            className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {aboutSaving ? "Salvando..." : "Salvar pagina Auto Garage Show"}
          </button>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="text-sm font-semibold text-slate-900">Identidade visual do site</div>
        <div className="mt-1 text-sm text-slate-600">
          Defina a logo do topo, o favicon e o link opcional do YouTube ao vivo na home.
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

          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-semibold text-slate-900">
              YouTube ao vivo (home)
            </span>
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
              value={brandingDraft.youtubeLiveUrl}
              onChange={(e) => {
                setBrandingSaved(false);
                setBrandingDraft((current) => ({
                  ...current,
                  youtubeLiveUrl: e.target.value
                }));
              }}
            />
            <span className="text-xs text-slate-500">
              Opcional: se preenchido, o video sera exibido na home quando nao houver evento ao vivo.
            </span>
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
                : "Salvar identidade visual"}
          </button>
        </div>
      </div>
    </div>
  );
}
