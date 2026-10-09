"use client";

import { forwardRef, useMemo } from "react";
import { AdditiveBlending, Color, ExtrudeGeometry, NormalBlending, Shape, type BufferGeometry, type Group, type Mesh, type Texture } from "three";
import type { ScenePalette } from "@/lib/theme/palette";
import { getGlowTexture } from "../utils/textures";

/**
 * Procedural hardware parts shared by every scene: chamfered aluminium chassis, clear acrylic
 * covers, PCBs, gold I/O pins, status LEDs and glow halos. Geometry is cached per size.
 */

const geometryCache = new Map<string, BufferGeometry>();

/**
 * A box with machined (chamfered) edges: a rounded-rectangle footprint extruded with a one-segment
 * bevel. Centred on the origin, `height` along Y.
 */
export function chamferedBox(width: number, height: number, depth: number, chamfer = 0.05, radius = 0.06): BufferGeometry {
  const key = `${width}:${height}:${depth}:${chamfer}:${radius}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;

  const w = width / 2 - chamfer;
  const d = depth / 2 - chamfer;
  const r = Math.min(radius, w, d);
  const shape = new Shape();
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);

  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, height - chamfer * 2),
    bevelEnabled: true,
    bevelThickness: chamfer,
    bevelSize: chamfer,
    bevelSegments: 1,
    curveSegments: 4,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  geometry.translate(0, -(box.max.y + box.min.y) / 2, 0);
  geometry.computeVertexNormals();
  geometryCache.set(key, geometry);
  return geometry;
}

/** HDR colour (> 1) for emissive glow on dark themes. */
export function useGlowColor(hex: string, palette: ScenePalette, boost = 1) {
  return useMemo(() => new Color(hex).multiplyScalar(palette.glow * boost), [hex, palette.glow, boost]);
}

interface ChassisProps {
  width: number;
  height: number;
  depth: number;
  palette: ScenePalette;
  /** Rim light colour along the machined edge */
  accent?: string;
  hot?: boolean;
}

/** Anodised aluminium body. */
export const Chassis = forwardRef<Mesh, ChassisProps & { children?: React.ReactNode }>(function Chassis({ width, height, depth, palette, accent, hot, children }, ref) {
  const geometry = useMemo(() => chamferedBox(width, height, depth, Math.min(0.06, height * 0.25)), [width, height, depth]);
  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial
        color={palette.theme === "dark" ? "#1c1d24" : "#3a3c46"}
        metalness={0.82}
        roughness={0.38}
        emissive={accent ?? "#000000"}
        emissiveIntensity={accent ? (hot ? 0.18 : 0.06) : 0}
      />
      {children}
    </mesh>
  );
});

/** Clear acrylic lid. Physical transmission on the high tier, a cheap translucent sheet otherwise. */
export const AcrylicCover = forwardRef<Mesh, { width: number; depth: number; thickness?: number; transmission: boolean; tint?: string }>(function AcrylicCover(
  { width, depth, thickness = 0.08, transmission, tint = "#cfefff" },
  ref,
) {
  const geometry = useMemo(() => chamferedBox(width, thickness, depth, 0.025, 0.05), [width, thickness, depth]);
  return (
    <mesh ref={ref} geometry={geometry} renderOrder={2}>
      {transmission ? (
        <meshPhysicalMaterial color={tint} transmission={1} thickness={0.25} roughness={0.08} ior={1.49} clearcoat={1} clearcoatRoughness={0.05} />
      ) : (
        <meshPhysicalMaterial color={tint} transparent opacity={0.22} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} />
      )}
    </mesh>
  );
});

/** Printed circuit board with a procedural trace texture on top. */
export const Pcb = forwardRef<Mesh, { width: number; depth: number; texture: Texture | null }>(function Pcb({ width, depth, texture }, ref) {
  return (
    <mesh ref={ref}>
      <boxGeometry args={[width, 0.035, depth]} />
      <meshStandardMaterial attach="material-0" color="#0e2420" roughness={0.6} />
      <meshStandardMaterial attach="material-1" color="#0e2420" roughness={0.6} />
      <meshStandardMaterial attach="material-2" map={texture ?? undefined} color={texture ? "#ffffff" : "#174b3f"} roughness={0.55} metalness={0.15} />
      <meshStandardMaterial attach="material-3" color="#0e2420" roughness={0.6} />
      <meshStandardMaterial attach="material-4" color="#0e2420" roughness={0.6} />
      <meshStandardMaterial attach="material-5" color="#0e2420" roughness={0.6} />
    </mesh>
  );
});

/** Gold-plated connector pins along one side (x = ±side), spaced along Z. */
export const Pins = forwardRef<Group, { count: number; side: -1 | 1; offset: number; length?: number; spread?: number }>(function Pins(
  { count, side, offset, length = 0.22, spread = 0.36 },
  ref,
) {
  const positions = useMemo(() => Array.from({ length: count }, (_, i) => (count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1))), [count, spread]);
  return (
    <group ref={ref}>
      {positions.map((z) => (
        <group key={z} position={[side * offset, 0, z]}>
          <mesh position={[(side * length) / 2, 0, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.028, 0.028, length, 10]} />
            <meshStandardMaterial color="#d4a94f" metalness={1} roughness={0.25} />
          </mesh>
          {/* insulating collar */}
          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.055, 0.055, 0.06, 12]} />
            <meshStandardMaterial color="#0c0c10" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

/** Status LED with an additive halo. */
export function Led({ color, on = true, palette, size = 0.035 }: { color: string; on?: boolean; palette: ScenePalette; size?: number }) {
  const glow = useGlowColor(color, palette, 1.2);
  const halo = useMemo(() => getGlowTexture(), []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={on ? glow : "#333338"} toneMapped={false} />
      </mesh>
      {on && (
        <sprite scale={size * 9}>
          <spriteMaterial map={halo} color={color} transparent opacity={0.8} blending={palette.additive ? AdditiveBlending : NormalBlending} depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}

/** Soft floor glow under a part (works without post-processing, in both themes). */
export function Halo({ color, palette, size = 2.2, intensity = 0.35, y = -0.5 }: { color: string; palette: ScenePalette; size?: number; intensity?: number; y?: number }) {
  const texture = useMemo(() => getGlowTexture(), []);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={palette.additive ? intensity : intensity * 0.6}
        blending={palette.additive ? AdditiveBlending : NormalBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
