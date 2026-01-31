"use client";

import { useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { applyListingOverrides } from "@/lib/listingOverrides";
import type { Listing } from "@/lib/mockData";
import { useListingOverrides } from "@/lib/useListingOverrides";
import { useSiteSettings } from "@/lib/useSiteSettings";

const DAY_MS = 1000 * 60 * 60 * 24;

type Props = {
  listings: Listing[];
};

function isExpired(listing: Listing, expireDays: number, now: number) {
  if (expireDays <= 0) return false;
  const created = new Date(listing.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return created + expireDays * DAY_MS <= now;
}

function daysUntilExpiration(listing: Listing, expireDays: number, now: number) {
  if (expireDays <= 0) return null;
  const created = new Date(listing.createdAt).getTime();
  if (!Number.isFinite(created)) return null;

  const expiresAt = created + expireDays * DAY_MS;
  return Math.ceil((expiresAt - now) / DAY_MS);
}

function isFeaturedActive(listing: Listing, now: number) {
  if (!listing.featured) return false;
  if (!listing.featuredUntil) return true;
  const until = new Date(listing.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export default function AdminListingsPanel({ listings }: Props) {
  const { settings } = useSiteSettings();
  const { overrides, setOverride, clearOverride } = useListingOverrides();
  const [selectedDuration, setSelectedDuration] = useState(() => {
    const first = settings.listingFeaturedDurationsDays[0];
    return typeof first === "number" ? String(first) : "7";
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const now = Date.now();

  const effectiveListings = useMemo(
    () => applyListingOverrides(listings, overrides),
    [listings, overrides]
  );

  const approved = effectiveListings.filter((l) => l.status === "approved" || l.status === "active");
  const pending = effectiveListings.filter((l) => l.status === "pending");
  const expired = approved.filter((l) => isExpired(l, settings.listingAutoExpireDays, now));
  const active = approved.filter((l) => !isExpired(l, settings.listingAutoExpireDays, now));

  const durationOptions = settings.listingFeaturedDurationsDays.length
    ? settings.listingFeaturedDurationsDays
    : [7, 14, 21, 30];

  const selectedDurationNumber = Number(selectedDuration) || durationOptions[0] || 7;

  const handleApproveReject = async (listingId: string, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('ags.auth.v1');
      let authToken = null;
      
      if (token) {
        try {
          const parsed = JSON.parse(token);
          authToken = parsed.token;
        } catch (e) {
          console.error('Erro ao parsear token:', e);
        }
      }
      
      console.log('Token encontrado:', authToken ? 'Sim' : 'Não');
      console.log('Listing ID:', listingId);
      console.log('Action:', action);
      
      if (!authToken) {
        setMessage({ type: 'error', text: 'Token de autenticação não encontrado' });
        return;
      }

      const response = await fetch(`/api/admin/listings/${listingId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ action })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
      }

      setMessage({ 
        type: 'success', 
        text: `Anúncio ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!` 
      });

      // Recarregar a página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erro na aprovação:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao processar solicitação' 
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {/* Mensagem de feedback */}
      {message && (
        <div className={`mb-4 rounded-md p-3 text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Abas */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Pendentes ({pending.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'approved'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Aprovados ({approved.length})
          </button>
        </nav>
      </div>
      
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Classificados (gestão)</div>
          <div className="mt-1 text-sm text-slate-600">
            Protótipo: reativação e destaque via admin, aplicados localmente neste navegador.
          </div>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">Duração padrão do destaque</span>
          <select
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
          >
            {durationOptions.map((d) => (
              <option key={d} value={String(d)}>
                {d} dias
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-600">Pendentes</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{pending.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-600">Aprovados</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{approved.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-600">Ativos</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{active.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-600">Expirados</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{expired.length}</div>
        </div>
      </div>

      {/* Anúncios Pendentes */}
      {activeTab === 'pending' && (
        <div className="mt-6">
          {pending.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Anúncios Pendentes de Aprovação</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Anúncio</th>
                      <th className="px-4 py-3">Criado</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((l) => (
                      <tr key={l.id} className="border-t border-slate-200 align-top">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{l.title}</div>
                          <div className="mt-1 text-xs text-slate-600">
                            {l.city}/{l.state} • {l.year}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">{formatDate(l.createdAt)}</td>

                        <td className="px-4 py-3">
                          <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                            Pendente
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                              onClick={() => handleApproveReject(l.id, 'approve')}
                            >
                              Aprovar
                            </button>

                            <button
                              type="button"
                              className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                              onClick={() => handleApproveReject(l.id, 'reject')}
                            >
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              Nenhum anúncio pendente de aprovação.
            </div>
          )}
        </div>
      )}

      {/* Anúncios Aprovados */}
      {activeTab === 'approved' && (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Anúncio</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {approved.map((l) => {
              const expiredNow = isExpired(l, settings.listingAutoExpireDays, now);
              const daysLeft = daysUntilExpiration(l, settings.listingAutoExpireDays, now);
              const featuredActive = isFeaturedActive(l, now);

              return (
                <tr key={l.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{l.title}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {l.city}/{l.state} • {l.year}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-700">{formatDate(l.createdAt)}</td>

                  <td className="px-4 py-3">
                    <div className="grid gap-1">
                      {expiredNow ? (
                        <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          Expirado
                        </span>
                      ) : (
                        <span className="inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                          Ativo
                        </span>
                      )}

                      {featuredActive ? (
                        <span className="inline-flex w-fit rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                          Destaque
                        </span>
                      ) : null}

                      {!expiredNow && typeof daysLeft === "number" && settings.listingAutoExpireDays > 0 ? (
                        <span className="text-xs text-slate-600">Expira em {daysLeft} dia(s)</span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {expiredNow ? (
                        <button
                          type="button"
                          className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
                          onClick={() => {
                            setOverride(l.id, { reactivatedAt: new Date().toISOString() });
                          }}
                        >
                          Reativar (mock)
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          const until = new Date(
                            Date.now() + selectedDurationNumber * DAY_MS
                          ).toISOString();
                          setOverride(l.id, { isFeatured: true, featuredUntil: until });
                        }}
                      >
                        Ativar destaque
                      </button>

                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setOverride(l.id, { isFeatured: false, featuredUntil: null });
                        }}
                      >
                        Remover destaque
                      </button>

                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => clearOverride(l.id)}
                      >
                        Limpar override
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {approved.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <Notice title="Sem anúncios" variant="info">
                    Nenhum anúncio aprovado.
                  </Notice>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </div>
  );
}
