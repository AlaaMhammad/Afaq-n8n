"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, CubicBezierCurve3, NormalBlending, Object3D, TubeGeometry, Vector3, type InstancedMesh, type Mesh } from "three";
import type { ScenePalette } from "@/lib/theme/palette";

const SEGMENTS = 48;

export interface CableEnds {
  /** Plug at the source's output pin, written by the caller every frame. */
  from: Vector3;
  /** Plug at the target's input pin. */
  to: Vector3;
  /** Direction the cable leaves the source pin (+1/-1 on X). */
  flow: 1 | -1;
}

/**
 * A patch cable between two pins: a translucent sheath around a glowing conductor, leaving each
 * pin horizontally and sagging under its own weight, with instanced data packets flowing from
 * source (accent) to target (pulse). Geometry is rebuilt only when an end actually moves.
 */
export function Cable({ ends, palette, packets, reducedMotion, hot, onCurve }: { ends: () => CableEnds; palette: ScenePalette; packets: number; reducedMotion: boolean; hot: boolean; onCurve?: (curve: CubicBezierCurve3) => void }) {
  const sheath = useRef<Mesh>(null);
  const conductor = useRef<Mesh>(null);
  const instances = useRef<InstancedMesh>(null);
  const work = useMemo(
    () => ({
      curve: new CubicBezierCurve3(new Vector3(), new Vector3(), new Vector3(), new Vector3()),
      lastFrom: new Vector3(Infinity, 0, 0),
      lastTo: new Vector3(Infinity, 0, 0),
      dummy: new Object3D(),
      color: new Color(),
    }),
    [],
  );
  const colors = useMemo(
    () => ({
      start: new Color(palette.accent).multiplyScalar(palette.glow),
      end: new Color(palette.pulse).multiplyScalar(palette.glow),
      conductor: new Color(palette.pulse).multiplyScalar(palette.glow * 0.7),
    }),
    [palette],
  );

  // Dispose rebuilt tube geometries on unmount.
  useEffect(
    () => () => {
      sheath.current?.geometry.dispose();
      conductor.current?.geometry.dispose();
    },
    [],
  );

  useFrame(({ clock }) => {
    const { from, to, flow } = ends();
    const { curve } = work;

    if (work.lastFrom.distanceToSquared(from) > 1e-6 || work.lastTo.distanceToSquared(to) > 1e-6) {
      work.lastFrom.copy(from);
      work.lastTo.copy(to);
      const span = Math.max(0.6, from.distanceTo(to));
      const lead = Math.min(1.4, span * 0.4);
      const sag = Math.min(0.9, span * 0.18);
      curve.v0.copy(from);
      curve.v1.set(from.x + flow * lead, from.y - sag, from.z + 0.1);
      curve.v2.set(to.x - flow * lead, to.y - sag, to.z + 0.1);
      curve.v3.copy(to);
      if (sheath.current) {
        sheath.current.geometry.dispose();
        sheath.current.geometry = new TubeGeometry(curve, SEGMENTS, 0.055, 8, false);
      }
      if (conductor.current) {
        conductor.current.geometry.dispose();
        conductor.current.geometry = new TubeGeometry(curve, SEGMENTS, 0.022, 6, false);
      }
      onCurve?.(curve);
    }

    const mesh = instances.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < packets; i++) {
      const u = reducedMotion ? (i + 0.5) / packets : (t * 0.35 + i / packets) % 1;
      curve.getPoint(u, work.dummy.position);
      work.dummy.scale.setScalar(0.35 + 0.65 * Math.sin(Math.PI * u));
      work.dummy.updateMatrix();
      mesh.setMatrixAt(i, work.dummy.matrix);
      mesh.setColorAt(i, work.color.lerpColors(colors.start, colors.end, u));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const blending = palette.additive ? AdditiveBlending : NormalBlending;

  return (
    <group>
      <mesh ref={sheath}>
        <meshPhysicalMaterial color={palette.theme === "dark" ? "#20242c" : "#cfd4dc"} transparent opacity={0.55} roughness={0.25} clearcoat={1} depthWrite={false} />
      </mesh>
      <mesh ref={conductor}>
        <meshBasicMaterial color={colors.conductor} toneMapped={false} transparent opacity={hot ? 1 : 0.75} />
      </mesh>
      {packets > 0 && (
        <instancedMesh key={packets} ref={instances} args={[undefined, undefined, packets]} frustumCulled={false}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial toneMapped={false} transparent blending={blending} depthWrite={false} />
        </instancedMesh>
      )}
    </group>
  );
}
