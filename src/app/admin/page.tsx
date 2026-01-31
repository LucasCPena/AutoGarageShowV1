"use client";

import { useEffect, useState } from "react";

import AdminListingsPanel from "@/components/AdminListingsPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { useAuth } from "@/lib/useAuth";
import type { Listing } from "@/lib/mockData";

export default function AdminPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !mounted) return;

    // Buscar listings da API
    fetch('/api/listings', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => setListings(data.listings || []));

    // Buscar eventos da API
    fetch('/api/events', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, [user, mounted]);

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
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p>Token: {localStorage.getItem('token') ? 'Presente' : 'Ausente'}</p>
          <p>User: {user ? JSON.stringify(user) : 'Nulo'}</p>
          <button 
            onClick={() => console.log('Storage:', localStorage.getItem('ags.auth.v1'))}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
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
      <PageIntro
        title="Admin"
        subtitle="Painel administrativo com dados reais do backend."
      />

      <Container className="py-10">
        <Notice title="Atenção" variant="info">
          Painel administrativo com dados reais do backend.
        </Notice>

        <div className="mt-10">
          <AdminSettingsPanel />
        </div>

        <div className="mt-10">
          <AdminListingsPanel listings={listings} />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-900">Pendências</div>
            <dl className="mt-4 grid gap-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Anúncios para aprovar</dt>
                <dd className="font-semibold text-slate-900">{pendingListings.length}</dd>
              </div>
            </dl>
          </div>
        </div>

      </Container>
    </>
  );
}
