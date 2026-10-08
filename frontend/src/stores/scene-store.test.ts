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

  it("toggles mode, clamps explode progress and bounds quality steps", () => {
    const s = useSceneStore.getState();
    s.toggleMode();
    expect(useSceneStore.getState().mode).toBe("exploded");

    s._setExplodeProgress(1.7);
    expect(useSceneStore.getState().explodeProgress).toBe(1);

    s.stepQuality("up");
    expect(useSceneStore.getState().quality).toBe("high");
    for (let i = 0; i < 4; i++) s.stepQuality("down");
    expect(useSceneStore.getState().quality).toBe("fallback2d");
  });
});
