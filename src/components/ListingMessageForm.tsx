"use client";

import { useState } from "react";

import Notice from "@/components/Notice";

type Props = {
  listingId: string;
};

export default function ListingMessageForm({ listingId }: Props) {
  const [subject, setSubject] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          listingId,
          subject,
          senderPhone,
          message
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível enviar a mensagem.");
      }

      setSubject("");
      setSenderPhone("");
      setMessage("");
      setFeedback({
        type: "success",
        text: data?.notice || "Mensagem enviada com sucesso."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao enviar mensagem."
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-3 border-t border-slate-200 pt-5">
      <div className="text-sm font-semibold text-slate-900">Enviar mensagem ao anunciante</div>

      {feedback ? (
        <Notice title={feedback.type === "success" ? "Enviado" : "Erro"} variant={feedback.type === "success" ? "success" : "warning"}>
          {feedback.text}
        </Notice>
      ) : null}

      <input
        className="h-10 rounded-md border border-slate-300 px-3 text-sm"
        placeholder="Assunto (opcional)"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <input
        className="h-10 rounded-md border border-slate-300 px-3 text-sm"
        placeholder="Seu telefone (opcional)"
        value={senderPhone}
        onChange={(event) => setSenderPhone(event.target.value)}
      />
      <textarea
        className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Escreva sua mensagem"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
      />
      <button
        type="submit"
        disabled={sending}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {sending ? "Enviando..." : "Enviar mensagem"}
      </button>
    </form>
  );
}

