"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import AuthModal from "@/components/AuthModal";
import Container from "@/components/Container";
import {
  SITE_BRANDING_EVENT,
  normalizeSiteBranding,
  type SiteBranding
} from "@/lib/siteBranding";
import { useAuth } from "@/lib/useAuth";

const DEFAULT_LOGO_URL = "/uploads/site/logo-site.png";

function applyFavicon(faviconUrl: string) {
  const entries: Array<{ rel: string }> = [
    { rel: "icon" },
    { rel: "shortcut icon" },
    { rel: "apple-touch-icon" }
  ];

  entries.forEach(({ rel }) => {
    const selector = `link[rel='${rel}']`;
    const existing = document.head.querySelector<HTMLLinkElement>(selector);
    const link = existing ?? document.createElement("link");
    link.rel = rel;
    link.href = faviconUrl;
    if (!existing) {
      document.head.appendChild(link);
    }
  });
}

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [branding, setBranding] = useState<SiteBranding>({});
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const logoUrl = branding.logoUrl || DEFAULT_LOGO_URL;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoUrl]);

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

        setBranding(normalizeSiteBranding(obj.settings?.branding));
      } catch {
        if (!active) return;
        setBranding({});
      }
    }

    loadBranding();

    function onBrandingUpdate() {
      loadBranding();
    }

    window.addEventListener(SITE_BRANDING_EVENT, onBrandingUpdate);
    return () => {
      active = false;
      window.removeEventListener(SITE_BRANDING_EVENT, onBrandingUpdate);
    };
  }, []);

  useEffect(() => {
    applyFavicon(branding.faviconUrl || "/placeholders/car.svg");
  }, [branding.faviconUrl]);

  const navItems = useMemo(() => {
    const items = [
      { href: "/eventos", label: "Eventos" },
      { href: "/eventos/calendario", label: "Calendario" },
      { href: "/classificados", label: "Classificados" },
      { href: "/noticias", label: "Noticias" }
    ];
    if (mounted && user?.role === "admin") {
      items.push({ href: "/admin", label: "Admin" });
    }
    return items;
  }, [user, mounted]);

  const showCustomLogo = !logoLoadFailed;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-black">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          {showCustomLogo ? (
            <>
              <img
                src={logoUrl}
                alt="Auto Garage Show"
                className="h-10 w-auto max-w-[210px] object-contain"
                onError={() => setLogoLoadFailed(true)}
              />
              <span className="sr-only">Auto Garage Show</span>
            </>
          ) : (
            <>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                AGS
              </span>
              <span className="hidden sm:inline">Auto Garage Show</span>
            </>
          )}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-200 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-slate-200 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {mounted && user ? (
            <>
              <span className="text-sm text-slate-600">
                <span className="text-slate-300">Ola,</span>{" "}
                <span className="font-semibold text-white">{user.name}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="rounded-md border border-white bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Cadastrar
              </button>
            </>
          )}
        </div>

        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900">
            Menu
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2">
              {mounted && user ? (
                <>
                  <div className="px-3 py-2 text-sm text-slate-600">
                    Ola, <span className="font-semibold text-slate-900">{user.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="rounded-md bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Cadastrar
                  </button>
                </>
              )}
            </div>
          </div>
        </details>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </Container>
    </header>
  );
}
