"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, RoundedBox } from "@react-three/drei";
import { AdditiveBlending, Color, NormalBlending, type Group, type Mesh, type MeshBasicMaterial } from "three";
import type { NodeKind } from "@/lib/api/types";
import type { ScenePalette } from "@/lib/theme/palette";
import type { QualitySettings } from "../utils/quality";
import { getGlowTexture } from "../utils/textures";
import type { SimNode } from "./workflow-sim";

/**
 * Procedural n8n nodes (docs/03_frontend_3d/r3f_components.md §3). Every node has an outer
 * "shell" and an inner glowing "core"; `node.local` (0 → 1) pulls them apart, so exploding
 * the workflow also explodes each node — an assembly diagram of the automation.
 */
export interface NodeMeshProps {
  node: SimNode;
  palette: ScenePalette;
  settings: QualitySettings;
  /** hovered or selected */
  hot: boolean;
  reducedMotion: boolean;
}

/** HDR colour (> 1) so only glowing parts pass the bloom threshold. */
function useGlow(hex: string, palette: ScenePalette, boost = 1) {
  return useMemo(() => new Color(hex).multiplyScalar(palette.glow * boost), [hex, palette.glow, boost]);
}

function BodyMaterial({
  palette,
  hot,
  emissive,
  emissiveIntensity = 0.12,
}: {
  palette: ScenePalette;
  hot: boolean;
  emissive: string;
  emissiveIntensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={palette.body}
      metalness={palette.bodyMetalness}
      roughness={palette.bodyRoughness}
      emissive={emissive}
      emissiveIntensity={hot ? emissiveIntensity * 2.6 : emissiveIntensity}
      flatShading
    />
  );
}

/** Trigger — a faceted diamond in a wire cage, with a pulse ring broadcasting "an event arrived". */
function TriggerMesh({ node, palette, hot, reducedMotion }: NodeMeshProps) {
  const core = useRef<Mesh>(null);
  const cage = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const glow = useGlow(palette.accent, palette);

  useFrame(({ clock }, dt) => {
    const e = node.local;
    if (!reducedMotion && core.current) core.current.rotation.y += dt * (0.5 + e * 0.8);
    if (cage.current) {
      cage.current.scale.set(1 + e * 0.5, 1.35 + e * 0.6, 1 + e * 0.5);
      if (!reducedMotion) cage.current.rotation.y -= dt * 0.25;
    }
    if (ring.current) {
      const phase = reducedMotion ? 0.4 : (clock.elapsedTime * 0.7 + node.seed) % 1;
      ring.current.scale.setScalar(0.9 + phase * 0.9 + e * 0.3);
      (ring.current.material as MeshBasicMaterial).opacity = (1 - phase) * 0.8;
    }
  });

  return (
    <group>
      <mesh ref={core} scale={[1, 1.35, 1]}>
        <octahedronGeometry args={[0.42, 0]} />
        <BodyMaterial palette={palette} hot={hot} emissive={palette.accent} emissiveIntensity={0.35} />
      </mesh>
      <mesh ref={cage} scale={[1, 1.35, 1]}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshBasicMaterial color={glow} wireframe transparent opacity={hot ? 0.9 : 0.55} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.62, 0.014, 6, 64]} />
        <meshBasicMaterial color={glow} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Router — a carbon drum with a glowing band; output fins fan out when exploded. */
