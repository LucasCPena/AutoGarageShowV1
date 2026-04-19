"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import AuthModal from "@/components/AuthModal";
import { PUBLIC_LISTING_ACCESS_ROUTE } from "@/lib/public-listing-access";
import { normalizeSiteBranding } from "@/lib/siteBranding";
import { resolvePublicOrigin, siteUrl, toAbsoluteUrl } from "@/lib/site-url";

const DEFAULT_LOGO_URL = "/uploads/site/logo-site.png";

const PRELAUNCH_QR_CODE = {
  eyebrow: "Anúncio de carro",
  title: "Cadastre seu anúncio",
  description:
    "Escaneie o QR Code para ir direto ao cadastro do carro. Esse acesso libera somente essa área durante o pré-lançamento.",
  targetPath: PUBLIC_LISTING_ACCESS_ROUTE
} as const;

function getQrCodeImageSrc(targetPath: string, origin: string) {
  const absoluteTarget = toAbsoluteUrl(targetPath, origin);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&margin=0&data=${encodeURIComponent(
    absoluteTarget
  )}`;
}

export default function SitePrelaunchScreen() {
  const pathname = usePathname();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [qrOrigin, setQrOrigin] = useState(siteUrl);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    setQrOrigin(resolvePublicOrigin(window.location.origin));
  }, []);

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
        <div className="w-full max-w-3xl text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[32px] border border-white/10 bg-white/[0.03] px-6 py-10 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm sm:px-10 sm:py-14">
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
                {"Lan\u00e7amento em 01 de julho."}
              </p>
            </div>

            <div className="mt-8 w-full max-w-xl">
              <p className="mx-auto max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                Durante o pré-lançamento, o QR Code abaixo leva direto ao
                cadastro de carro, sem abrir o restante do portal.
              </p>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-5 text-left sm:px-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
                    {PRELAUNCH_QR_CODE.eyebrow}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    {PRELAUNCH_QR_CODE.title}
                  </h2>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/68">
                  {PRELAUNCH_QR_CODE.description}
                </p>

                <div className="mt-5 rounded-[24px] bg-white px-4 py-5 text-center text-slate-900">
                  <img
                    src={getQrCodeImageSrc(PRELAUNCH_QR_CODE.targetPath, qrOrigin)}
                    alt="QR Code para cadastro de anúncio de carro"
                    className="mx-auto h-40 w-40 rounded-2xl object-contain sm:h-44 sm:w-44"
                    loading="lazy"
                  />
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    Escaneie para abrir o cadastro direto do carro.
                  </p>
                  <a
                    href={PRELAUNCH_QR_CODE.targetPath}
                    className="mt-4 inline-flex min-w-40 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Abrir cadastro
                  </a>
                </div>
              </div>
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
