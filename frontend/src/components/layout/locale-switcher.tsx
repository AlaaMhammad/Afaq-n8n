"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

/** Switches ar ⇄ en on the same page, keeping the #section the visitor was looking at. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const next = routing.locales.find((l) => l !== locale) as Locale;

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t("switch")}
      disabled={pending}
      lang={next}
      onClick={() =>
        startTransition(() => {
          const hash = typeof window !== "undefined" ? window.location.hash : "";
          router.replace(`${pathname}${hash}`, { locale: next, scroll: false });
        })
      }
    >
      <Languages />
      {t(next)}
    </Button>
  );
}
