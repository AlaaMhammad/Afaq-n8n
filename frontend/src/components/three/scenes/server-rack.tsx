"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { StageSceneProps } from "@/components/stage/stage-slot";
import { useReducedMotion } from "@/lib/hooks/use-media-query";
import { snapEase, staggered } from "@/lib/stage/progress";
import { scenePalette, type ScenePalette } from "@/lib/theme/palette";
import { useUiStore } from "@/stores/ui-store";
import { Chassis, Halo, Led } from "../hardware/parts";
import { brandFromIconName } from "@/lib/integrations";
import { panelTexture } from "../hardware/textures";
import { StageView, useSectionProgress } from "../stage/stage-view";
import { damp } from "../utils/spring";

export interface RackService {
  slug: string;
  title: string;
  caption: string;
  icon: string | null;
}

const BLADE = { width: 2.6, height: 0.34, depth: 1.6 };
const GAP = 0.1;
const SLIDE = 0.95;

/**
 * Services: a 3D server rack. As the section scrolls in, each service blade slides out of the rack
 * in turn (snapping on its rails); hovering a service card pulls its blade further and lights it.
 */
export default function ServerRack({ theme, locale, data, onReady }: StageSceneProps) {
  const palette = scenePalette(theme);
  const services = (data as RackService[] | undefined) ?? [];
  const flow = locale === "ar" ? -1 : 1;
  const height = services.length * (BLADE.height + GAP) + 0.3;
  return (
    <StageView index={3} palette={palette} camera={{ position: [flow * 3.2, 1.9, 6.2], fov: 34, target: [0, 0, 0.3] }} onReady={onReady}>
      <Rack services={services} palette={palette} flow={flow} height={height} locale={locale} />
    </StageView>
  );
}

function Rack({ services, palette, flow, height, locale }: { services: RackService[]; palette: ScenePalette; flow: 1 | -1; height: number; locale: "ar" | "en" }) {
  const progress = useSectionProgress("services");
  const reducedMotion = useReducedMotion();
  const blades = useRef<(Group | null)[]>([]);
  const offsets = useRef<number[]>([]);
  const rig = useRef<Group>(null);

  useFrame(({ clock }, dt) => {
    // Slide out over the first ~half of the section's travel through the viewport.
    const p = Math.min(1, progress.current / 0.5);
    const focused = useUiStore.getState().focus.service;
    services.forEach((service, i) => {
      const blade = blades.current[i];
      if (!blade) return;
      const base = snapEase(staggered(p, i, services.length, 0.55)) * SLIDE;
      const target = base + (focused === service.slug ? 0.55 : 0);
      offsets.current[i] = reducedMotion ? target : damp(offsets.current[i] ?? 0, target, 9, dt);
      blade.position.z = offsets.current[i];
    });
    if (rig.current && !reducedMotion) rig.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.04;
  });

  const top = height / 2;

  return (
    <group ref={rig} position={[0, 0, 0]}>
      {/* rack frame: four posts, top and bottom plates */}
      {[-1, 1].map((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} position={[x * (BLADE.width / 2 + 0.09), 0, z * (BLADE.depth / 2) - 0.05]}>
            <boxGeometry args={[0.08, height + 0.2, 0.08]} />
            <meshStandardMaterial color={palette.theme === "dark" ? "#2a2c34" : "#4a4d58"} metalness={0.9} roughness={0.35} />
          </mesh>
        )),
      )}
      {[-1, 1].map((y) => (
        <group key={y} position={[0, y * (top + 0.1), -0.05]}>
          <Chassis width={BLADE.width + 0.34} height={0.1} depth={BLADE.depth + 0.1} palette={palette} />
        </group>
      ))}

      {services.map((service, i) => (
        <group key={service.slug} position={[0, top - 0.25 - i * (BLADE.height + GAP), 0]}>
          <group
            ref={(element) => {
              blades.current[i] = element;
            }}
          >
            <Blade service={service} palette={palette} flow={flow} locale={locale} />
          </group>
        </group>
      ))}

      <Halo color={palette.pulse} palette={palette} size={5} y={-top - 0.25} intensity={0.35} />
    </group>
  );
}

function Blade({ service, palette, flow, locale }: { service: RackService; palette: ScenePalette; flow: 1 | -1; locale: "ar" | "en" }) {
  const focused = useUiStore((s) => s.focus.service === service.slug);
  const face = useMemo(() => panelTexture(service.title, service.caption, palette.accent, locale === "ar" ? "rtl" : "ltr", (BLADE.width - 0.12) / (BLADE.height - 0.06), brandFromIconName(service.icon)), [service.title, service.caption, service.icon, palette.accent, locale]);

  return (
    <group>
      <Chassis width={BLADE.width} height={BLADE.height} depth={BLADE.depth} palette={palette} accent={palette.accent} hot={focused} />
      {face && (
        <mesh position={[0, 0, BLADE.depth / 2 + 0.004]}>
          <planeGeometry args={[BLADE.width - 0.12, BLADE.height - 0.06]} />
          <meshStandardMaterial map={face} roughness={0.45} metalness={0.25} emissive="#ffffff" emissiveMap={face} emissiveIntensity={focused ? 0.35 : 0.12} />
        </mesh>
      )}
      {/* handles */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (BLADE.width / 2 - 0.05), 0, BLADE.depth / 2 + 0.06]}>
          <boxGeometry args={[0.05, BLADE.height * 0.7, 0.1]} />
          <meshStandardMaterial color="#b8bcc6" metalness={1} roughness={0.2} />
        </mesh>
      ))}
      <group position={[-flow * (BLADE.width / 2 - 0.2), BLADE.height / 2 - 0.08, BLADE.depth / 2 + 0.01]}>
        <Led color={focused ? palette.accent : palette.pulse} palette={palette} size={0.03} />
      </group>
    </group>
  );
}
