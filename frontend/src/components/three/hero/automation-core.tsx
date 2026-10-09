"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { AdditiveBlending, Color, NormalBlending, Object3D, type Group, type InstancedMesh, type Mesh } from "three";
import { useReducedMotion } from "@/lib/hooks/use-media-query";
import { scenePalette, type ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { SceneCanvas } from "../scene-canvas";
import { getGlowTexture } from "../utils/textures";

/** Three tilted orbits, each carrying n8n-style node cubes and faster data packets. */
const ORBITS: {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  nodes: number;
  color: "pulse" | "accent";
}[] = [
  {
    radius: 2.05,
    tilt: [1.15, 0, 0.35],
    speed: 0.32,
    nodes: 4,
    color: "pulse",
  },
  {
    radius: 2.6,
    tilt: [1.5, 0.6, -0.2],
    speed: -0.22,
    nodes: 5,
    color: "accent",
  },
  {
    radius: 3.1,
    tilt: [0.9, -0.7, 0.9],
    speed: 0.16,
    nodes: 6,
    color: "pulse",
  },
];
const PACKETS_PER_ORBIT = 10;

/** Click "energy": 1 right after a click, decaying to 0 — speeds the orbits up and swells the core. */
interface Energy {
  value: number;
}

/**
 * Hero centrepiece: a faceted automation "core" wrapped by orbits of nodes and data packets,
 * leaning toward the pointer. Transparent canvas over the page; glow comes from additive
 * halo sprites (no post-processing, so it stays cheap and works on any background).
 * Clicking the core fires a "data burst": packets race around the orbits and the core pulses.
 */
export default function AutomationCore({ label, theme, onReady }: { label: string; theme: string | undefined; onReady?: () => void }) {
  const palette = scenePalette(theme);

  return (
    <SceneCanvas label={label} camera={{ position: [0, 0, 8], fov: 38 }} transparent onReady={onReady}>
      <ambientLight intensity={palette.ambient + 0.2} />
      <directionalLight position={[3, 5, 6]} intensity={1.6} />
      <pointLight position={[-4, -2, 3]} color={palette.accent} intensity={30} distance={14} />
      <pointLight position={[4, 3, 2]} color={palette.pulse} intensity={24} distance={14} />
      <CoreRig palette={palette} />
    </SceneCanvas>
  );
}

function CoreRig({ palette }: { palette: ScenePalette }) {
  const rig = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const cage = useRef<Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();
  const glowAccent = useMemo(() => new Color(palette.accent).multiplyScalar(palette.glow), [palette]);
  const glowTexture = useMemo(() => getGlowTexture(), []);
  // Written on click, read every frame — never during render.
  const energy = useRef<Energy>({ value: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const burst = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    energy.current.value = 1;
  };

  // Window-level pointer so the core leans toward the cursor anywhere in the hero.
  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useFrame((_, dt) => {
    energy.current.value *= Math.exp(-dt * 1.4);
    if (reducedMotion) return;
    if (rig.current) {
      rig.current.rotation.y += (pointer.current.x * 0.3 - rig.current.rotation.y) * Math.min(1, dt * 2.5);
      rig.current.rotation.x += (pointer.current.y * 0.2 - rig.current.rotation.x) * Math.min(1, dt * 2.5);
    }
    const boost = 1 + energy.current.value * 6;
    if (core.current) {
      core.current.rotation.y += dt * 0.35 * boost;
      core.current.rotation.x += dt * 0.12 * boost;
      core.current.scale.setScalar(1 + energy.current.value * 0.18);
    }
    if (cage.current) {
      cage.current.rotation.y -= dt * 0.18 * boost;
      cage.current.scale.setScalar(1 + energy.current.value * 0.35);
    }
  });

  return (
    <group ref={rig}>
      <mesh
        ref={core}
        onClick={burst}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <icosahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color={palette.body} metalness={0.6} roughness={0.3} emissive={palette.accent} emissiveIntensity={0.18} flatShading />
      </mesh>
      <mesh ref={cage}>
        <icosahedronGeometry args={[1.32, 1]} />
        <meshBasicMaterial color={glowAccent} wireframe transparent opacity={palette.additive ? 0.32 : 0.45} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshBasicMaterial color={glowAccent} toneMapped={false} />
      </mesh>
      <sprite scale={4.6}>
        <spriteMaterial
          map={glowTexture}
          color={palette.accent}
          transparent
          opacity={palette.additive ? 0.55 : 0.28}
          blending={palette.additive ? AdditiveBlending : NormalBlending}
          depthWrite={false}
        />
      </sprite>
      {ORBITS.map((orbit, i) => (
        <Orbit key={i} {...orbit} palette={palette} reducedMotion={reducedMotion} energy={energy} />
      ))}
    </group>
  );
}

interface OrbitProps {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  nodes: number;
  color: "pulse" | "accent";
  palette: ScenePalette;
  reducedMotion: boolean;
  energy: React.RefObject<Energy>;
}

function Orbit({ radius, tilt, speed, nodes, color, palette, reducedMotion, energy }: OrbitProps) {
  const cubes = useRef<InstancedMesh>(null);
  const packets = useRef<InstancedMesh>(null);
  const dummy = useRef(new Object3D());
  const lowTier = useSceneStore((s) => s.quality === "low");
  const packetCount = lowTier ? PACKETS_PER_ORBIT / 2 : PACKETS_PER_ORBIT;
  const hex = palette[color];
  const glow = useMemo(() => new Color(hex).multiplyScalar(palette.glow), [hex, palette.glow]);
  /** Own clock so a burst can speed the orbit up without a jump when it ends. */
  const phase = useRef(0);

  useFrame((_, dt) => {
    if (!reducedMotion) phase.current += Math.min(dt, 0.1) * (1 + energy.current.value * 5);
    const time = phase.current;
    const d = dummy.current;

    if (cubes.current) {
      for (let i = 0; i < nodes; i++) {
        const angle = time * speed + (i / nodes) * Math.PI * 2;
        d.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        d.rotation.set(time * 0.6 + i, time * 0.4, 0);
        d.scale.setScalar(1);
        d.updateMatrix();
        cubes.current.setMatrixAt(i, d.matrix);
      }
      cubes.current.instanceMatrix.needsUpdate = true;
    }

    if (packets.current) {
      for (let i = 0; i < packetCount; i++) {
        const angle = time * speed * 3.2 + (i / packetCount) * Math.PI * 2;
        d.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(0.6 + 0.4 * Math.sin(angle * 3 + time));
        d.updateMatrix();
        packets.current.setMatrixAt(i, d.matrix);
      }
      packets.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.006, 6, 160]} />
        <meshBasicMaterial color={glow} transparent opacity={palette.additive ? 0.35 : 0.5} toneMapped={false} />
      </mesh>
      <instancedMesh ref={cubes} args={[undefined, undefined, nodes]} frustumCulled={false}>
        <boxGeometry args={[0.17, 0.17, 0.17]} />
        <meshStandardMaterial color={palette.body} metalness={0.5} roughness={0.35} emissive={hex} emissiveIntensity={0.6} />
      </instancedMesh>
      <instancedMesh key={packetCount} ref={packets} args={[undefined, undefined, packetCount]} frustumCulled={false}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color={glow} toneMapped={false} transparent blending={palette.additive ? AdditiveBlending : NormalBlending} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
