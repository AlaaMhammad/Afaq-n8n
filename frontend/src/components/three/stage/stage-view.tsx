"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, PerspectiveCamera, View } from "@react-three/drei";
import type { SectionId, Vec3 } from "@/lib/api/types";
import { travelProgress } from "@/lib/stage/progress";
import type { ScenePalette } from "@/lib/theme/palette";

interface StageViewProps {
  children: ReactNode;
  palette: ScenePalette;
  camera: { position: Vec3; fov?: number; target?: Vec3 };
  /** Render order inside the shared canvas (the conduit background is 1). */
  index: number;
  className?: string;
  onReady?: () => void;
  /** Cheap image-based lighting (rendered once) so metal and acrylic pick up reflections. */
  environment?: boolean;
}

/**
 * One scissored viewport of the shared stage canvas, laid over its DOM placeholder.
 * Gives the vignette its own camera, studio lighting and a first-frame "ready" signal.
 */
export function StageView({ children, palette, camera, index, className = "absolute inset-0", onReady, environment = true }: StageViewProps) {
  return (
    <View className={className} index={index}>
      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov ?? 35} near={0.1} far={80} onUpdate={(c) => c.lookAt(...(camera.target ?? [0, 0, 0]))} />
      <ambientLight intensity={palette.ambient} />
      <directionalLight position={[4, 7, 6]} intensity={palette.theme === "dark" ? 1.4 : 1.9} />
      <pointLight position={[-6, 2, 4]} color={palette.accent} intensity={palette.theme === "dark" ? 30 : 14} distance={20} decay={2} />
      <pointLight position={[6, -1, 4]} color={palette.pulse} intensity={palette.theme === "dark" ? 26 : 12} distance={20} decay={2} />
      {environment && (
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={palette.theme === "dark" ? 1.6 : 2.4} color="#ffffff" position={[0, 6, -3]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
          <Lightformer form="rect" intensity={3} color={palette.accent} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
          <Lightformer form="rect" intensity={3} color={palette.pulse} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} />
        </Environment>
      )}
      {children}
      {onReady && <FirstFrame onReady={onReady} />}
    </View>
  );
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

/**
 * Live scroll progress of a page section (0 entering from below → 1 leaving above), refreshed
 * every frame into a ref — read it inside useFrame, never during render.
 */
export function useSectionProgress(sectionId: SectionId) {
  const progress = useRef(0);
  const element = useRef<HTMLElement | null>(null);
  useFrame(() => {
    element.current ??= document.getElementById(sectionId);
    if (!element.current) return;
    progress.current = travelProgress(element.current.getBoundingClientRect(), window.innerHeight);
  }, -1);
  return progress;
}
