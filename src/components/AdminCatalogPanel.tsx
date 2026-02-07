"use client";

import { useEffect, useMemo, useState } from "react";

import type { VehicleBrand } from "@/lib/database";

type Message = { type: "success" | "error"; text: string } | null;

type Props = {
  token: string | null;
};

function parseModels(text: string) {
  return Array.from(
    new Set(
      text
        .split(/[\n,]+/)
        .map((m) => m.trim())
        .filter(Boolean)
    )
  );
}

export default function AdminCatalogPanel({ token }: Props) {
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);

  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandModels, setNewBrandModels] = useState("");

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [newModel, setNewModel] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) ?? brands[0],
    [brands, selectedBrandId]
  );

  function authHeaders() {
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }

  async function fetchBrands() {
    try {
      const res = await fetch("/api/catalog/brands");
      const data = await res.json();
      setBrands(data.brands || []);
      if (!selectedBrandId && data.brands?.length) {
        setSelectedBrandId(data.brands[0].id);
      }
    } catch (error) {
      console.error("Erro ao buscar marcas", error);
      setMessage({ type: "error", text: "Não foi possível carregar marcas." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddBrand(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newBrandName.trim()) {
      setMessage({ type: "error", text: "Informe o nome da marca." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/catalog/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({
          name: newBrandName.trim(),
          models: parseModels(newBrandModels)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar marca.");
      }
      setBrands(data.brands || []);
      setSelectedBrandId(data.brand?.id || data.brands?.[0]?.id || "");
      setNewBrandName("");
      setNewBrandModels("");
      setMessage({ type: "success", text: "Marca adicionada." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao criar marca."
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddModel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedBrand?.id) {
      setMessage({ type: "error", text: "Escolha uma marca." });
      return;
    }
    if (!newModel.trim()) {
      setMessage({ type: "error", text: "Informe o modelo." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/catalog/brands/${selectedBrand.id}/models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({ model: newModel.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao adicionar modelo.");
      }
      setBrands((current) =>
        current.map((b) =>
          b.id === selectedBrand.id ? { ...b, models: data.models } : b
        )
      );
      setMessage({ type: "success", text: "Modelo adicionado." });
      setNewModel("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao adicionar modelo."
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveModel(model: string) {
    if (!selectedBrand?.id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/catalog/brands/${selectedBrand.id}/models`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({ model })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao remover modelo.");
      }
      setBrands((current) =>
        current.map((b) =>
          b.id === selectedBrand.id ? { ...b, models: data.models } : b
        )
      );
      setMessage({ type: "success", text: "Modelo removido." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao remover modelo."
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBrand() {
    if (!selectedBrand?.id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/catalog/brands/${selectedBrand.id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders()
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir marca.");
      }
      setBrands(data.brands || []);
      setSelectedBrandId(data.brands?.[0]?.id || "");
      setMessage({ type: "success", text: "Marca excluída." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao excluir marca."
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Marcas e Modelos</div>
          <div className="mt-1 text-sm text-slate-600">
            Admin pode criar marcas e editar modelos usados nos classificados.
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Catálogo com {brands.length} marca(s)
        </div>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-md border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 text-sm text-slate-600">Carregando catálogo...</div>
      ) : (
        <>
          <form onSubmit={handleAddBrand} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Nova marca</span>
              <input
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                placeholder="Ex.: Volkswagen"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Modelos (opcional)</span>
              <input
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                placeholder="Separe por vírgula ou quebra de linha"
                value={newBrandModels}
                onChange={(e) => setNewBrandModels(e.target.value)}
              />
            </label>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Salvando..." : "Adicionar marca"}
              </button>
            </div>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Selecionar marca</div>
              <select
                className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={selectedBrand?.id || ""}
                onChange={(e) => setSelectedBrandId(e.target.value)}
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>

              {selectedBrand ? (
                <div className="mt-3 text-xs text-slate-600">
                  {selectedBrand.models.length} modelo(s)
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleDeleteBrand}
                disabled={busy || !selectedBrand}
                className="mt-3 inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                Excluir marca
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Adicionar modelo</div>
              <form onSubmit={handleAddModel} className="mt-3 grid gap-3">
                <input
                  className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                  placeholder="Ex.: Variant"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={busy || !selectedBrand}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy ? "Salvando..." : "Adicionar modelo"}
                </button>
              </form>

              {selectedBrand ? (
                <div className="mt-4 grid max-h-52 grid-cols-2 gap-2 overflow-y-auto text-xs">
                  {selectedBrand.models.map((model) => (
                    <div
                      key={model}
                      className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1"
                    >
                      <span className="truncate">{model}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveModel(model)}
                        className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                        disabled={busy}
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
