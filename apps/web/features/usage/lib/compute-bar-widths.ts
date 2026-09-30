const FULL_WIDTH_PERCENT = 100

// Percentages of the largest value: non-positive values get no bar, and all-zero input never
// divides by zero.
export function computeBarWidths(values: readonly number[]): number[] {
  const lengths = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0))
  const max = lengths.reduce((largest, value) => Math.max(largest, value), 0)
  return lengths.map((value) => (max === 0 ? 0 : (value / max) * FULL_WIDTH_PERCENT))
}
