# Research: AI-Powered Knowledge Base

Every open question from the plan's Technical Context, resolved. Each entry records the decision, why it was made and what was rejected. The entries summarise; the authoritative reasoning is the linked entry in [DECISIONS.md](../../DECISIONS.md).

## R1. Monorepo tooling and internal packages

**Decision**: pnpm 12.6 workspaces with a version catalog in `pnpm-workspace.yaml`, and Turborepo 2.11. `@kb/contracts` and `@kb/ai` compile to ESM `dist/` while their `types` export points at `src/index.ts`; `@kb/ui` ships TypeScript source that Next compiles through `transpilePackages` and Tailwind scans through `@source`. Vitest aliases every `@kb/*` package to its source (`vitest.shared.ts`), so tests never need a build. `build` and `dev` depend on `^build`, while `lint`, `typecheck` and `test` depend on a `transit` node. The one-shot setup is `pnpm bootstrap` (DEC-001, DEC-013).

**Rationale**: Turborepo is required; pnpm's strict linking catches undeclared dependencies, and the catalog keeps one copy of zod, TypeScript and React. Node and Nest execute compiled JavaScript while editors and type-checkers read live types. The `transit` node keeps the three checks parallel while still invalidating their cache when a dependency changes.

**Alternatives considered**: npm or Yarn workspaces (looser linking, no catalog); source-only packages for the API as well (Nest runs compiled output, so it would need a runtime TypeScript loader); `lint`, `typecheck` and `test` with no dependency edge, as first planned (a contract change could replay a stale green typecheck from the cache); a script named `pnpm setup` (a pnpm 10 built-in that rewrites shell profiles).

## R2. Contracts as the single source of truth

**Decision**: zod 4 schemas in `@kb/contracts` for every DTO, query, route path (`apiRoutes`), SSE event (`chatSseEventSchemas`, `parseChatSseEvent`), limit and error code, with the status of each code in `ERROR_HTTP_STATUS`; types are always `z.infer`-ed. The API validates each request part with its own `ZodValidationPipe` behind `ZodBody`, `ZodQuery` and `ZodParam`, and turns failures into `422 invalid_payload` with a field map. The web uses the same schemas in its forms (`useZodResolver`) and parses every response. Every stored string passes `withoutNul` (DEC-002).

**Rationale**: one schema object on both sides removes drift by construction, and the limits are also SQL check constraints, so a bypass of the API still fails. An own pipe keeps the error shape stable.

**Alternatives considered**: class-validator DTOs in Nest (a second source of truth with a different error shape); an OpenAPI-first generator (heavier toolchain; generating OpenAPI from the zod contracts is listed as a future improvement); building the update schema with `.partial()` of the create schema (the `tags` default was re-applied and a title-only PATCH wiped the tags; a contract test caught it, and the update schema now starts from the undefaulted fields).

## R3. Provider-agnostic AI layer

**Decision**: `@kb/ai` is framework-free. It exposes the `ChatModel` and `EmbeddingModel` ports, `AiProviderError` with neutral codes (`authentication`, `rate_limited`, `timeout`, `connection`, `server`, …), a profile table for `openai`, `groq`, `together`, `openrouter`, `gemini`, `ollama` and `custom`, one adapter over the OpenAI SDK and `createAiClients(config)` as the only factory. `AI_CHAT_*` and `AI_EMBEDDING_*` are configured independently: the embedding provider defaults to the chat provider, its key, base URL and headers are inherited only when both providers match, and model names never carry over. The Gemini profile uses Google's OpenAI-compatible endpoint with `gemini-embedding-001` requested at 1536 dimensions. An incomplete configuration binds stand-in models that fail each call with the problem (DEC-003, DEC-017).

**Rationale**: most providers speak the OpenAI wire protocol, so one adapter with per-profile quirks (base URL, key policy, `max_tokens` or `max_completion_tokens`, streamed usage, `dimensions` support, attribution headers) covers them. Independent configuration allows, for example, Groq for chat with OpenAI embeddings, since Groq serves no embeddings. `aiConfigFromEnv` names the offending variable in every error.

