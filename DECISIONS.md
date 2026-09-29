# Decisions

Append-only log of architectural decisions. To change one, add a new entry that supersedes it; never rewrite history. DEC-001 to DEC-014 were recorded on 2026-09-29 while planning the project.

## DEC-001 — Monorepo tooling: pnpm 12 workspaces and Turborepo 2 on Node 22

**Decision** pnpm 12.6 (pinned via `packageManager`; settings and the version catalog live in `pnpm-workspace.yaml`) and Turborepo 2.11 on Node 22 LTS. `@kb/contracts` and `@kb/ai` compile to ESM `dist/` while their `types` export points at `src/`; `@kb/ui` ships source and is compiled by Next (`transpilePackages`).

**Why** Turborepo is the required orchestrator; pnpm's strict linking catches undeclared dependencies, and the catalog keeps a single copy of zod, TypeScript and React. Node and Nest execute compiled JavaScript while editors and type-checkers read live types without a build. Several pinned dependencies (openai 7, lint-staged 17, vitest 4) need Node 22.

**How to apply** Put shared versions in the catalog and reference them as `catalog:`. New runtime packages copy the `@kb/contracts` scripts (`build`, `dev`, `typecheck`, `lint`, `test`, `clean`). `lint`, `typecheck` and `test` depend on turbo's `transit` node, never on `^build`, so they stay parallel but still re-run when a dependency changes.

## DEC-002 — Contracts: zod schemas in `@kb/contracts` are the single source of truth

**Decision** Every DTO, query schema, route path, SSE event, limit and error code lives in `@kb/contracts` as a zod 4 schema or `as const` value; TypeScript types are always `z.infer`-ed.

**Why** The API validates requests with the same schema object the web form uses, so client and server cannot drift, and limits such as title length or upload size stay identical on both sides and in the SQL check constraints.

**How to apply** Change the contract first, then the API, then the web. Never hand-write a DTO type or repeat a limit literal; import it. Every schema has accept/reject unit tests.

## DEC-003 — AI layer: provider-agnostic ports with one OpenAI-compatible adapter

**Decision** `@kb/ai` exposes `ChatModel` and `EmbeddingModel` ports, a provider profile table (OpenAI, Groq, Together, OpenRouter, Ollama, custom) and one adapter over the OpenAI SDK. Chat and embeddings are configured independently.

**Why** Most providers speak the OpenAI wire protocol, so one adapter plus per-profile quirks (base URL, max-tokens parameter, streamed usage, embedding support) covers them. Independent configuration allows, for example, Groq for chat with OpenAI embeddings. Application code only sees the ports.

**How to apply** Swap providers with `AI_*` environment variables. A provider with a different protocol gets a new adapter class and one `case` in the factory; nothing outside `@kb/ai` changes.

## DEC-004 — Security boundary: Postgres RLS with per-request user-scoped clients

**Decision** The API forwards the caller's JWT to Supabase through a per-request client (publishable key plus Bearer token), so row-level security decides what is visible. The secret key is used only by the ingestion worker and the usage recorder.

**Why** A forgotten `where user_id = …` cannot leak another user's data, and column privileges keep ingestion bookkeeping writable by the service role alone.

**How to apply** Repository methods take the user-scoped `db` client as their first argument. Any other use of the service-role client needs a new DEC entry.

## DEC-005 — Ingestion queue: the documents status column is the durable queue

**Decision** `documents.embedding_status` doubles as the job queue. The worker claims rows with `FOR UPDATE SKIP LOCKED`, retries with exponential backoff, re-claims stale `processing` rows and reuses embeddings by chunk content hash.

**Why** Durable across restarts and safe with several API instances, without Redis or a second service. A database trigger re-queues a document whenever its content changes, so no code path can forget to.

**How to apply** Application code never writes `embedding_status` directly; it goes through the ingestion SQL functions (`requeue_documents` for users, `requeue_documents_for_model` for the worker).

## DEC-006 — Chunking: markdown-aware splitting at 400/512/50 tokens with heading breadcrumbs

**Decision** A recursive splitter targets 400 tokens (maximum 512, overlap 50, counted with cl100k via `js-tiktoken`), never crosses a heading, keeps fenced code intact and prefixes every chunk with a `Title › Heading` breadcrumb. Chunks are keyed by content hash.

**Why** One idea per vector retrieves more precisely; six 400-token sources plus history fit an 8k-context local model; the breadcrumb restores context lost by splitting; hash keys make re-indexing idempotent and cheap.

**How to apply** Tune only through the chunker constants and cover every change with chunker unit tests.

## DEC-007 — Retrieval: hybrid vector and full-text search fused with RRF in TypeScript

