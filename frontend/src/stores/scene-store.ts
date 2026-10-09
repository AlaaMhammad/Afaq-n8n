import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Vec3, WorkflowMode } from "@/lib/api/types";

/**
 * 3D scene state shared by the R3F canvas, DOM controls and the AI agent bridge.
 *
 * `mode` is the *intent* (assembled/exploded); `explodeProgress` is the animated value
 * (0 → 1) written only by the canvas's ExplodeDriver and read per-frame with getState().
 * Spec: docs/01_architecture/state_management.md §1
 */

export type QualityTier = "high" | "medium" | "low" | "fallback2d";
/** Who changed the mode: user clicks and the AI agent stop scroll-driven explode for the visit. */
export type ModeSource = "user" | "agent" | "scroll";
/** Why the 3D canvas was swapped for the 2D diagram. */
export type FallbackReason = "user" | "performance" | "unsupported" | "context-lost" | "error";

const QUALITY_ORDER: QualityTier[] = ["high", "medium", "low", "fallback2d"];
const LOWEST_3D_INDEX = QUALITY_ORDER.indexOf("low");

export interface CameraGoal {
  position: Vec3;
  target: Vec3;
  durationMs?: number;
}

export interface SceneState {
  /** Slugs the portfolio actually rendered — the agent can only target these. */
  knownProjects: string[];
  /** slug → localized title, for agent toasts and labels */
  projectTitles: Record<string, string>;
  activeProjectSlug: string | null;
  mode: WorkflowMode;
  explodeProgress: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  cameraGoal: CameraGoal | null;
  /** While true, scrolling the portfolio into view explodes/assembles the workflow. */
  autoExplode: boolean;
  quality: QualityTier;
  /** Tier detected from the device on first client render (null until then). */
  detectedQuality: QualityTier | null;
  /** The visitor chose 2D/3D explicitly — performance heuristics no longer override it. */
  qualityPinned: boolean;
  fallbackReason: FallbackReason | null;
  /** WebGL context losses this visit — the first one is recovered automatically. */
  contextLosses: number;
  /** Incremented every time a 3D canvas should (re)mount — keys the canvas and its "ready" state. */
  renderAttempt: number;
  /** The single background canvas: off (2D), mounting, or rendering frames. */
  stage: "off" | "loading" | "live";
  /** The hero's trigger switch is closed: the page's data conduits are energised. */
  powered: boolean;
  autoRotate: boolean;

  registerProjects: (projects: { slug: string; title: string }[]) => void;
  /** Returns false (and changes nothing) for an unknown slug. */
  setActiveProject: (slug: string) => boolean;
  /** Scroll-sourced changes are ignored once the user or the agent has set a mode. */
  setMode: (mode: WorkflowMode, source?: ModeSource) => void;
  toggleMode: () => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  focusCamera: (goal: CameraGoal | null) => void;
  /** Records the device tier once; later calls are no-ops. */
  detectQuality: (tier: QualityTier) => void;
  /** Explicit visitor choice (the 2D/3D switch). Pins the tier. */
  setQuality: (quality: QualityTier) => void;
  /** Automatic step from the frame-rate monitor; stays within the 3D tiers and respects a pin. */
  adaptQuality: (direction: "down" | "up") => void;
  /** Swap to the 2D diagram. A sustained-slow-frames fallback respects a visitor's pin. */
  fallbackTo2d: (reason: Exclude<FallbackReason, "user">) => void;
  /** After a first context loss, remount the 3D canvas with a fresh context. Later losses stay 2D. */
  recover3d: () => void;
  setStage: (stage: "off" | "loading" | "live") => void;
  setPowered: (powered: boolean) => void;
  setAutoRotate: (enabled: boolean) => void;
  /** internal — written by the ExplodeDriver tween only */
  _setExplodeProgress: (progress: number) => void;
}

