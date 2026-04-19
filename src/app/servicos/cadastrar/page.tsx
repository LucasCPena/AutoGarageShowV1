import type { Metadata } from "next";

import Container from "@/components/Container";
import MarketplaceImportantNotice from "@/components/MarketplaceImportantNotice";
import PageIntro from "@/components/PageIntro";
import ServicesRegistrationForm from "@/components/ServicesRegistrationForm";
import SidebarBannerStack from "@/components/SidebarBannerStack";

export const metadata: Metadata = {
  title: "Cadastrar serviço",
  description: "Cadastro de prestadores de serviços especializados em carros antigos."
};

export default function ServiceRegisterPage() {
  return (
    <>
      <PageIntro
        title="Cadastrar serviço"
        subtitle="Crie o perfil da sua empresa para aparecer na vitrine pública de serviços."
      />

      <Container className="py-10">
        <div className="grid gap-10">
          <div className="page-with-sidebar">
            <div className="grid gap-8">
              <ServicesRegistrationForm />
            </div>
            <SidebarBannerStack />
          </div>

          <MarketplaceImportantNotice className="mb-0 max-w-none" />
        </div>
      </Container>
    </>
  );
}
