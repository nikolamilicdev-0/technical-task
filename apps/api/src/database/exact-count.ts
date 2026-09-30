/** The row count of a request made with `count: 'exact'`, which PostgREST always sends. */
export function exactCount(count: number | null): number {
  if (count === null) throw new Error('PostgREST returned no row count for a counted request')
  return count
}
