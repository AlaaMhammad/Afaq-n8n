"use client";

import { useEffect, useRef, useState } from "react";
import type { NodeKind, Workflow } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useSceneStore } from "@/stores/scene-store";

const KIND_STYLES: Record<NodeKind, string> = {
  trigger: "rotate-45 rounded-md border-accent bg-accent/15",
  router: "rounded-full border-pulse bg-pulse/15",
  action: "rounded-lg border-accent/70 bg-surface-2",
  ai: "rounded-[40%] border-pulse bg-pulse/10",
  storage: "rounded-md border-muted bg-surface-2",
};

/** Scene units → pixels, capped for large stages. */
const MAX_UNIT = 46;
/** Half the node button width plus a small gutter, so outer labels never clip. */
const NODE_HALF_PX = 54;

/** Furthest |x| any node reaches, assembled or exploded (scene units). */
const reachX = (workflow: Workflow) => Math.max(1, ...workflow.nodes.flatMap((n) => [Math.abs(n.position[0]), Math.abs(n.position[0] + n.exploded[0])]));

interface WorkflowDiagram2DProps {
  workflow: Workflow;
  exploded: boolean;
  /** Hidden visually (the 3D canvas is showing) but kept mounted as the instant fallback. */
  concealed?: boolean;
}

/**
 * The workflow as an SVG/DOM diagram from the same spec as the 3D scene. It is the server-rendered
 * poster (no layout shift, nothing blocks LCP), the fallback for devices without WebGL or that run
 * slowly, and an accessible alternative: every node is a real button wired to the scene store.
 */
export function WorkflowDiagram2D({ workflow, exploded, concealed = false }: WorkflowDiagram2DProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [unit, setUnit] = useState(MAX_UNIT);
  const selectedNodeId = useSceneStore((s) => s.selectedNodeId);
  const hoveredNodeId = useSceneStore((s) => s.hoveredNodeId);
  const selectNode = useSceneStore((s) => s.selectNode);
  const hoverNode = useSceneStore((s) => s.hoverNode);

  useEffect(() => {
    const element = stage.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const reach = reachX(workflow);
    const observer = new ResizeObserver(([entry]) => setUnit(Math.max(8, Math.min(MAX_UNIT, (entry.contentRect.width / 2 - NODE_HALF_PX) / reach))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [workflow]);

  const progress = exploded ? 1 : 0;
  const at = (node: Workflow["nodes"][number]) => ({
    x: (node.position[0] + node.exploded[0] * progress) * unit,
    y: -(node.position[1] + node.exploded[1] * progress) * unit,
  });

  return (
    <div
      ref={stage}
      aria-hidden={concealed || undefined}
      inert={concealed || undefined}
      className={cn("bg-grid absolute inset-0 transition-opacity duration-700", concealed && "pointer-events-none opacity-0")}
    >
      {/* 1px SVG anchored at the stage centre (a zero-size outer <svg> is not rendered at all): plain px coordinates, no percentages
          (Chrome does not re-resolve % inside SVG attributes when the stage resizes). */}
      <svg className="absolute left-1/2 top-1/2 size-px overflow-visible" aria-hidden>
        {workflow.edges.map((edge) => {
          const from = workflow.nodes.find((n) => n.id === edge.from);
          const to = workflow.nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const a = at(from);
          const b = at(to);
          const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
          return (
            // A path, not a line: as the CSS `d` property the edge glides with its nodes
            // (Chrome/Firefox); the attribute is the static fallback (Safari).
            <path
              key={`${edge.from}-${edge.to}`}
              d={d}
              style={{ d: `path("${d}")` }}
              fill="none"
              stroke="var(--pulse)"
              strokeWidth={1.5}
              strokeDasharray="6 6"
              className="animate-dash transition-[d] duration-700 ease-out motion-reduce:animate-none"
            />
          );
        })}
      </svg>

      {workflow.nodes.map((node) => {
        const { x, y } = at(node);
        const engaged = selectedNodeId === node.id || hoveredNodeId === node.id;
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => selectNode(selectedNodeId === node.id ? null : node.id)}
            onPointerEnter={() => hoverNode(node.id)}
            onPointerLeave={() => hoverNode(null)}
            aria-pressed={selectedNodeId === node.id}
            // Physical coordinates (localizeWorkflow() already mirrored X for RTL); the 40px icon's
            // centre — not the button's — sits on the point, so edges meet the icons exactly.
            className="absolute left-1/2 top-1/2 flex w-24 flex-col items-center gap-2 rounded-lg transition-transform duration-700 ease-out"
            style={{ transform: `translate(calc(${x.toFixed(1)}px - 50%), ${(y - 20).toFixed(1)}px)` }}
          >
            <span className={cn("size-10 border-2 shadow-sm transition-shadow", KIND_STYLES[node.kind], engaged && "shadow-glow-accent")} aria-hidden />
            <span className="text-center text-[11px] font-medium leading-tight text-foreground">{node.label}</span>
          </button>
        );
      })}
    </div>
  );
}
