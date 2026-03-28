"use client";

import { useEffect, useState } from "react";

import Notice from "@/components/Notice";

type Props = {
  token: string | null;
};

type MetricsPayload = {
  metrics?: {
    totals?: {
      visits?: number;
      listingViews?: number;
      companyViews?: number;
      clicks?: number;
      messages?: number;
      searches?: number;
    };
    byEntity?: Array<{
      entityType: string;
      entityId?: string;
      label?: string;
      count: number;
    }>;
  };
};

export default function AdminMetricsPanel({ token }: Props) {
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Sessao expirada. Faca login novamente.");
      return;
    }

    let cancelled = false;
    fetch("/api/metrics?scope=all", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Nao foi possivel carregar as metricas.");
        }
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Nao foi possivel carregar as metricas."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <div className="text-sm font-semibold text-slate-900">Metricas do site</div>
        <div className="mt-1 text-sm text-slate-600">
          Visitas, cliques, mensagens e itens com maior desempenho.
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-slate-600">Carregando metricas...</div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <Notice title="Erro" variant="warning">
            {error}
          </Notice>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Visitas</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {data?.metrics?.totals?.visits ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Views de anuncios</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {data?.metrics?.totals?.listingViews ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Views de empresas</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {data?.metrics?.totals?.companyViews ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Cliques</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {data?.metrics?.totals?.clicks ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Mensagens</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {data?.metrics?.totals?.messages ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Buscas</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {data?.metrics?.totals?.searches ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {(data?.metrics?.byEntity || []).slice(0, 12).map((item, index) => (
              <div
                key={`${item.entityType}-${item.entityId || index}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {item.label || item.entityId || "Item sem identificacao"}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {item.entityType}
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900">{item.count}</div>
              </div>
            ))}

            {!(data?.metrics?.byEntity || []).length ? (
              <Notice title="Sem movimentacao" variant="info">
                As metricas aparecerao aqui conforme o site for utilizado.
              </Notice>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
