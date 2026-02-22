"use client";

import { useState } from "react";

import Link from "next/link";

import Notice from "@/components/Notice";
import type { Event } from "@/lib/database";
import { formatDateLong, formatTime } from "@/lib/date";
import { eventImageAlt } from "@/lib/image-alt";
import { normalizeAssetReference } from "@/lib/site-url";

type Props = {
  events: Event[];
  token: string | null;
};

type Message = { type: "success" | "error"; text: string } | null;

function formatDateTime(iso: string) {
  const date = formatDateLong(iso);
  const time = formatTime(iso);
  return `${date} • ${time}`;
}

function eventThumbnail(event: Event) {
  return (
    normalizeAssetReference(event.coverImage || event.images?.[0]) ||
    "/placeholders/event.svg"
  );
}

export default function AdminEventsPanel({ events, token }: Props) {
  const [message, setMessage] = useState<Message>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = events.filter((event) => event.status === "pending");
  const managed = events.filter(
    (event) => event.status === "approved" || event.status === "completed"
  );

  async function handleAction(eventId: string, action: "approve" | "delete") {
    try {
      if (!token) {
        setMessage({ type: "error", text: "Token de autenticacao nao encontrado." });
        return;
      }
      setBusyId(`${eventId}-${action}`);

      const response = await fetch(`/api/admin/events/${eventId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar evento.");
      }

      setMessage({
        type: "success",
        text: data.message || "Evento atualizado."
      });

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao processar evento."
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(eventId: string) {
    try {
      if (!token) {
        setMessage({ type: "error", text: "Token de autenticacao nao encontrado." });
        return;
      }
      setBusyId(`${eventId}-duplicate`);

      const response = await fetch(`/api/events/${eventId}/duplicate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao duplicar evento.");
      }

      setMessage({
        type: "success",
        text: data.message || "Evento duplicado com sucesso."
      });

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao duplicar evento."
      });
    } finally {
      setBusyId(null);
    }
  }

  function renderEventCard(event: Event, isPending: boolean) {
    return (
      <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <img
              src={eventThumbnail(event)}
              alt={eventImageAlt(event.title)}
              className="mb-2 h-16 w-24 rounded-md border border-slate-200 object-cover"
            />
            <div className="text-sm text-slate-500">{formatDateTime(event.startAt)}</div>
            <div className="text-base font-semibold text-slate-900">{event.title}</div>
            <div className="text-sm text-slate-600">
              {event.city}/{event.state} • {event.location}
            </div>
            <div className="text-xs text-slate-500">Organizador: {event.contactName}</div>
            {!isPending && event.status === "completed" ? (
              <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Realizado
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              href={`/eventos/gerenciar/${event.id}`}
            >
              Editar
            </Link>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-70"
              disabled={busyId !== null}
              onClick={() => handleDuplicate(event.id)}
            >
              {busyId === `${event.id}-duplicate` ? "Duplicando..." : "Duplicar"}
            </button>

            {isPending ? (
              <button
                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                disabled={busyId !== null}
                onClick={() => handleAction(event.id, "approve")}
              >
                {busyId === `${event.id}-approve` ? "Aprovando..." : "Aprovar"}
              </button>
            ) : null}

            <button
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-70"
              disabled={busyId !== null}
              onClick={() => handleAction(event.id, "delete")}
            >
              {busyId === `${event.id}-delete` ? "Removendo..." : "Excluir"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-900">Eventos</div>
        <div className="mt-1 text-sm text-slate-600">
          Aprovacao e remocao de eventos.
        </div>
      </div>

      {message ? (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "pending"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Pendentes ({pending.length})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "approved"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Gerenciar ({managed.length})
          </button>
        </nav>
      </div>

      {activeTab === "pending" ? (
        <div className="grid gap-4">
          {pending.length === 0 ? (
            <Notice title="Nenhum evento pendente" variant="info">
              Quando um usuario cadastrar um evento, ele aparecera aqui para revisao.
            </Notice>
          ) : (
            pending.map((event) => renderEventCard(event, true))
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {managed.length === 0 ? (
            <Notice title="Sem eventos para gerenciar" variant="info">
              Nenhum evento aprovado/realizado no momento.
            </Notice>
          ) : (
            managed.map((event) => renderEventCard(event, false))
          )}
        </div>
      )}
    </div>
  );
}
