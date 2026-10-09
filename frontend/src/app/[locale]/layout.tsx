import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "../globals.css";

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AgentActionRunner } from "@/components/assistant/agent-action-runner";
import { CopilotWidget } from "@/components/assistant/copilot-widget";
import { SectionObserver } from "@/components/layout/section-observer";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { Toaster } from "@/components/ui/toaster";
import { directionOf, routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { currentYear } from "@/lib/time";

/** Both locales are prerendered; `/[locale]` is the root segment (no app/layout.tsx). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale, namespace: "meta" });

  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t("title"), template: `%s · ${t("brand")}` },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en", "x-default": "/ar" },
    },
    openGraph: { title: t("title"), description: t("description"), siteName: t("brand"), locale, type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f9" },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const dir = directionOf(locale);
  const t = await getTranslations({ locale, namespace: "nav" });
  const year = await currentYear();

  return (
    // next-themes sets the theme class before paint, so the server markup can't know it.
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider>
          <AppProviders>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
            >
              {t("skipToContent")}
            </a>
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter year={year} />
            <SectionObserver />
            <AgentActionRunner />
            <CopilotWidget />
            <Toaster dir={dir} />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
