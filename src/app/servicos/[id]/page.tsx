import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";
import ServiceCrudActions from "@/components/ServiceCrudActions";
import SidebarBannerStack from "@/components/SidebarBannerStack";
import { db } from "@/lib/database";
import { getUserDisplayName, isCompanyAccount, normalizeUserRecord } from "@/lib/userProfiles";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const user = await db.users.findById(params.id);
  if (!user) return notFound();

  const normalized = normalizeUserRecord(user);
  if (
    normalized.marketplaceProfile !== "services" ||
    !isCompanyAccount(normalized) ||
    normalized.approvalStatus === "pending"
  ) {
    return notFound();
  }

  const related = (await db.users.getAll())
    .map((item) => normalizeUserRecord(item))
    .filter(
      (item) =>
        item.id !== normalized.id &&
        item.marketplaceProfile === "services" &&
        item.approvalStatus !== "pending" &&
        item.activityType === normalized.activityType
    )
    .slice(0, 3);

  const displayName = getUserDisplayName(normalized);

  return (
    <>
      <PageIntro
        title={displayName}
        subtitle={normalized.activityType || "Prestador de serviços especializado"}
      >
        <Link
          href="/servicos"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar aos serviços
        </Link>
      </PageIntro>

      <Container className="py-10">
        <ServiceCrudActions
          serviceId={normalized.id}
          editHref={`/servicos/gerenciar/${normalized.id}`}
        />

        <div className="page-with-sidebar">
          <div className="grid gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {normalized.activityType || "Prestador de serviços"}
                  </div>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900">{displayName}</h2>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {normalized.shortDescription || "Empresa cadastrada na vitrine pública de serviços."}
                  </p>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                  {normalized.address ? <div>Endereço: {normalized.address}</div> : null}
                  <div>
                    Localização: {[normalized.city, normalized.state].filter(Boolean).join(" / ") || "Não informada"}
                  </div>
                  {normalized.phone ? <div>Telefone: {normalized.phone}</div> : null}
                  {normalized.websiteUrl ? (
                    <a
                      href={normalized.websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Acessar site
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            {related.length > 0 ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Serviços relacionados</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      href={`/servicos/${item.id}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-brand-200 hover:bg-brand-50"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {item.activityType || "Prestador"}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {getUserDisplayName(item)}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {[item.city, item.state].filter(Boolean).join(" / ")}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
