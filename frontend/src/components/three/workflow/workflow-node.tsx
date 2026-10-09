"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { Vector3, type Group } from "three";
import type { WorkflowNode as WorkflowNodeData } from "@/lib/api/types";
import type { ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { HardwareNode } from "../hardware/hardware-node";
import type { QualitySettings } from "../utils/quality";
import { placeLabel, type LabelRegistry } from "./label-layer";
import type { SimNode } from "./workflow-sim";

interface WorkflowNodeProps {
  node: SimNode;
  data: WorkflowNodeData;
  labels: LabelRegistry;
  palette: ScenePalette;
  settings: QualitySettings;
  flow: 1 | -1;
  reducedMotion: boolean;
}

/** Layer separation of a node: its explode spring (can overshoot below 0 — the "snap") plus hover peek. */
export const separationOf = (node: SimNode) => node.spring.x * 0.85 + node.peek * 0.45;

/**
 * Positions one hardware node from the simulation every frame (no React state per frame) and wires
 * hover/selection to the scene store, so the DOM step list, the 2D diagram and the AI agent all
 * share the same selection.
 */
export function WorkflowNode({ node, data, labels, palette, settings, flow, reducedMotion }: WorkflowNodeProps) {
  const group = useRef<Group>(null);
  const anchor = useRef(new Vector3());
  const hot = useSceneStore((s) => s.hoveredNodeId === node.id || s.selectedNodeId === node.id);
  const [pointerOver, setPointerOver] = useState(false);
  useCursor(pointerOver);

  useFrame(({ camera, size }) => {
    if (!group.current) return;
    group.current.position.copy(node.position);
    group.current.scale.setScalar(1 + node.peek * 0.06);
    // Label sits under the chassis (which drops as the node explodes), in world space.
    group.current.updateWorldMatrix(true, false);
    placeLabel(labels.current.get(node.id), group.current.localToWorld(anchor.current.set(0, -0.95 - 0.3 * Math.max(0, separationOf(node)), 0)), camera, size);
  });

  const onOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setPointerOver(true);
    useSceneStore.getState().hoverNode(node.id);
  };
  const onOut = () => {
    setPointerOver(false);
    if (useSceneStore.getState().hoveredNodeId === node.id) useSceneStore.getState().hoverNode(null);
  };
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const scene = useSceneStore.getState();
    scene.selectNode(scene.selectedNodeId === node.id ? null : node.id);
  };

  return (
    <group ref={group} position={node.position} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      <HardwareNode
        id={node.id}
        kind={node.kind}
        label={data.label}
        n8nType={data.n8nType}
        palette={palette}
        flow={flow}
        transmission={settings.transmission}
        separation={() => separationOf(node)}
        hot={hot}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
