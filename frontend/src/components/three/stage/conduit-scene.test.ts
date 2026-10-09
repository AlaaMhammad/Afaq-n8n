import { describe, expect, it } from "vitest";
import { buildConduitPath, fractionAbove } from "./conduit-scene";

describe("conduit path", () => {
  const anchors = [
    { x: 1000, y: 600 }, // hero switch outlet
    { x: 900, y: 1400 }, // services rack
    { x: 700, y: 2600 }, // portfolio
  ];

  it("routes from the hero through every section anchor down to the page end", () => {
    const path = buildConduitPath(anchors, 4000, 1280, false)!;
    const start = path.curve.getPointAt(0);
    const end = path.curve.getPointAt(1);
    // CSS pixels, origin at the viewport centre, page Y negated.
    expect(start.x).toBeCloseTo(1000 - 640);
    expect(-start.y).toBeCloseTo(600);
    expect(-end.y).toBeCloseTo(4000);
    expect(end.x).toBeCloseTo(1280 - 28 - 640); // runs down the outer (end) gutter in LTR
    expect(path.sampleY).toHaveLength(path.segments + 1);
  });

  it("uses the left gutter in RTL and rebuilds only when the layout changes", () => {
    const rtl = buildConduitPath(anchors, 4000, 1280, true)!;
    expect(rtl.curve.getPointAt(1).x).toBeCloseTo(28 - 640);
    expect(buildConduitPath(anchors, 4000, 1280, false)!.key).toBe(buildConduitPath(anchors, 4000, 1280, false)!.key);
    expect(buildConduitPath([], 4000, 1280, false)).toBeNull();
  });

  it("energises the path down to a page position", () => {
    const path = buildConduitPath(anchors, 4000, 1280, false)!;
    expect(fractionAbove(path.sampleY, 0)).toBe(0);
    expect(fractionAbove(path.sampleY, 5000)).toBe(1);
    const half = fractionAbove(path.sampleY, 1800);
    expect(half).toBeGreaterThan(0.2);
    expect(half).toBeLessThan(0.6);
  });
});
