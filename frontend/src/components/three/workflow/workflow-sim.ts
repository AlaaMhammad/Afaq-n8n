import { Vector3 } from "three";
import type { NodeKind, Workflow } from "@/lib/api/types";
import { clamp01, damp, stepSpring, type SpringState } from "../utils/spring";

export interface SimNode {
  id: string;
  index: number;
  kind: NodeKind;
  base: Vector3;
  offset: Vector3;
  spring: SpringState;
  /** 0 → 1 hover/selection "peek": the node opens up a little on its own. */
  peek: number;
  /** Sub-part explode for the node's own geometry (shell/core, discs, …), 0 → ~1. */
  local: number;
  /** Live world position (assembled + offset × spring, plus idle float). */
  position: Vector3;
  seed: number;
}

export interface SimFrame {
  /** 0 = assembled, 1 = exploded */
  target: number;
  hoveredId: string | null;
  selectedId: string | null;
  reducedMotion: boolean;
  time: number;
}

/**
 * Physics state for one workflow scene. Each node rides its own slightly under-damped spring
 * toward the global explode target: stiffness falls off along the flow, so nodes stagger
 * naturally, overshoot a touch and settle — and an interrupted transition simply reverses
 * from wherever the nodes are. Pure (no React), stepped once per frame by the scene.
 */
export class WorkflowSim {
  readonly nodes: SimNode[];
  private readonly byId: Map<string, SimNode>;

  constructor(workflow: Pick<Workflow, "nodes">, initialProgress = 0) {
    this.nodes = workflow.nodes.map((node, index) => {
      const base = new Vector3(...node.position);
      const offset = new Vector3(...node.exploded);
      return {
        id: node.id,
        index,
        kind: node.kind,
        base,
        offset,
        spring: { x: initialProgress, v: 0 },
        peek: 0,
        local: initialProgress,
        position: base.clone().addScaledVector(offset, initialProgress),
        seed: index * 1.7 + 0.3,
      };
    });
    this.byId = new Map(this.nodes.map((node) => [node.id, node]));
  }

  node(id: string): SimNode | undefined {
    return this.byId.get(id);
  }

  /** Average explode progress of all nodes (0–1), mirrored to the store for DOM consumers. */
  progress(): number {
    if (this.nodes.length === 0) return 0;
    return clamp01(this.nodes.reduce((sum, node) => sum + node.spring.x, 0) / this.nodes.length);
  }

  /** Advances every node; returns true while anything is still moving. */
  step(dt: number, frame: SimFrame): boolean {
    let moving = false;

    for (const node of this.nodes) {
      if (frame.reducedMotion) {
        node.spring.x = frame.target;
        node.spring.v = 0;
      } else {
        const stiffness = Math.max(34, 78 - node.index * 9);
        moving =
          stepSpring(node.spring, frame.target, dt, {
            stiffness,
            dampingRatio: 0.58,
          }) || moving;
      }

      const engaged = node.id === frame.hoveredId || node.id === frame.selectedId ? 1 : 0;
      node.peek = frame.reducedMotion ? engaged : damp(node.peek, engaged, 9, dt);
      if (Math.abs(node.peek - engaged) > 1e-3) moving = true;
      node.local = Math.max(node.spring.x, node.peek * 0.55);

      node.position.copy(node.base).addScaledVector(node.offset, node.spring.x);
      if (!frame.reducedMotion) {
        // Exploded parts float gently, like components held apart in an assembly diagram.
        node.position.y += Math.sin(frame.time * 1.1 + node.seed) * 0.06 * clamp01(node.spring.x);
      }
    }

    return moving;
  }
}
