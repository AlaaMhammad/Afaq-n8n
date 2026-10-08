import { beforeEach, describe, expect, it } from "vitest";
import { useSceneStore } from "./scene-store";

const initial = useSceneStore.getState();

beforeEach(() => useSceneStore.setState(initial, true));

describe("scene store", () => {
  it("registers projects and selects the first by default", () => {
    useSceneStore.getState().registerProjects([
      { slug: "a", title: "A" },
      { slug: "b", title: "B" },
    ]);

    expect(useSceneStore.getState()).toMatchObject({ knownProjects: ["a", "b"], projectTitles: { a: "A", b: "B" }, activeProjectSlug: "a" });
  });

  it("only activates known projects and resets view state on switch", () => {
    const s = useSceneStore.getState();
    s.registerProjects([
      { slug: "a", title: "A" },
      { slug: "b", title: "B" },
    ]);
    s.setMode("exploded");
    s.selectNode("webhook");

    expect(useSceneStore.getState().setActiveProject("ghost")).toBe(false);
    expect(useSceneStore.getState().activeProjectSlug).toBe("a");

    expect(useSceneStore.getState().setActiveProject("b")).toBe(true);
    expect(useSceneStore.getState()).toMatchObject({ activeProjectSlug: "b", mode: "assembled", selectedNodeId: null });
  });

  it("toggles mode and clamps explode progress", () => {
    const s = useSceneStore.getState();
    s.toggleMode();
    expect(useSceneStore.getState().mode).toBe("exploded");

    s._setExplodeProgress(1.7);
    expect(useSceneStore.getState().explodeProgress).toBe(1);
  });

  it("lets scroll drive the mode only until the user or agent takes over", () => {
    const s = useSceneStore.getState();
    s.setMode("exploded", "scroll");
    expect(useSceneStore.getState()).toMatchObject({ mode: "exploded", autoExplode: true });

    s.setMode("assembled", "agent");
    expect(useSceneStore.getState()).toMatchObject({ mode: "assembled", autoExplode: false });

    s.setMode("exploded", "scroll");
    expect(useSceneStore.getState().mode).toBe("assembled");
  });

  it("adapts quality within the 3D tiers and never overrides a visitor's choice", () => {
    const s = useSceneStore.getState();
    s.detectQuality("medium");
    s.detectQuality("high"); // only the first detection counts
    expect(useSceneStore.getState()).toMatchObject({ quality: "medium", detectedQuality: "medium" });

    s.adaptQuality("up");
    expect(useSceneStore.getState().quality).toBe("high");
    for (let i = 0; i < 4; i++) s.adaptQuality("down");
    expect(useSceneStore.getState().quality).toBe("low"); // the monitor never drops to 2D by stepping

    s.fallbackTo2d("performance");
    expect(useSceneStore.getState()).toMatchObject({ quality: "fallback2d", fallbackReason: "performance" });

    s.setQuality("low"); // visitor switches back to 3D → pinned
    s.fallbackTo2d("performance");
    s.adaptQuality("down");
    expect(useSceneStore.getState()).toMatchObject({ quality: "low", qualityPinned: true, fallbackReason: null });

    s.fallbackTo2d("context-lost"); // hard failures always win
    expect(useSceneStore.getState()).toMatchObject({ quality: "fallback2d", fallbackReason: "context-lost" });
  });

  it("recovers from the first WebGL context loss only, remounting the canvas", () => {
    const s = useSceneStore.getState();
    s.detectQuality("high");
    const attempt = useSceneStore.getState().renderAttempt;

    s.fallbackTo2d("context-lost");
    s.recover3d();
    expect(useSceneStore.getState()).toMatchObject({ quality: "high", fallbackReason: null, renderAttempt: attempt + 1 });

    s.fallbackTo2d("context-lost");
    s.recover3d(); // a second loss means the GPU is unhappy — stay on the 2D diagram
    expect(useSceneStore.getState()).toMatchObject({ quality: "fallback2d", fallbackReason: "context-lost", contextLosses: 2 });
  });
});
