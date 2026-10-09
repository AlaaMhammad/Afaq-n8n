"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useNearViewport } from "@/lib/hooks/use-scene-support";
import { cn } from "@/lib/utils";
import { useSceneStore } from "@/stores/scene-store";

/** Props every stage scene module receives. */
export interface StageSceneProps {
  theme: string | undefined;
  locale: "ar" | "en";
  onReady: () => void;
  data?: unknown;
}

// One lazy chunk per vignette; three.js itself is shared with the stage canvas chunk.
const SCENES: Record<StageSceneName, ComponentType<StageSceneProps>> = {
  hero: dynamic(() => import("@/components/three/scenes/n8n-logo"), { ssr: false }),
  services: dynamic(() => import("@/components/three/scenes/server-rack"), { ssr: false }),
  team: dynamic(() => import("@/components/three/scenes/neural-core"), { ssr: false }),
  booking: dynamic(() => import("@/components/three/scenes/node-terminal"), { ssr: false }),
};

export type StageSceneName = "hero" | "services" | "team" | "booking";

interface StageSlotProps {
  scene: StageSceneName;
  locale: "ar" | "en";
  /** Shown until the 3D vignette renders its first frame — and forever without WebGL. */
  poster?: ReactNode;
  data?: unknown;
  className?: string;
  /** Accessible description; the vignette is decorative when omitted. */
  label?: string;
}

/**
 * A DOM placeholder that a vignette of the shared 3D stage renders into. It reserves the layout
 * (no shift), shows the poster, and loads its scene only while the stage is up and the slot is
 * near the viewport. `data-stage-anchor` lets the background conduits route through it.
 */
export function StageSlot({ scene, locale, poster, data, className, label }: StageSlotProps) {
  const slot = useRef<HTMLDivElement>(null);
  const stage = useSceneStore((s) => s.stage);
  const renderAttempt = useSceneStore((s) => s.renderAttempt);
  const near = useNearViewport(slot, "600px 0px");
  const { resolvedTheme } = useTheme();
  const [readyAttempt, setReadyAttempt] = useState<number | null>(null);
  const ready = readyAttempt === renderAttempt && stage !== "off";
  const Scene = SCENES[scene];

  return (
    <div
      ref={slot}
      data-stage-anchor={scene}
      data-stage={ready ? "3d" : "poster"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative", className)}
    >
      {poster && <div className={cn("absolute inset-0 transition-opacity duration-700", ready && "opacity-0")}>{poster}</div>}
      {stage !== "off" && near && (
        <div key={renderAttempt} className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <Scene theme={resolvedTheme} locale={locale} data={data} onReady={() => setReadyAttempt(renderAttempt)} />
        </div>
      )}
    </div>
  );
}
