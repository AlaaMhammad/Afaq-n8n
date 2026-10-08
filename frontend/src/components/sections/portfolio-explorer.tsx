"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Clock, Gauge, Network, Timer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { NodeKind, Project } from "@/lib/api/types";
import { cn, formatNumber } from "@/lib/utils";
import { localizeWorkflow } from "@/lib/workflow";
import { selectIsExploded, useSceneStore } from "@/stores/scene-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const KIND_STYLES: Record<NodeKind, string> = {
  trigger: "rotate-45 rounded-md border-accent bg-accent/15",
  router: "rounded-full border-pulse bg-pulse/15",
  action: "rounded-lg border-accent/70 bg-surface-2",
  ai: "rounded-[40%] border-pulse bg-pulse/10",
  storage: "rounded-md border-muted bg-surface-2",
};

/** Scene units → pixels for the interim 2D preview: fit ~14 units (incl. exploded offsets) across. */
const MAX_UNIT = 46;
const UNITS_ACROSS = 14.5;

/**
 * Portfolio explorer wired to the scene store. Until the R3F canvas lands (Phase 5) it renders
 * the real workflow graph as a 2D diagram; the AI agent's `trigger_3d_workflow` already drives it.
 */
export function PortfolioExplorer({ projects }: { projects: Project[] }) {
  const t = useTranslations("portfolio");
  const locale = useLocale();
  const registerProjects = useSceneStore((s) => s.registerProjects);
  const activeSlug = useSceneStore((s) => s.activeProjectSlug);
  const setActiveProject = useSceneStore((s) => s.setActiveProject);
  const exploded = useSceneStore(selectIsExploded);
  const toggleMode = useSceneStore((s) => s.toggleMode);
  const selectedNodeId = useSceneStore((s) => s.selectedNodeId);
  const selectNode = useSceneStore((s) => s.selectNode);

  const stageRef = useRef<HTMLDivElement>(null);
  const [UNIT, setUnit] = useState(MAX_UNIT);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setUnit(Math.min(MAX_UNIT, entry.contentRect.width / UNITS_ACROSS)));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    registerProjects(projects.map(({ slug, title }) => ({ slug, title })));
  }, [projects, registerProjects]);

  const project = projects.find((p) => p.slug === activeSlug) ?? projects[0];
  const workflow = useMemo(() => (project ? localizeWorkflow(project.workflow, locale) : null), [project, locale]);
  if (!project || !workflow) return null;

  const progress = exploded ? 1 : 0;
  const selected = workflow.nodes.find((n) => n.id === selectedNodeId);
  const metrics = [
    { icon: Timer, label: t("avgExecution"), value: `${formatNumber(project.metrics.avgExecutionMs, locale)} ms` },
    { icon: Gauge, label: t("failureRate"), value: `${project.metrics.failureRate}%` },
    { icon: Network, label: t("monthlyRuns"), value: formatNumber(project.metrics.monthlyRuns, locale, { notation: "compact" }) },
    { icon: Clock, label: t("hoursSaved"), value: formatNumber(project.metrics.hoursSavedPerMonth, locale) },
  ];

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label={t("title")} className="flex gap-2 overflow-x-auto pb-1">
        {projects.map((p) => (
          <button
            key={p.slug}
            role="tab"
            aria-selected={p.slug === project.slug}
            onClick={() => setActiveProject(p.slug)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              p.slug === project.slug ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted hover:text-foreground",
            )}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div
          ref={stageRef}
          data-active-project={project.slug}
          data-mode={exploded ? "exploded" : "assembled"}
          className="relative h-80 overflow-hidden rounded-2xl border border-border bg-surface/60 bg-grid sm:h-96"
        >
          <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
            <Badge variant="pulse">
              <Boxes /> {workflow.nodes.length} {t("nodes")}
            </Badge>
            <Button size="sm" variant={exploded ? "secondary" : "primary"} onClick={toggleMode} aria-pressed={exploded}>
              {exploded ? t("assemble") : t("explode")}
            </Button>
          </div>

          {/* Edges */}
          <svg className="absolute inset-0 size-full overflow-visible" aria-hidden>
            {workflow.edges.map((edge) => {
              const from = workflow.nodes.find((n) => n.id === edge.from);
              const to = workflow.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              const x1 = (from.position[0] + from.exploded[0] * progress) * UNIT;
              const y1 = -(from.position[1] + from.exploded[1] * progress) * UNIT;
              const x2 = (to.position[0] + to.exploded[0] * progress) * UNIT;
              const y2 = -(to.position[1] + to.exploded[1] * progress) * UNIT;
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={`calc(50% + ${x1}px)`}
                  y1={`calc(50% + ${y1}px)`}
                  x2={`calc(50% + ${x2}px)`}
                  y2={`calc(50% + ${y2}px)`}
                  stroke="var(--pulse)"
                  strokeWidth={1.5}
                  strokeDasharray="6 6"
                  className="transition-all duration-700 ease-out"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {workflow.nodes.map((node) => {
            const x = (node.position[0] + node.exploded[0] * progress) * UNIT;
            const y = -(node.position[1] + node.exploded[1] * progress) * UNIT;
            return (
              <button
                key={node.id}
                onClick={() => selectNode(selectedNodeId === node.id ? null : node.id)}
                aria-pressed={selectedNodeId === node.id}
                // Physical coordinates: localizeWorkflow() already mirrored X for RTL, like the SVG edges.
                className="absolute left-1/2 top-1/2 flex w-24 flex-col items-center gap-2 transition-transform duration-700 ease-out"
                style={{ transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))` }}
              >
                <span
                  className={cn(
                    "size-10 border-2 shadow-sm transition-shadow",
                    KIND_STYLES[node.kind],
                    selectedNodeId === node.id && "shadow-glow-accent",
                  )}
                  aria-hidden
                />
                <span className="text-center text-[11px] font-medium leading-tight text-foreground">{node.label}</span>
              </button>
            );
          })}
        </div>

        <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">{project.client}</p>
            <h3 className="mt-1 text-lg font-semibold">{project.title}</h3>
          </div>
          {selected ? (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
              <p className="font-semibold">{selected.label}</p>
              <p className="mt-1 font-mono text-xs text-muted" dir="ltr">
                {selected.n8nType}
              </p>
              {selected.stats && (
                <p className="mt-2 text-xs text-muted">
                  {t("avgExecution")}: {formatNumber(selected.stats.avgMs, locale)} ms
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">{project.summary}</p>
          )}
          <p className="mt-auto text-xs text-muted/80">{t("viewerSoon")}</p>
        </aside>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-surface/60 p-4">
            <dt className="flex items-center gap-2 text-xs text-muted">
              <Icon className="size-3.5" aria-hidden />
              {label}
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold">
              <bdi dir="ltr">{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
