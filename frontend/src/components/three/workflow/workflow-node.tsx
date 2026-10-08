"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { Vector3, type Group } from "three";
import type { ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import type { QualitySettings } from "../utils/quality";
import { placeLabel, type LabelRegistry } from "./label-layer";
import { NODE_MESHES, NodeHalo } from "./node-meshes";
import type { SimNode } from "./workflow-sim";

interface WorkflowNodeProps {
  node: SimNode;
  labels: LabelRegistry;
  palette: ScenePalette;
  settings: QualitySettings;
  reducedMotion: boolean;
}

/**
 * Positions one node from the simulation every frame (no React state per frame) and wires
 * hover/selection to the scene store, so the DOM step list, the 2D diagram and the AI agent
 * all share the same selection.
 */
export function WorkflowNode({ node, labels, palette, settings, reducedMotion }: WorkflowNodeProps) {
  const group = useRef<Group>(null);
  const anchor = useRef(new Vector3());
  const hot = useSceneStore((s) => s.hoveredNodeId === node.id || s.selectedNodeId === node.id);
  const [pointerOver, setPointerOver] = useState(false);
  useCursor(pointerOver);

  useFrame(({ camera, size }) => {
    if (!group.current) return;
    group.current.position.copy(node.position);
    group.current.scale.setScalar(1 + node.peek * 0.08);
    // Label sits just under the node, in world space (the scene root sways slightly).
    group.current.updateWorldMatrix(true, false);
    placeLabel(labels.current.get(node.id), group.current.localToWorld(anchor.current.set(0, -1.05, 0)), camera, size);
  });

  const Mesh = NODE_MESHES[node.kind];
  const color = node.kind === "router" || node.kind === "ai" || node.kind === "storage" ? palette.pulse : palette.accent;

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
      <Mesh node={node} palette={palette} settings={settings} hot={hot} reducedMotion={reducedMotion} />
      <NodeHalo palette={palette} color={color} hot={hot} />
    </group>
  );
}
