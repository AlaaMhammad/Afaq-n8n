/**
 * Three.js cannot read CSS variables, so the 3D scenes use this mirror of the tokens in
 * src/app/globals.css (docs/03_frontend_3d/theme_and_i18n.md §1). Keep the two in sync.
 */
export interface ScenePalette {
  theme: "dark" | "light";
  /** Opaque stage behind the workflow scene (slightly lifted from --background). */
  stage: string;
  gridCell: string;
  gridSection: string;
  /** Node bodies */
  body: string;
  bodyMetalness: number;
  bodyRoughness: number;
  accent: string;
  pulse: string;
  /** Multiplier applied to glow colours so they exceed 1.0 and catch the bloom threshold. */
  glow: number;
  ambient: number;
  /** Additive blending reads as glow on dark grounds but washes out on light ones. */
  additive: boolean;
}

export const SCENE_PALETTES: Record<"dark" | "light", ScenePalette> = {
  dark: {
    theme: "dark",
    stage: "#0c0c10",
    gridCell: "#1c1c24",
    gridSection: "#2c2c38",
    body: "#1a1a21",
    bodyMetalness: 0.75,
    bodyRoughness: 0.28,
    accent: "#ff6b00",
    pulse: "#00e5ff",
    glow: 2.4,
    ambient: 0.35,
    additive: true,
  },
  light: {
    theme: "light",
    stage: "#f3f3f6",
    gridCell: "#e1e1e8",
    gridSection: "#c9c9d4",
    body: "#e9e9ef",
    bodyMetalness: 0.35,
    bodyRoughness: 0.35,
    accent: "#e05500",
    pulse: "#0090a8",
    glow: 1,
    ambient: 0.9,
    additive: false,
  },
};

export const scenePalette = (theme: string | undefined): ScenePalette => SCENE_PALETTES[theme === "light" ? "light" : "dark"];
