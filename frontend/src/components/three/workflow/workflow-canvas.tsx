"use client";

import { lazy, Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import type { Group } from "three";
import type { Workflow } from "@/lib/api/types";
import { useFinePointer, useReducedMotion } from "@/lib/hooks/use-media-query";
import { scenePalette, type ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { Lighting } from "../lighting";
import { SceneCanvas } from "../scene-canvas";
import { DEFAULT_CAMERA } from "../utils/camera";
import { settingsFor, type QualitySettings } from "../utils/quality";
import { CameraRig } from "./camera-rig";
import { LabelLayer, type LabelRegistry } from "./label-layer";
import { WorkflowEdge } from "./workflow-edge";
import { WorkflowNode } from "./workflow-node";
import { WorkflowSim } from "./workflow-sim";

const Effects = lazy(() => import("../effects"));

export interface WorkflowCanvasProps {
  /** Locale-resolved (and RTL-mirrored) workflow */
  workflow: Workflow;
  /** Changes when the project or locale changes → fresh simulation */
  sceneKey: string;
  label: string;
  theme: string | undefined;
  onReady?: () => void;
}

/**
 * The portfolio's interactive 3D workflow. Default export so it can be code-split with
 * `next/dynamic({ ssr: false })` — three.js never reaches the server or the initial bundle.
 */
export default function WorkflowCanvas({ workflow, sceneKey, label, theme, onReady }: WorkflowCanvasProps) {
  const palette = scenePalette(theme);
  const quality = useSceneStore((s) => s.quality);
  const settings = settingsFor(quality);
  const reducedMotion = useReducedMotion();
  const orbit = useFinePointer();
  const labels = useRef(new Map<string, HTMLElement>());

  return (
    <>
      <SceneCanvas
        label={label}
        camera={{
          position: workflow.camera?.position ?? DEFAULT_CAMERA.position,
          fov: 40,
        }}
        monitorPerformance
        onReady={onReady}
        onPointerMissed={() => useSceneStore.getState().selectNode(null)}
        onDoubleClick={() => useSceneStore.getState().toggleMode()}
      >
        <color attach="background" args={[palette.stage]} />
        <fog attach="fog" args={[palette.stage, 15, 32]} />
        <Lighting palette={palette} envResolution={settings.envResolution} />
        <WorkflowWorld key={sceneKey} workflow={workflow} labels={labels} palette={palette} settings={settings} reducedMotion={reducedMotion} orbit={orbit} />
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
        {settings.bloom > 0 && palette.theme === "dark" && (
          <Suspense fallback={null}>
            <Effects intensity={settings.bloom} multisampling={settings.multisampling} />
          </Suspense>
        )}
      </SceneCanvas>
      <LabelLayer key={sceneKey} workflow={workflow} registry={labels} />
    </>
  );
}

interface WorkflowWorldProps {
  workflow: Workflow;
  labels: LabelRegistry;
  palette: ScenePalette;
  settings: QualitySettings;
  reducedMotion: boolean;
  orbit: boolean;
}

function WorkflowWorld({ workflow, labels, palette, settings, reducedMotion, orbit }: WorkflowWorldProps) {
  // Start from the current intent, so a workflow opened already-exploded doesn't animate in from 0.
  const sim = useMemo(() => new WorkflowSim(workflow, useSceneStore.getState().mode === "exploded" ? 1 : 0), [workflow]);
  const root = useRef<Group>(null);

  // Registered after the children's callbacks, so every node and edge reads the same
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
          <WorkflowNode key={node.id} node={node} labels={labels} palette={palette} settings={settings} reducedMotion={reducedMotion} />
        ))}
        {workflow.edges.map((edge) => (
          <WorkflowEdge
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            sim={sim}
            labels={labels}
            palette={palette}
            packets={edge.animated === false ? 0 : settings.packetsPerEdge}
            reducedMotion={reducedMotion}
          />
        ))}
      </group>
      <CameraRig workflow={workflow} sim={sim} orbit={orbit} reducedMotion={reducedMotion} />
    </>
  );
}
