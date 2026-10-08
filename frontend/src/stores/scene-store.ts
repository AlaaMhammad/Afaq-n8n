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

const QUALITY_ORDER: QualityTier[] = ["high", "medium", "low", "fallback2d"];

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
  quality: QualityTier;
  autoRotate: boolean;

  registerProjects: (projects: { slug: string; title: string }[]) => void;
  /** Returns false (and changes nothing) for an unknown slug. */
  setActiveProject: (slug: string) => boolean;
  setMode: (mode: WorkflowMode) => void;
  toggleMode: () => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  focusCamera: (goal: CameraGoal | null) => void;
  setQuality: (quality: QualityTier) => void;
  stepQuality: (direction: "down" | "up") => void;
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
      quality: "high",
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

      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ mode: state.mode === "exploded" ? "assembled" : "exploded" })),
      selectNode: (selectedNodeId) => set({ selectedNodeId }),
      hoverNode: (hoveredNodeId) => set({ hoveredNodeId }),
      focusCamera: (cameraGoal) => set({ cameraGoal }),
      setQuality: (quality) => set({ quality }),
      stepQuality: (direction) =>
        set((state) => {
          const index = QUALITY_ORDER.indexOf(state.quality) + (direction === "down" ? 1 : -1);
          return { quality: QUALITY_ORDER[Math.min(Math.max(index, 0), QUALITY_ORDER.length - 1)] };
        }),
      setAutoRotate: (autoRotate) => set({ autoRotate }),
      _setExplodeProgress: (progress) => set({ explodeProgress: Math.min(1, Math.max(0, progress)) }),
    }),
    { name: "scene", enabled: process.env.NODE_ENV === "development" },
  ),
);

export const selectIsExploded = (state: SceneState) => state.mode === "exploded";
