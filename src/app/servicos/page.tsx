import type { Metadata } from "next";

import Container from "@/components/Container";
import MarketplaceSectionNav from "@/components/MarketplaceSectionNav";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import ServicesDirectoryClient, {
  type ServiceDirectoryEntry
} from "@/components/ServicesDirectoryClient";
import SidebarBannerStack from "@/components/SidebarBannerStack";
import { db } from "@/lib/database";
import { getUserDisplayName, isCompanyAccount, normalizeUserRecord } from "@/lib/userProfiles";

export const metadata: Metadata = {
  title: "Servicos",
  description: "Guia publico de prestadores de servicos automotivos cadastrados na plataforma."
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  let services: ServiceDirectoryEntry[] = [];
  let loadError = false;

  try {
    const users = await db.users.getAll();

    services = users
      .map((user) => normalizeUserRecord(user))
      .filter(
        (user) =>
          user.marketplaceProfile === "services" &&
          isCompanyAccount(user) &&
          user.approvalStatus !== "pending"
      )
      .map((user) => ({
        id: user.id,
        displayName: getUserDisplayName(user),
        activityType: user.activityType,
        shortDescription: user.shortDescription,
        websiteUrl: user.websiteUrl,
        address: user.address,
        city: user.city,
        state: user.state,
        phone: user.phone,
        logoUrl: user.logoUrl
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
  } catch (error) {
    loadError = true;
    console.error("Erro ao carregar servicos:", error);
  }

  return (
    <>
      <PageIntro
        title="Servicos"
        subtitle="Busque prestadores por atividade, estado e municipio em uma vitrine dedicada."
      />

      <Container className="py-10">
        <div className="page-with-sidebar">
          <div>
            <MarketplaceSectionNav current="servicos" />

            {loadError ? (
              <Notice title="Erro" variant="warning">
                Nao foi possivel carregar os servicos agora.
              </Notice>
            ) : (
              <ServicesDirectoryClient services={services} />
            )}
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
