"use client";

import { useEffect, useState } from "react";

import Notice from "@/components/Notice";
import { normalizeCouponCampaigns, resolvePlanOffer } from "@/lib/couponCampaigns";
import type { CouponCampaign } from "@/lib/database";
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
    discountType: "none",
    discountValue: null,
    durationDays: 0,
    ctaLabel: "Saiba mais",
    ctaHref: "/veiculos/anunciar",
    featured: false,
    active: true
  } satisfies ListingPlan;
}

function createCampaign() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    code: "",
    targetPlanIds: [],
    discountType: "free",
    discountValue: 0,
    badgeText: "",
    active: true,
    startAt: now,
    endAt: "",
    createdAt: now,
    updatedAt: now
  } satisfies CouponCampaign;
}

function validatePlans(plans: ListingPlan[]) {
  const firstInvalidActivePlan = plans.find(
    (plan) => plan.active && !isListingPlanReadyForPublic(plan)
  );

  if (!firstInvalidActivePlan) return null;

  const missingFields: string[] = [];
  if (!firstInvalidActivePlan.name.trim()) missingFields.push("nome");
  if (!firstInvalidActivePlan.description.trim()) missingFields.push("descrição");
  if (!firstInvalidActivePlan.priceLabel.trim()) missingFields.push("valor original");

  return `Preencha ${missingFields.join(", ")} nos planos ativos antes de salvar.`;
}

function getPlanPricePreview(plan: ListingPlan) {
  return resolvePlanOffer(plan, []);
}

