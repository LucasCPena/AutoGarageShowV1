"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import SidebarBannerStack from "@/components/SidebarBannerStack";
import { onlyDigits, validateCNPJ } from "@/lib/document";
import { DEFAULT_SERVICE_ACTIVITIES } from "@/lib/serviceActivities";
import { useAuth } from "@/lib/useAuth";

type Props = {
  params: { id: string };
};

type ServiceFormState = {
  companyName: string;
  document: string;
  phone: string;
  activityType: string;
  customActivityType: string;
  address: string;
  city: string;
  state: string;
  websiteUrl: string;
  shortDescription: string;
};

type ServiceResponse = {
  id: string;
  companyName?: string;
  document?: string;
  phone?: string;
  activityType?: string;
  address?: string;
  city?: string;
  state?: string;
  websiteUrl?: string;
  shortDescription?: string;
};

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function createInitialState(): ServiceFormState {
  return {
    companyName: "",
    document: "",
    phone: "",
    activityType: DEFAULT_SERVICE_ACTIVITIES[0] || "",
    customActivityType: "",
    address: "",
    city: "",
    state: "",
    websiteUrl: "",
    shortDescription: ""
  };
}

export default function ServiceManagePage({ params }: Props) {
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ServiceFormState>(() => createInitialState());

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError("Faça login para gerenciar este serviço.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`/api/services/${params.id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Não foi possível carregar o serviço.");
        }
        if (cancelled) return;

        const service = data.service as ServiceResponse;
        const activityType = service.activityType || DEFAULT_SERVICE_ACTIVITIES[0] || "";
        const hasPreset = DEFAULT_SERVICE_ACTIVITIES.includes(activityType);

        setFormState({
          companyName: service.companyName || "",
          document: formatCnpj(service.document || ""),
          phone: formatPhone(service.phone || ""),
          activityType: hasPreset ? activityType : "__other__",
          customActivityType: hasPreset ? "" : activityType,
          address: service.address || "",
          city: service.city || "",
          state: service.state || "",
          websiteUrl: service.websiteUrl || "",
          shortDescription: service.shortDescription || ""
        });
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Não foi possível carregar o serviço."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, params.id, token]);

  const canManage = Boolean(user && (user.role === "admin" || user.id === params.id));
  const resolvedActivityType =
    formState.activityType === "__other__"
      ? formState.customActivityType.trim()
      : formState.activityType.trim();

  function updateField<K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Faça login para gerenciar este serviço.");
      return;
    }

    if (!validateCNPJ(formState.document)) {
      setError("Informe um CNPJ válido.");
      return;
    }

    if (!resolvedActivityType) {
      setError("Selecione ou informe o tipo de atividade.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/services/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: formState.companyName,
          document: onlyDigits(formState.document),
          phone: onlyDigits(formState.phone),
          activityType: resolvedActivityType,
          address: formState.address,
          city: formState.city,
          state: formState.state,
          websiteUrl: formState.websiteUrl,
          shortDescription: formState.shortDescription
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível atualizar o serviço.");
      }

      setMessage("Serviço atualizado com sucesso. Redirecionando...");
      window.setTimeout(() => {
        router.push(`/servicos/${params.id}`);
        router.refresh();
      }, 900);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível atualizar o serviço."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageIntro
        title="Gerenciar serviço"
        subtitle="Atualize os dados públicos da empresa sem precisar criar um novo cadastro."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/servicos/${params.id}`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver página pública
          </Link>
          <Link
            href="/servicos"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voltar aos serviços
          </Link>
        </div>
      </PageIntro>

      <Container className="py-10">
        <div className="page-with-sidebar">
          <div className="grid gap-6">
            {loading ? (
              <Notice title="Carregando" variant="info">
                Carregando dados do serviço...
              </Notice>
            ) : !canManage ? (
              <Notice title="Acesso restrito" variant="warning">
                Você não tem permissão para gerenciar este serviço.
              </Notice>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"
              >
                {error ? (
                  <Notice title="Validação" variant="warning">
                    {error}
                  </Notice>
                ) : null}

                {message ? (
                  <Notice title="Sucesso" variant="success">
                    {message}
                  </Notice>
                ) : null}

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">Nome da empresa</span>
                  <input
                    required
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.companyName}
                    onChange={(event) => updateField("companyName", event.target.value)}
                    placeholder="Nome fantasia ou razão social"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">CNPJ</span>
                  <input
                    required
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    inputMode="numeric"
                    value={formState.document}
                    onChange={(event) => updateField("document", formatCnpj(event.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">Telefone</span>
                  <input
                    required
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.phone}
                    onChange={(event) => updateField("phone", formatPhone(event.target.value))}
                    placeholder="(11) 99999-9999"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-900">Tipo de atividade</span>
                  <select
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.activityType}
                    onChange={(event) => updateField("activityType", event.target.value)}
                  >
                    {DEFAULT_SERVICE_ACTIVITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                    <option value="__other__">Outro</option>
                  </select>
                </label>

                {formState.activityType === "__other__" ? (
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-900">
                      Atividade personalizada
                    </span>
                    <input
                      required
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={formState.customActivityType}
                      onChange={(event) =>
                        updateField("customActivityType", event.target.value)
                      }
                      placeholder="Ex.: vidraçaria, pintura, mecânica especializada"
                    />
                  </label>
                ) : null}

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-900">Endereço</span>
                  <input
                    required
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    placeholder="Rua, número e complemento"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">Município</span>
                  <input
                    required
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="Município"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">Estado</span>
                  <input
                    required
                    maxLength={2}
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.state}
                    onChange={(event) => updateField("state", event.target.value.toUpperCase())}
                    placeholder="SP"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-900">Descrição curta</span>
                  <textarea
                    required
                    className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formState.shortDescription}
                    onChange={(event) => updateField("shortDescription", event.target.value)}
                    placeholder="Explique em poucas linhas o que a empresa faz."
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">Site</span>
                  <input
                    type="url"
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                    value={formState.websiteUrl}
                    onChange={(event) => updateField("websiteUrl", event.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </form>
            )}
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
