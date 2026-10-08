/**
 * Tiny physics helpers for the 3D scene. Pure functions over plain objects so they can be
 * unit-tested and stepped from `useFrame` without allocating.
 */

export interface SpringState {
  x: number;
  v: number;
}

export interface SpringConfig {
  /** Higher → faster. */
  stiffness: number;
  /** < 1 overshoots (the "physical" wobble), 1 is critically damped. */
  dampingRatio: number;
}

const SUBSTEP = 1 / 240;
/** Tab switches can deliver a huge delta; never integrate more than this in one frame. */
const MAX_DT = 0.1;

/**
 * Advances a damped spring toward `target` (semi-implicit Euler with fixed sub-steps for stability).
 * Returns `true` while the spring is still moving; snaps exactly to the target once at rest.
 */
export function stepSpring(state: SpringState, target: number, dt: number, { stiffness, dampingRatio }: SpringConfig): boolean {
  const damping = 2 * dampingRatio * Math.sqrt(stiffness);
  let remaining = Math.min(Math.max(dt, 0), MAX_DT);

  while (remaining > 0) {
    const h = Math.min(SUBSTEP, remaining);
    state.v += (stiffness * (target - state.x) - damping * state.v) * h;
    state.x += state.v * h;
    remaining -= h;
  }

  if (Math.abs(target - state.x) < 1e-4 && Math.abs(state.v) < 1e-3) {
    state.x = target;
    state.v = 0;
    return false;
  }
  return true;
}

/** Frame-rate independent exponential approach (`lambda` ≈ responsiveness per second). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * Math.min(dt, MAX_DT)));
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
