"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useIdle, useSceneSupport } from "@/lib/hooks/use-scene-support";
import { cn } from "@/lib/utils";
import { selectWants3d, useSceneStore } from "@/stores/scene-store";

const AutomationCore = dynamic(() => import("@/components/three/hero/automation-core"), { ssr: false });

/**
 * Hero centrepiece. The CSS orb is the server-rendered poster (and the phone/no-WebGL/2D-mode
 * version); on large screens the R3F automation core loads once the browser is idle — after LCP —
 * and cross-fades in on its first frame.
 */
export function HeroVisual() {
  const t = useTranslations("hero");
  const large = useMediaQuery("(min-width: 1024px)");
  const webgl = useSceneSupport();
  const wants3d = useSceneStore(selectWants3d);
  const idle = useIdle();
  const { resolvedTheme } = useTheme();
  const renderAttempt = useSceneStore((s) => s.renderAttempt);
  const [readyAttempt, setReadyAttempt] = useState<number | null>(null);
  const ready = readyAttempt === renderAttempt;

  const show3d = large && idle && webgl === true && wants3d;
  const live = show3d && ready;

  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
      <div className={cn("absolute inset-0 transition-opacity duration-1000", live && "opacity-0")} aria-hidden>
        <div className="absolute inset-0 rounded-full border border-pulse/20" />
        <div className="absolute inset-10 rounded-full border border-dashed border-accent/30" />
        <div className="absolute inset-24 rounded-full bg-accent/10 shadow-glow-accent" />
        <div className="absolute inset-[38%] animate-pulse-ring rounded-full bg-accent shadow-glow-accent" />
      </div>
      {show3d && (
        <div key={renderAttempt} className={cn("absolute -inset-10 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
          <AutomationCore label={t("coreLabel")} theme={resolvedTheme} onReady={() => setReadyAttempt(renderAttempt)} />
        </div>
      )}
    </div>
  );
}
