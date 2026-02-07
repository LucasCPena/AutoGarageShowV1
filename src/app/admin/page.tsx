"use client";

import { useEffect, useState } from "react";

import AdminEventsPanel from "@/components/AdminEventsPanel";
import AdminListingsPanel from "@/components/AdminListingsPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
import AdminCatalogPanel from "@/components/AdminCatalogPanel";
import AdminBannersPanel from "@/components/AdminBannersPanel";
import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { useAuth } from "@/lib/useAuth";
import type { Event } from "@/lib/database";
import type { Listing } from "@/lib/mockData";

export default function AdminPage() {
  const { user, token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !mounted) return;

    const authHeaders: HeadersInit | undefined = token
      ? { Authorization: `Bearer ${token}` }
      : undefined;

    fetch("/api/listings", { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => setListings(data.listings || []));

    fetch("/api/events", { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, [user, token, mounted]);

  const pendingEvents = events.filter((e) => e.status === "pending");
  const pendingListings = listings.filter((l) => l.status === "pending");

  if (!mounted) {
    return (
      <Container className="py-10">
        <div>Carregando...</div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-10">
        <Notice title="Acesso Restrito" variant="warning">
          Você precisa estar logado como administrador para acessar esta página.
        </Notice>
        <div className="mt-4 rounded-lg bg-gray-100 p-4">
          <h3 className="mb-2 font-semibold">Debug Info:</h3>
          <p>Token: {token ? "Presente" : "Ausente"}</p>
          <p>User: {user ? JSON.stringify(user) : "Nulo"}</p>
          <button
            onClick={() => console.log("Storage:", localStorage.getItem("ags.auth.v1"))}
            className="mt-2 rounded bg-blue-500 px-3 py-1 text-sm text-white"
          >
            Ver Storage
          </button>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando...</div>
      </Container>
    );
  }

  return (
    <>
      <PageIntro title="Admin" subtitle="Painel administrativo com dados reais do backend." />

      <Container className="py-10">
        <Notice title="Atenção" variant="info">
          Painel administrativo com dados reais do backend.
        </Notice>

        <div className="mt-10">
          <AdminSettingsPanel />
        </div>

        <div className="mt-10">
          <AdminCatalogPanel token={token} />
        </div>

        <div className="mt-10">
          <AdminBannersPanel token={token} />
        </div>

        <div className="mt-10">
          <AdminListingsPanel listings={listings} />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-900">Pendências</div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-600">Anúncios para aprovar</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{pendingListings.length}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-600">Eventos para aprovar</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{pendingEvents.length}</div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container className="py-10">
        <AdminEventsPanel events={events} token={token} />
      </Container>
    </>
  );
}

