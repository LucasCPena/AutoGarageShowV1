import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";
import SiteSearchResults from "@/components/SiteSearchResults";

type Props = {
  searchParams?: {
    q?: string;
    type?: string;
  };
};

export default function SearchPage({ searchParams }: Props) {
  return (
    <>
      <PageIntro
        title="Busca"
        subtitle="Localize veículos, eventos, notícias e empresas em um único lugar."
      />

      <Container className="py-10">
        <SiteSearchResults
          initialQuery={searchParams?.q || ""}
          initialType={searchParams?.type || "all"}
        />
      </Container>
    </>
  );
}