export const useSceneStore = create<SceneState>()(
  devtools(
    (set, get) => ({
      knownProjects: [],
      projectTitles: {},
      activeProjectSlug: null,
      mode: "assembled",
      explodeProgress: 0,
      selectedNodeId: null,
      hoveredNodeId: null,
      cameraGoal: null,
      autoExplode: true,
      quality: "high",
      detectedQuality: null,
      qualityPinned: false,
      fallbackReason: null,
      contextLosses: 0,
      renderAttempt: 0,
      stage: "off",
      powered: false,
      autoRotate: true,

      registerProjects: (projects) =>
        set((state) => {
          const slugs = projects.map((p) => p.slug);
          return {
            knownProjects: slugs,
            projectTitles: Object.fromEntries(projects.map((p) => [p.slug, p.title])),
            activeProjectSlug:
              state.activeProjectSlug && slugs.includes(state.activeProjectSlug) ? state.activeProjectSlug : (slugs[0] ?? null),
          };
        }),

      setActiveProject: (slug) => {
        const { knownProjects, activeProjectSlug } = get();
        if (knownProjects.length > 0 && !knownProjects.includes(slug)) return false;
        if (slug !== activeProjectSlug) {
          set({ activeProjectSlug: slug, mode: "assembled", selectedNodeId: null, hoveredNodeId: null, cameraGoal: null });
        }
        return true;
      },

      setMode: (mode, source = "user") =>
        set((state) => {
          if (source === "scroll") return state.autoExplode ? { mode } : state;
          return { mode, autoExplode: false };
        }),
      toggleMode: () => set((state) => ({ mode: state.mode === "exploded" ? "assembled" : "exploded", autoExplode: false })),
      selectNode: (selectedNodeId) => set({ selectedNodeId }),
      hoverNode: (hoveredNodeId) => set({ hoveredNodeId }),
      focusCamera: (cameraGoal) => set({ cameraGoal }),
      detectQuality: (tier) =>
        set((state) => {
          if (state.detectedQuality !== null) return state;
          return state.qualityPinned ? { detectedQuality: tier } : { detectedQuality: tier, quality: tier, fallbackReason: tier === "fallback2d" ? "performance" : null };
        }),
      setQuality: (quality) =>
        set((state) => ({
          quality,
          qualityPinned: true,
          fallbackReason: quality === "fallback2d" ? "user" : null,
          renderAttempt: state.quality === "fallback2d" && quality !== "fallback2d" ? state.renderAttempt + 1 : state.renderAttempt,
        })),
      adaptQuality: (direction) =>
        set((state) => {
          if (state.qualityPinned || state.quality === "fallback2d") return state;
          const index = QUALITY_ORDER.indexOf(state.quality) + (direction === "down" ? 1 : -1);
          return { quality: QUALITY_ORDER[Math.min(Math.max(index, 0), LOWEST_3D_INDEX)] };
        }),
      fallbackTo2d: (reason) =>
        set((state) => {
          if (reason === "performance" && state.qualityPinned) return state;
          return { quality: "fallback2d", fallbackReason: reason, contextLosses: state.contextLosses + (reason === "context-lost" ? 1 : 0) };
        }),
      recover3d: () =>
        set((state) => {
          if (state.quality !== "fallback2d" || state.fallbackReason !== "context-lost" || state.contextLosses > 1) return state;
          const tier = state.detectedQuality === null || state.detectedQuality === "fallback2d" ? "low" : state.detectedQuality;
          return { quality: tier, fallbackReason: null, renderAttempt: state.renderAttempt + 1 };
        }),
      setAutoRotate: (autoRotate) => set({ autoRotate }),
      setStage: (stage) => set({ stage }),
      setPowered: (powered) => set({ powered }),
      _setExplodeProgress: (progress) => set({ explodeProgress: Math.min(1, Math.max(0, progress)) }),
    }),
    { name: "scene", enabled: process.env.NODE_ENV === "development" },
  ),
);

export const selectIsExploded = (state: SceneState) => state.mode === "exploded";
/** True once the device tier is known and it is a 3D tier. */
export const selectWants3d = (state: SceneState) => state.detectedQuality !== null && state.quality !== "fallback2d";
