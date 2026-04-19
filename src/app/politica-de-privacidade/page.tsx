import type { Metadata } from "next";

import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";
import { db } from "@/lib/database";
import { getPrivacyPageContent } from "@/lib/siteContent";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Politica de privacidade do Auto Garage Show."
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const settings = await db.settings.get().catch(() => null);
  const content = getPrivacyPageContent(settings);
  const paragraphs = content.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);

  return (
    <>
      <PageIntro title={content.title} subtitle={content.subtitle} />

      <Container className="py-10">
        <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-5 text-base leading-8 text-slate-700">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>
      </Container>
    </>
  );
}