function RouterMesh({ node, palette, hot, reducedMotion }: NodeMeshProps) {
  const band = useRef<Mesh>(null);
  const cap = useRef<Mesh>(null);
  const fins = useRef<Group>(null);
  const glow = useGlow(palette.pulse, palette);
  const finAngles = [-0.55, 0, 0.55];

  useFrame((_, dt) => {
    const e = node.local;
    if (band.current) {
      band.current.position.y = 0.05 + e * 0.32;
      if (!reducedMotion) band.current.rotation.z += dt * 0.8;
    }
    if (cap.current) cap.current.position.y = 0.48 + e * 0.5;
    fins.current?.children.forEach((fin, i) => {
      const angle = finAngles[i] * (0.4 + e * 1.1);
      fin.position.set(Math.cos(angle) * (0.52 + e * 0.38), 0, Math.sin(angle) * (0.52 + e * 0.38));
      fin.rotation.y = -angle;
    });
  });

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.48, 0.48, 0.82, 40]} />
        <BodyMaterial palette={palette} hot={hot} emissive={palette.pulse} />
      </mesh>
      <mesh ref={cap}>
        <cylinderGeometry args={[0.36, 0.48, 0.12, 40]} />
        <BodyMaterial palette={palette} hot={hot} emissive={palette.pulse} emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={band} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.52, 0.035, 10, 64]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      <group ref={fins}>
        {finAngles.map((angle) => (
          <mesh key={angle}>
            <boxGeometry args={[0.08, 0.32, 0.22]} />
            <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={hot ? 1 : 0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Action — a rounded n8n "card" split into lid and base around a glowing core. */
function ActionMesh({ node, palette, hot, reducedMotion }: NodeMeshProps) {
  const lid = useRef<Mesh>(null);
  const base = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const glow = useGlow(palette.accent, palette);

  useFrame((_, dt) => {
    const e = node.local;
    const gap = 0.2 + e * 0.32;
    if (lid.current) lid.current.position.y = gap;
    if (base.current) base.current.position.y = -gap;
    if (core.current) {
      core.current.scale.setScalar(0.55 + e * 0.45);
      if (!reducedMotion) {
        core.current.rotation.x += dt * 0.6;
        core.current.rotation.y += dt * 0.9;
      }
    }
  });

  return (
    <group>
      <RoundedBox ref={lid} args={[0.96, 0.36, 0.96]} radius={0.08} smoothness={3}>
        <BodyMaterial palette={palette} hot={hot} emissive={palette.accent} />
        <Edges threshold={20} color={glow} />
      </RoundedBox>
      <RoundedBox ref={base} args={[0.96, 0.36, 0.96]} radius={0.08} smoothness={3}>
        <BodyMaterial palette={palette} hot={hot} emissive={palette.accent} />
        <Edges threshold={20} color={glow} />
      </RoundedBox>
      <mesh ref={core}>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** AI — a glass icosahedron around a spinning wireframe "brain". */
function AiMesh({ node, palette, settings, hot, reducedMotion }: NodeMeshProps) {
  const shell = useRef<Mesh>(null);
  const brain = useRef<Mesh>(null);
  const glow = useGlow(palette.pulse, palette);
  const coreGlow = useGlow(palette.accent, palette, 0.9);

  useFrame((_, dt) => {
    const e = node.local;
    shell.current?.scale.setScalar(1 + e * 0.42);
    if (brain.current && !reducedMotion) {
      brain.current.rotation.y += dt * (0.7 + e * 1.6);
      brain.current.rotation.x += dt * 0.35;
    }
  });

  return (
    <group>
      <mesh ref={shell}>
        <icosahedronGeometry args={[0.62, 0]} />
        {settings.transmission ? (
          <meshPhysicalMaterial
            color={palette.theme === "dark" ? "#9fe9ff" : "#d9f6ff"}
            transmission={1}
            thickness={0.6}
            roughness={0.12}
            ior={1.45}
            metalness={0}
            clearcoat={1}
            flatShading
          />
        ) : (
          <meshStandardMaterial color={palette.pulse} transparent opacity={0.22} roughness={0.2} metalness={0.2} flatShading depthWrite={false} />
        )}
      </mesh>
      <mesh ref={brain}>
        <icosahedronGeometry args={[0.36, 1]} />
        {/* Opaque on purpose: physical transmission only refracts opaque objects behind the glass. */}
        <meshBasicMaterial color={glow} wireframe toneMapped={false} />
      </mesh>
      <mesh scale={hot ? 1.4 : 1}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial color={coreGlow} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Storage — three stacked platters with glowing rims that separate vertically. */
function StorageMesh({ node, palette, hot }: NodeMeshProps) {
  const discs = useRef<Group>(null);
  const glow = useGlow(palette.pulse, palette, 0.9);

  useFrame(() => {
    const spacing = 0.27 + node.local * 0.3;
    discs.current?.children.forEach((disc, i) => {
      disc.position.y = (i - 1) * spacing;
    });
  });

  return (
    <group ref={discs}>
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 0.2, 40]} />
            <BodyMaterial palette={palette} hot={hot} emissive={palette.pulse} />
          </mesh>
          <mesh rotation-x={Math.PI / 2} position-y={0.1}>
            <torusGeometry args={[0.47, 0.018, 8, 48]} />
            <meshBasicMaterial color={glow} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export const NODE_MESHES: Record<NodeKind, (props: NodeMeshProps) => React.JSX.Element> = {
  trigger: TriggerMesh,
  router: RouterMesh,
  action: ActionMesh,
  ai: AiMesh,
  storage: StorageMesh,
};

/** Soft halo under each node — cheap fake glow that also works without bloom (low tier, light theme). */
export function NodeHalo({ palette, color, hot }: { palette: ScenePalette; color: string; hot: boolean }) {
  const texture = useMemo(() => getGlowTexture(), []);

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.75}>
      <planeGeometry args={[2.4, 2.4]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={hot ? 0.75 : palette.additive ? 0.35 : 0.22}
        blending={palette.additive ? AdditiveBlending : NormalBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
