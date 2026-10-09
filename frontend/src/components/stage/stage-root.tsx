"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useIdle, useSceneSupport } from "@/lib/hooks/use-scene-support";
import { selectWants3d, useSceneStore } from "@/stores/scene-store";

const StageCanvas = dynamic(() => import("@/components/three/stage/stage-canvas"), { ssr: false });

/**
 * Mounts the single background 3D stage once the browser is idle after hydration, on devices with
 * WebGL and a 3D quality tier. Until then (and on any failure) every section shows its 2D poster.
 * A lost GL context remounts the stage once (`renderAttempt`), then stays 2D.
 */
export function StageRoot() {
  const webgl = useSceneSupport();
  const wants3d = useSceneStore(selectWants3d);
  const renderAttempt = useSceneStore((s) => s.renderAttempt);
  const fallbackReason = useSceneStore((s) => s.fallbackReason);
  const idle = useIdle();
  const { resolvedTheme } = useTheme();
  const mount = webgl === true && wants3d && idle;

  useEffect(() => {
    const scene = useSceneStore.getState();
    if (!mount) scene.setStage("off");
    else if (scene.stage === "off") scene.setStage("loading");
  }, [mount, renderAttempt]);

  // A lost WebGL context (GPU reset, driver hiccup) gets one fresh canvas.
  useEffect(() => {
    if (fallbackReason !== "context-lost") return;
    const timer = setTimeout(() => useSceneStore.getState().recover3d(), 1500);
    return () => clearTimeout(timer);
  }, [fallbackReason]);

  return mount ? <StageCanvas key={renderAttempt} theme={resolvedTheme} /> : null;
}