**Decision** Vector top-20 and Postgres full-text top-20 run in parallel and are merged with Reciprocal Rank Fusion (k = 60) in TypeScript; the top 6 go into the prompt. Follow-up questions are first rewritten into standalone queries.

**Why** Keyword search rescues exact identifiers that embeddings blur. Fusing in TypeScript keeps the ranking unit-testable and tunable without a migration.

**How to apply** Adjust limits and weights with the `RAG_*` variables; the SQL functions only return candidates.

## DEC-008 — Streaming: Server-Sent Events over POST with typed events

**Decision** `POST /api/conversations/:id/messages` streams `meta → sources → delta… → usage → done` (or `error`) as SSE when the request sends `Accept: text/event-stream`, and returns JSON otherwise. The web reads the stream with `fetch` and a `ReadableStream` parser.

**Why** `EventSource` cannot POST or send an `Authorization` header; SSE is simpler than WebSockets for one-way streaming and stays curl-friendly. Shared schemas validate every frame on both ends.

**How to apply** Add or change events only in `@kb/contracts` (`chatSseEventSchemas`). Frames are `event: <type>` plus `data: <json>`; `done` is sent only after the assistant message is persisted.

## DEC-009 — Citations: a snapshot of retrieved sources on the assistant message

**Decision** The model cites with `[n]` markers. Every retrieved source is stored as a jsonb snapshot on the assistant message with a `cited` flag, and `[n]` refers to `citations[n - 1]`.

**Why** Answers stay reproducible and clickable after documents are edited, re-indexed or deleted, without joining chunk rows that may no longer exist.

**How to apply** Render history from the stored snapshot, never from live chunks, and parse markers with the shared citation parser.

## DEC-010 — Configuration: one root `.env`, public variables derived

**Decision** Both apps read the single root `.env`, found by walking up to `pnpm-workspace.yaml` and loaded with `process.loadEnvFile()`. The web derives its `NEXT_PUBLIC_*` values in `next.config.ts`.

**Why** No value is duplicated between apps, and the server-only secret key can never be given a `NEXT_PUBLIC_` name by mistake.

**How to apply** A new variable touches `.env.example`, the API env schema and, when the web build reads it, `apps/web/turbo.json`.

## DEC-011 — Database workflow: Supabase CLI migrations for local and hosted projects

**Decision** The schema lives in timestamped SQL migrations under `supabase/migrations`. `pnpm bootstrap` supports a local Supabase stack (Docker) or a hosted project, and the generated database types are committed.

**Why** Migrations are reviewable and replayable; committed types let evaluators without Docker or the CLI still build and run the API against a hosted project.

**How to apply** Never edit an applied migration: add one with `pnpm db:new`, then run `pnpm db:types`. Never hand-edit `database.types.ts`.

## DEC-012 — Toolchain pins: TypeScript 6.0, Vitest 4, ESLint 10, NestJS 12 (ESM), Next.js 16

**Decision** TypeScript `~6.0.3` from the catalog, Vitest 4.1, ESLint 10 flat config with typescript-eslint 8.71, NestJS 12 as native ESM and Next.js 16 with the App Router.

**Why** `@nestjs/cli` 12 requires TypeScript ~6.0 and typescript-eslint supports `<6.1`, which rules out TypeScript 7; Vitest 5 is only weeks old; ESM Nest imports ESM-only libraries (`unpdf`, `openai`, `jose`) without workarounds.

**How to apply** Upgrading a pinned major needs a new DEC entry. If Next rejects TypeScript 6, override it to 5.9 for `apps/web` only.

## DEC-013 — Setup command: `pnpm bootstrap`, not `pnpm setup`

**Decision** The one-shot setup script is `pnpm bootstrap` (`scripts/setup.mjs`): dependency-free Node ESM and idempotent.

**Why** `pnpm setup` is a built-in command in pnpm 10 and earlier that rewrites shell rc files, so a script with that name would be shadowed or surprising.

**How to apply** Keep the script dependency-free so it runs before dependencies are installed, and never let a re-run overwrite an existing `.env` unless `--force-env` is passed.

## DEC-014 — Embeddings: a fixed 1536-dimension column, zero-padding and a model signature

**Decision** `document_chunks.embedding` is `vector(1536)`. Smaller embeddings are zero-padded, every chunk records an `embedding_model` signature (`model` or `model#dims`), and the worker re-queues documents embedded under a different signature.

**Why** HNSW indexes need a fixed dimension. Zero-padding preserves cosine similarity, so switching to a 768-dimension Ollama model is an env-only change, and the signature keeps vector spaces from mixing in one search.

**How to apply** Retrieval always filters by the current signature. Models with more than 1536 dimensions need a column migration, a `VECTOR_DIMENSIONS` bump and `POST /api/documents/reindex-all`.
