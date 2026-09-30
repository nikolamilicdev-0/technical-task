---
name: data-layer
description: Rules for the Supabase database — migrations through the Supabase CLI, RLS policies and explicit grants, generated types, SQL functions called over RPC, the ingestion state machine and vector storage. Use when changing the schema, adding a table, column, policy, grant or SQL function, writing repository queries, or reasoning about indexing states.
---

# Data Layer (Supabase Postgres 17 with pgvector)

Schema reference: `specs/001-knowledge-base/data-model.md`. Security model: `docs/architecture.md`. RLS is the security boundary (DEC-004).

## Migrations (DEC-011)

- Create one with `pnpm db:new <name>` (`supabase/migrations/<timestamp>_<name>.sql`). Never edit an applied migration; supersede it in a new one, as `20260929101000_ingestion_guards.sql` drops and recreates two functions.
- Apply with `pnpm db:reset` (rebuild the local database), `pnpm db:migrate` (pending migrations against the database in `.env`) or `pnpm db:push` (hosted, asks first).
- After every schema change run `pnpm db:types`, which regenerates `apps/api/src/database/database.types.ts` (committed, excluded from Prettier, never hand-edited), then extend `DATABASE_RELATIONS` or `DATABASE_FUNCTIONS` in `apps/api/src/database/database.constants.ts`; both are checked against the generated types.

## Every new table

1. `user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`, or a `user_id` copied from its parent row.
2. A check constraint for every limit the contract states (`packages/contracts/src/limits.ts`).
3. Indexes for the list order (`(user_id, updated_at desc)`) and for every filter the repository uses.
4. `enable row level security`, then one policy per command `to authenticated` on `user_id = (select auth.uid())`, with `with check` on insert and update.
5. Explicit grants: `revoke all … from anon`; grant `authenticated` exactly the commands and columns it needs (column lists when some columns are system-owned); grant `service_role` its table privileges as `20260929100800_grants_hardening.sql` does, because a grant on all tables covers only tables that already existed.
6. A view is `with (security_invoker = true)` and granted `select` only.

## SQL functions

- `set search_path = ''`, with every object schema-qualified (`public.documents`, `extensions.vector`, `operator(extensions.<=>)`).
- `security invoker` by default, so RLS applies. Use `security definer` only when users must change columns they hold no grant on, and then check `auth.uid()` inside, as `requeue_documents` does.
- `revoke execute … from public, anon`, then grant `authenticated` and/or `service_role` explicitly; worker functions go to `service_role` alone.
- Repositories call them with `db.rpc(DATABASE_FUNCTIONS.x, { p_… })`; parameters are prefixed `p_`.
- A changed signature drops the old function in the same migration and ships together with the API that passes the new arguments (DEC-023).

## Ingestion state machine (DEC-005)

- `documents.embedding_status` (`pending → processing → ready | failed`) is the queue. Only the `documents_before_write` trigger (a changed content hash means `pending`) and the ingestion functions move it: `claim_pending_documents` (`SKIP LOCKED`, stale recovery), `upsert_document_chunks` (hash reuse; `-1` when the content changed), `finalize_document_ingestion` (exactly the run's chunk set), `mark_document_ingestion_failed` (only on the current claim; a retry time or `infinity`), `requeue_documents` (users) and `requeue_documents_for_model` (the worker).
- Application code never writes `embedding_status` or any other bookkeeping column; users hold no grant on them anyway.
- A new failure kind gets a branch and a test in `classifyIngestionFailure` (`apps/api/src/modules/ingestion/ingestion-failure.ts`, DEC-018).

## Vectors and search

- `document_chunks.embedding` is `extensions.vector(1536)` under an HNSW cosine index. Send the text literal from `toStoredVector()` (`apps/api/src/common/utils/vector.ts`), which zero-pads and rejects wider vectors; a wider model needs the column migration described in `docs/architecture.md` (DEC-014).
- Searches filter by `user_id`, the current embedding signature and `document_content_hash = documents.content_hash`; SQL only returns candidates, and fusion happens in `apps/api/src/modules/retrieval/rank-fusion.ts` (DEC-007, DEC-024).

## Done when

`pnpm db:reset` applies every migration cleanly, `pnpm db:types` leaves no diff, a second user gets 404 on the first user's rows, and no function has a mutable `search_path`.
