import Container from "@/components/Container";
import { db } from "@/lib/database";

const defaultSocialLinks = [
  { platform: "YouTube", url: "https://www.youtube.com/" },
  { platform: "X", url: "https://x.com/" },
  { platform: "Pinterest", url: "https://www.pinterest.com/" },
  { platform: "Instagram", url: "https://www.instagram.com/" },
  { platform: "Facebook", url: "https://www.facebook.com/" },
  { platform: "TikTok", url: "https://www.tiktok.com/" }
];

export default async function SiteFooter() {
  const year = new Date().getFullYear();
  const settings = await db.settings.get();
  const socialLinks = settings?.social?.links?.length ? settings.social.links : defaultSocialLinks;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Auto Garage Show</div>
            <div className="mt-1 text-xs text-slate-500">
              Calendário, classificados e notícias de carros antigos.
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

        <div className="mt-8 text-xs text-slate-500">
          © {year} Auto Garage Show. Links editáveis em settings.json.
        </div>
      </Container>
    </footer>
  );
}
