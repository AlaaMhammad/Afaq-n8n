import { describe, expect, it } from "vitest";
import { QuadraticBezierCurve3, Vector3 } from "three";
import type { Workflow } from "@/lib/api/types";
import { fitCamera, focusPose, workflowBounds } from "./camera";
import { PORT_OFFSET, packetScale, sampleCurve, shapeEdgeCurve } from "./edge";
import { detectQualityTier, QUALITY_SETTINGS, settingsFor } from "./quality";
import { damp, stepSpring } from "./spring";

describe("stepSpring", () => {
  it("overshoots slightly when under-damped, then settles exactly on the target", () => {
    const state = { x: 0, v: 0 };
    let peak = 0;
    let frames = 0;
    while (stepSpring(state, 1, 1 / 60, { stiffness: 78, dampingRatio: 0.58 }) && frames < 600) {
      peak = Math.max(peak, state.x);
      frames++;
    }

    expect(peak).toBeGreaterThan(1.02); // the physical "wobble"
    expect(peak).toBeLessThan(1.2);
    expect(state).toEqual({ x: 1, v: 0 });
    expect(frames).toBeLessThan(180); // settles within ~3 s at 60 fps
  });

  it("reverses smoothly from mid-flight and survives huge frame deltas", () => {
    const state = { x: 0, v: 0 };
    for (let i = 0; i < 10; i++) stepSpring(state, 1, 1 / 60, { stiffness: 60, dampingRatio: 0.6 });
    const midway = state.x;
    expect(midway).toBeGreaterThan(0.1);

    stepSpring(state, 0, 5, { stiffness: 60, dampingRatio: 0.6 }); // a backgrounded tab returns
    expect(Number.isFinite(state.x)).toBe(true);
    expect(state.x).toBeLessThan(midway + 0.5);
  });

  it("damp approaches the target frame-rate independently", () => {
    const at60 = Array.from({ length: 60 }).reduce<number>((x) => damp(x, 1, 4, 1 / 60), 0);
    const at30 = Array.from({ length: 30 }).reduce<number>((x) => damp(x, 1, 4, 1 / 30), 0);
    expect(at60).toBeCloseTo(at30, 5);
  });
});

describe("quality tiers", () => {
  const desktop = {
    cores: 12,
    memoryGb: 16,
    saveData: false,
    coarsePointer: false,
    viewportWidth: 1440,
  };

  it("maps device signals to an initial tier", () => {
    expect(detectQualityTier(desktop)).toBe("high");
    expect(detectQualityTier({ ...desktop, cores: 6 })).toBe("medium");
    expect(
      detectQualityTier({
        ...desktop,
        coarsePointer: true,
        viewportWidth: 1024,
      }),
    ).toBe("medium"); // tablet
    expect(
      detectQualityTier({
        ...desktop,
        coarsePointer: true,
        viewportWidth: 390,
      }),
    ).toBe("low"); // phone
    expect(detectQualityTier({ ...desktop, cores: 4 })).toBe("low");
    expect(detectQualityTier({ ...desktop, memoryGb: 2 })).toBe("low");
    expect(detectQualityTier({ ...desktop, saveData: true })).toBe("low");
  });

  it("scales the expensive features down by tier", () => {
    expect(QUALITY_SETTINGS.high.bloom).toBeGreaterThan(QUALITY_SETTINGS.medium.bloom);
    expect(QUALITY_SETTINGS.low).toMatchObject({
      bloom: 0,
      transmission: false,
      dpr: [1, 1],
    });
    expect(QUALITY_SETTINGS.high.packetsPerEdge).toBeGreaterThan(QUALITY_SETTINGS.low.packetsPerEdge);
    expect(settingsFor("fallback2d")).toBe(QUALITY_SETTINGS.low);
  });
});

const workflow: Pick<Workflow, "nodes" | "camera"> = {
  camera: { position: [0, 2.5, 9], target: [0, 0, 0] },
  nodes: [
    {
      id: "a",
      kind: "trigger",
      label: "A",
      n8nType: "x",
      position: [-4.5, 0, -0.6],
      exploded: [-1.5, 1.2, 0.8],
    },
    {
      id: "b",
      kind: "action",
      label: "B",
      n8nType: "y",
      position: [4.5, 0, -0.6],
      exploded: [1.6, -1, 0.7],
    },
  ],
};

describe("camera fitting", () => {
  it("bounds include assembled and exploded positions", () => {
    const { min, max } = workflowBounds(workflow);
    expect(min[0]).toBeLessThanOrEqual(-6);
    expect(max[0]).toBeGreaterThanOrEqual(6.1);
    expect(max[1]).toBeGreaterThanOrEqual(1.2);
  });

  it("moves the camera back on narrow viewports instead of cropping nodes", () => {
    const wide = fitCamera(workflow, 2.1, 40);
    const phone = fitCamera(workflow, 1.05, 40);
    const distance = (pose: typeof wide) => Math.hypot(...pose.position.map((p, i) => p - pose.target[i]));

    expect(distance(phone)).toBeGreaterThan(distance(wide) * 1.5);
    // Keeps the authored viewing direction (slightly above, in front)
    expect(wide.position[1]).toBeGreaterThan(wide.target[1]);
    expect(wide.position[2]).toBeGreaterThan(wide.target[2]);
  });

  it("focuses a node along the same view direction", () => {
    const base = fitCamera(workflow, 2, 40);
    const focus = focusPose([4.5, 0, 0], base, 5);
    expect(focus.target).toEqual([4.5, 0, 0]);
    expect(Math.hypot(...focus.position.map((p, i) => p - focus.target[i]))).toBeCloseTo(5, 5);
  });
});

describe("edge curves", () => {
  it("anchors on node surfaces and lifts the arc as the workflow explodes", () => {
    const from = new Vector3(-3, 0, 0);
    const to = new Vector3(3, 0, 0);
    const assembled = shapeEdgeCurve(new QuadraticBezierCurve3(), from, to, 0);
    expect(assembled.v0.x).toBeCloseTo(-3 + PORT_OFFSET);
    expect(assembled.v2.x).toBeCloseTo(3 - PORT_OFFSET);
    const lowLift = assembled.v1.y;

    const exploded = shapeEdgeCurve(new QuadraticBezierCurve3(), from, to, 1);
    expect(exploded.v1.y).toBeGreaterThan(lowLift);

    const points = sampleCurve(exploded, 4, new Float32Array(15));
    expect(points[0]).toBeCloseTo(exploded.v0.x);
    expect(points[12]).toBeCloseTo(exploded.v2.x);
  });

  it("packets grow out of the source port and shrink into the target", () => {
    expect(packetScale(0)).toBeLessThan(packetScale(0.5));
    expect(packetScale(1)).toBeCloseTo(packetScale(0));
  });
});
