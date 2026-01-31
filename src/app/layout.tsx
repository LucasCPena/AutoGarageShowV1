import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://autogarageshow.com.br"),
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
        <SiteHeader />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
