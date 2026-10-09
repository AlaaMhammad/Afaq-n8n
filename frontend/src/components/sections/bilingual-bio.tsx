"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { directionOf, type Locale } from "@/i18n/routing";

interface BilingualBioProps {
  bio: string;
  role: string;
  /** The same member in the other site language (null if it couldn't be loaded). */
  alternate: { bio: string; role: string } | null;
}

/**
 * Role + bio with a one-click switch to the other language, so an Arabic visitor can read the
 * English original (and vice versa). The swapped text carries the right `lang` and `dir`.
 */
export function BilingualBio({ bio, role, alternate }: BilingualBioProps) {
  const t = useTranslations("team");
  const locale = useLocale() as Locale;
  const other: Locale = locale === "ar" ? "en" : "ar";
  const [showOther, setShowOther] = useState(false);
  const canSwitch = alternate !== null && alternate.bio.trim() !== "" && alternate.bio !== bio;

  const shownLocale = showOther && canSwitch ? other : locale;
  const shown = showOther && canSwitch ? alternate : { bio, role };

  return (
    <div lang={shownLocale} dir={directionOf(shownLocale)} className="space-y-3">
      <p className="text-sm text-accent">{shown.role}</p>
      <p className="line-clamp-5 text-sm leading-relaxed text-muted" aria-live="polite">
        {shown.bio}
      </p>
      {canSwitch && (
        <button
          type="button"
          onClick={() => setShowOther((value) => !value)}
          aria-pressed={showOther}
          lang={locale}
          dir={directionOf(locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-pulse hover:underline"
        >
          <Languages className="size-3.5" aria-hidden />
          {t("readIn", { language: t(`languages.${showOther ? locale : other}`) })}
        </button>
      )}
    </div>
  );
}
