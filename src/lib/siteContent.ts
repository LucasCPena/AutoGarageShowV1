import type {
  Settings,
  SitePageContentSettings
} from "@/lib/database.types";

export type SitePageContent = {
  title: string;
  subtitle: string;
  body: string;
  footerSummary?: string;
};

const defaultAboutPage: SitePageContent = {
  title: "Auto Garage Show",
  subtitle: "Calendario, classificados, noticias e conteudo sobre carros antigos.",
  body:
    "O Auto Garage Show reune encontros, classificados e noticias para quem vive o antigomobilismo no dia a dia.\n\nA pagina do canal pode ser atualizada pelo admin para contar a historia do projeto, destacar a proposta editorial e incluir novas informacoes institucionais sempre que necessario.",
  footerSummary: "Calendario, classificados e noticias de carros antigos."
};

const defaultPrivacyPage: SitePageContent = {
  title: "Politica de Privacidade",
  subtitle: "Transparencia sobre dados, contato e uso da plataforma.",
  body:
    "Esta pagina pode ser atualizada para refletir a politica oficial de privacidade do Auto Garage Show.\n\nEnquanto isso, utilize somente os dados necessarios para operacao do site e para o contato entre usuarios e anunciantes.",
  footerSummary: undefined
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizePageContent(
  input: SitePageContentSettings | null | undefined,
  fallback: SitePageContent
): SitePageContent {
  return {
    title: normalizeText(input?.title) || fallback.title,
    subtitle: normalizeText(input?.subtitle) || fallback.subtitle,
    body: normalizeText(input?.body) || fallback.body,
    footerSummary: normalizeText(input?.footerSummary) || fallback.footerSummary
  };
}

export function getAboutPageContent(settings: Settings | null | undefined) {
  return normalizePageContent(settings?.content?.about, defaultAboutPage);
}

export function getPrivacyPageContent(settings: Settings | null | undefined) {
  return normalizePageContent(settings?.content?.privacy, defaultPrivacyPage);
}
