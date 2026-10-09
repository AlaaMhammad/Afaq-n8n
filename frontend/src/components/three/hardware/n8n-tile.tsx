"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ExtrudeGeometry, Path, Shape, type BufferGeometry, type Group } from "three";
import type { NodeKind } from "@/lib/api/types";
import { displayColor, iconForNodeType } from "@/lib/integrations";
import { clamp01 } from "@/lib/stage/progress";
import type { ScenePalette } from "@/lib/theme/palette";
import { Halo } from "./parts";
import { boltTexture, nodeFaceTexture } from "./textures";

/** Tile edge length (scene units) — n8n's square node. */
export const TILE = 1.1;
const DEPTH = 0.2;
const HANDLE_R = 0.07;
/** Centre → handle tip: cables plug in here. */
export const TILE_REACH = TILE / 2 + HANDLE_R;

const EXECUTED = "#3fb950";

/**
 * n8n node outline in the XY plane, centred: a rounded square, or for triggers n8n's "D" shape
 * (fully rounded on the input side). `inset` shrinks it (used for the rim's inner hole).
 */
export function tileShape(trigger: boolean, flow: 1 | -1, inset = 0): Shape {
  const half = TILE / 2 - inset;
  const r = Math.max(0.02, 0.15 - inset);
  const round = trigger ? half : r; // input-side corner radius
  const left = flow === 1 ? round : r;
  const right = flow === 1 ? r : round;
  const shape = new Shape();
  shape.moveTo(-half + left, -half);
  shape.lineTo(half - right, -half);
  shape.quadraticCurveTo(half, -half, half, -half + right);
  shape.lineTo(half, half - right);
  shape.quadraticCurveTo(half, half, half - right, half);
  shape.lineTo(-half + left, half);
  shape.quadraticCurveTo(-half, half, -half, half - left);
  shape.lineTo(-half, -half + left);
  shape.quadraticCurveTo(-half, -half, -half + left, -half);
  return shape;
}

const geometryCache = new Map<string, BufferGeometry>();

function tileGeometry(trigger: boolean, flow: 1 | -1, part: "body" | "rim"): BufferGeometry {
  const key = `${trigger}:${flow}:${part}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;
  let geometry: BufferGeometry;
  if (part === "body") {
    geometry = new ExtrudeGeometry(tileShape(trigger, flow, 0.035), { depth: DEPTH, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 12 });
    geometry.translate(0, 0, -DEPTH / 2);
  } else {
    // The border ring: outline with the body cut out of it.
    const ring = tileShape(trigger, flow);
    const hole = tileShape(trigger, flow, 0.06);
    ring.holes.push(new Path(hole.getPoints(48)));
    geometry = new ExtrudeGeometry(ring, { depth: 0.05, bevelEnabled: false, curveSegments: 12 });
    geometry.translate(0, 0, DEPTH / 2);
  }
  geometryCache.set(key, geometry);
  return geometry;
}

export interface N8nTileProps {
  kind: NodeKind;
  n8nType: string;
  palette: ScenePalette;
  flow: 1 | -1;
  outputs: number;
  /** Layer separation, read every frame (0 assembled, ~1 exploded; may dip below 0 — the snap). */
  separation: () => number;
  hot: boolean;
  selected: boolean;
}

/**
 * An n8n editor node built in 3D: the dark rounded body (the "D" shape for triggers, with the orange
 * lightning marker), the green "executed" border, the integration's real icon on the face and
 * grey input/output handles. Exploding pulls the layers apart along the view axis — icon plate
 * forward, border ring, body back — and handles slide out; assembling snaps them together.
 */
export function N8nTile({ kind, n8nType, palette, flow, outputs, separation, hot, selected }: N8nTileProps) {
  const trigger = kind === "trigger";
  const icon = iconForNodeType(n8nType, kind);
  const face = useMemo(() => nodeFaceTexture(icon, displayColor(icon.hex, palette.theme), flow), [icon, palette.theme, flow]);
  const bolt = useMemo(() => (trigger ? boltTexture() : null), [trigger]);
  const body = useMemo(() => tileGeometry(trigger, flow, "body"), [trigger, flow]);
  const rim = useMemo(() => tileGeometry(trigger, flow, "rim"), [trigger, flow]);

  const faceRef = useRef<Group>(null);
  const rimRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const inputs = useRef<Group>(null);
  const outputsRef = useRef<Group>(null);
  const boltRef = useRef<Group>(null);

  useFrame(() => {
    const s = separation();
    const e = Math.max(0, s);
    const press = Math.min(0, s); // overshoot on assemble presses the layers together
    if (faceRef.current) faceRef.current.position.z = DEPTH / 2 + 0.03 + 0.6 * e + press * 0.08;
    if (rimRef.current) rimRef.current.position.z = 0.28 * e + press * 0.04;
    if (bodyRef.current) bodyRef.current.position.z = -0.32 * e;
    const slide = 0.18 * clamp01(e);
    if (inputs.current) inputs.current.position.x = -flow * slide;
    if (outputsRef.current) outputsRef.current.position.x = flow * slide;
    if (boltRef.current) boltRef.current.position.z = 0.4 * e;
  });

  const rimColor = selected ? palette.accent : EXECUTED;
  const handleColor = palette.theme === "dark" ? "#8a8a93" : "#9a9aa6";

  return (
    <group>
      <group ref={bodyRef}>
        <mesh geometry={body}>
          <meshStandardMaterial color={palette.theme === "dark" ? "#2e2e33" : "#f6f6f8"} roughness={0.55} metalness={0.15} />
        </mesh>
      </group>
      <group ref={rimRef}>
        <mesh geometry={rim}>
          <meshStandardMaterial color={rimColor} emissive={rimColor} emissiveIntensity={hot || selected ? 0.9 : 0.35} roughness={0.4} toneMapped={false} />
        </mesh>
      </group>
      <group ref={faceRef}>
        {face && (
          <mesh>
            <planeGeometry args={[TILE * 0.92, TILE * 0.92]} />
            <meshBasicMaterial map={face} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* handles: input on the reading-start side, outputs on the other */}
      <group ref={inputs}>
        {!trigger && (
          <mesh position={[-flow * (TILE / 2 + HANDLE_R * 0.4), 0, 0]}>
            <sphereGeometry args={[HANDLE_R, 16, 16]} />
            <meshStandardMaterial color={handleColor} roughness={0.4} />
          </mesh>
        )}
      </group>
      <group ref={outputsRef}>
        {Array.from({ length: outputs }, (_, i) => (
          <mesh key={i} position={[flow * (TILE / 2 + HANDLE_R * 0.4), TILE / 2 - ((i + 1) / (outputs + 1)) * TILE, 0]}>
            <sphereGeometry args={[HANDLE_R, 16, 16]} />
            <meshStandardMaterial color={handleColor} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {bolt && (
        <group ref={boltRef} position={[-flow * (TILE / 2 + 0.32), 0, 0]}>
          <mesh>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial map={bolt} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      )}

      <Halo color={rimColor} palette={palette} y={-0.7} size={1.9} intensity={hot ? 0.5 : 0.22} />
    </group>
  );
}

/** Y offset of output handle `index` of `count` (connections leave from here). */
export const outputHandleY = (index: number, count: number) => TILE / 2 - ((index + 1) / (count + 1)) * TILE;
