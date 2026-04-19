import Container from "@/components/Container";
import MarketplaceImportantNotice from "@/components/MarketplaceImportantNotice";
import MercadoPulgasRegistrationForm from "@/components/MercadoPulgasRegistrationForm";
import PageIntro from "@/components/PageIntro";
import SidebarBannerStack from "@/components/SidebarBannerStack";

export const dynamic = "force-dynamic";

export default function MercadoPulgasPage() {
  return (
    <>
      <PageIntro
        title="Mercado de Pulgas"
        subtitle="Cadastro empresarial para pecas, ferramentas, materiais, funilaria e outros fornecedores do setor."
      />

      <Container className="py-10">
        <div className="grid gap-10">
          <div className="page-with-sidebar">
            <div className="grid gap-8">
              <MercadoPulgasRegistrationForm />
            </div>
            <SidebarBannerStack section="mercado-de-pulgas" title="Destaques do Mercado" />
          </div>

          <MarketplaceImportantNotice className="mb-0 max-w-none" />
        </div>
      </Container>
    </>
  );
}
