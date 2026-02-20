"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import type { Listing } from "@/lib/database";
import { useAuth } from "@/lib/useAuth";

type Props = {
  params: { id: string };
};

type FormState = {
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

function toLocalDateTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseImages(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ListingManagePage({ params }: Props) {
  const { token, user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({
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

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError("Token de autenticacao nao encontrado.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/listings/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar classificado.");
        }
        if (cancelled) return;
        const listing = data.listing as Listing;
        setFormState({
          title: listing.title || "",
          make: listing.make || "",
          model: listing.model || "",
          modelYear: String(listing.modelYear ?? listing.year ?? ""),
          manufactureYear: String(
            listing.manufactureYear ?? listing.modelYear ?? listing.year ?? ""
          ),
          mileage: String(listing.mileage ?? ""),
          price: String(listing.price ?? ""),
          city: listing.city || "",
          state: listing.state || "",
          description: listing.description || "",
          document: listing.document || "",
          contactName: listing.contact?.name || "",
          contactEmail: listing.contact?.email || "",
          contactPhone: listing.contact?.phone || "",
          status: listing.status || "active",
          featured: Boolean(listing.featured),
          featuredUntil: toLocalDateTime(listing.featuredUntil),
          images: (listing.images || []).join("\n")
        });
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro ao carregar classificado."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, params.id, token]);

  const canRenderForm = useMemo(
    () => !loading && !error && user?.role === "admin",
    [error, loading, user?.role]
  );

  function updateField(
    field: keyof FormState
  ) {
    return (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const value =
        event.target instanceof HTMLInputElement &&
        event.target.type === "checkbox"
          ? String(event.target.checked)
          : event.target.value;

      setFormState((prev) => ({
        ...prev,
        [field]:
          field === "featured"
            ? value === "true"
            : value
      }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Token de autenticacao nao encontrado.");
      return;
    }

    const modelYear = Number(formState.modelYear);
    const manufactureYear = Number(formState.manufactureYear);
    const mileage = Number(formState.mileage);
    const price = Number(formState.price);

    if (
      !Number.isFinite(modelYear) ||
      !Number.isFinite(manufactureYear) ||
      !Number.isFinite(mileage) ||
      !Number.isFinite(price)
    ) {
      setError("Preencha os campos numericos com valores validos.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        title: formState.title.trim(),
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
          ? (formState.featuredUntil
              ? new Date(formState.featuredUntil).toISOString()
              : null)
          : null,
        images: parseImages(formState.images)
      };

      const response = await fetch(`/api/listings/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar classificado.");
      }
      setMessage("Classificado atualizado com sucesso.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Erro ao salvar classificado."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageIntro
        title="Editar classificado"
        subtitle="Edite os dados do post diretamente nesta tela."
      >
        <Link
          href="/classificados"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar para classificados
        </Link>
      </PageIntro>

      <Container className="py-10">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Carregando classificado...
          </div>
        ) : null}

        {user && user.role !== "admin" ? (
          <Notice title="Acesso restrito" variant="warning">
            Apenas administradores podem usar esta tela.
          </Notice>
        ) : null}

        {error ? (
          <Notice title="Erro" variant="warning" className="mb-4">
            {error}
          </Notice>
        ) : null}

        {message ? (
          <Notice title="Sucesso" variant="success" className="mb-4">
            {message}
          </Notice>
        ) : null}

        {canRenderForm ? (
          <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-600">Titulo</span>
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.title}
                  onChange={updateField("title")}
                />
              </label>

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
                <span className="text-xs font-semibold text-slate-600">Ano fabricacao</span>
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
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Preco</span>
                <input
                  type="number"
                  step="0.01"
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.price}
                  onChange={updateField("price")}
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
                  maxLength={2}
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.state}
                  onChange={updateField("state")}
                  required
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-600">Descricao</span>
                <textarea
                  className="min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formState.description}
                  onChange={updateField("description")}
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Documento</span>
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.document}
                  onChange={updateField("document")}
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
                Destacar classificado
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Destaque ate</span>
                <input
                  type="datetime-local"
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.featuredUntil}
                  onChange={updateField("featuredUntil")}
                  disabled={!formState.featured}
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-600">Imagens (1 por linha)</span>
                <textarea
                  className="min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formState.images}
                  onChange={updateField("images")}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        ) : null}
      </Container>
    </>
  );
}
