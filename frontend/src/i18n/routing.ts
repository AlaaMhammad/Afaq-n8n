import { defineRouting } from "next-intl/routing";

/** Arabic is the primary market: default locale, always prefixed (/ar, /en). */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
  localeCookie: { name: "afaq-locale", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export const directionOf = (locale: Locale): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");
