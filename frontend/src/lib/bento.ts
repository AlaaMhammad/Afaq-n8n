/**
 * Bento layout for a 3-column grid: the first tile is a 2×2 feature tile, the rest are 1×1,
 * and the last tile widens just enough to close the final row (no holes for any count).
 */
export function bentoSpans(count: number): { col: 1 | 2 | 3; row: 1 | 2 }[] {
  if (count <= 0) return [];
  if (count === 1) return [{ col: 3, row: 1 }];

  const spans: { col: 1 | 2 | 3; row: 1 | 2 }[] = [{ col: 2, row: 2 }, ...Array.from({ length: count - 1 }, () => ({ col: 1 as const, row: 1 as const }))];
  // The 2×2 tile occupies 4 cells, which pairs with exactly 2 singles in the first two rows.
  const cells = 4 + (count - 1);
  const remainder = cells % 3;
  if (remainder !== 0 && count > 3) spans[count - 1] = { col: (1 + (3 - remainder)) as 2 | 3, row: 1 };
  if (count === 2) spans[1] = { col: 1, row: 2 };
  return spans;
}
