import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Script from "next/script";

import "./globals.css";

import ChunkRecovery from "@/components/ChunkRecovery";
import SiteAccessGate from "@/components/SiteAccessGate";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { db } from "@/lib/database";
import { hasPublicListingPageAccess } from "@/lib/public-listing-access";
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

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  let googleAnalyticsId = "";
  try {
    const settings = await db.settings.get();
    googleAnalyticsId = settings?.analytics?.googleAnalyticsId?.trim() || "";
  } catch (error) {
    console.error("Erro ao carregar analytics do layout:", error);
  }

  const cookieStore = cookies();
  const hasLimitedListingAccess = hasPublicListingPageAccess(cookieStore);

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {googleAnalyticsId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${googleAnalyticsId}');`}
            </Script>
          </>
        ) : null}
        <ChunkRecovery />
        <SiteAccessGate>
          {hasLimitedListingAccess ? (
            <main className="min-h-screen">{children}</main>
          ) : (
            <>
              <SiteHeader />
              <main className="min-h-[calc(100vh-4rem)]">{children}</main>
              <SiteFooter />
            </>
          )}
        </SiteAccessGate>
      </body>
    </html>
  );
}
