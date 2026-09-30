-- Explicit privileges instead of Supabase's default grants, which a hosted project may have turned off.
-- Grants decide which statements a role may run; row-level security still decides which rows.
grant usage on schema public to anon, authenticated, service_role;

-- The service role (ingestion worker, usage recorder) bypasses RLS and writes every table.
grant select, insert, update, delete on all tables in schema public to service_role;

-- Users read and delete their documents but write only the user-owned columns.
grant select, delete on table public.documents to authenticated;
grant insert (title, content, tags, source_type, source_filename) on table public.documents to authenticated;
grant update (title, content, tags) on table public.documents to authenticated;
grant select on table public.document_summaries to authenticated;
-- Chunks and metering rows are system-written; users only read their own.
grant select on table public.document_chunks to authenticated;
grant select on table public.usage_events to authenticated;
grant select, insert, update, delete on table public.conversations to authenticated;
-- Messages are immutable once written.
grant select, insert on table public.messages to authenticated;

-- No user statement needs these, yet default grants hand them out with every new table.
revoke truncate, references, trigger on all tables in schema public from authenticated;
-- Postgres could write through the simple view; users may only read it.
revoke insert, update, delete on table public.document_summaries from authenticated;
