/**
 * Scroll-progress maths for the scrollytelling stage. Pure functions so the 3D scenes can call
 * them every frame and tests can pin their behaviour.
 */

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Hermite smoothstep between `edge0` and `edge1`. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

/**
 * How far an element has travelled through the viewport: 0 when its top touches the bottom edge,
 * 0.5 when it is centred, 1 when its bottom leaves the top edge.
 */
export function travelProgress(rect: { top: number; height: number }, viewportHeight: number): number {
  return clamp01((viewportHeight - rect.top) / (viewportHeight + rect.height));
}

/**
 * Staggered sequence: item `index` of `count` animates within its own slice of `progress`, with
 * neighbouring slices overlapping by `overlap` (0 = strictly one after another, 1 = all together).
 */
export function staggered(progress: number, index: number, count: number, overlap = 0.5): number {
  if (count <= 1) return clamp01(progress);
  const span = 1 / (count - (count - 1) * overlap);
  const start = index * span * (1 - overlap);
  // Snap float noise so the last item lands exactly on 1.
  return clamp01(Math.round(((progress - start) / span) * 1e9) / 1e9);
}

/**
 * Mechanical "snap": eases in like a sliding part, then overshoots slightly and settles,
 * as if a latch clicked into place. Input and output are 0 → 1.
 */
export function snapEase(t: number): number {
  const x = clamp01(t);
  if (x < 0.75) return smoothstep(0, 0.75, x) * 1.06;
  // settle from 1.06 back to 1
  return 1.06 - 0.06 * smoothstep(0.75, 1, x);
}
