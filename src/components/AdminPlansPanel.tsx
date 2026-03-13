"use client";

import { useEffect, useState } from "react";

import Notice from "@/components/Notice";
import {
  cloneDefaultListingPlans,
  isListingPlanReadyForPublic,
  normalizeListingPlans,
  type ListingPlan
} from "@/lib/listingPlans";

type Props = {
  token: string | null;
};

function createPlan() {
  return {
    id: crypto.randomUUID(),
    badge: "",
    name: "",
    description: "",
    priceLabel: "",
    durationDays: 0,
    ctaLabel: "Saiba mais",
    ctaHref: "/classificados/anunciar",
    featured: false,
    active: true
  } satisfies ListingPlan;
}

function validatePlans(plans: ListingPlan[]) {
  const firstInvalidActivePlan = plans.find(
    (plan) => plan.active && !isListingPlanReadyForPublic(plan)
  );

  if (!firstInvalidActivePlan) return null;

  const missingFields: string[] = [];
  if (!firstInvalidActivePlan.name.trim()) missingFields.push("nome");
  if (!firstInvalidActivePlan.description.trim()) missingFields.push("descricao");
  if (!firstInvalidActivePlan.priceLabel.trim()) missingFields.push("preco exibido");

  return `Preencha ${missingFields.join(", ")} nos planos ativos antes de salvar.`;
}

export default function AdminPlansPanel({ token }: Props) {
  const [plans, setPlans] = useState<ListingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Nao foi possivel carregar os planos.");
        }

        if (!active) return;

        if (Array.isArray(data?.settings?.listingPlans)) {
          setPlans(normalizeListingPlans(data.settings.listingPlans));
        } else {
          setPlans(cloneDefaultListingPlans());
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar os planos.");
        setPlans(cloneDefaultListingPlans());
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      active = false;
    };
  }, []);

  function updatePlan(id: string, updates: Partial<ListingPlan>) {
    setPlans((current) =>
      current.map((plan) => (plan.id === id ? { ...plan, ...updates } : plan))
    );
    setMessage(null);
    setError(null);
  }

  function addPlan() {
    setPlans((current) => [...current, createPlan()]);
    setMessage(null);
    setError(null);
  }

  function removePlan(id: string) {
    setPlans((current) => current.filter((plan) => plan.id !== id));
    setMessage(null);
    setError(null);
  }

  async function savePlans() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const validationError = validatePlans(plans);
      if (validationError) {
        throw new Error(validationError);
      }

      const normalized = normalizeListingPlans(plans);

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          listingPlans: normalized
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel salvar os planos.");
      }

      setPlans(
        Array.isArray(data?.settings?.listingPlans)
          ? normalizeListingPlans(data.settings.listingPlans)
          : normalized
      );
      setMessage("Planos salvos com sucesso.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nao foi possivel salvar os planos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Cadastro de planos</div>
          <div className="mt-1 text-sm text-slate-600">
            Cadastre os planos exibidos na aba publica de planos.
          </div>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={addPlan}
        >
          Novo plano
        </button>
      </div>

      {message ? (
        <div className="mt-4">
          <Notice title="Salvo" variant="success">
            {message}
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
        <div className="mt-6">
          <Notice title="Carregando" variant="info">
            Lendo planos cadastrados.
          </Notice>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {plans.length === 0 ? (
            <Notice title="Sem planos" variant="info">
              Nenhum plano cadastrado. Clique em Novo plano para adicionar.
            </Notice>
          ) : (
            plans.map((plan, index) => (
              <section key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Plano {index + 1}</div>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => removePlan(plan.id)}
                  >
                    Excluir
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-slate-600">Selo</span>
                    <input
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={plan.badge}
                      onChange={(event) => updatePlan(plan.id, { badge: event.target.value })}
                      placeholder="Plano destaque"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-slate-600">Nome</span>
                    <input
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={plan.name}
                      onChange={(event) => updatePlan(plan.id, { name: event.target.value })}
                      placeholder="Destaque por 30 dias"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-slate-600">Preco exibido</span>
                    <input
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={plan.priceLabel}
                      onChange={(event) => updatePlan(plan.id, { priceLabel: event.target.value })}
                      placeholder="R$ 99"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-slate-600">Duracao (dias)</span>
                    <input
                      type="number"
                      min={0}
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={plan.durationDays}
                      onChange={(event) =>
                        updatePlan(plan.id, { durationDays: Number(event.target.value || 0) })
                      }
                    />
                  </label>

                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">Descricao</span>
                    <textarea
                      className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={plan.description}
                      onChange={(event) => updatePlan(plan.id, { description: event.target.value })}
                      placeholder="Descreva o que o plano oferece."
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-slate-600">Texto do botao</span>
                    <input
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={plan.ctaLabel}
                      onChange={(event) => updatePlan(plan.id, { ctaLabel: event.target.value })}
                      placeholder="Quero destacar"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-slate-600">Link do botao</span>
                    <input
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={plan.ctaHref}
                      onChange={(event) => updatePlan(plan.id, { ctaHref: event.target.value })}
                      placeholder="/classificados/anunciar"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={plan.featured}
                      onChange={(event) => updatePlan(plan.id, { featured: event.target.checked })}
                    />
                    Mostrar como plano em destaque
                  </label>

                  <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={plan.active}
                      onChange={(event) => updatePlan(plan.id, { active: event.target.checked })}
                    />
                    Plano ativo
                  </label>
                </div>
              </section>
            ))
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || loading}
          className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          onClick={savePlans}
        >
          {saving ? "Salvando..." : "Salvar planos"}
        </button>
      </div>
    </div>
  );
}
