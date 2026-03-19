import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

import ChunkRecovery from "@/components/ChunkRecovery";
import SiteAccessGate from "@/components/SiteAccessGate";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { siteUrl } from "@/lib/site-url";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  verification: {
    google: "y9BwzKKOqFuLgZMihxCLd2XEK6OjHnXTwIhn7e-VUO8"
  },
  title: {
    default: "Auto Garage Show",
    template: "%s | Auto Garage Show"
  },
  description: "Calendário de encontros, classificados e notícias de carros antigos.",
  openGraph: {
    title: "Auto Garage Show",
    description: "Calendário de encontros, classificados e notícias de carros antigos.",
    type: "website",
    locale: "pt_BR"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ChunkRecovery />
        <SiteAccessGate>
          <SiteHeader />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <SiteFooter />
        </SiteAccessGate>
      </body>
    </html>
  );
}
