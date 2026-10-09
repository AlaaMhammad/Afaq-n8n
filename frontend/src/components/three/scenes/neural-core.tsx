"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineSegments, NormalBlending, type Group, type Mesh } from "three";
import type { StageSceneProps } from "@/components/stage/stage-slot";
import { useReducedMotion } from "@/lib/hooks/use-media-query";
import { clamp01, snapEase, staggered } from "@/lib/stage/progress";
import { scenePalette, type ScenePalette } from "@/lib/theme/palette";
import { useUiStore } from "@/stores/ui-store";
import { monogram } from "../hardware/decal-text";
import { Chassis, Halo, useGlowColor } from "../hardware/parts";
import { chipTexture } from "../hardware/textures";
import { StageView, useSectionProgress } from "../stage/stage-view";
import { getGlowTexture } from "../utils/textures";
import { damp } from "../utils/spring";

export interface CoreMember {
  id: number;
  name: string;
  role: string;
}

const CHIP = { width: 1.5, height: 0.94, thickness: 0.07 };
const RADIUS = 2.15;

/**
 * Team: a neural core from which each member's holographic profile chip emerges as the section
 * scrolls in, tethered by synapse links. Hovering a member's card brings their chip forward.
 */
export default function NeuralCore({ theme, locale, data, onReady }: StageSceneProps) {
  const palette = scenePalette(theme);
  const members = (data as CoreMember[] | undefined) ?? [];
  return (
    <StageView index={5} palette={palette} camera={{ position: [0, 0.4, 7.4], fov: 38, target: [0, 0, 0] }} onReady={onReady}>
      <Core members={members} palette={palette} rtl={locale === "ar"} />
    </StageView>
  );
}

function Core({ members, palette, rtl }: { members: CoreMember[]; palette: ScenePalette; rtl: boolean }) {
  const progress = useSectionProgress("team");
  const reducedMotion = useReducedMotion();
  const brain = useRef<Mesh>(null);
  const shell = useRef<Mesh>(null);
  const chips = useRef<(Group | null)[]>([]);
  const forward = useRef<number[]>([]);
  const spin = useRef(0);
  const pulseGlow = useGlowColor(palette.pulse, palette);
  const accentGlow = useGlowColor(palette.accent, palette, 1.2);
  const halo = useMemo(() => getGlowTexture(), []);
  const count = Math.max(members.length, 1);

  const links = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 2 * 3), 3));
    const material = new LineBasicMaterial({ color: new Color(palette.pulse), transparent: true, opacity: 0.55, toneMapped: false, blending: palette.additive ? AdditiveBlending : NormalBlending });
    return new LineSegments(geometry, material);
  }, [count, palette]);
  useEffect(() => () => links.geometry.dispose(), [links]);
  const linkLines = useRef<LineSegments>(null);

  useFrame(({ clock }, dt) => {
    const p = clamp01((progress.current - 0.12) / 0.38);
    if (!reducedMotion) spin.current += dt * 0.12;
    if (brain.current && !reducedMotion) {
      brain.current.rotation.y += dt * 0.5;
      brain.current.rotation.x += dt * 0.2;
    }
    if (shell.current) shell.current.scale.setScalar(1 + 0.04 * Math.sin(clock.elapsedTime * 2));

    const focused = useUiStore.getState().focus.member;
    const lines = linkLines.current;
    if (!lines) return;
    const positions = lines.geometry.attributes.position as BufferAttribute;
    members.forEach((member, i) => {
      const chip = chips.current[i];
      if (!chip) return;
      const t = snapEase(staggered(p, i, members.length, 0.6));
      const angle = (i / count) * Math.PI * 2 + spin.current + Math.PI / 2;
      const x = Math.cos(angle) * RADIUS * t * (rtl ? -1 : 1);
      const y = Math.sin(angle) * RADIUS * 0.62 * t;
      const target = focused === member.id ? 1 : 0;
      forward.current[i] = reducedMotion ? target : damp(forward.current[i] ?? 0, target, 8, dt);
      const f = forward.current[i];
      chip.position.set(x, y, 0.2 + f * 1.1);
      chip.scale.setScalar(Math.max(0.001, 0.25 + 0.75 * Math.min(t, 1)) * (1 + f * 0.15));
      chip.rotation.set(0, -x * 0.12 * (1 - f), 0);
      positions.setXYZ(i * 2, 0, 0, 0);
      positions.setXYZ(i * 2 + 1, x * 0.92, y * 0.92, 0.1);
    });
    positions.needsUpdate = true;
    (lines.material as LineBasicMaterial).opacity = 0.2 + 0.45 * p;
  });

  return (
    <group>
      <mesh ref={brain}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshBasicMaterial color={pulseGlow} wireframe toneMapped={false} />
      </mesh>
      <mesh ref={shell}>
        <sphereGeometry args={[0.36, 24, 24]} />
        <meshBasicMaterial color={accentGlow} toneMapped={false} />
      </mesh>
      <sprite scale={3.6}>
        <spriteMaterial map={halo} color={palette.pulse} transparent opacity={palette.additive ? 0.5 : 0.3} blending={palette.additive ? AdditiveBlending : NormalBlending} depthWrite={false} />
      </sprite>
      <primitive ref={linkLines} object={links} />

      {members.map((member, i) => (
        <group
          key={member.id}
          ref={(element) => {
            chips.current[i] = element;
          }}
        >
          <Chip member={member} palette={palette} rtl={rtl} />
        </group>
      ))}

      <Halo color={palette.pulse} palette={palette} size={6} y={-1.9} intensity={0.25} />
    </group>
  );
}

function Chip({ member, palette, rtl }: { member: CoreMember; palette: ScenePalette; rtl: boolean }) {
  const focused = useUiStore((s) => s.focus.member === member.id);
  const face = useMemo(() => chipTexture(monogram(member.name), member.name, member.role, palette.accent, palette.pulse, rtl ? "rtl" : "ltr"), [member.name, member.role, palette.accent, palette.pulse, rtl]);

  return (
    <group rotation-x={Math.PI / 2}>
      <Chassis width={CHIP.width} height={CHIP.thickness} depth={CHIP.height} palette={palette} accent={palette.pulse} hot={focused} />
      {face && (
        <mesh position={[0, CHIP.thickness / 2 + 0.003, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[CHIP.width - 0.08, CHIP.height - 0.08]} />
          <meshBasicMaterial map={face} toneMapped={false} transparent opacity={focused ? 1 : 0.92} />
        </mesh>
      )}
    </group>
  );
}
