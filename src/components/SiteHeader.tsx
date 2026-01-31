"use client";

import { useMemo, useState, useEffect } from "react";

import Link from "next/link";

import AuthModal from "@/components/AuthModal";
import Container from "@/components/Container";
import { useAuth } from "@/lib/useAuth";

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = useMemo(() => {
    const items = [
      { href: "/eventos", label: "Eventos" },
      { href: "/eventos/calendario", label: "Calendário" },
      { href: "/realizados", label: "Realizados" },
      { href: "/classificados", label: "Classificados" },
      { href: "/noticias", label: "Notícias" }
    ];
    if (mounted && user?.role === "admin") {
      items.push({ href: "/admin", label: "Admin" });
    }
    return items;
  }, [user, mounted]);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            AGS
          </span>
          <span className="hidden sm:inline">Auto Garage Show</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {mounted && user ? (
            <>
              <span className="text-sm text-slate-600">
                Olá, <span className="font-semibold text-slate-900">{user.name}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
          <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
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
                    Olá, <span className="font-semibold text-slate-900">{user.name}</span>
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
