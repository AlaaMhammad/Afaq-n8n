import { describe, expect, it } from "vitest";
import type { Workflow } from "@/lib/api/types";
import { WorkflowSim, type SimFrame } from "./workflow-sim";

const workflow: Pick<Workflow, "nodes"> = {
  nodes: [
    {
      id: "trigger",
      kind: "trigger",
      label: "T",
      n8nType: "x",
      position: [-3, 0, 0],
      exploded: [-1, 1, 0],
    },
    {
      id: "ai",
      kind: "ai",
      label: "AI",
      n8nType: "y",
      position: [0, 0, 0],
      exploded: [0, -1.5, 1],
    },
    {
      id: "save",
      kind: "storage",
      label: "S",
      n8nType: "z",
      position: [3, 0, 0],
      exploded: [1, 1, -1],
    },
  ],
};

const frame = (overrides: Partial<SimFrame> = {}): SimFrame => ({
  target: 1,
  hoveredId: null,
  selectedId: null,
  reducedMotion: false,
  time: 0,
  ...overrides,
});

function run(sim: WorkflowSim, seconds: number, overrides: Partial<SimFrame> = {}) {
  for (let t = 0; t < seconds; t += 1 / 60) sim.step(1 / 60, frame({ time: t, ...overrides }));
}

describe("WorkflowSim", () => {
  it("staggers nodes along the flow — earlier nodes lead", () => {
    const sim = new WorkflowSim(workflow);
    run(sim, 0.12);
    const [first, , last] = sim.nodes;
    expect(first.spring.x).toBeGreaterThan(last.spring.x);
  });

  it("explodes every node to its offset and reports progress", () => {
    const sim = new WorkflowSim(workflow);
    run(sim, 4);

    expect(sim.progress()).toBe(1);
    const ai = sim.node("ai")!;
    expect(ai.position.x).toBeCloseTo(0);
    expect(ai.position.z).toBeCloseTo(1);
    expect(Math.abs(ai.position.y - -1.5)).toBeLessThan(0.07); // within the idle float
  });

  it("reverses mid-transition without jumping", () => {
    const sim = new WorkflowSim(workflow);
    run(sim, 0.2);
    const before = sim.node("trigger")!.position.clone();

    sim.step(1 / 60, frame({ target: 0 }));
    expect(sim.node("trigger")!.position.distanceTo(before)).toBeLessThan(0.15);

    run(sim, 4, { target: 0 });
    expect(sim.progress()).toBe(0);
    expect(sim.node("trigger")!.position.toArray()).toEqual([-3, 0, 0]);
  });

  it("opens a hovered node a little on its own, even when assembled", () => {
    const sim = new WorkflowSim(workflow);
    run(sim, 1, { target: 0, hoveredId: "ai" });

    expect(sim.node("ai")!.local).toBeGreaterThan(0.5);
    expect(sim.node("save")!.local).toBe(0);
    expect(sim.progress()).toBe(0); // hovering never moves the node itself
  });

  it("snaps instantly with reduced motion and can start exploded", () => {
    const sim = new WorkflowSim(workflow, 1);
    expect(sim.node("save")!.position.toArray()).toEqual([4, 1, -1]);

    const moving = sim.step(1 / 60, frame({ target: 0, reducedMotion: true }));
    expect(moving).toBe(false);
    expect(sim.node("save")!.position.toArray()).toEqual([3, 0, 0]);
  });
});
