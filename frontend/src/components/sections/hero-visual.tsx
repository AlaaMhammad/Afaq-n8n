"use client";

import { useLocale, useTranslations } from "next-intl";
import { StageSlot } from "@/components/stage/stage-slot";
import { useSceneStore } from "@/stores/scene-store";

/** CSS poster: shown first, on phones, and wherever WebGL is unavailable. */
function HeroPoster() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 rounded-full border border-pulse/20" />
      <div className="absolute inset-10 rounded-full border border-dashed border-accent/30" />
      <div className="absolute inset-24 rounded-full bg-accent/10 shadow-glow-accent" />
      <div className="absolute inset-[38%] animate-pulse-ring rounded-full bg-accent shadow-glow-accent" />
    </div>
  );
}

/**
 * Hero centrepiece: the n8n trigger switch, a vignette of the shared stage canvas. Scrolling or
 * clicking it closes the circuit and energises the data conduits that run down the page.
 */
export function HeroVisual() {
  const t = useTranslations("hero");
  const locale = useLocale() as "ar" | "en";
  const powered = useSceneStore((s) => s.powered);
  const live = useSceneStore((s) => s.stage === "live");

  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
      <StageSlot scene="hero" locale={locale} poster={<HeroPoster />} label={t("coreLabel")} className="absolute -inset-10" />
      {live && (
        <p className="pointer-events-none absolute inset-x-0 -bottom-8 text-center text-xs text-muted" aria-live="polite">
          {powered ? t("switchOn") : t("coreHint")}
        </p>
      )}
    </div>
  );
}
