import Link from "next/link";

import Container from "@/components/Container";
import { db } from "@/lib/database";
import { getAboutPageContent } from "@/lib/siteContent";

const defaultSocialLinks = [
  { platform: "YouTube", url: "https://www.youtube.com/@AUTO_GARAGE_SHOW" },
  { platform: "TikTok", url: "https://www.tiktok.com/@autogarageshow" },
  { platform: "Instagram", url: "https://www.instagram.com/autogarageshow/" },
  { platform: "Facebook", url: "https://www.facebook.com/profile.php?id=100095277923726" },
  { platform: "Pinterest", url: "https://br.pinterest.com/autogarageshow/" }
];

const blockedPlatforms = new Set(["x", "twitter"]);

function normalizePlatform(value: string | undefined | null) {
  return String(value || "").trim().toLowerCase();
}

function filterSocialLinks(links: Array<{ platform: string; url: string }> | undefined | null) {
  return (links || []).filter((link) => {
    const platform = normalizePlatform(link?.platform);
    return platform && !blockedPlatforms.has(platform);
  });
}

function mergeSocialLinks(links: Array<{ platform: string; url: string }>) {
  const defaultPlatforms = new Set(defaultSocialLinks.map((link) => normalizePlatform(link.platform)));
  const extras = links.filter((link) => !defaultPlatforms.has(normalizePlatform(link.platform)));
  return [...defaultSocialLinks, ...extras];
}

export default async function SiteFooter() {
  const year = new Date().getFullYear();
  let socialLinks = defaultSocialLinks;
  let footerSummary = "Calendario, classificados e noticias de carros antigos.";

  try {
    const settings = await db.settings.get();
    const filteredSettingsLinks = filterSocialLinks(settings?.social?.links);
    socialLinks = mergeSocialLinks(filteredSettingsLinks);
    footerSummary = getAboutPageContent(settings).footerSummary || footerSummary;
  } catch (error) {
    console.error("Erro ao carregar links sociais no rodape:", error);
  }

  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <Link href="/auto-garage-show" className="text-slate-900 hover:text-brand-700">
                Auto Garage Show
              </Link>
              <Link
                href="/politica-de-privacidade"
                className="text-slate-700 hover:text-brand-700"
              >
                Politica de Privacidade
              </Link>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {footerSummary}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm lg:justify-end">
            {socialLinks.map((link) => (
              <a
                key={link.platform}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:border-brand-200 hover:text-brand-700"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {link.platform.slice(0, 1)}
                </span>
                {link.platform}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Auto Garage Show {year}
        </div>
      </Container>
    </footer>
  );
}
