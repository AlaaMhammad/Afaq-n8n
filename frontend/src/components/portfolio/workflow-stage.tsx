"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Boxes, Loader2, Square } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import type { Workflow } from "@/lib/api/types";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useNearViewport, useSceneSupport } from "@/lib/hooks/use-scene-support";
import { cn } from "@/lib/utils";
import { selectIsExploded, selectWants3d, useSceneStore } from "@/stores/scene-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useScrollExplode } from "./use-scroll-explode";
import { WorkflowDiagram2D } from "./workflow-diagram-2d";

// three.js stays out of the server render and the initial bundle; it loads near the section.
const WorkflowCanvas = dynamic(() => import("@/components/three/workflow/workflow-canvas"), { ssr: false });

interface WorkflowStageProps {
  workflow: Workflow;
  projectSlug: string;
  projectTitle: string;
  locale: string;
}

/**
 * The portfolio stage: the 2D diagram renders on the server as a poster, the 3D canvas loads
 * as the section approaches and cross-fades in on its first frame. Any failure (no WebGL,
 * context loss, render error, sustained low frame-rate) lands back on the 2D diagram.
 */
export function WorkflowStage({ workflow, projectSlug, projectTitle, locale }: WorkflowStageProps) {
  const t = useTranslations("portfolio");
  const stage = useRef<HTMLDivElement>(null);
  const webgl = useSceneSupport();
  const near = useNearViewport(stage);
  const wants3d = useSceneStore(selectWants3d);
  const detectedQuality = useSceneStore((s) => s.detectedQuality);
  const fallbackReason = useSceneStore((s) => s.fallbackReason);
  const exploded = useSceneStore(selectIsExploded);
  const toggleMode = useSceneStore((s) => s.toggleMode);
  const setQuality = useSceneStore((s) => s.setQuality);
  const finePointer = useFinePointer();
  const { resolvedTheme } = useTheme();
  // "Ready" belongs to one canvas mount: a remount (new attempt) starts hidden again.
  const renderAttempt = useSceneStore((s) => s.renderAttempt);
  const [readyAttempt, setReadyAttempt] = useState<number | null>(null);
  const ready = readyAttempt === renderAttempt;
  useScrollExplode(stage);

  // A lost WebGL context (GPU reset, driver hiccup, too many contexts) gets one fresh canvas.
  useEffect(() => {
    if (fallbackReason !== "context-lost") return;
    const timer = setTimeout(() => useSceneStore.getState().recover3d(), 1500);
    return () => clearTimeout(timer);
  }, [fallbackReason]);

  const show3d = webgl === true && wants3d && near;
  const live3d = show3d && ready;
  const canToggle = webgl === true && detectedQuality !== null;

  const switchView = () => {
    if (wants3d) {
      setQuality("fallback2d");
    } else {
      setQuality(detectedQuality === null || detectedQuality === "fallback2d" ? "low" : detectedQuality);
    }
  };

  const notice =
    fallbackReason === "performance"
      ? t("fallbackPerformance")
      : fallbackReason === "unsupported"
        ? t("fallbackUnsupported")
        : fallbackReason === "error" || fallbackReason === "context-lost"
          ? t("fallbackError")
          : null;

  return (
    <div
      ref={stage}
      data-active-project={projectSlug}
      data-mode={exploded ? "exploded" : "assembled"}
      data-view={live3d ? "3d" : "2d"}
      className="relative isolate h-80 overflow-hidden rounded-2xl border border-border bg-surface/60 sm:h-[26rem] lg:h-[28rem]"
    >
      <WorkflowDiagram2D workflow={workflow} exploded={exploded} concealed={live3d} />

      {show3d && (
        <div key={renderAttempt} className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <WorkflowCanvas
            workflow={workflow}
            sceneKey={`${projectSlug}:${locale}`}
            label={t("sceneLabel", {
              title: projectTitle,
              count: workflow.nodes.length,
            })}
            theme={resolvedTheme}
            onReady={() => setReadyAttempt(renderAttempt)}
          />
        </div>
      )}

      <div className="absolute end-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2">
        <Badge variant="pulse" className="hidden sm:inline-flex">
          <Boxes /> {workflow.nodes.length} {t("nodes")}
        </Badge>
        {canToggle && (
          <Button size="sm" variant="ghost" onClick={switchView} aria-pressed={!wants3d} className="bg-surface/70 backdrop-blur-sm">
            {wants3d ? <Square /> : <Box />}
            {wants3d ? t("view2d") : t("view3d")}
          </Button>
        )}
        <Button size="sm" variant={exploded ? "secondary" : "primary"} onClick={toggleMode} aria-pressed={exploded}>
          {exploded ? t("assemble") : t("explode")}
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-3 text-[11px] text-muted">
        {show3d && !ready ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface/80 px-2 py-1 backdrop-blur-sm" role="status">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            {t("loading3d")}
          </span>
        ) : live3d ? (
          <span className="rounded-md bg-surface/70 px-2 py-1 backdrop-blur-sm">{finePointer ? t("orbitHint") : t("touchHint")}</span>
        ) : notice ? (
          <span className="rounded-md bg-surface/80 px-2 py-1 backdrop-blur-sm" role="status">
            {notice}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