**Alternatives considered**: one combined provider setting (rules out chat-only providers such as Groq); a native Gemini SDK adapter (unnecessary, because Gemini speaks the OpenAI protocol); retry and timeout decorator classes (the SDK's `maxRetries` and `timeout` options already cover them); refusing to boot without AI configuration (documents and conversations still work, so the API degrades and reports `ai: unconfigured` instead).

## R4. Row-level security and user-scoped clients

**Decision**: RLS is the security boundary. `AuthGuard` verifies the bearer token with `supabase.auth.getClaims` behind the `JwtVerifier` port and attaches a Supabase client built from the publishable key plus the caller's token; every repository takes that client as its first argument. The service-role client serves only the ingestion worker, the usage recorder and the readiness probe. `20260929100800_grants_hardening.sql` grants each role exactly what it needs per table and column and revokes `TRUNCATE`, `REFERENCES`, `TRIGGER` and, on Postgres 17, `MAINTAIN` (DEC-004, DEC-015).

**Rationale**: a forgotten `where user_id = …` returns fewer rows instead of leaking data; column grants keep the hash and ingestion bookkeeping out of users' reach; explicit grants do not depend on a hosted project's default privileges. `getClaims` verifies ES256 tokens locally against the cached JWKS and legacy HS256 tokens through Auth, so no shared secret is needed.

**Alternatives considered**: a service-role client with application-level `user_id` filters (a single missed filter leaks another user's data); verifying tokens with the project's JWT secret (needs the legacy shared secret and fails on asymmetric keys; the port still allows swapping in a local verifier); granting the readiness function to `anon` (makes schema details public for no gain).

## R5. The documents table as a durable ingestion queue

**Decision**: `documents.embedding_status` is the queue. The `documents_before_write` trigger computes `content_hash` from title and content and re-queues the document whenever the hash changes. An in-process `IngestionWorker` drains on boot, on `DOCUMENT_INGESTION_REQUESTED`, after a reindex and on a 30 s sweep, one drain at a time and one document at a time. `claim_pending_documents` takes pending rows, failed rows whose retry is due and stale `processing` claims with `FOR UPDATE SKIP LOCKED`. `upsert_document_chunks` reuses stored vectors by chunk hash, `finalize_document_ingestion` publishes exactly the run's chunk set, and `mark_document_ingestion_failed` only touches the claim that failed. `classifyIngestionFailure` retries transient failures after `max(30 s doubling up to 30 min, Retry-After)` for up to 5 attempts and fails the rest for good (DEC-005, DEC-018, DEC-021, DEC-022, DEC-023).

**Rationale**: durable across restarts, safe with several API instances and free of extra infrastructure; every step is an RPC through PostgREST, so no direct database connection is needed. Doing the hashing and re-queueing in the trigger means no code path can change content without re-indexing it.

**Alternatives considered**: Redis with a job library (an extra service to run and secure); pg-boss or pgmq (a direct Postgres connection and a second process; the planned next step once ingestion moves out of the API); processing inline in the request (lost on restart, no retries, slow saves); interrupting a run on reindex (races its finalize, so a document mid-run is skipped instead).

## R6. Markdown-aware chunking with breadcrumbs

**Decision**: a recursive splitter targets 400 tokens, with a 512-token maximum and 50 tokens of overlap, counted in cl100k with `js-tiktoken/lite`. It never crosses a heading, keeps fenced code whole, merges tails under 60 tokens and prefixes every chunk with a `Title › Heading` breadcrumb (headings cut to 80 characters, the breadcrumb to 64 tokens). Each chunk embeds `breadcrumb + "\n\n" + content` and is keyed by its SHA-256; more than 1,000 chunks fails the document. Regular expressions are anchored at the start of a run, blank runs are capped, and long runs of one character class are tokenized in slices (DEC-006, DEC-019).

**Rationale**: one idea per vector retrieves more precisely; six 400-token sources plus history fit an 8k-context local model; the breadcrumb restores context the split removed; hashes make re-indexing idempotent and cheap. Real token counts matter because a characters-divided-by-four estimate is 30 to 50% off for code and non-English text. The linear-time rules came from a review that found a 20,000-space run blocking the event loop for 32 s.

**Alternatives considered**: fixed character windows (split sentences and code, ignore structure); whole pages or documents as one vector (dilute the match); estimating tokens from characters (see above).

## R7. Hybrid retrieval fused with Reciprocal Rank Fusion

**Decision**: `match_chunks` (cosine over the HNSW index, 20 results from 40 candidates) and `search_chunks_keyword` (English lexemes of the query OR-ed, ranked by `ts_rank_cd`, 20 results) run in parallel as the user. Both filter by the current embedding signature, the optional `documentIds` and a chunk's `document_content_hash` matching its document's current hash. `fuseRankings` scores `Σ 1/(60 + rank)` in TypeScript and keeps the top 6. A follow-up is first rewritten into a standalone query (last 6 messages of at most 300 tokens, 256 output tokens, 4 s, the raw question on any failure). `Citation.score` is the fused score, not a probability (DEC-007, DEC-024, DEC-027, DEC-028).

**Rationale**: full-text search rescues exact identifiers that embeddings blur; RRF needs no calibration between cosine similarity and `ts_rank_cd`; fusing in TypeScript keeps ranking unit-tested and tunable with `RAG_*` variables without a migration. The content-hash filter keeps a re-queued document searchable while text removed by an edit disappears at once.

**Alternatives considered**: vector search only (misses exact codes and names; still available as `RAG_RETRIEVAL_MODE=vector`); fusion inside SQL (harder to test, and every tweak becomes a migration); `websearch_to_tsquery`, which ANDs every word (rewritten follow-ups matched nothing; a review finding); filtering on `embedding_status = 'ready'` (reindex-all emptied the library until the queue drained); a cross-encoder reranker (an extra model call per question; listed as an improvement).

## R8. Streaming over Server-Sent Events on POST

**Decision**: `POST /api/conversations/:id/messages` streams `meta`, `sources`, `delta`…, `usage` and `done` (or one `error`) as SSE when `Accept` names `text/event-stream`, and returns a `ChatResult` as JSON otherwise. Frames are `event: <type>` plus one line of JSON; a `: keep-alive` comment follows every 15 s; headers disable caching, transformation and proxy buffering. The writer drains the event generator even after a disconnect so persistence runs, and `done` is sent only after the answer is stored. The web reads the stream with `fetch` and its own spec-compliant parser (`features/chat/lib/parse-sse.ts`) feeding a reducer (DEC-008, DEC-026).

**Rationale**: `EventSource` can neither POST nor send an `Authorization` header; one-way streaming does not need WebSockets; the endpoint stays usable from curl, and the same zod schemas validate every frame on both ends.

**Alternatives considered**: `EventSource` with the token in the query string (leaks it into logs and history); WebSockets (a second protocol with its own authentication, for one-way traffic); streaming through a Next route handler (can buffer, and adds a hop; the browser calls the API origin directly).

## R9. Citations as a snapshot on the answer

**Decision**: the model cites with `[n]` markers. Every source placed in the prompt is stored as a jsonb snapshot on the assistant message, in prompt order, with `cited: true` on those the answer names; `[n]` always means `citations[n - 1]`. The parser accepts `[1]`, `[2][3]` and `[1, 2]` outside code and ignores Markdown links and out-of-range numbers. The web renders markers as chips and shows each source's rank and a bar relative to the best score in that answer (DEC-009, DEC-027, DEC-030).

**Rationale**: answers stay reproducible and clickable after documents are edited, re-indexed or deleted, without joining chunk rows that may no longer exist.

**Alternatives considered**: a join table from messages to chunks (breaks when a re-index replaces chunks); asking the model for structured citation JSON (fragile while streaming); showing the score as a percentage (it is not a probability).

## R10. One root `.env` and a typed configuration factory

**Decision**: both apps read the single root `.env`, found by walking up to `pnpm-workspace.yaml` and loaded with `process.loadEnvFile()`; values already in the environment win. The web derives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `next.config.ts`. The API validates everything once in a DI-time `APP_CONFIG` factory built on its zod env schema, extended with `@kb/ai`'s `aiEnvSchema`; drift tests compare the schemas with `.env.example` (DEC-010, DEC-016).

**Rationale**: no value is duplicated between apps, and the secret key can never be exposed under a public name by mistake. A DI-time factory runs after the root `.env` is loaded, reports every invalid variable at once and hands out typed sections.

**Alternatives considered**: one `.env` per app (duplicated values drift apart); `@nestjs/config` (`ConfigModule.forRoot()` validates while `app.module.ts` is evaluated, before `main.ts` can load the root file, and resolves `envFilePath` against the working directory); reading `process.env` wherever a value is needed (untyped, unvalidated).

## R11. Supabase CLI migrations and a one-command bootstrap

**Decision**: the schema lives in timestamped SQL migrations under `supabase/migrations/`, and an applied migration is never edited. `pnpm bootstrap` (`scripts/setup.mjs`, dependency-free Node ESM, idempotent) installs dependencies, creates `.env` from `.env.example` without ever overwriting it, and sets up a local Docker stack (`supabase start`, keys copied from `supabase status`, migrations applied, types generated), a hosted project (`supabase db push --db-url`) or neither (instructions for the SQL editor). The generated `database.types.ts` is committed (DEC-011, DEC-013).

**Rationale**: migrations are reviewable and replayable; committed types let evaluators without Docker or the CLI build and run the API against a hosted project; `--db-url` avoids `supabase login` and `link`.

**Alternatives considered**: an ORM with its own migration format (a second schema language, and a poor fit for policies, grants and SQL functions); generating types during the build (needs Docker or an access token in CI); requiring `supabase link` for hosted projects (an extra login step for evaluators).

## R12. Toolchain pins

**Decision**: Node 22 LTS; TypeScript `~6.0.3` from the catalog; NestJS 12 as native ESM (`module: nodenext`, `.js` import suffixes, `import.meta.dirname`, injected classes never imported with `import type`); Next.js 16 with the App Router and `proxy.ts`; React 19.3; Tailwind CSS 4.3 in CSS-first mode, with the design tokens in `@kb/ui/theme.css` under `@theme inline`; Vitest 4.1; ESLint 10 flat configs with typescript-eslint 8.71 (DEC-012).

**Rationale**: `@nestjs/cli` 12 depends on TypeScript `~6.0` and typescript-eslint supports versions below 6.1, which rules out TypeScript 7; ESM Nest imports ESM-only libraries such as `unpdf` and `openai` without dynamic-import workarounds; several pinned dependencies (openai 7, lint-staged 17, Vitest 4) need Node 22; Next 16 deprecates `middleware.ts`.

**Alternatives considered**: TypeScript 7 (breaks `nest build` and typescript-eslint); CommonJS Nest (dynamic imports for every ESM-only library); Node 20 (end of life and below several packages' engines); Tailwind 3 with a JavaScript preset (v4 tokens live in CSS); Vitest 5 (only weeks old when the versions were pinned).

## R13. Fixed embedding dimensions and model signatures

**Decision**: `document_chunks.embedding` is `vector(1536)`. `toStoredVector` zero-pads shorter vectors and rejects longer ones with a `VectorDimensionError` that points at `AI_EMBEDDING_DIMENSIONS`; every chunk records the signature `model` or `model#dims`; retrieval filters by the current signature; the worker re-queues documents embedded under another one once per process; `/api/health/ready` compares the column size with `VECTOR_DIMENSIONS` (DEC-014, DEC-017).

**Rationale**: an HNSW index needs a fixed dimension; trailing zeros change neither dot products nor norms, so cosine similarity is preserved and a 768-dimension model is an environment-only swap; signatures keep vector spaces from mixing in one search.

**Alternatives considered**: an unconstrained `vector` column (cannot carry the HNSW index); one column or table per model (schema churn for every model); a wider column by default (pgvector's HNSW supports at most 2,000 dimensions for `vector`, so larger models need `halfvec` through a documented migration).

## R14. Web data flow and session handling

**Decision**: server components gate, load copy and render the shell; data lives in React Query hooks inside client leaves, with no server prefetch or hydration. The browser calls the API origin directly with the Supabase access token as a Bearer header. Query-key factories live per feature; the documents list polls every 3 s while anything is indexing; mutations follow a fixed matrix (create pushes to the detail cache, updates and deletes are optimistic with rollback, uploads and new conversations invalidate lists, a finished answer is committed to the conversation cache). The first message in a new chat creates the conversation and swaps the URL with `history.replaceState` so the stream stays mounted. A 401 refreshes the session once and retries before signing out, and sign-out is a full reload (DEC-029, DEC-031, DEC-032, DEC-034).

**Rationale**: with a separate API origin and Bearer authentication, server-side prefetching would double the fetch surface; keying the chat session to the URL keeps history honest without unmounting an open stream.

**Alternatives considered**: prefetching on the server with a hydration boundary (a second, cookie-based fetch path to the API); `router.push` after the first message (unmounts the component that holds the stream); clearing the query cache in place on sign-out (queries refetched without a token and triggered a spurious "session expired" redirect).

## R15. Rate limits and usage metering

**Decision**: limits count per user, per route and per minute: 120 by default (`RATE_LIMIT_DEFAULT_PER_MINUTE`), 20 for chat (`RATE_LIMIT_CHAT_PER_MINUTE`), and fixed values of 10 uploads and 3 reindex requests. `@RateLimitBucket(name)` maps a route to a configured bucket that `UserThrottlerGuard` resolves at request time, after `AuthGuard`. Every provider call writes one `usage_events` row through `UsageRecorder.record()`, fire-and-forget with the service-role client, flushed on shutdown; missing provider usage is estimated with cl100k and flagged `estimated` (DEC-020, DEC-025).

**Rationale**: `@Throttle` arguments are fixed before the DI-time configuration exists; counting users rather than addresses is fair behind shared networks and never counts a 401; metering must never slow down or fail the request it measures.

**Alternatives considered**: limits by IP address (penalises shared networks); Redis storage for the counters (needed only with several instances; listed as an improvement); awaiting usage inserts on the request path (adds latency and a failure mode to every answer).

## R16. Test strategy

**Decision**: Vitest unit tests in each package's `__tests__/unit/` for every non-trivial pure module (contracts tables, provider profiles and env decoding, both adapters against a fake OpenAI client, the chunker and its splitters with time budgets, RRF, the prompt builder, the citation parser, SSE formatting and parsing, reducers, cache helpers, view-state functions). The API boots whole in `app.setup.test.ts` and five `*.pipeline.test.ts` files with in-memory repositories, a fake JWT verifier and `FakeChatModel`/`FakeEmbeddingModel`. Web component tests render with the real dictionary through `renderWithProviders`. Live behaviour was verified by hand with `http/*.http`, curl and a browser pass against the local stack.

**Rationale**: every boundary has a fake, so CI needs no keys, Docker or network and stays deterministic; pipeline tests prove the HTTP wiring (guards, pipes, filters, SSE) that unit tests cannot.

**Alternatives considered**: tests against live providers in CI (slow, flaky and costly, and they would need secrets); a Supabase stack in CI for every run (slow; a Playwright smoke test against a CLI stack is the planned addition); component snapshot tests (brittle and uninformative).
