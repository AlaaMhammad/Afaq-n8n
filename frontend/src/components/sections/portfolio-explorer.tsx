"use client";

import { useEffect, useMemo } from "react";
import { Clock, Gauge, Network, Timer, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Project } from "@/lib/api/types";
import { cn, formatNumber } from "@/lib/utils";
import { localizeWorkflow } from "@/lib/workflow";
import { useSceneStore } from "@/stores/scene-store";
import { Badge } from "@/components/ui/badge";
import { iconForNodeType } from "@/lib/integrations";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { WorkflowStage } from "@/components/portfolio/workflow-stage";
import { WorkflowSteps } from "@/components/portfolio/workflow-steps";

/**
 * Portfolio explorer: project tabs, the 3D/2D workflow stage, the step list and live metrics —
 * all coordinated through the scene store, which the AI agent's `trigger_3d_workflow` drives too.
 */
export function PortfolioExplorer({ projects }: { projects: Project[] }) {
  const t = useTranslations("portfolio");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const registerProjects = useSceneStore((s) => s.registerProjects);
  const activeSlug = useSceneStore((s) => s.activeProjectSlug);
  const setActiveProject = useSceneStore((s) => s.setActiveProject);
  const selectedNodeId = useSceneStore((s) => s.selectedNodeId);
  const selectNode = useSceneStore((s) => s.selectNode);

  useEffect(() => {
    registerProjects(projects.map(({ slug, title }) => ({ slug, title })));
  }, [projects, registerProjects]);

  // Escape clears the node selection (the camera glides back to the overview).
  useEffect(() => {
    if (!selectedNodeId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") selectNode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNodeId, selectNode]);

  const project = projects.find((p) => p.slug === activeSlug) ?? projects[0];
  const workflow = useMemo(() => (project ? localizeWorkflow(project.workflow, locale) : null), [project, locale]);
  if (!project || !workflow) return null;

  const selected = workflow.nodes.find((n) => n.id === selectedNodeId);
  const metrics = [
    {
      icon: Timer,
      label: t("avgExecution"),
      value: `${formatNumber(project.metrics.avgExecutionMs, locale)} ms`,
    },
    {
      icon: Gauge,
      label: t("failureRate"),
      value: `${project.metrics.failureRate}%`,
    },
    {
      icon: Network,
      label: t("monthlyRuns"),
      value: formatNumber(project.metrics.monthlyRuns, locale, {
        notation: "compact",
      }),
    },
    {
      icon: Clock,
      label: t("hoursSaved"),
      value: formatNumber(project.metrics.hoursSavedPerMonth, locale),
    },
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
        <WorkflowStage workflow={workflow} projectSlug={project.slug} projectTitle={project.title} locale={locale} />

        <aside className="flex flex-col gap-5 rounded-2xl border border-border bg-surface/60 p-5">
          <div>
            <p className="font-mono text-xs text-muted ltr:uppercase ltr:tracking-widest">{project.client}</p>
            <h3 className="mt-1 text-lg font-semibold">{project.title}</h3>
          </div>

          {selected ? (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm" aria-live="polite">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <IntegrationIcon icon={iconForNodeType(selected.n8nType, selected.kind)} className="size-4" />
                  {selected.label}
                </p>
                <button type="button" onClick={() => selectNode(null)} className="rounded p-0.5 text-muted hover:text-foreground" aria-label={tCommon("close")}>
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-muted" dir="ltr">
                {selected.n8nType}
              </p>
              {selected.stats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>
                    {t("avgExecution")}: <bdi dir="ltr">{formatNumber(selected.stats.avgMs, locale)} ms</bdi>
                  </Badge>
                  <Badge>
                    {t("monthlyRuns")}:{" "}
                    <bdi dir="ltr">
                      {formatNumber(selected.stats.executions, locale, {
                        notation: "compact",
                      })}
                    </bdi>
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">{project.summary}</p>
          )}

          <WorkflowSteps workflow={workflow} />
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
