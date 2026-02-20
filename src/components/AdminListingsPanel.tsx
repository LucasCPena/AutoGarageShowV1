"use client";

import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { applyListingOverrides } from "@/lib/listingOverrides";
import type { Listing } from "@/lib/database";
import { useListingOverrides } from "@/lib/useListingOverrides";
import { useSiteSettings } from "@/lib/useSiteSettings";

const DAY_MS = 1000 * 60 * 60 * 24;

type Props = {
  listings: Listing[];
  token?: string | null;
  onListingsChange?: (next: Listing[]) => void;
};

type ListingFormState = {
  title: string;
  make: string;
  model: string;
  modelYear: string;
  manufactureYear: string;
  mileage: string;
  price: string;
  city: string;
  state: string;
  description: string;
  document: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: Listing["status"];
  featured: boolean;
  featuredUntil: string;
  images: string;
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

function getYearLabel(listing: Listing) {
  const yearValue = listing.modelYear ?? listing.year ?? listing.manufactureYear;
  return yearValue ? String(yearValue) : "-";
}

function getStatusMeta(listing: Listing, expired: boolean) {
  if (expired) {
    return { label: "Expirado", className: "bg-amber-100 text-amber-900" };
  }
  switch (listing.status) {
    case "approved":
      return { label: "Aprovado", className: "bg-slate-100 text-slate-700" };
    case "active":
      return { label: "Ativo", className: "bg-emerald-100 text-emerald-900" };
    case "inactive":
      return { label: "Inativo", className: "bg-slate-200 text-slate-800" };
    case "sold":
      return { label: "Vendido", className: "bg-blue-100 text-blue-900" };
    case "rejected":
      return { label: "Rejeitado", className: "bg-red-100 text-red-900" };
    default:
      return { label: "Pendente", className: "bg-amber-100 text-amber-900" };
  }
}

function toLocalDateTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoString(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function parseImages(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminListingsPanel({ listings, token, onListingsChange }: Props) {
  const { settings } = useSiteSettings();
  const { overrides, setOverride, clearOverride } = useListingOverrides();
  const [localListings, setLocalListings] = useState<Listing[]>(listings);
  const [selectedDuration, setSelectedDuration] = useState(() => {
    const first = settings.listingFeaturedDurationsDays[0];
    return typeof first === "number" ? String(first) : "7";
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ListingFormState>({
    title: "",
    make: "",
    model: "",
    modelYear: "",
    manufactureYear: "",
    mileage: "",
    price: "",
    city: "",
    state: "",
    description: "",
    document: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    status: "active",
    featured: false,
    featuredUntil: "",
    images: ""
  });

  const now = Date.now();

  useEffect(() => {
    setLocalListings(listings);
  }, [listings]);

  const effectiveListings = useMemo(
    () => applyListingOverrides(localListings, overrides),
    [localListings, overrides]
  );

  const approved = effectiveListings.filter((l) => l.status === "approved" || l.status === "active");
  const pending = effectiveListings.filter((l) => l.status === "pending");
  const managed = effectiveListings.filter((l) => l.status !== "pending");
  const expired = approved.filter((l) => isExpired(l, settings.listingAutoExpireDays, now));
  const active = approved.filter((l) => !isExpired(l, settings.listingAutoExpireDays, now));

  const durationOptions = settings.listingFeaturedDurationsDays.length
    ? settings.listingFeaturedDurationsDays
    : [7, 14, 21, 30];

  const selectedDurationNumber = Number(selectedDuration) || durationOptions[0] || 7;

  const updateListingsState = (updater: Listing[] | ((prev: Listing[]) => Listing[])) => {
    setLocalListings((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onListingsChange?.(next);
      return next;
    });
  };

  const getAuthToken = () => {
    if (token) return token;
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("ags.auth.v1");
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return parsed.token || null;
    } catch {
      return null;
    }
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setFormError(null);
    setFormState({
      title: "",
      make: "",
      model: "",
      modelYear: "",
      manufactureYear: "",
      mileage: "",
      price: "",
      city: "",
      state: "",
      description: "",
      document: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      status: "active",
      featured: false,
      featuredUntil: "",
      images: ""
    });
    setFormOpen(true);
  };

  const openEdit = (listing: Listing) => {
    setFormMode("edit");
    setEditingId(listing.id);
    setFormError(null);
    setFormState({
      title: listing.title || "",
      make: listing.make || "",
      model: listing.model || "",
      modelYear: String(listing.modelYear ?? listing.year ?? listing.manufactureYear ?? ""),
      manufactureYear: String(listing.manufactureYear ?? listing.modelYear ?? listing.year ?? ""),
      mileage: String(listing.mileage ?? ""),
      price: String(listing.price ?? ""),
      city: listing.city || "",
      state: listing.state || "",
      description: listing.description || "",
      document: listing.document || "",
      contactName: listing.contact?.name || "",
      contactEmail: listing.contact?.email || "",
      contactPhone: listing.contact?.phone || "",
      status: listing.status || "pending",
      featured: Boolean(listing.featured),
      featuredUntil: toLocalDateTime(listing.featuredUntil),
      images: (listing.images || []).join("\n")
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormError(null);
    setSaving(false);
  };

  const updateField =
    (field: keyof ListingFormState) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const missing: string[] = [];
    if (!formState.make.trim()) missing.push("marca");
    if (!formState.model.trim()) missing.push("modelo");
    if (!formState.modelYear.trim()) missing.push("ano modelo");
    if (!formState.manufactureYear.trim()) missing.push("ano fabricação");
    if (!formState.mileage.trim()) missing.push("quilometragem");
    if (!formState.price.trim()) missing.push("preço");
    if (!formState.city.trim()) missing.push("cidade");
    if (!formState.state.trim()) missing.push("UF");
    if (!formState.description.trim()) missing.push("descrição");
    if (!formState.document.trim()) missing.push("documento");
    if (!formState.contactName.trim()) missing.push("contato");

    if (missing.length > 0) {
      setFormError(`Preencha: ${missing.join(", ")}.`);
      return;
    }

    const modelYear = Number(formState.modelYear);
    const manufactureYear = Number(formState.manufactureYear);
    const mileage = Number(formState.mileage);
    const price = Number(formState.price);

    if (!Number.isFinite(modelYear) || !Number.isFinite(manufactureYear)) {
      setFormError("Ano modelo e ano de fabricação precisam ser números válidos.");
      return;
    }

    if (!Number.isFinite(mileage) || mileage < 0) {
      setFormError("Quilometragem inválida.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Preço inválido.");
      return;
    }

    const payload = {
      title: formState.title.trim() || undefined,
      make: formState.make.trim(),
      model: formState.model.trim(),
      modelYear,
      manufactureYear,
      year: modelYear,
      mileage,
      price,
      city: formState.city.trim(),
      state: formState.state.trim().toUpperCase(),
      description: formState.description.trim(),
      document: formState.document.trim(),
      contact: {
        name: formState.contactName.trim(),
        email: formState.contactEmail.trim(),
        phone: formState.contactPhone.trim()
      },
      status: formState.status,
      featured: formState.featured,
      featuredUntil: formState.featured
        ? (toIsoString(formState.featuredUntil) ?? null)
        : null,
      images: parseImages(formState.images)
    };

    setSaving(true);

    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error("Token de autenticação não encontrado.");
      }

      if (formMode === "create") {
        const createPayload = {
          make: payload.make,
          model: payload.model,
          modelYear: payload.modelYear,
          manufactureYear: payload.manufactureYear,
          year: payload.year,
          mileage: payload.mileage,
          price: payload.price,
          city: payload.city,
          state: payload.state,
          description: payload.description,
          document: payload.document,
          contact: payload.contact,
          images: payload.images
        };

        const response = await fetch("/api/listings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(createPayload)
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao criar anúncio.");
        }

        let createdListing: Listing = data.listing;

        if (
          payload.status !== createdListing.status ||
          payload.featured ||
          payload.title
        ) {
          const updateResponse = await fetch(`/api/listings/${createdListing.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({
              title: payload.title,
              status: payload.status,
              featured: payload.featured,
              featuredUntil: payload.featuredUntil
            })
          });
          const updateData = await updateResponse.json();
          if (updateResponse.ok && updateData.listing) {
            createdListing = updateData.listing;
          }
        }

        updateListingsState((prev) => [createdListing, ...prev]);
        setMessage({ type: "success", text: "Anúncio criado com sucesso." });
        if (createdListing.status !== "pending") {
          setActiveTab("approved");
        }
      } else if (editingId) {
        const response = await fetch(`/api/listings/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao atualizar anúncio.");
        }

        updateListingsState((prev) =>
          prev.map((item) => (item.id === editingId ? data.listing : item))
        );
        setMessage({ type: "success", text: "Anúncio atualizado com sucesso." });
      }

      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao salvar anúncio.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm("Tem certeza que deseja excluir este anúncio?")) return;
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const response = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir anúncio.");
      }

      updateListingsState((prev) => prev.filter((item) => item.id !== listingId));
      setMessage({ type: "success", text: "Anúncio excluído com sucesso." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao excluir anúncio."
      });
    }
  };

  const handleApproveReject = async (listingId: string, action: 'approve' | 'reject') => {
    try {
      const authToken = getAuthToken();

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
      }

      setMessage({
        type: 'success',
        text: `Anúncio ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!`
      });
      // Atualiza o item alterado e em seguida sincroniza a lista completa com o backend.
      if (data.listing) {
        updateListingsState((prev) =>
          prev.map((item) => (item.id === listingId ? data.listing : item))
        );
      }

      const syncResponse = await fetch('/api/listings', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const syncData = await syncResponse.json();
      if (syncResponse.ok && Array.isArray(syncData.listings)) {
        updateListingsState(syncData.listings);
      }

      if (action === 'approve') {
        setActiveTab('approved');
      }

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
            Gerenciar ({managed.length})
          </button>
        </nav>
      </div>
      
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Classificados</div>
          <div className="mt-1 text-sm text-slate-600">
            CRUD completo de anúncios: criar, editar, excluir e aprovar.
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Novo anúncio
          </button>

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
                            {l.city}/{l.state} • {getYearLabel(l)}
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
                              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => openEdit(l)}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                              onClick={() => handleApproveReject(l.id, 'reject')}
                            >
                              Rejeitar
                            </button>

                            <button
                              type="button"
                              className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(l.id)}
                            >
                              Excluir
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
            {managed.map((l) => {
              const expiredNow = isExpired(l, settings.listingAutoExpireDays, now);
              const daysLeft = daysUntilExpiration(l, settings.listingAutoExpireDays, now);
              const featuredActive = isFeaturedActive(l, now);
              const statusMeta = getStatusMeta(l, expiredNow);

              return (
                <tr key={l.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{l.title}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {l.city}/{l.state} • {getYearLabel(l)}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-700">{formatDate(l.createdAt)}</td>

                  <td className="px-4 py-3">
                    <div className="grid gap-1">
                      <span
                        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>

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

                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => openEdit(l)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(l.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {managed.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <Notice title="Sem anúncios" variant="info">
                    Nenhum anúncio para gerenciar.
                  </Notice>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {formMode === "create" ? "Novo anúncio" : "Editar anúncio"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:text-slate-700"
              >
                Fechar
              </button>
            </div>

            {formError ? (
              <Notice title="Validação" variant="warning" className="mt-4">
                {formError}
              </Notice>
            ) : null}

            <form onSubmit={handleSave} className="mt-4 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Marca</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.make}
                    onChange={updateField("make")}
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Modelo</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.model}
                    onChange={updateField("model")}
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Ano modelo</span>
                  <input
                    type="number"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.modelYear}
                    onChange={updateField("modelYear")}
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Ano fabricação</span>
                  <input
                    type="number"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.manufactureYear}
                    onChange={updateField("manufactureYear")}
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Quilometragem</span>
                  <input
                    type="number"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.mileage}
                    onChange={updateField("mileage")}
                    step="1"
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Preço</span>
                  <input
                    type="number"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.price}
                    onChange={updateField("price")}
                    step="0.01"
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Cidade</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.city}
                    onChange={updateField("city")}
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">UF</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.state}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        state: e.target.value.toUpperCase()
                      }))
                    }
                    maxLength={2}
                    required
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">Título (opcional)</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.title}
                    onChange={updateField("title")}
                    placeholder="Deixe vazio para manter o título automático"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">Descrição</span>
                  <textarea
                    className="min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formState.description}
                    onChange={updateField("description")}
                    required
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">Imagens (1 por linha)</span>
                  <textarea
                    className="min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formState.images}
                    onChange={updateField("images")}
                    placeholder="https://..."
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Documento</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.document}
                    onChange={updateField("document")}
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Contato (nome)</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.contactName}
                    onChange={updateField("contactName")}
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Contato (email)</span>
                  <input
                    type="email"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.contactEmail}
                    onChange={updateField("contactEmail")}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Contato (telefone)</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.contactPhone}
                    onChange={updateField("contactPhone")}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Status</span>
                  <select
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.status}
                    onChange={updateField("status")}
                  >
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="sold">Vendido</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formState.featured}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        featured: e.target.checked
                      }))
                    }
                  />
                  Destacar anúncio
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600">Destaque até</span>
                  <input
                    type="datetime-local"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.featuredUntil}
                    onChange={updateField("featuredUntil")}
                    disabled={!formState.featured}
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

