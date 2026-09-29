// LIKE escapes with a backslash by default; PostgREST rewrites every `*` in a like pattern to `%`.
const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g
const POSTGREST_LIKE_STAR = /\*/g
const LIKE_ANY_CHARACTER = '_'
const ARRAY_ELEMENT_SPECIAL_CHARACTERS = /["\\]/g

/**
 * An `ilike` pattern matching `text` anywhere. `*` cannot stay literal through PostgREST,
 * so it matches any one character.
 */
export function toContainsPattern(text: string): string {
  const escaped = text
    .replace(LIKE_SPECIAL_CHARACTERS, '\\$&')
    .replace(POSTGREST_LIKE_STAR, LIKE_ANY_CHARACTER)
  return `%${escaped}%`
}

/** A Postgres array literal with every element quoted; supabase-js would join them unquoted. */
export function toArrayLiteral(values: readonly string[]): string {
  const elements = values.map(
    (value) => `"${value.replace(ARRAY_ELEMENT_SPECIAL_CHARACTERS, '\\$&')}"`
  )
  return `{${elements.join(',')}}`
}
