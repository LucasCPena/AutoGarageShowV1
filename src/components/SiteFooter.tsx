import Container from "@/components/Container";

export default function SiteFooter() {
  const year = new Date().getFullYear();

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

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <a
              className="text-slate-600 hover:text-brand-700"
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
            <a
              className="text-slate-600 hover:text-brand-700"
              href="https://www.youtube.com/"
              target="_blank"
              rel="noreferrer"
            >
              YouTube
            </a>
            <a
              className="text-slate-600 hover:text-brand-700"
              href="https://www.facebook.com/"
              target="_blank"
              rel="noreferrer"
            >
              Facebook
            </a>
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-500">
          © {year} Auto Garage Show. Todos os direitos reservados.
        </div>
      </Container>
    </footer>
  );
}
