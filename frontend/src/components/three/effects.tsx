"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";

/**
 * Selective neon bloom: only HDR colours (> 1, the glowing parts with toneMapped={false}) pass
 * the threshold. Loaded lazily and only on high/medium tiers in the dark theme.
 */
export default function Effects({ intensity, multisampling }: { intensity: number; multisampling: number }) {
  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={intensity} luminanceThreshold={1} luminanceSmoothing={0.15} radius={0.72} />
    </EffectComposer>
  );
}
