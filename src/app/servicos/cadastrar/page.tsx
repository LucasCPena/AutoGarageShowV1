import type { Metadata } from "next";

import Container from "@/components/Container";
import MarketplaceImportantNotice from "@/components/MarketplaceImportantNotice";
import PageIntro from "@/components/PageIntro";
import ServicesRegistrationForm from "@/components/ServicesRegistrationForm";
import SidebarBannerStack from "@/components/SidebarBannerStack";

export const metadata: Metadata = {
  title: "Cadastrar servico",
  description: "Cadastro de prestadores de servicos especializados em carros antigos."
};

export default function ServiceRegisterPage() {
  return (
    <>
      <PageIntro
        title="Cadastrar servico"
        subtitle="Crie o perfil da sua empresa para aparecer na vitrine publica de servicos."
      />

      <Container className="py-10">
        <div className="page-with-sidebar">
          <div className="grid gap-8">
            <ServicesRegistrationForm />
            <MarketplaceImportantNotice />
          </div>
          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