function toDateTimeInputValue(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrEmpty(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

export default function AdminPlansPanel({ token }: Props) {
  const [plans, setPlans] = useState<ListingPlan[]>([]);
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
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
          throw new Error(data?.error || "Não foi possível carregar os planos.");
        }

        if (!active) return;

        setPlans(
          Array.isArray(data?.settings?.listingPlans)
            ? normalizeListingPlans(data.settings.listingPlans)
            : cloneDefaultListingPlans()
        );
        setCampaigns(normalizeCouponCampaigns(data?.settings?.couponCampaigns));
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os planos."
        );
        setPlans(cloneDefaultListingPlans());
        setCampaigns([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPlans();

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

  function updateCampaign(id: string, updates: Partial<CouponCampaign>) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === id
          ? { ...campaign, ...updates, updatedAt: new Date().toISOString() }
          : campaign
      )
    );
    setMessage(null);
    setError(null);
  }

  function addCampaign() {
    setCampaigns((current) => [...current, createCampaign()]);
    setMessage(null);
    setError(null);
  }

  function removeCampaign(id: string) {
    setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
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

      const normalizedPlans = normalizeListingPlans(plans);
      const normalizedCampaigns = normalizeCouponCampaigns(campaigns);

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          listingPlans: normalizedPlans,
          couponCampaigns: normalizedCampaigns
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível salvar os planos.");
      }

      setPlans(
        Array.isArray(data?.settings?.listingPlans)
          ? normalizeListingPlans(data.settings.listingPlans)
          : normalizedPlans
      );
      setCampaigns(normalizeCouponCampaigns(data?.settings?.couponCampaigns));
      setMessage("Planos salvos com sucesso.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar os planos."
      );
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
            Cadastre os planos exibidos na área pública de planos.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={addPlan}
          >
            Novo plano
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={addCampaign}
          >
            Nova campanha
          </button>
        </div>
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
            plans.map((plan, index) => {
              const preview = getPlanPricePreview(plan);
              const hasDiscountPreview = Boolean(preview.promotionalPriceLabel);
              const requiresNumericBase =
                plan.discountType &&
                plan.discountType !== "none" &&
                plan.discountType !== "free" &&
                plan.priceLabel.trim();

              return (
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
                      <span className="text-xs font-semibold text-slate-600">Valor original</span>
                      <input
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={plan.priceLabel}
                        onChange={(event) => updatePlan(plan.id, { priceLabel: event.target.value })}
                        placeholder="R$ 99,00"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Duração (dias)</span>
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

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Tipo de desconto</span>
                      <select
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={plan.discountType || "none"}
                        onChange={(event) =>
                          updatePlan(plan.id, {
                            discountType: event.target.value as ListingPlan["discountType"],
                            discountValue:
                              event.target.value === "none" || event.target.value === "free"
                                ? null
                                : plan.discountValue ?? 0
                          })
                        }
                      >
                        <option value="none">Sem desconto</option>
                        <option value="percentage">Percentual</option>
                        <option value="fixed">Valor fixo</option>
                        <option value="free">Grátis</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">
                        {plan.discountType === "percentage" ? "Percentual (%)" : "Valor do desconto"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={plan.discountType === "percentage" ? 100 : undefined}
                        disabled={!plan.discountType || plan.discountType === "none" || plan.discountType === "free"}
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100"
                        value={plan.discountValue ?? ""}
                        onChange={(event) =>
                          updatePlan(plan.id, {
                            discountValue: event.target.value === "" ? null : Number(event.target.value)
                          })
                        }
                      />
                    </label>

                    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Prévia pública
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {hasDiscountPreview ? (
                          <span className="text-sm font-semibold text-slate-400 line-through">
                            {preview.originalPriceLabel}
                          </span>
                        ) : null}
                        <span className="text-xl font-bold text-slate-900">
                          {preview.promotionalPriceLabel || preview.originalPriceLabel || "Sem valor"}
                        </span>
                      </div>
                      {requiresNumericBase && !hasDiscountPreview ? (
                        <div className="mt-2 text-xs text-amber-700">
                          Use um valor numérico no campo original para calcular o desconto automaticamente.
                        </div>
                      ) : null}
                    </div>

                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold text-slate-600">Descrição</span>
                      <textarea
                        className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={plan.description}
                        onChange={(event) => updatePlan(plan.id, { description: event.target.value })}
                        placeholder="Descreva o que o plano oferece."
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Texto do botão</span>
                      <input
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={plan.ctaLabel}
                        onChange={(event) => updatePlan(plan.id, { ctaLabel: event.target.value })}
                        placeholder="Quero destacar"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Link do botão</span>
                      <input
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={plan.ctaHref}
                        onChange={(event) => updatePlan(plan.id, { ctaHref: event.target.value })}
                        placeholder="/veiculos/anunciar"
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
              );
            })
          )}
        </div>
      )}

      {!loading ? (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="text-sm font-semibold text-slate-900">Campanhas promocionais</div>
          <div className="mt-1 text-sm text-slate-600">
            Configure cupons e períodos promocionais por plano.
          </div>

          <div className="mt-4 grid gap-4">
            {campaigns.length === 0 ? (
              <Notice title="Sem campanhas" variant="info">
                Nenhuma campanha cadastrada. Clique em Nova campanha para criar uma promoção.
              </Notice>
            ) : (
              campaigns.map((campaign, index) => (
                <section key={campaign.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">
                      Campanha {index + 1}
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => removeCampaign(campaign.id)}
                    >
                      Excluir
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Título</span>
                      <input
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={campaign.title}
                        onChange={(event) => updateCampaign(campaign.id, { title: event.target.value })}
                        placeholder="Ex.: Grátis até dezembro"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Selo</span>
                      <input
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={campaign.badgeText || ""}
                        onChange={(event) => updateCampaign(campaign.id, { badgeText: event.target.value })}
                        placeholder="Ex.: Grátis por tempo limitado"
                      />
                    </label>

                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold text-slate-600">Descrição</span>
                      <textarea
                        className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={campaign.description || ""}
                        onChange={(event) => updateCampaign(campaign.id, { description: event.target.value })}
                        placeholder="Explique a regra da campanha."
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Tipo de desconto</span>
                      <select
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={campaign.discountType}
                        onChange={(event) =>
                          updateCampaign(campaign.id, {
                            discountType: event.target.value as CouponCampaign["discountType"]
                          })
                        }
                      >
                        <option value="free">Grátis</option>
                        <option value="percentage">Percentual</option>
                        <option value="fixed">Valor fixo</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Valor do desconto</span>
                      <input
                        type="number"
                        min={0}
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={campaign.discountValue || 0}
                        onChange={(event) =>
                          updateCampaign(campaign.id, {
                            discountValue: Number(event.target.value || 0)
                          })
                        }
                      />
                    </label>

                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold text-slate-600">Planos alvo</span>
                      <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3">
                        {plans.map((plan) => {
                          const checked = campaign.targetPlanIds.includes(plan.id);
                          return (
                            <label key={plan.id} className="flex items-center gap-3 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  updateCampaign(campaign.id, {
                                    targetPlanIds: event.target.checked
                                      ? [...campaign.targetPlanIds, plan.id]
                                      : campaign.targetPlanIds.filter((item) => item !== plan.id)
                                  })
                                }
                              />
                              {plan.name || plan.id}
                            </label>
                          );
                        })}
                      </div>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Início</span>
                      <input
                        type="datetime-local"
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={toDateTimeInputValue(campaign.startAt)}
                        onChange={(event) => {
                          const next = toIsoOrEmpty(event.target.value);
                          if (next) {
                            updateCampaign(campaign.id, { startAt: next });
                          }
                        }}
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Fim</span>
                      <input
                        type="datetime-local"
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={toDateTimeInputValue(campaign.endAt)}
                        onChange={(event) =>
                          updateCampaign(campaign.id, {
                            endAt: toIsoOrEmpty(event.target.value) || undefined
                          })
                        }
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={campaign.active}
                        onChange={(event) => updateCampaign(campaign.id, { active: event.target.checked })}
                      />
                      Campanha ativa
                    </label>
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      ) : null}

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
