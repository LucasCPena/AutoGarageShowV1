"use client";

import { useState } from "react";

import Notice from "@/components/Notice";
import type { Event } from "@/lib/database";
import { formatDateLong, formatTime } from "@/lib/date";

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

export default function AdminEventsPanel({ events, token }: Props) {
  const [message, setMessage] = useState<Message>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "completed">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = events.filter((e) => e.status === "pending");
  const approved = events.filter((e) => e.status === "approved");
  const completed = events.filter((e) => e.status === "completed");

  async function handleAction(eventId: string, action: "approve" | "complete" | "delete") {
    try {
      if (!token) {
        setMessage({ type: "error", text: "Token de autenticação não encontrado." });
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

      // Atualizar visão rápida recarregando
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao processar evento."
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
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
            Aprovados ({approved.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "completed"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Realizados ({completed.length})
          </button>
        </nav>
      </div>

      {activeTab === "pending" && (
        <div className="grid gap-4">
          {pending.length === 0 ? (
            <Notice title="Nenhum evento pendente" variant="info">
              Quando um usuário cadastrar um evento, ele aparecerá aqui para revisão.
            </Notice>
          ) : (
            pending.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="text-sm text-slate-500">{formatDateTime(event.startAt)}</div>
                    <div className="text-base font-semibold text-slate-900">{event.title}</div>
                    <div className="text-sm text-slate-600">
                      {event.city}/{event.state} • {event.location}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                      disabled={busyId !== null}
                      onClick={() => handleAction(event.id, "approve")}
                    >
                      {busyId === `${event.id}-approve` ? "Aprovando..." : "Aprovar"}
                    </button>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-70"
                      disabled={busyId !== null}
                      onClick={() => handleAction(event.id, "delete")}
                    >
                      {busyId === `${event.id}-delete` ? "Removendo..." : "Excluir"}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{event.description}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "approved" && (
        <div className="space-y-3">
          {approved.length === 0 ? (
            <Notice title="Sem eventos aprovados" variant="info">
              Aprove eventos pendentes para publicá-los.
            </Notice>
          ) : (
            approved.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="text-sm text-slate-500">{formatDateTime(event.startAt)}</div>
                    <div className="text-base font-semibold text-slate-900">{event.title}</div>
                    <div className="text-sm text-slate-600">
                      {event.city}/{event.state} • {event.location}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
                      disabled={busyId !== null}
                      onClick={() => handleAction(event.id, "complete")}
                    >
                      {busyId === `${event.id}-complete` ? "Atualizando..." : "Marcar como realizado"}
                    </button>
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
            ))
          )}
        </div>
      )}

      {activeTab === "completed" && (
        <div className="space-y-3">
          {completed.length === 0 ? (
            <Notice title="Nenhum evento marcado como realizado" variant="info">
              Quando um evento terminar, marque-o aqui para enviá-lo à galeria de realizados.
            </Notice>
          ) : (
            completed.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="text-sm text-slate-500">{formatDateTime(event.startAt)}</div>
                    <div className="text-base font-semibold text-slate-900">{event.title}</div>
                  </div>
                  <button
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-70"
                    disabled={busyId !== null}
                    onClick={() => handleAction(event.id, "delete")}
                  >
                    {busyId === `${event.id}-delete` ? "Removendo..." : "Excluir"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
