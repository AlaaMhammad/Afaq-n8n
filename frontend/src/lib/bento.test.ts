import { describe, expect, it } from "vitest";
import { bentoSpans } from "./bento";

/** Packs spans into a 3-column grid (CSS grid auto-placement, row-major) and reports holes. */
function holes(spans: { col: number; row: number }[]): number {
  const grid: boolean[][] = [];
  const free = (r: number, c: number) => !grid[r]?.[c];
  for (const span of spans) {
    for (let r = 0, placed = false; !placed; r++) {
      for (let c = 0; c + span.col <= 3 && !placed; c++) {
        let fits = true;
        for (let dr = 0; dr < span.row; dr++) for (let dc = 0; dc < span.col; dc++) fits &&= free(r + dr, c + dc);
        if (!fits) continue;
        for (let dr = 0; dr < span.row; dr++) for (let dc = 0; dc < span.col; dc++) (grid[r + dr] ??= [])[c + dc] = true;
        placed = true;
      }
    }
  }
  return grid.reduce((sum, row) => sum + [0, 1, 2].filter((c) => !row[c]).length, 0);
}

describe("bentoSpans", () => {
  it("features the first tile and leaves no holes for any count", () => {
    for (let count = 1; count <= 12; count++) {
      const spans = bentoSpans(count);
      expect(spans).toHaveLength(count);
      expect(holes(spans), `count ${count}`).toBe(0);
    }
    expect(bentoSpans(6)[0]).toEqual({ col: 2, row: 2 });
  });
});
