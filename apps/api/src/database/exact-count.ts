export function exactCount(count: number | null): number {
  if (count === null) throw new Error('PostgREST returned no row count for a counted request')
  return count
}
