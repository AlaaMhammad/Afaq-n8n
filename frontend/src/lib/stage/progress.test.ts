import { describe, expect, it } from "vitest";
import { monogram } from "@/components/three/hardware/decal-text";
import { snapEase, smoothstep, staggered, travelProgress } from "./progress";

describe("stage progress", () => {
  it("measures travel through the viewport", () => {
    const vh = 800;
    expect(travelProgress({ top: 800, height: 400 }, vh)).toBe(0); // just below the fold
    expect(travelProgress({ top: 200, height: 400 }, vh)).toBe(0.5); // centred
    expect(travelProgress({ top: -400, height: 400 }, vh)).toBe(1); // scrolled past
    expect(travelProgress({ top: 2000, height: 400 }, vh)).toBe(0);
  });

  it("staggers items so the first leads and all finish together", () => {
    expect(staggered(0.2, 0, 4)).toBeGreaterThan(staggered(0.2, 3, 4));
    for (let i = 0; i < 4; i++) {
      expect(staggered(0, i, 4)).toBe(0);
      expect(staggered(1, i, 4)).toBe(1);
    }
    expect(staggered(0.4, 0, 1)).toBe(0.4);
  });

  it("snaps with a small overshoot and settles exactly", () => {
    expect(snapEase(0)).toBe(0);
    expect(snapEase(0.75)).toBeCloseTo(1.06);
    expect(snapEase(1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
});

describe("profile chip monograms", () => {
  it("builds monograms for Latin and Arabic names", () => {
    expect(monogram("Layla Mansour")).toBe("LM");
    expect(monogram("عمر الحربي")).toBe("عا");
    expect(monogram("  Omar ")).toBe("O");
  });
});
