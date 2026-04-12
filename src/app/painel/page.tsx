"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatCurrencyBRL } from "@/lib/format";
import { useAuth } from "@/lib/useAuth";
import { useSiteSettings } from "@/lib/useSiteSettings";

type ListingItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  status: "pending" | "approved" | "active" | "inactive" | "sold" | "rejected";
  vehicleType?: "car" | "motorcycle";
  featured?: boolean;
  createdAt: string;
};

type MessageItem = {
  id: string;
  listingId?: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject?: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

type MetricsResponse = {
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

function statusLabel(status: ListingItem["status"]) {
  switch (status) {
    case "active":
      return "Ativo";
    case "approved":
      return "Aprovado";
    case "inactive":
      return "Inativo";
    case "sold":
      return "Vendido";
    case "rejected":
      return "Rejeitado";
    default:
      return "Pendente";
  }
}

function vehicleTypeLabel(vehicleType?: ListingItem["vehicleType"]) {
  return vehicleType === "motorcycle" ? "Moto" : "Carro";
}

export default function DashboardPage() {
  const { user, token, isLoading } = useAuth();
  const { settings } = useSiteSettings();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse["metrics"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageBusyId, setMessageBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!token || !user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/listings?scope=mine", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      }),
      fetch("/api/messages", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      }),
      fetch("/api/metrics", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      })
    ])
      .then(async ([listingsResponse, messagesResponse, metricsResponse]) => {
        const [listingsData, messagesData, metricsData] = await Promise.all([
          listingsResponse.json(),
          messagesResponse.json(),
          metricsResponse.json()
        ]);

        if (!listingsResponse.ok) {
          throw new Error(listingsData?.error || "Não foi possível carregar os veículos.");
        }
        if (!messagesResponse.ok) {
          throw new Error(messagesData?.error || "Não foi possível carregar as mensagens.");
        }
        if (!metricsResponse.ok) {
          throw new Error(metricsData?.error || "Não foi possível carregar as métricas.");
        }

        if (cancelled) return;
        setListings(Array.isArray(listingsData?.listings) ? listingsData.listings : []);
        setMessages(Array.isArray(messagesData?.messages) ? messagesData.messages : []);
        setMetrics(metricsData?.metrics || null);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Não foi possível carregar o painel."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, token, user]);

  const unreadMessages = useMemo(
    () => messages.filter((item) => item.status === "new").length,
    [messages]
  );

  const currentLimit = useMemo(() => {
    if (!user) return null;
    if (typeof user.listingLimitOverride === "number") {
      return user.listingLimitOverride;
    }
    const documentType = user.documentType === "cnpj" ? "cnpj" : "cpf";
    return settings.listingLimits[documentType];
  }, [settings.listingLimits, user]);

  async function updateMessageStatus(messageId: string, status: MessageItem["status"]) {
    if (!token) return;
    setMessageBusyId(messageId);
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível atualizar a mensagem.");
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, status: data.message.status } : item
        )
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar a mensagem."
      );
    } finally {
      setMessageBusyId(null);
    }
  }

  if (isLoading || loading) {
    return (
      <Container className="py-10">
        <div>Carregando painel...</div>
      </Container>
    );
  }

  if (!user) {
    return (
      <>
        <PageIntro
          title="Painel"
          subtitle="Entre com sua conta para acompanhar anúncios, mensagens e desempenho."
        />
        <Container className="py-10">
          <Notice title="Login obrigatório" variant="info">
            Faça login para acessar seu painel de cliente ou agência.
          </Notice>
        </Container>
      </>
    );
  }

  return (
    <>
      <PageIntro
        title="Painel"
        subtitle={
          user.accountType === "agency"
            ? "Ambiente profissional da agência com mensagens, métricas e controle de anúncios."
            : user.accountType === "company"
              ? "Acompanhe seus veículos, mensagens e desempenho comercial."
              : "Acompanhe seus anúncios, mensagens e desempenho."
        }
      >
        <Link
          href="/veiculos/anunciar"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Novo veículo
        </Link>
      </PageIntro>

      <Container className="py-10">
        {error ? (
          <Notice title="Atenção" variant="warning">
            {error}
          </Notice>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {user.logoUrl ? (
                <img
                  src={user.logoUrl}
                  alt={user.companyName || user.name}
                  className="h-20 w-20 rounded-2xl border border-white/10 bg-white object-contain p-2"
                />
              ) : null}
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
                  {user.accountType === "agency"
                    ? "Painel de agência"
                    : user.accountType === "company"
                      ? "Painel corporativo"
                      : "Painel do anunciante"}
                </div>
                <h2 className="mt-2 text-2xl font-bold">
                  {user.companyName || user.name}
                </h2>
                <p className="mt-2 text-sm text-slate-200">
                  Status da conta:{" "}
                  {user.approvalStatus === "pending" ? "aguardando liberação" : "ativa"}.
                  {" "}Verificação:{" "}
                  {user.verificationStatus === "verified" ? "reaproveitada/validada" : "pendente"}.
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <div>
                Limite de anúncios:{" "}
                <strong>{typeof currentLimit === "number" ? currentLimit : "sem limite"}</strong>
              </div>
              <div>
                Em uso: <strong>{listings.length}</strong>
              </div>
              <div>
                Mensagens novas: <strong>{unreadMessages}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Veículos
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{listings.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Visualizacoes
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {metrics?.totals?.listingViews ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cliques
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {metrics?.totals?.clicks ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mensagens recebidas
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {metrics?.totals?.messages ?? messages.length}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Meus veículos</h3>
              <p className="mt-1 text-sm text-slate-600">
                Seus anúncios publicados, pendentes ou em revisão.
              </p>
            </div>
            {user.accountType === "company" || user.accountType === "agency" ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={
                    user.marketplaceProfile === "services"
                      ? `/servicos/${user.id}`
                      : `/empresas/${user.id}`
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver perfil público
                </Link>
                {user.marketplaceProfile === "services" ? (
                  <Link
                    href={`/servicos/gerenciar/${user.id}`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Gerenciar serviço
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {vehicleTypeLabel(listing.vehicleType)}
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-slate-900">
                      {listing.title}
                    </h4>
                    <div className="mt-2 text-lg font-bold text-slate-900">
                      {formatCurrencyBRL(listing.price)}
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {statusLabel(listing.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/veiculos/${listing.slug}`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    Ver anúncio
                  </Link>
                  <Link
                    href={`/veiculos/gerenciar/${listing.id}`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    Editar
                  </Link>
                </div>
              </article>
            ))}

            {listings.length === 0 ? (
              <Notice title="Sem veículos" variant="info">
                Você ainda não possui anúncios cadastrados.
              </Notice>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">Mensagens dos interessados</h3>
            <p className="mt-1 text-sm text-slate-600">
              Historico completo das mensagens registradas no sistema.
            </p>

            <div className="mt-5 grid gap-4">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {message.subject || "Mensagem sem assunto"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {message.senderName} • {message.senderEmail}
                        {message.senderPhone ? ` • ${message.senderPhone}` : ""}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {message.status === "new"
                        ? "Nova"
                        : message.status === "read"
                          ? "Lida"
                          : "Arquivada"}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                    {message.message}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {message.status !== "read" ? (
                      <button
                        type="button"
                        disabled={messageBusyId === message.id}
                        onClick={() => updateMessageStatus(message.id, "read")}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
                      >
                        Marcar como lida
                      </button>
                    ) : null}
                    {message.status !== "archived" ? (
                      <button
                        type="button"
                        disabled={messageBusyId === message.id}
                        onClick={() => updateMessageStatus(message.id, "archived")}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
                      >
                        Arquivar
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}

              {messages.length === 0 ? (
                <Notice title="Sem mensagens" variant="info">
                  As mensagens enviadas pelo site aparecerao aqui.
                </Notice>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">Métricas detalhadas</h3>
            <p className="mt-1 text-sm text-slate-600">
              Visitas, cliques e desempenho consolidado da sua conta.
            </p>

            <div className="mt-5 grid gap-3">
              {(metrics?.byEntity || []).slice(0, 8).map((item, index) => (
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

              {!(metrics?.byEntity || []).length ? (
                <Notice title="Sem dados ainda" variant="info">
                  As métricas começarão a aparecer conforme o público navegar, clicar e enviar contatos.
                </Notice>
              ) : null}
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
