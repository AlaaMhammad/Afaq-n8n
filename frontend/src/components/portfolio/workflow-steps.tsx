"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Workflow } from "@/lib/api/types";
import { cn, formatNumber } from "@/lib/utils";
import { orderedNodes } from "@/lib/workflow";
import { nodeSubtitle } from "./n8n-node";
import { useSceneStore } from "@/stores/scene-store";
import { iconForNodeType } from "@/lib/integrations";
import { IntegrationIcon } from "@/components/ui/integration-icon";

/**
 * The workflow's nodes in data-flow order as a keyboard/screen-reader friendly list. Hovering
 * or selecting a step highlights it in the 3D scene (and vice versa) through the scene store.
 */
export function WorkflowSteps({ workflow }: { workflow: Workflow }) {
  const t = useTranslations("portfolio");
  const locale = useLocale();
  const selectedNodeId = useSceneStore((s) => s.selectedNodeId);
  const hoveredNodeId = useSceneStore((s) => s.hoveredNodeId);
  const selectNode = useSceneStore((s) => s.selectNode);
  const hoverNode = useSceneStore((s) => s.hoverNode);

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-muted">{t("steps")}</h4>
      <ol className="space-y-1.5">
        {orderedNodes(workflow).map((node, index) => {
          const selected = selectedNodeId === node.id;
          return (
            <li key={node.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => selectNode(selected ? null : node.id)}
                onPointerEnter={() => hoverNode(node.id)}
                onPointerLeave={() => hoverNode(null)}
                onFocus={() => hoverNode(node.id)}
                onBlur={() => hoverNode(null)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-start text-sm transition-colors",
                  selected ? "border-accent bg-accent/10" : hoveredNodeId === node.id ? "border-border bg-surface-2" : "border-transparent hover:bg-surface-2",
                )}
              >
                <span className="font-mono text-[11px] text-muted" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* the node's real integration icon, on an n8n-style tile */}
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-white dark:bg-[#2e2e33]">
                  <IntegrationIcon icon={iconForNodeType(node.n8nType, node.kind)} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{node.label}</span>
                  <span className="block text-[11px] text-muted">
                    {t(`kinds.${node.kind}`)} · {nodeSubtitle(node)}
                  </span>
                </span>
                {node.stats && (
                  <bdi dir="ltr" className="shrink-0 font-mono text-[11px] text-muted">
                    {formatNumber(node.stats.avgMs, locale)} ms
                  </bdi>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
