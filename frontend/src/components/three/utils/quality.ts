import type { QualityTier } from "@/stores/scene-store";

/**
 * Quality tiers for the 3D scenes (docs/03_frontend_3d/r3f_components.md §2).
 * `fallback2d` never reaches the canvas — the 2D diagram replaces it.
 */
export type CanvasTier = Exclude<QualityTier, "fallback2d">;

export interface QualitySettings {
  dpr: [number, number];
  antialias: boolean;
  /** Bloom intensity; 0 disables post-processing entirely (and its lazy chunk). */
  bloom: number;
  multisampling: number;
  packetsPerEdge: number;
  envResolution: number;
  /** Physical transmission (glass) on the AI node; costs an extra render pass. */
  transmission: boolean;
}

export const QUALITY_SETTINGS: Record<CanvasTier, QualitySettings> = {
  high: {
    dpr: [1, 2],
    antialias: true,
    bloom: 1.15,
    multisampling: 4,
    packetsPerEdge: 24,
    envResolution: 256,
    transmission: true,
  },
  medium: {
    dpr: [1, 1.5],
    antialias: true,
    bloom: 0.8,
    multisampling: 0,
    packetsPerEdge: 12,
    envResolution: 128,
    transmission: false,
  },
  low: {
    dpr: [1, 1],
    antialias: false,
    bloom: 0,
    multisampling: 0,
    packetsPerEdge: 6,
    envResolution: 64,
    transmission: false,
  },
};

export const settingsFor = (tier: QualityTier): QualitySettings => QUALITY_SETTINGS[tier === "fallback2d" ? "low" : tier];

export interface DeviceSignals {
  cores?: number;
  memoryGb?: number;
  saveData?: boolean;
  coarsePointer: boolean;
  viewportWidth: number;
}

/**
 * Initial tier from cheap device signals; the frame-rate monitor refines it at runtime.
 * Phones and data-saver → low, tablets / modest CPUs → medium, everything else → high.
 */
export function detectQualityTier(signals: DeviceSignals = readDeviceSignals()): CanvasTier {
  const { cores, memoryGb, saveData, coarsePointer, viewportWidth } = signals;
  if (saveData) return "low";
  if ((cores !== undefined && cores <= 4) || (memoryGb !== undefined && memoryGb <= 4)) return "low";
  if (coarsePointer && viewportWidth < 768) return "low";
  if (coarsePointer || (cores !== undefined && cores <= 6)) return "medium";
  return "high";
}

export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData === true,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    viewportWidth: window.innerWidth,
  };
}

let webglSupport: boolean | undefined;

/** WebGL2 (or WebGL1) availability, probed once per page. */
export function isWebGLAvailable(): boolean {
  if (webglSupport !== undefined) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglSupport = Boolean(context);
    (context as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** Test hook: forget the cached probe. */
export function resetWebGLProbe() {
  webglSupport = undefined;
}
