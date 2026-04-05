import Container from "@/components/Container";
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
        <div className="page-with-sidebar">
          <MercadoPulgasRegistrationForm />
          <SidebarBannerStack section="mercado-de-pulgas" title="Destaques do Mercado" />
        </div>
      </Container>
    </>
  );
}
