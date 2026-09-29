import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types.js'

/** A typed Supabase client; repositories take one as their first argument (DEC-004). */
export type DatabaseClient = SupabaseClient<Database>
