import type { Vec3, Workflow } from "@/lib/api/types";

/** Half-size of a node incl. its label, in scene units. */
export const NODE_EXTENT = 0.85;
export const DEFAULT_CAMERA: { position: Vec3; target: Vec3 } = {
  position: [0, 2.5, 9],
  target: [0, 0, 0],
};

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
  center: Vec3;
}

/** Box containing every node in both its assembled and exploded positions. */
export function workflowBounds(workflow: Pick<Workflow, "nodes">): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const node of workflow.nodes) {
    for (let axis = 0; axis < 3; axis++) {
      const assembled = node.position[axis];
      const exploded = assembled + node.exploded[axis];
      min[axis] = Math.min(min[axis], assembled - NODE_EXTENT, exploded - NODE_EXTENT);
      max[axis] = Math.max(max[axis], assembled + NODE_EXTENT, exploded + NODE_EXTENT);
    }
  }

  if (!Number.isFinite(min[0])) return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0] };
  return {
    min,
    max,
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
  };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
const normalize = (v: Vec3): Vec3 => {
  const l = length(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Camera pose that keeps the whole workflow (exploded included) in frame for the viewport's
 * aspect ratio, looking from the direction the workflow's author chose. Narrow (phone) viewports
 * move the camera back instead of cropping the outer nodes.
 */
export function fitCamera(workflow: Pick<Workflow, "nodes" | "camera">, aspect: number, fovDeg: number, margin = 1.08): CameraPose {
  const authored = workflow.camera ?? DEFAULT_CAMERA;
  const bounds = workflowBounds(workflow);
  const direction = normalize(sub(authored.position, authored.target));
  const tanHalf = Math.tan((fovDeg * Math.PI) / 180 / 2);

  const halfWidth = ((bounds.max[0] - bounds.min[0]) / 2) * margin;
  const halfHeight = ((bounds.max[1] - bounds.min[1]) / 2) * margin;
  const depth = (bounds.max[2] - bounds.min[2]) / 2;
  const fitDistance = Math.max(halfWidth / (tanHalf * Math.max(aspect, 0.1)), halfHeight / tanHalf) + depth;
  const distance = Math.max(fitDistance, length(sub(authored.position, authored.target)) * 0.85);

  const target: Vec3 = [bounds.center[0], bounds.center[1] * 0.5, bounds.center[2]];
  return {
    target,
    position: [target[0] + direction[0] * distance, target[1] + direction[1] * distance, target[2] + direction[2] * distance],
  };
}

/** Close-up on one node, keeping the base view direction so the transition reads as a dolly. */
export function focusPose(point: Vec3, base: CameraPose, distance = 5.2): CameraPose {
  const direction = normalize(sub(base.position, base.target));
  return {
    target: point,
    position: [point[0] + direction[0] * distance, point[1] + direction[1] * distance, point[2] + direction[2] * distance],
  };
}
