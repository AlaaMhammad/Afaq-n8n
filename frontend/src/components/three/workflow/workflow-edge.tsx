"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type CubicBezierCurve3, type Group } from "three";
import type { WorkflowEdge as WorkflowEdgeData } from "@/lib/api/types";
import { clamp01 } from "@/lib/stage/progress";
import type { ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { Cable, type CableEnds } from "../hardware/cable";
import { PIN_REACH } from "../hardware/hardware-node";
import { edgeLabelKey, placeLabel, type LabelRegistry } from "./label-layer";
import { separationOf } from "./workflow-node";
import type { SimNode, WorkflowSim } from "./workflow-sim";

interface WorkflowEdgeProps {
  edge: WorkflowEdgeData;
  sim: WorkflowSim;
  labels: LabelRegistry;
  palette: ScenePalette;
  packets: number;
  flow: 1 | -1;
  reducedMotion: boolean;
}

/** Pins slide outward a little as the hardware opens up (see HardwareNode). */
const pinReach = (node: SimNode) => PIN_REACH + 0.16 * clamp01(separationOf(node));

/**
 * A patch cable from the source node's output pin to the target's input pin; the plugs follow the
 * nodes while the workflow explodes. Edge labels ride just above the cable's midpoint.
 */
export function WorkflowEdge({ edge, sim, labels, palette, packets, flow, reducedMotion }: WorkflowEdgeProps) {
  const group = useRef<Group>(null);
  const curve = useRef<CubicBezierCurve3 | null>(null);
  // Scratch objects, mutated every frame through a ref (not memoised values).
  const work = useRef<{ mid: Vector3; ends: CableEnds }>({ mid: new Vector3(), ends: { from: new Vector3(), to: new Vector3(), flow } });
  const from = sim.node(edge.from);
  const to = sim.node(edge.to);
  const hot = useSceneStore((s) => [edge.from, edge.to].includes(s.hoveredNodeId ?? "") || [edge.from, edge.to].includes(s.selectedNodeId ?? ""));

  const readEnds = () => {
    const { ends } = work.current;
    ends.flow = flow;
    if (from && to) {
      ends.from.copy(from.position);
      ends.from.x += flow * pinReach(from);
      ends.to.copy(to.position);
      ends.to.x -= flow * pinReach(to);
    }
    return ends;
  };

  useFrame(({ camera, size }) => {
    if (!edge.label || !curve.current || !group.current) return;
    const { mid } = work.current;
    curve.current.getPoint(0.5, mid);
    mid.y += 0.3;
    group.current.updateWorldMatrix(true, false);
    placeLabel(labels.current.get(edgeLabelKey(edge.from, edge.to)), group.current.localToWorld(mid), camera, size);
  });

  if (!from || !to) return null;

  return (
    <group ref={group}>
      <Cable
        ends={readEnds}
        palette={palette}
        packets={packets}
        reducedMotion={reducedMotion}
        hot={hot}
        onCurve={(c) => {
          curve.current = c;
        }}
      />
    </group>
  );
}
