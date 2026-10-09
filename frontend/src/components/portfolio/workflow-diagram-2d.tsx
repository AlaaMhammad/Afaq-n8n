"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Workflow } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useSceneStore } from "@/stores/scene-store";
import { N8nNodeBox, nodeSubtitle } from "./n8n-node";

/** Scene units → pixels, capped for large stages. */
const MAX_UNIT = 46;
/** Half the node column width plus a small gutter, so outer labels never clip. */
const NODE_HALF_PX = 54;

/** Furthest |x| any node reaches, assembled or exploded (scene units). */
const reachX = (workflow: Workflow) => Math.max(1, ...workflow.nodes.flatMap((n) => [Math.abs(n.position[0]), Math.abs(n.position[0] + n.exploded[0])]));

/** Node body size for a given scale: n8n's square nodes, kept legible on phones. */
export const nodeSizeFor = (unit: number) => Math.round(Math.min(64, Math.max(34, unit * 1.3)));

/** Output handles per node: routers fan out to at least two branches, like n8n's IF/Switch. */
export function outputCount(workflow: Workflow, nodeId: string, kind: string): number {
  const outgoing = workflow.edges.filter((edge) => edge.from === nodeId).length;
  return Math.max(kind === "router" ? 2 : 1, outgoing);
}

/** n8n-style connection: leaves the output handle horizontally and enters the input handle horizontally. */
export function connectionPath(a: { x: number; y: number }, b: { x: number; y: number }, flow: 1 | -1): string {
  const bend = Math.max(28, Math.abs(b.x - a.x) * 0.5) * flow;
  const f = (v: number) => v.toFixed(1);
  return `M${f(a.x)} ${f(a.y)} C${f(a.x + bend)} ${f(a.y)} ${f(b.x - bend)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
}

interface WorkflowDiagram2DProps {
  workflow: Workflow;
  exploded: boolean;
  /** +1 LTR; -1 Arabic (the workflow reads right → left). */
  flow?: 1 | -1;
  /** Hidden visually (the 3D canvas is showing) but kept mounted as the instant fallback. */
  concealed?: boolean;
}

/**
 * The workflow drawn like the n8n editor canvas — dotted background, square nodes with real
 * integration icons, trigger "D" nodes with the lightning marker, grey handles and bezier
 * connections with arrowheads. It is the server-rendered poster, the fallback without WebGL,
 * and an accessible alternative: every node is a real button wired to the scene store.
 */
export function WorkflowDiagram2D({ workflow, exploded, flow = 1, concealed = false }: WorkflowDiagram2DProps) {
  const stage = useRef<HTMLDivElement>(null);
  const markerId = useId().replace(/:/g, "");
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

  const size = nodeSizeFor(unit);
  const half = size / 2;
  const progress = exploded ? 1 : 0;
  const at = (node: Workflow["nodes"][number]) => ({
    x: (node.position[0] + node.exploded[0] * progress) * unit,
    y: -(node.position[1] + node.exploded[1] * progress) * unit,
  });
  const byId = new Map(workflow.nodes.map((node) => [node.id, node]));

  return (
    <div
      ref={stage}
      aria-hidden={concealed || undefined}
      inert={concealed || undefined}
      className={cn(
        "absolute inset-0 bg-[radial-gradient(circle,var(--n8n-dot)_1px,transparent_1.2px)] [--n8n-dot:#c9c9d2] [background-size:20px_20px] transition-opacity duration-700 dark:[--n8n-dot:#3a3a40]",
        concealed && "pointer-events-none opacity-0",
      )}
    >
      {/* 1px SVG anchored at the stage centre (a zero-size outer <svg> is not rendered at all). */}
      <svg className="absolute left-1/2 top-1/2 size-px overflow-visible" aria-hidden>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#8a8a93" />
          </marker>
        </defs>
        {workflow.edges.map((edge) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to) return null;
          const outs = outputCount(workflow, from.id, from.kind);
          const portIndex = Math.max(0, workflow.edges.filter((e) => e.from === from.id).indexOf(edge));
          const a = at(from);
          const b = at(to);
          const start = { x: a.x + flow * half, y: a.y - half + ((portIndex + 1) / (outs + 1)) * size };
          const end = { x: b.x - flow * (half + 6), y: b.y };
          const d = connectionPath(start, end, flow);
          const hot = [hoveredNodeId, selectedNodeId].some((id) => id === edge.from || id === edge.to);
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path
                d={d}
                style={{ d: `path("${d}")` }}
                fill="none"
                stroke={hot ? "#3fb950" : "#8a8a93"}
                strokeWidth={hot ? 2.5 : 2}
                markerEnd={`url(#${markerId})`}
                className="transition-[d,stroke] duration-700 ease-out"
              />
              {/* data flowing along the connection */}
              <path d={d} style={{ d: `path("${d}")` }} fill="none" stroke="#3fb950" strokeWidth={2} strokeDasharray="4 14" className="animate-dash opacity-70 transition-[d] duration-700 ease-out motion-reduce:hidden" />
              {(edge.label || edge.fromPort) && (
                <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 8} textAnchor="middle" className="fill-muted font-mono text-[10px]">
                  {edge.label ?? edge.fromPort}
                </text>
              )}
            </g>
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
            // Physical coordinates (localizeWorkflow() already mirrored X for RTL); the node body's
            // centre sits on the point, so connections meet the handles exactly.
            className="absolute left-1/2 top-1/2 flex w-28 flex-col items-center gap-1.5 rounded-lg transition-transform duration-700 ease-out focus-visible:outline-offset-4"
            style={{ transform: `translate(calc(${x.toFixed(1)}px - 50%), ${(y - half).toFixed(1)}px)` }}
          >
            <N8nNodeBox node={node} size={size} flow={flow} outputs={outputCount(workflow, node.id, node.kind)} engaged={engaged} selected={selectedNodeId === node.id} />
            <span className="max-w-full text-center text-[11px] font-semibold leading-tight text-foreground">{node.label}</span>
            <span className="-mt-1 max-w-full truncate text-center text-[9px] text-muted">{nodeSubtitle(node)}</span>
          </button>
        );
      })}
    </div>
  );
}
