const FULL_WIDTH_PERCENT = 100

/**
 * Bar lengths as a percentage of the largest value, so the busiest row fills its track. Values
 * that are not positive get no bar, and with none above zero every bar is empty (never NaN).
 */
export function computeBarWidths(values: readonly number[]): number[] {
  const lengths = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0))
  const max = lengths.reduce((largest, value) => Math.max(largest, value), 0)
  return lengths.map((value) => (max === 0 ? 0 : (value / max) * FULL_WIDTH_PERCENT))
}
