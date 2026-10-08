"use client";

import { useMemo, useRef, type ComponentRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { AdditiveBlending, Color, NormalBlending, Object3D, QuadraticBezierCurve3, Vector3, type Group, type InstancedMesh, type Mesh } from "three";
import type { WorkflowEdge as WorkflowEdgeData } from "@/lib/api/types";
import type { ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { packetScale, sampleCurve, shapeEdgeCurve } from "../utils/edge";
import { edgeLabelKey, placeLabel, type LabelRegistry } from "./label-layer";
import type { WorkflowSim } from "./workflow-sim";

const SEGMENTS = 32;
const PACKET_SPEED = 0.32;

interface WorkflowEdgeProps {
  edge: WorkflowEdgeData;
  sim: WorkflowSim;
  labels: LabelRegistry;
  palette: ScenePalette;
  packets: number;
  reducedMotion: boolean;
}

/**
 * A "laser" connection between two nodes: a dashed fat line whose dashes stream from source to
 * target, glowing port sockets at both ends, and instanced data packets riding the curve
 * (orange at the source, cyan at the target). The curve follows the nodes while they explode.
 */
export function WorkflowEdge({ edge, sim, labels, palette, packets, reducedMotion }: WorkflowEdgeProps) {
  const line = useRef<ComponentRef<typeof Line>>(null);
  const group = useRef<Group>(null);
  const instances = useRef<InstancedMesh>(null);
  const startPort = useRef<Mesh>(null);
  const endPort = useRef<Mesh>(null);
  const work = useRef({
    curve: new QuadraticBezierCurve3(new Vector3(), new Vector3(), new Vector3()),
    positions: new Float32Array((SEGMENTS + 1) * 3),
    last: new Vector3(Infinity, 0, 0),
    lastTo: new Vector3(Infinity, 0, 0),
    point: new Vector3(),
    mid: new Vector3(),
    dummy: new Object3D(),
    color: new Color(),
  });

  const from = sim.node(edge.from);
  const to = sim.node(edge.to);

  const colors = useMemo(
    () => ({
      line: new Color(palette.pulse).multiplyScalar(palette.glow * 0.8),
      start: new Color(palette.accent).multiplyScalar(palette.glow),
      end: new Color(palette.pulse).multiplyScalar(palette.glow),
    }),
    [palette],
  );

  // Initial points so the first paint is already correct (frames then update in place).
  const initialPoints = useMemo(() => {
    if (!from || !to) return [];
    const curve = shapeEdgeCurve(new QuadraticBezierCurve3(new Vector3(), new Vector3(), new Vector3()), from.position, to.position, from.spring.x);
    return curve.getPoints(SEGMENTS);
  }, [from, to]);

  useFrame(({ clock, camera, size }, dt) => {
    if (!from || !to || !group.current) return;
    const w = work.current;
    const progress = (from.spring.x + to.spring.x) / 2;

    if (w.last.distanceToSquared(from.position) > 1e-8 || w.lastTo.distanceToSquared(to.position) > 1e-8) {
      w.last.copy(from.position);
      w.lastTo.copy(to.position);
      shapeEdgeCurve(w.curve, from.position, to.position, progress);
      if (line.current) {
        line.current.geometry.setPositions(sampleCurve(w.curve, SEGMENTS, w.positions, w.point));
        line.current.computeLineDistances();
      }
      startPort.current?.position.copy(w.curve.v0);
      endPort.current?.position.copy(w.curve.v2);
    }

    if (edge.label) {
      group.current.updateWorldMatrix(true, false);
      // Just above the arc, so the label never sits on a node label.
      placeLabel(labels.current.get(edgeLabelKey(edge.from, edge.to)), group.current.localToWorld(w.curve.getPoint(0.5, w.mid).setY(w.mid.y + 0.3)), camera, size);
    }

    if (line.current && !reducedMotion) line.current.material.dashOffset -= dt * 0.9;

    const mesh = instances.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    for (let i = 0; i < packets; i++) {
      const u = reducedMotion ? (i + 0.5) / packets : (time * PACKET_SPEED + i / packets) % 1;
      w.curve.getPoint(u, w.dummy.position);
      w.dummy.scale.setScalar(packetScale(u));
      w.dummy.updateMatrix();
      mesh.setMatrixAt(i, w.dummy.matrix);
      mesh.setColorAt(i, w.color.lerpColors(colors.start, colors.end, u));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const hot = useSceneStore((s) => [edge.from, edge.to].includes(s.hoveredNodeId ?? "") || [edge.from, edge.to].includes(s.selectedNodeId ?? ""));

  if (!from || !to || initialPoints.length === 0) return null;
  const blending = palette.additive ? AdditiveBlending : NormalBlending;

  return (
    <group ref={group}>
      <Line
        ref={line}
        points={initialPoints}
        color={colors.line}
        lineWidth={hot ? 2.6 : 1.6}
        dashed
        dashSize={0.22}
        gapSize={0.12}
        transparent
        opacity={hot ? 1 : 0.8}
        toneMapped={false}
      />
      <mesh ref={startPort} position={initialPoints[0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={colors.start} toneMapped={false} />
      </mesh>
      <mesh ref={endPort} position={initialPoints[initialPoints.length - 1]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={colors.end} toneMapped={false} />
      </mesh>
      {packets > 0 && (
        <instancedMesh key={packets} ref={instances} args={[undefined, undefined, packets]} frustumCulled={false}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial toneMapped={false} transparent blending={blending} depthWrite={false} />
        </instancedMesh>
      )}
    </group>
  );
}
