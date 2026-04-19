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
  subtitle: "Calendário, classificados, notícias e conteúdo sobre carros antigos.",
  body:
    "O Auto Garage Show reúne encontros, classificados e notícias para quem vive o antigomobilismo no dia a dia.\n\nA página do canal pode ser atualizada pelo admin para contar a história do projeto, destacar a proposta editorial e incluir novas informações institucionais sempre que necessário.",
  footerSummary: "Calendário, classificados e notícias de carros antigos."
};

const defaultPrivacyPage: SitePageContent = {
  title: "Política de Privacidade",
  subtitle: "Transparência sobre dados, contato e uso da plataforma.",
  body:
    "Esta página pode ser atualizada para refletir a política oficial de privacidade do Auto Garage Show.\n\nEnquanto isso, utilize somente os dados necessários para operação do site e para o contato entre usuários e anunciantes.",
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
