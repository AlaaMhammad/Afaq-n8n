import { QuadraticBezierCurve3, Vector3 } from "three";

/** Edges start/end on the node's surface, not its centre. */
export const PORT_OFFSET = 0.62;

const direction = new Vector3();

/**
 * Shapes an edge curve between two live node positions. The control point lifts as the
 * workflow explodes so the "laser" arcs bend more, and bows slightly toward the camera.
 * Mutates `curve` in place (called every frame while nodes move).
 */
export function shapeEdgeCurve(curve: QuadraticBezierCurve3, from: Vector3, to: Vector3, progress: number): QuadraticBezierCurve3 {
  direction.subVectors(to, from);
  const span = direction.length();
  direction.normalize();
  const offset = Math.min(PORT_OFFSET, span * 0.35);

  curve.v0.copy(from).addScaledVector(direction, offset);
  curve.v2.copy(to).addScaledVector(direction, -offset);
  curve.v1.addVectors(curve.v0, curve.v2).multiplyScalar(0.5);
  curve.v1.y += 0.35 + 0.45 * progress;
  curve.v1.z += 0.25 * progress;
  return curve;
}

/** Writes `segments + 1` evenly spaced points of the curve into a flat xyz array. */
export function sampleCurve(curve: QuadraticBezierCurve3, segments: number, out: Float32Array, scratch = new Vector3()): Float32Array {
  for (let i = 0; i <= segments; i++) {
    curve.getPoint(i / segments, scratch);
    out[i * 3] = scratch.x;
    out[i * 3 + 1] = scratch.y;
    out[i * 3 + 2] = scratch.z;
  }
  return out;
}

/** Packet size along an edge: grows out of the start port, shrinks into the end port. */
export const packetScale = (u: number) => 0.25 + 0.75 * Math.sin(Math.PI * u);
