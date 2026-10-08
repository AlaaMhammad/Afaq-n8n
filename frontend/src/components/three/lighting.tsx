"use client";

import { Environment, Lightformer } from "@react-three/drei";
import type { ScenePalette } from "@/lib/theme/palette";

/**
 * Key + orange/cyan rim lights, plus a procedural environment (Lightformers rendered once into
 * a cube map) so metallic node bodies pick up neon reflections — no HDR download, no CDN.
 */
export function Lighting({ palette, envResolution }: { palette: ScenePalette; envResolution: number }) {
  return (
    <>
      <ambientLight intensity={palette.ambient} />
      <directionalLight position={[4, 7, 6]} intensity={palette.theme === "dark" ? 1.3 : 1.8} />
      <pointLight position={[-7, 2, 4]} color={palette.accent} intensity={palette.theme === "dark" ? 40 : 18} distance={22} decay={2} />
      <pointLight position={[7, -1, 4]} color={palette.pulse} intensity={palette.theme === "dark" ? 34 : 14} distance={22} decay={2} />
      <Environment resolution={envResolution} frames={1}>
        <Lightformer
          form="rect"
          intensity={palette.theme === "dark" ? 1.6 : 2.4}
          color="#ffffff"
          position={[0, 6, -3]}
          rotation-x={Math.PI / 2}
          scale={[12, 3, 1]}
        />
        <Lightformer form="rect" intensity={3} color={palette.accent} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={3} color={palette.pulse} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 2, 8]} scale={4} />
      </Environment>
    </>
  );
}
