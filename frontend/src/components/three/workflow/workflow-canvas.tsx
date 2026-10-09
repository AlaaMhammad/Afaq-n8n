"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import type { Group } from "three";
import type { Workflow } from "@/lib/api/types";
import { useFinePointer, useReducedMotion } from "@/lib/hooks/use-media-query";
import { scenePalette, type ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { mainEdges, subNodeIds } from "@/lib/workflow";
import { StageView } from "../stage/stage-view";
import { DEFAULT_CAMERA } from "../utils/camera";
import { settingsFor, type QualitySettings } from "../utils/quality";
import { CameraRig } from "./camera-rig";
import { LabelLayer, type LabelRegistry } from "./label-layer";
import { WorkflowEdge } from "./workflow-edge";
import { WorkflowNode } from "./workflow-node";
import { WorkflowSim } from "./workflow-sim";

export interface WorkflowCanvasProps {
  /** Locale-resolved (and RTL-mirrored) workflow */
  workflow: Workflow;
  /** Changes when the project or locale changes → fresh simulation */
  sceneKey: string;
  label: string;
  theme: string | undefined;
  /** +1 LTR, -1 Arabic (pins and cables follow the reading direction). */
  flow: 1 | -1;
  onReady?: () => void;
}

/**
 * The portfolio's interactive workflow, rendered as a view of the shared stage canvas: hardware
 * nodes patched together with glowing cables. Code-split (`next/dynamic`, `ssr: false`).
 */
export default function WorkflowCanvas({ workflow, sceneKey, label, theme, flow, onReady }: WorkflowCanvasProps) {
  const palette = scenePalette(theme);
  const quality = useSceneStore((s) => s.quality);
  const settings = settingsFor(quality);
  const reducedMotion = useReducedMotion();
  const orbit = useFinePointer();
  const labels = useRef(new Map<string, HTMLElement>());

  return (
    <>
      <div role="img" aria-label={label} className="absolute inset-0" onDoubleClick={() => useSceneStore.getState().toggleMode()}>
        <StageView index={4} palette={palette} camera={{ position: workflow.camera?.position ?? DEFAULT_CAMERA.position, fov: 40 }} onReady={onReady}>
          <color attach="background" args={[palette.stage]} />
          <fog attach="fog" args={[palette.stage, 15, 32]} />
          <WorkflowWorld key={sceneKey} workflow={workflow} labels={labels} palette={palette} settings={settings} flow={flow} reducedMotion={reducedMotion} orbit={orbit} />
          <Grid
            position={[0, -2.4, 0]}
            args={[40, 40]}
            cellSize={0.6}
            cellThickness={0.6}
            cellColor={palette.gridCell}
            sectionSize={3}
            sectionThickness={1}
            sectionColor={palette.gridSection}
            fadeDistance={24}
            fadeStrength={1.6}
            infiniteGrid
          />
        </StageView>
      </div>
      <LabelLayer key={sceneKey} workflow={workflow} registry={labels} />
    </>
  );
}

interface WorkflowWorldProps {
  workflow: Workflow;
  labels: LabelRegistry;
  palette: ScenePalette;
  settings: QualitySettings;
  flow: 1 | -1;
  reducedMotion: boolean;
  orbit: boolean;
}

function WorkflowWorld({ workflow, labels, palette, settings, flow, reducedMotion, orbit }: WorkflowWorldProps) {
  // Start from the current intent, so a workflow opened already-exploded doesn't animate in from 0.
  const sim = useMemo(() => new WorkflowSim(workflow, useSceneStore.getState().mode === "exploded" ? 1 : 0), [workflow]);
  const root = useRef<Group>(null);
  const byId = useMemo(() => new Map(workflow.nodes.map((node) => [node.id, node])), [workflow]);
  // Output handles per node and which handle each connection leaves from (n8n IF/Switch fan-out).
  const ports = useMemo(() => {
    const main = mainEdges(workflow);
    const count = new Map(workflow.nodes.map((node) => [node.id, Math.max(node.kind === "router" ? 2 : 1, main.filter((e) => e.from === node.id).length)]));
    const index = new Map(main.map((edge) => [`${edge.from}-${edge.to}`, main.filter((e) => e.from === edge.from).indexOf(edge)]));
    return { count, index, subs: subNodeIds(workflow) };
  }, [workflow]);

  // Registered after the children's callbacks, so every node and cable reads the same
  // (previous) simulation state within a frame — they can never drift apart.
  useFrame(({ clock }, dt) => {
    const scene = useSceneStore.getState();
    sim.step(dt, {
      target: scene.mode === "exploded" ? 1 : 0,
      hoveredId: scene.hoveredNodeId,
      selectedId: scene.selectedNodeId,
      reducedMotion,
      time: clock.elapsedTime,
    });
    const progress = sim.progress();
    if (Math.abs(progress - scene.explodeProgress) > 0.001 || (progress !== scene.explodeProgress && (progress === 0 || progress === 1))) {
      scene._setExplodeProgress(progress);
    }
    if (root.current) root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.22) * 0.05;
  });

  return (
    <>
      <group ref={root}>
        {sim.nodes.map((node) => (
          <WorkflowNode key={node.id} node={node} data={byId.get(node.id)!} labels={labels} palette={palette} flow={flow} outputs={ports.count.get(node.id) ?? 1} sub={ports.subs.has(node.id)} />
        ))}
        {workflow.edges.map((edge) => (
          <WorkflowEdge
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            sim={sim}
            labels={labels}
            palette={palette}
            packets={edge.animated === false ? 0 : settings.packetsPerEdge}
            flow={flow}
            port={{ index: ports.index.get(`${edge.from}-${edge.to}`) ?? 0, count: ports.count.get(edge.from) ?? 1 }}
            reducedMotion={reducedMotion}
          />
        ))}
      </group>
      <CameraRig workflow={workflow} sim={sim} orbit={orbit} reducedMotion={reducedMotion} />
    </>
  );
}
