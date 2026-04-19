"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialQuery?: string;
  initialType?: string;
  compact?: boolean;
};

export default function SiteSearchForm({
  initialQuery = "",
  initialType = "all",
  compact = false
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type !== "all") params.set("type", type);
    router.push(`/busca?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "flex min-w-0 w-full gap-2"
          : "grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
      }
    >
      <input
        className={`h-11 rounded-md border border-slate-300 px-3 text-sm ${compact ? "min-w-0 flex-1" : ""}`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar eventos, veículos, notícias e empresas"
      />
      {compact ? (
        <input type="hidden" value={type} readOnly />
      ) : (
        <select
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="all">Tudo</option>
          <option value="listing">Veículos</option>
          <option value="event">Eventos</option>
          <option value="news">Notícias</option>
          <option value="company">Empresas</option>
        </select>
      )}
      <button
        type="submit"
        className={`inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 ${compact ? "shrink-0" : ""}`}
      >
        Buscar
      </button>
    </form>
  );
}
