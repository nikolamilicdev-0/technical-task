import { PostgrestError } from '@supabase/supabase-js'

/** supabase-js returns failures as plain objects, whatever their type says; logs need an Error. */
export function toDatabaseError(error: PostgrestError): PostgrestError {
  return error instanceof PostgrestError ? error : new PostgrestError(error)
}
