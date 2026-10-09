"use client";

import type { Camera, Vector3 } from "three";
import type { Workflow } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { nodeSubtitle } from "@/components/portfolio/n8n-node";
import { useSceneStore } from "@/stores/scene-store";

/** DOM elements of the labels, keyed by node id or `edge:from-to`; positioned from the frame loop. */
export type LabelRegistry = React.RefObject<Map<string, HTMLElement>>;

export const edgeLabelKey = (from: string, to: string) => `edge:${from}-${to}`;

/**
 * Moves a label element to a world position's screen projection (called from `useFrame`).
 * Writes the transform directly — no React render per frame.
 */
export function placeLabel(element: HTMLElement | undefined, world: Vector3, camera: Camera, size: { width: number; height: number }) {
  if (!element) return;
  world.project(camera);
  const behind = world.z > 1;
  const x = (world.x * 0.5 + 0.5) * size.width;
  const y = (-world.y * 0.5 + 0.5) * size.height;
  element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
  element.style.visibility = behind ? "hidden" : "visible";
}

/**
 * Labels for nodes and edges as one plain DOM layer over the canvas: native Arabic shaping and
 * theme tokens, rendered in the main React tree (no per-label React roots). Decorative — the
 * canvas' aria-label and the step list carry the same information for assistive tech.
 */
export function LabelLayer({ workflow, registry }: { workflow: Workflow; registry: LabelRegistry }) {
  const hoveredId = useSceneStore((s) => s.hoveredNodeId);
  const selectedId = useSceneStore((s) => s.selectedNodeId);

  const register = (key: string) => (element: HTMLElement | null) => {
    if (element) registry.current.set(key, element);
    else registry.current.delete(key);
  };

  // Physical left/top on purpose: projected coordinates are physical in both LTR and RTL.
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none" aria-hidden>
      {workflow.nodes.map((node) => {
        const selected = node.id === selectedId;
        const hot = selected || node.id === hoveredId;
        return (
          <span
            key={node.id}
            ref={register(node.id)}
            dir="auto"
            style={{ visibility: "hidden" }}
            // n8n style: bold name with the integration underneath, no pill.
            className={cn(
              "absolute left-0 top-0 flex flex-col items-center whitespace-nowrap text-center leading-tight will-change-transform [text-shadow:0_1px_3px_var(--background)]",
              selected ? "text-accent" : "text-foreground",
            )}
          >
            <span className={cn("text-[11px] font-semibold", hot && !selected && "text-[#3fb950]")}>{node.label}</span>
            <span className="text-[9px] text-muted">{nodeSubtitle(node)}</span>
          </span>
        );
      })}
      {workflow.edges
        .filter((edge) => edge.label)
        .map((edge) => (
          <span
            key={edgeLabelKey(edge.from, edge.to)}
            ref={register(edgeLabelKey(edge.from, edge.to))}
            dir="auto"
            style={{ visibility: "hidden" }}
            className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-pulse/50 bg-surface/80 px-2 py-px font-mono text-[10px] text-pulse backdrop-blur-sm will-change-transform"
          >
            {edge.label}
          </span>
        ))}
    </div>
  );
}
