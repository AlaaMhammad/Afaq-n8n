"use client";

import { useLocale, useTranslations } from "next-intl";
import { StageSlot } from "@/components/stage/stage-slot";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { N8N_CORAL, N8N_LOGO } from "@/lib/integrations";
import { useSceneStore } from "@/stores/scene-store";

/** Poster: the flat n8n mark with a soft glow — shown first, on phones, and without WebGL. */
function HeroPoster() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="absolute inset-[18%] rounded-full opacity-40 blur-3xl" style={{ background: `radial-gradient(circle, ${N8N_CORAL} 0%, transparent 65%)` }} />
      <IntegrationIcon icon={N8N_LOGO} className="relative w-[62%] drop-shadow-[0_0_24px_rgb(234_75_113/0.45)] motion-safe:animate-pulse-ring" />
    </div>
  );
}

/**
 * Hero centrepiece: the n8n logo in 3D, a vignette of the shared stage canvas. Scrolling or
 * clicking it runs the "workflow" and energises the data conduits that run down the page.
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
