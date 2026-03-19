"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import AuthModal from "@/components/AuthModal";
import { normalizeSiteBranding } from "@/lib/siteBranding";

const DEFAULT_LOGO_URL = "/uploads/site/logo-site.png";

export default function SitePrelaunchScreen() {
  const pathname = usePathname();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const raw = await response.text();
        let parsed: unknown = null;

        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch {
            return;
          }
        }

        if (!response.ok || !active) return;

        const obj =
          parsed && typeof parsed === "object"
            ? (parsed as { settings?: { branding?: unknown } })
            : {};

        const branding = normalizeSiteBranding(obj.settings?.branding);
        setLogoUrl(branding.logoUrl || DEFAULT_LOGO_URL);
      } catch {
        if (!active) return;
        setLogoUrl(DEFAULT_LOGO_URL);
      }
    }

    void loadBranding();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoUrl]);

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
        <div className="w-full max-w-2xl text-center">
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-[32px] border border-white/10 bg-white/[0.03] px-6 py-10 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm sm:px-10 sm:py-14">
            {logoLoadFailed ? (
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-3xl font-bold text-white sm:h-28 sm:w-28">
                AGS
              </div>
            ) : (
              <img
                src={logoUrl}
                alt="Auto Garage Show"
                className="h-20 w-auto max-w-full object-contain sm:h-24 md:h-28"
                onError={() => setLogoLoadFailed(true)}
              />
            )}

            <div className="mt-10 max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                {"Pre-lan\u00e7amento"}
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
                {"O maior portal de carros antigos do Brasil est\u00e1 em constru\u00e7\u00e3o."}
              </h1>
              <p className="text-lg font-medium text-white/75 sm:text-xl">
                {"Lan\u00e7amento em junho."}
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex min-w-40 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Entrar
              </button>
              <p className="text-sm text-white/55">
                {"Acesso completo liberado para usu\u00e1rios autenticados."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode="login"
        redirectTo={pathname || "/"}
      />
    </>
  );
}
