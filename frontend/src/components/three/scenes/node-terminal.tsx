"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, NormalBlending, Object3D, type Group, type InstancedMesh, type Mesh } from "three";
import type { StageSceneProps } from "@/components/stage/stage-slot";
import { useReducedMotion } from "@/lib/hooks/use-media-query";
import { scenePalette, type ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { useUiStore } from "@/stores/ui-store";
import { AcrylicCover, Chassis, Halo, Led, useGlowColor } from "../hardware/parts";
import { brandFromIconName, N8N_LOGO } from "@/lib/integrations";
import { panelTexture } from "../hardware/textures";
import { StageView } from "../stage/stage-view";
import { settingsFor } from "../utils/quality";
import { stepSpring } from "../utils/spring";

export interface TerminalData {
  services: { slug: string; title: string; icon: string | null }[];
  /** Cartridge label when the visitor chose "not sure yet". */
  customLabel: string;
}

const SOCKETS = 5;
const PITCH = 0.92;
const RAIL = { width: SOCKETS * PITCH + 0.5, height: 0.26, depth: 1.15 };
const LIFT = 1.5;
const PACKETS = 10;

/**
 * Booking: a node terminal. The service chosen in the form is a hardware cartridge that drops and
 * snaps into the pipeline's first socket; each completed step lights the next socket, and a sent
 * request streams packets down the rail into a green "delivered" terminal.
 */
export default function NodeTerminal({ theme, locale, data, onReady }: StageSceneProps) {
  const palette = scenePalette(theme);
  const terminal = data as TerminalData | undefined;
  const flow = locale === "ar" ? -1 : 1;
  return (
    <StageView index={6} palette={palette} camera={{ position: [flow * 0.8, 2.9, 5.6], fov: 36, target: [0, 0.2, 0] }} onReady={onReady}>
      {terminal && <Terminal data={terminal} palette={palette} flow={flow} rtl={locale === "ar"} />}
    </StageView>
  );
}

function Terminal({ data, palette, flow, rtl }: { data: TerminalData; palette: ScenePalette; flow: 1 | -1; rtl: boolean }) {
  const track = useUiStore((s) => s.bookingTrack);
  const transmission = useSceneStore((s) => settingsFor(s.quality).transmission);
  const reducedMotion = useReducedMotion();
  const cartridge = useRef<Group>(null);
  const lit = useRef<Mesh>(null);
  const packets = useRef<InstancedMesh>(null);
  const drop = useRef({ x: 1, v: 0 });
  const seatedSlug = useRef<string | null>(null);
  const fill = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const litColor = useGlowColor(palette.pulse, palette);
  const packetColor = useGlowColor(palette.accent, palette, 1.2);

  const socketX = (i: number) => flow * (i - (SOCKETS - 1) / 2) * PITCH;
  const service = data.services.find((s) => s.slug === track.serviceSlug);
  const title = service?.title ?? data.customLabel;
  const icon = brandFromIconName(service?.icon) ?? N8N_LOGO;
  const decal = useMemo(() => panelTexture(title, "n8n · SERVICE", palette.accent, rtl ? "rtl" : "ltr", 2, icon), [title, icon, palette.accent, rtl]);
  // The cartridge seats once a service is picked (or the visitor moved past step 1).
  const seated = track.step >= 1 || track.submitted;

  useFrame(({ clock }, dt) => {
    const slug = seated ? track.serviceSlug : null;
    if (slug !== seatedSlug.current && seatedSlug.current !== null && slug !== null) drop.current.x = 1; // swapped service: pop out, drop again
    seatedSlug.current = slug;
    const target = seated ? 0 : 1;
    if (reducedMotion) drop.current.x = target;
    else stepSpring(drop.current, target, dt, { stiffness: 120, dampingRatio: 0.42 });

    if (cartridge.current) {
      cartridge.current.position.y = RAIL.height / 2 + 0.3 + LIFT * drop.current.x;
      cartridge.current.rotation.y = reducedMotion ? 0 : drop.current.x * Math.sin(clock.elapsedTime * 0.8) * 0.5;
    }

    // Rail conductor fills up to the current step (all the way once submitted).
    const fillTarget = track.submitted ? 1 : Math.min(track.step, SOCKETS - 1) / (SOCKETS - 1);
    fill.current = reducedMotion ? fillTarget : fill.current + (fillTarget - fill.current) * (1 - Math.exp(-dt * 4));
    if (lit.current) {
      const length = (SOCKETS - 1) * PITCH;
      lit.current.scale.x = Math.max(0.0001, fill.current);
      lit.current.position.x = socketX(0) + (flow * length * fill.current) / 2;
    }

    const mesh = packets.current;
    if (!mesh) return;
    for (let i = 0; i < PACKETS; i++) {
      const u = reducedMotion ? (i + 0.5) / PACKETS : (clock.elapsedTime * 0.45 + i / PACKETS) % 1;
      dummy.position.set(socketX(0) + flow * u * (SOCKETS - 1) * PITCH, RAIL.height / 2 + 0.05, 0.38);
      dummy.scale.setScalar(track.submitted ? 1 : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, -0.4, 0]}>
      <Chassis width={RAIL.width} height={RAIL.height} depth={RAIL.depth} palette={palette} accent={palette.pulse} hot={track.submitted} />

      {/* conductor along the rail: dim full length + lit fill */}
      <mesh position={[0, RAIL.height / 2 + 0.02, 0.38]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, (SOCKETS - 1) * PITCH, 10]} />
        <meshStandardMaterial color={palette.theme === "dark" ? "#2a2f3a" : "#9aa0ad"} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={lit} position={[0, RAIL.height / 2 + 0.02, 0.38]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, (SOCKETS - 1) * PITCH, 10]} />
        <meshBasicMaterial color={litColor} toneMapped={false} />
      </mesh>
      <instancedMesh ref={packets} args={[undefined, undefined, PACKETS]} frustumCulled={false}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={packetColor} toneMapped={false} transparent blending={palette.additive ? AdditiveBlending : NormalBlending} depthWrite={false} />
      </instancedMesh>

      {/* sockets: one per booking step */}
      {Array.from({ length: SOCKETS }, (_, i) => {
        const done = track.submitted || i < track.step;
        const current = !track.submitted && i === track.step;
        return (
          <group key={i} position={[socketX(i), RAIL.height / 2, -0.08]}>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.66, 0.03, 0.6]} />
              <meshStandardMaterial color="#0c0d11" roughness={0.8} />
            </mesh>
            <group position={[0, 0.06, 0.4]}>
              <Led color={done ? (track.submitted && i === SOCKETS - 1 ? "#22c55e" : palette.pulse) : palette.accent} on={done || current} palette={palette} size={0.045} />
            </group>
          </group>
        );
      })}

      {/* the service cartridge */}
      <group ref={cartridge} position={[socketX(0), RAIL.height / 2 + 0.3 + LIFT, -0.08]}>
        <Chassis width={0.62} height={0.5} depth={0.56} palette={palette} accent={palette.accent} hot={seated} />
        <group position={[0, 0.28, 0]}>
          <AcrylicCover width={0.6} depth={0.54} thickness={0.05} transmission={transmission} />
        </group>
        {decal && (
          <mesh position={[0, 0, 0.285]}>
            <planeGeometry args={[0.58, 0.29]} />
            <meshBasicMaterial map={decal} transparent toneMapped={false} />
          </mesh>
        )}
        {/* contact fingers on the underside */}
        {[-0.18, -0.06, 0.06, 0.18].map((x) => (
          <mesh key={x} position={[x, -0.27, 0]}>
            <boxGeometry args={[0.06, 0.05, 0.4]} />
            <meshStandardMaterial color="#d4a94f" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* delivered terminal at the end of the pipeline */}
      <group position={[socketX(SOCKETS - 1) + flow * 0.62, RAIL.height / 2 + 0.25, -0.08]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.2, 0.5, 20]} />
          <meshStandardMaterial color="#23252c" metalness={0.85} roughness={0.3} />
        </mesh>
        <group position={[0, 0.32, 0]}>
          <Led color="#22c55e" on={track.submitted} palette={palette} size={0.07} />
        </group>
      </group>

      <Halo color={track.submitted ? "#22c55e" : palette.pulse} palette={palette} size={6} y={-RAIL.height / 2 - 0.02} intensity={track.submitted ? 0.5 : 0.28} />
    </group>
  );
}
