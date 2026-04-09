"use client";

import { useEffect, useState } from "react";

import Notice from "@/components/Notice";
import { getPrivacyPageContent } from "@/lib/siteContent";
import { SITE_SETTINGS_EVENT } from "@/lib/useSiteSettings";

type Props = {
  token?: string | null;
};

type PrivacyDraft = {
  title: string;
  subtitle: string;
  body: string;
  footerSummary: string;
};

function toPrivacyDraft(input: ReturnType<typeof getPrivacyPageContent>): PrivacyDraft {
  return {
    title: input.title,
    subtitle: input.subtitle,
    body: input.body,
    footerSummary: input.footerSummary ?? ""
  };
}

export default function AdminPrivacyPanel({ token }: Props) {
  const [draft, setDraft] = useState<PrivacyDraft>(() => toPrivacyDraft(getPrivacyPageContent(undefined)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPrivacyContent() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string" && data.error
              ? data.error
              : "Nao foi possivel carregar a politica de privacidade."
          );
        }

        if (!active) return;
        setDraft(toPrivacyDraft(getPrivacyPageContent(data?.settings)));
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar a politica de privacidade."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPrivacyContent();

    return () => {
      active = false;
    };
  }, []);

  async function savePrivacyPage() {
    if (!token) {
      setError("Sessao expirada. Faca login novamente como admin.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: {
            privacy: {
              title: draft.title.trim(),
              subtitle: draft.subtitle.trim(),
              body: draft.body.trim(),
              footerSummary: draft.footerSummary.trim()
            }
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error
            ? data.error
            : "Nao foi possivel salvar a politica de privacidade."
        );
      }

      setDraft(toPrivacyDraft(getPrivacyPageContent(data?.settings)));
      setSaved(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SITE_SETTINGS_EVENT));
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nao foi possivel salvar a politica de privacidade."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="admin-privacy-panel" className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Politica de Privacidade</div>
          <div className="mt-1 text-sm text-slate-600">
            Edite o conteudo publico exibido em /politica-de-privacidade.
          </div>
        </div>
      </div>

      {saved ? (
        <div className="mt-4">
          <Notice title="Salvo" variant="success">
            A politica de privacidade foi atualizada com sucesso.
          </Notice>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <Notice title="Erro" variant="warning">
            {error}
          </Notice>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4">
          <Notice title="Carregando" variant="info">
            Lendo o conteudo atual da politica de privacidade.
          </Notice>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Titulo</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={draft.title}
            onChange={(event) => {
              setSaved(false);
              setDraft((current) => ({ ...current, title: event.target.value }));
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Subtitulo</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={draft.subtitle}
            onChange={(event) => {
              setSaved(false);
              setDraft((current) => ({ ...current, subtitle: event.target.value }));
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Resumo curto</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={draft.footerSummary}
            onChange={(event) => {
              setSaved(false);
              setDraft((current) => ({ ...current, footerSummary: event.target.value }));
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Conteudo da pagina</span>
          <textarea
            className="min-h-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={draft.body}
            onChange={(event) => {
              setSaved(false);
              setDraft((current) => ({ ...current, body: event.target.value }));
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
          onClick={savePrivacyPage}
          disabled={loading || saving}
          className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar politica de privacidade"}
        </button>
      </div>
    </div>
  );
}
