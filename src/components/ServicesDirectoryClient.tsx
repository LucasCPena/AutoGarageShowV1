"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { getServiceActivityOptions } from "@/lib/serviceActivities";
import { useAuth } from "@/lib/useAuth";

export type ServiceDirectoryEntry = {
  id: string;
  displayName: string;
  activityType?: string;
  shortDescription?: string;
  websiteUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  logoUrl?: string;
};

type Props = {
  services: ServiceDirectoryEntry[];
};

export default function ServicesDirectoryClient({ services }: Props) {
  const { user, isLoading } = useAuth();
  const [activityFilter, setActivityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const activityOptions = useMemo(
    () => getServiceActivityOptions(services.map((service) => service.activityType)),
    [services]
  );
  const stateOptions = useMemo(
    () =>
      Array.from(new Set(services.map((service) => service.state).filter(Boolean) as string[])).sort(),
    [services]
  );
  const cityOptions = useMemo(() => {
    const scoped = services.filter(
      (service) => stateFilter === "all" || service.state === stateFilter
    );
    return Array.from(new Set(scoped.map((service) => service.city).filter(Boolean) as string[])).sort();
  }, [services, stateFilter]);

  const filtered = useMemo(
    () =>
      services.filter((service) => {
        if (activityFilter !== "all" && service.activityType !== activityFilter) return false;
        if (stateFilter !== "all" && service.state !== stateFilter) return false;
        if (cityFilter !== "all" && service.city !== cityFilter) return false;
        return true;
      }),
    [activityFilter, cityFilter, services, stateFilter]
  );

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Serviços para o antigomobilismo</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Encontre funilaria, restauração, tapeçaria, elétrica, peças e outros especialistas cadastrados na plataforma.
            </p>
          </div>

          <Link
            href="/servicos/cadastrar"
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Cadastrar serviço
          </Link>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value)}
          >
            <option value="all">Tipo de serviço: todos</option>
            {activityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value);
              setCityFilter("all");
            }}
          >
            <option value="all">Estado: todos</option>
            {stateOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
          >
            <option value="all">Município: todos</option>
            {cityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      {filtered.length === 0 ? (
        <Notice title="Nenhum serviço encontrado" variant="info">
          Nenhum prestador corresponde aos filtros selecionados.
        </Notice>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((service) => (
            <article
              key={service.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {service.activityType || "Prestador de serviços"}
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">{service.displayName}</h3>
                  <div className="mt-2 text-sm text-slate-600">
                    {[service.city, service.state].filter(Boolean).join(" / ") || "Localização não informada"}
                  </div>
                </div>

                {service.logoUrl ? (
                  <img
                    src={service.logoUrl}
                    alt={service.displayName}
                    className="h-16 w-16 rounded-2xl border border-slate-200 bg-white object-contain p-2"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                    {service.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {service.shortDescription ? (
                <p className="mt-4 text-sm leading-6 text-slate-600">{service.shortDescription}</p>
              ) : null}

              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {service.address ? <div>Endereço: {service.address}</div> : null}
                {service.phone ? <div>Telefone: {service.phone}</div> : null}
                {service.websiteUrl ? <div className="break-all">Site: {service.websiteUrl}</div> : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/servicos/${service.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver detalhes
                </Link>

                {!isLoading && user && (user.role === "admin" || user.id === service.id) ? (
                  <Link
                    href={`/servicos/gerenciar/${service.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Gerenciar
                  </Link>
                ) : null}

                {service.phone ? (
                  <a
                    href={`tel:${service.phone}`}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Ligar
                  </a>
                ) : null}

                {service.websiteUrl ? (
                  <a
                    href={service.websiteUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-100"
                  >
                    Acessar site
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
