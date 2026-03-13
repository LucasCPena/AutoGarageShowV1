import Container from "@/components/Container";
import { db } from "@/lib/database";

const defaultSocialLinks = [
  { platform: "YouTube", url: "https://www.youtube.com/" },
  { platform: "TikTok", url: "https://www.tiktok.com/" },
  { platform: "Instagram", url: "https://www.instagram.com/" },
  { platform: "Facebook", url: "https://www.facebook.com/" }
];

const blockedPlatforms = new Set(["x", "twitter", "pinterest"]);

function normalizePlatform(value: string | undefined | null) {
  return String(value || "").trim().toLowerCase();
}

function filterSocialLinks(links: Array<{ platform: string; url: string }> | undefined | null) {
  return (links || []).filter((link) => {
    const platform = normalizePlatform(link?.platform);
    return platform && !blockedPlatforms.has(platform);
  });
}

function ensureTikTokLink(links: Array<{ platform: string; url: string }>) {
  const hasTikTok = links.some((link) => normalizePlatform(link.platform) === "tiktok");
  if (hasTikTok) return links;

  const tikTokDefault = defaultSocialLinks.find(
    (link) => normalizePlatform(link.platform) === "tiktok"
  );

  return tikTokDefault ? [...links, tikTokDefault] : links;
}

export default async function SiteFooter() {
  const year = new Date().getFullYear();
  let socialLinks = defaultSocialLinks;

  try {
    const settings = await db.settings.get();
    const filteredSettingsLinks = ensureTikTokLink(filterSocialLinks(settings?.social?.links));
    socialLinks = filteredSettingsLinks.length ? filteredSettingsLinks : defaultSocialLinks;
  } catch (error) {
    console.error("Erro ao carregar links sociais no rodape:", error);
  }

  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Auto Garage Show</div>
            <div className="mt-1 text-xs text-slate-500">
              Calendario, classificados e noticias de carros antigos.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
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

        <div className="mt-8 text-xs text-slate-500">Auto Garage Show {year}</div>
      </Container>
    </footer>
  );
}
