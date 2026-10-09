"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { NodeKind } from "@/lib/api/types";
import type { ScenePalette } from "@/lib/theme/palette";
import { clamp01 } from "@/lib/stage/progress";
import { integrationName, portCounts } from "./decal-text";
import { AcrylicCover, Chassis, Halo, Led, Pcb, Pins, useGlowColor } from "./parts";
import { decalTexture, pcbTexture } from "./textures";

/** Footprint of one hardware node (scene units). */
export const NODE_WIDTH = 1.2;
export const NODE_DEPTH = 0.95;
const CHASSIS_H = 0.3;
/** Distance from a node's centre to the tip of its I/O pins (cables plug in here). */
export const PIN_REACH = NODE_WIDTH / 2 + 0.22;

export interface HardwareNodeProps {
  id: string;
  kind: NodeKind;
  label: string;
  n8nType: string;
  palette: ScenePalette;
  /** +1: data flows toward +x (LTR); -1 in Arabic, where workflows read right → left. */
  flow: 1 | -1;
  transmission: boolean;
  /** Reads the node's layer separation every frame (0 assembled, ~1 exploded; may overshoot). */
  separation: () => number;
  hot: boolean;
  reducedMotion: boolean;
}

export const kindAccent = (kind: NodeKind, palette: ScenePalette) => (kind === "trigger" || kind === "action" ? palette.accent : palette.pulse);

/**
 * An n8n node built like a piece of hardware: anodised chamfered chassis, a PCB with a chip, a clear
 * acrylic cover screen-printed with the integration name, gold input/output pins and status LEDs.
 * Exploding lifts the cover, raises the board and drops the chassis — an assembly diagram — and
 * the spring's overshoot makes the layers "snap" back together on assemble.
 */
export function HardwareNode({ id, kind, label, n8nType, palette, flow, transmission, separation, hot, reducedMotion }: HardwareNodeProps) {
  const accent = kindAccent(kind, palette);
  const ports = portCounts(kind);
  const chassis = useRef<Group>(null);
  const board = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const inputs = useRef<Group>(null);
  const outputs = useRef<Group>(null);
  const lever = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const coreGlow = useGlowColor(accent, palette, 1.1);

  const pcb = useMemo(() => pcbTexture(id, accent, palette.theme), [id, accent, palette.theme]);
  const decal = useMemo(() => decalTexture(integrationName(n8nType), label, accent, flow === -1 ? "rtl" : "ltr"), [n8nType, label, accent, flow]);

  useFrame(({ clock }, dt) => {
    const s = separation();
    const e = Math.max(s, 0);
    // A slight negative overshoot presses the layers together — the "snap" on assemble.
    const press = Math.min(s, 0);
    if (chassis.current) chassis.current.position.y = -0.32 * e;
    if (board.current) board.current.position.y = CHASSIS_H / 2 + 0.02 + 0.42 * e + press * 0.06;
    if (cover.current) {
      cover.current.position.y = CHASSIS_H / 2 + 0.09 + 0.95 * e + press * 0.1;
      cover.current.rotation.x = -0.18 * clamp01(e);
      cover.current.rotation.z = 0.06 * clamp01(e) * flow;
    }
    const reach = NODE_WIDTH / 2 + 0.16 * clamp01(e);
    if (inputs.current) inputs.current.position.x = -flow * (reach - NODE_WIDTH / 2);
    if (outputs.current) outputs.current.position.x = flow * (reach - NODE_WIDTH / 2);
    if (lever.current) lever.current.rotation.z = flow * (-0.6 + 1.2 * clamp01(e));
    if (core.current && !reducedMotion) {
      core.current.rotation.y += dt * (0.8 + 2 * clamp01(e));
      core.current.scale.setScalar(1 + 0.12 * Math.sin(clock.elapsedTime * 3));
    }
  });

  return (
    <group>
      <group ref={chassis}>
        <Chassis width={NODE_WIDTH} height={CHASSIS_H} depth={NODE_DEPTH} palette={palette} accent={accent} hot={hot} />
        {/* front status LEDs */}
        <group position={[-flow * (NODE_WIDTH / 2 - 0.16), 0.02, NODE_DEPTH / 2 + 0.005]}>
          <Led color={accent} palette={palette} />
          <group position={[flow * 0.12, 0, 0]}>
            <Led color={palette.pulse} on={hot} palette={palette} />
          </group>
        </group>
        {kind === "trigger" && (
          <group ref={lever} position={[0, CHASSIS_H / 2, NODE_DEPTH / 2 - 0.12]}>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.26, 10]} />
              <meshStandardMaterial color="#c9ccd4" metalness={1} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.27, 0]}>
              <sphereGeometry args={[0.06, 14, 14]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
            </mesh>
          </group>
        )}
        <group ref={inputs}>{ports.inputs > 0 && <Pins count={ports.inputs} side={(-flow) as -1 | 1} offset={NODE_WIDTH / 2} />}</group>
        <group ref={outputs}>
          <Pins count={ports.outputs} side={flow} offset={NODE_WIDTH / 2} spread={0.5} />
        </group>
      </group>

      <group ref={board}>
        <Pcb width={NODE_WIDTH - 0.16} depth={NODE_DEPTH - 0.16} texture={pcb} />
        {(kind === "ai" || kind === "router") && (
          <mesh ref={core} position={[0, 0.07, 0]}>
            {kind === "ai" ? <icosahedronGeometry args={[0.12, 1]} /> : <octahedronGeometry args={[0.1, 0]} />}
            <meshBasicMaterial color={coreGlow} toneMapped={false} wireframe={kind === "ai"} />
          </mesh>
        )}
        {kind === "storage" &&
          [0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.05 + i * 0.045, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.03, 32]} />
              <meshStandardMaterial color="#9aa0aa" metalness={1} roughness={0.18} />
            </mesh>
          ))}
      </group>

      <group ref={cover}>
        <AcrylicCover width={NODE_WIDTH - 0.04} depth={NODE_DEPTH - 0.04} transmission={transmission} />
        {decal && (
          <mesh position={[0, 0.045, 0]} rotation-x={-Math.PI / 2} renderOrder={3}>
            <planeGeometry args={[NODE_WIDTH - 0.2, (NODE_WIDTH - 0.2) / 2]} />
            <meshBasicMaterial map={decal} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>

      <Halo color={accent} palette={palette} y={-0.62} intensity={hot ? 0.6 : 0.3} />
    </group>
  );
}
