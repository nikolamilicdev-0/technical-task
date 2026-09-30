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

## DEC-015 — Readiness probe: `embedding_column_dimensions()` through the service-role client

**Decision** `GET /api/health/ready` calls `embedding_column_dimensions()` with the service-role client. This is an exception to DEC-004: the probe is read-only and reads catalog metadata, never user data.

**Why** The probe is public, so it has no user token to scope a client with, and the function is granted only to `authenticated` and `service_role`. Granting it to `anon` would make schema details public for no gain.

**How to apply** Keep the probe read-only and limited to that function. Every other service-role use still needs its own DEC entry; user requests always use the caller's RLS-scoped client.

## DEC-016 — Configuration: an own `APP_CONFIG` factory module instead of `@nestjs/config`

**Decision** `AppConfigModule` provides `APP_CONFIG`, a typed read-only `AppConfig` built by a DI-time factory that validates `process.env` with the zod env schema (the API variables plus `@kb/ai`'s `AI_*` ones). `@nestjs/config` is not used.

**Why** The root `.env` (DEC-010) must be loaded before validation runs. `ConfigModule.forRoot()` starts reading and validating as soon as `app.module.ts` is evaluated, which in ESM happens before `main.ts` can call `loadRootEnv()`, and its `envFilePath` is relative to the working directory rather than the workspace root. A DI-time factory runs after the root `.env` is loaded, reports every invalid variable in one error, and hands out typed sections instead of `config.get('KEY')` strings.

**How to apply** Inject `APP_CONFIG` and read typed sections; never read `process.env` outside `src/config`. A new variable is added to `env.schema.ts`, `buildAppConfig` and `.env.example` together.

## DEC-017 — Google Gemini provider profile over Google's OpenAI-compatible endpoint

**Decision** `@kb/ai` ships a `gemini` profile: base URL `https://generativelanguage.googleapis.com/v1beta/openai`, default chat model `gemini-3.5-flash-lite`, embeddings `gemini-embedding-001` with `defaultEmbeddingDimensions` 1536, and `max_completion_tokens` as the output limit.

**Why** Gemini speaks the OpenAI wire protocol, so the existing adapter serves it (DEC-003). `gemini-embedding-001` returns 3072 values natively, more than the `vector(1536)` column holds (DEC-014); Google truncates to the requested size without re-normalising, which is harmless because retrieval compares by cosine. "Thinking" Gemini Flash models count their reasoning tokens against `max_completion_tokens`, so a tight `RAG_MAX_ANSWER_TOKENS` can end an answer early.

**How to apply** Set `AI_CHAT_PROVIDER=gemini` and `AI_CHAT_API_KEY`; embeddings follow chat unless `AI_EMBEDDING_*` says otherwise. Prefer the lite model, or raise `RAG_MAX_ANSWER_TOKENS` for thinking models. Never set `AI_EMBEDDING_DIMENSIONS` above 1536 without the column migration.

## DEC-018 — Ingestion retry policy

**Decision** `classifyIngestionFailure` sorts every failed run once. Transient provider errors (`rate_limited`, `timeout`, `connection`, `server`), database requests that got no answer, a 408, 429 or 5xx, and a reused vector that vanished mid-run (SQLSTATE 23502) retry after `max(30 s doubling per attempt up to 30 min, the provider's Retry-After capped to a Postgres integer)`. Everything else fails for good: authentication, invalid or unsupported requests, more than 1,000 chunks, an embedding the column cannot hold (`VectorDimensionError`), the last of `INGESTION_MAX_ATTEMPTS`, and a stale claim past that limit, which fails before chunking.

**Why** Transient failures heal on their own, while permanent ones would spend provider quota on every sweep. The stale-claim branch of `claim_pending_documents` ignores the attempt limit, so without the pre-chunking check a document that kills the process mid-run would crash-loop forever. Only errors nothing anticipates (bugs, including a stray `RangeError`) are logged with their stack and stored as a generic message.

**How to apply** A new failure kind gets a branch and a test in `classifyIngestionFailure`; never make a bare `RangeError` or `TypeError` retryable or user-visible. A terminal failure stores `next_attempt_at = infinity`, which the contract reports as `null`; users retry with `POST /api/documents/:id/reindex`.

## DEC-019 — Chunker refinements and bounds on hostile input

**Decision** DEC-006 gains these rules. A heading with no text and no deeper heading after it becomes a chunk of its own text. Breadcrumb headings are cut to 80 characters ending in `…`, and a breadcrumb over 64 tokens drops its outermost headings but never the title. A token window that still counts over 512 on its own is cut again with half the budget. Normalization caps runs of spaces and tabs at 64. Patterns that scan runs of blanks or punctuation start matching only at a run's first character, headings are parsed by slicing, and `TokenCounter` encodes any run of one character class longer than 32 code units in slices.

**Why** An outline-only document used to publish with zero chunks, and one unbounded heading inflated every embedding input. js-tiktoken's byte-pair merge is quadratic in the length of a pre-tokenized piece (20,000 spaces took 32 s), and the worker shares the API's event loop, so a single upload could stall every request. Ordinary prose and code seldom hold 33 characters of one class in a row, so their counts stay exact; elsewhere a slice costs at most a token per cut.

**How to apply** Keep new chunker regexes linear: anchor them at the start of a run and never put a lazy group before a greedy blank run. Every such change gets an adversarial test within `LINEAR_TIME_BUDGET_MS`. Known limit: js-tiktoken's pure-JS merge still costs up to about 20 µs per character per pass on unbroken CJK (about 2 µs on Latin letters). Chunking a 200,000-character unbroken CJK run therefore occupies the event loop for about 20 s; moving chunking into a worker thread is the follow-up.

## DEC-020 — Usage metering

**Decision** Every provider call becomes one `usage_events` row. Ingestion records an `embedding` row per batch, chat records one for the query embedding, a completed rewrite records `query_rewrite`, and every stored answer records `chat`. `UsageRecorder.record()` is fire-and-forget through the service-role client; pending inserts are flushed before shutdown, and a failed insert is logged and dropped. When the provider reports no usage (Gemini's OpenAI-compatible embeddings send none), cl100k estimates it and flags the row `estimated`.

**Why** Metering must never slow down or fail the request it measures. Usage rows are system-written: users read their own but cannot insert (DEC-004). A flagged estimate serves the summary better than a missing row, and `estimatedRequests` keeps the estimate visible.

**How to apply** Record right after each provider call through `meterUsage(result.usage, estimate)` and never await it on a request path. A rewrite that timed out is not metered, because no answer arrived.

## DEC-021 — Reindex semantics

**Decision** `POST /api/documents/:id/reindex` and `POST /api/documents/reindex-all` run the definer function `requeue_documents` through the caller's RLS client. It re-queues the caller's documents that are not being processed, resets their attempts and returns `{ queued }`; the worker is woken only when something was queued. A document mid-run is skipped rather than interrupted (`{ queued: 0 }`), and a document the caller cannot see is a 404. Unchanged content reuses every stored vector by chunk hash, so only chunks whose text, breadcrumb or embedding signature changed are embedded again.

**Why** Users hold no update rights on the bookkeeping columns (DEC-005), and the definer function checks ownership in the same statement. Interrupting a run would race its finalize, and hash reuse keeps a reindex cheap; the chunk-set guard of DEC-023 removes what an older chunker left behind.

**How to apply** There is no force flag. To embed unchanged content anew, change the embedding model or its dimensions, which changes the signature (DEC-014). A title change re-embeds every chunk, because the title opens each breadcrumb. Each route allows 3 requests per minute per user.

## DEC-022 — Ingestion worker lifecycle

**Decision** `IngestionWorker` starts only when `INGESTION_WORKER_ENABLED` is true and AI is configured. It drains the queue on boot, on every `document.ingestion.requested` event, after a reindex and on a sweep every `INGESTION_SWEEP_INTERVAL_MS`. Only one drain runs at a time: wakes during it coalesce into one more pass, and a pass that claimed rows asks for another. Documents are processed one at a time. `requeue_documents_for_model` runs once per process, and until it succeeds each later drain retries it without holding up claims. On shutdown the worker stops claiming and waits only for the document in progress.

**Why** An in-process worker needs no extra service (DEC-005), and processing one document at a time bounds provider concurrency. The embedding signature is fixed at boot, so one re-queue per process is enough. Stopping between documents keeps SIGTERM fast; the rest of a claimed batch is claimed again once its claim goes stale (`INGESTION_STALE_AFTER_MINUTES`).

**How to apply** Never await ingestion on a request path: emit `DOCUMENT_INGESTION_REQUESTED` or call `wake()`. A failed drain is logged, and the next wake starts afresh.

## DEC-023 — Finalize and failure guards

**Decision** `finalize_document_ingestion` takes the run's chunk hashes and deletes every stored chunk of the document outside that set, besides chunks of other content versions or models. The published set is therefore exactly what the run produced. `mark_document_ingestion_failed` takes the claim's content hash and attempt, and changes the row only while that claim is current: `processing`, the same hash and the same `ingestion_attempts`.

**Why** When the content hash was unchanged, a retuned chunker left the old chunks in place, causing duplicates, an inflated `chunk_count` and colliding `chunk_index` values. A run whose claim went stale could also fail late and mark a newer claim or a newer content version as failed, discarding that work.

**How to apply** `20260929101000_ingestion_guards.sql` drops the old signatures, so ship it together with the API release that passes the new arguments; an older API can no longer finalize or record failures. The repository always sends every guard, and the in-memory fake mirrors them.

## DEC-024 — Search by content consistency and any query term (amends DEC-007)

**Decision** `match_chunks` and `search_chunks_keyword` return a chunk while its `document_content_hash` equals the document's current `content_hash`, whatever `embedding_status` the document has. Keyword search ORs the query's English lexemes (`to_tsvector`, quoted and joined with `|`) and falls back to `websearch_to_tsquery` when there are none. `ts_rank_cd` then ranks chunks by the terms and occurrences they match.

**Why** Filtering on `embedding_status = 'ready'` hid a document's still-valid chunks as soon as it was re-queued, so reindex-all emptied the library until the queue drained. The hash filter still hides chunks of text that an edit removed. DEC-007's `websearch_to_tsquery` ANDs every word, so a rewritten follow-up such as "Nimbus Pro plan pricing" found nothing unless one chunk held all four words.

**How to apply** A document that is partly re-indexed, or that failed midway, contributes the chunks already stored for its current content; that is intended. `ts_rank_cd` has no IDF, so Reciprocal Rank Fusion stays the arbiter (DEC-007): tune `RAG_KEYWORD_K` and `RAG_RRF_K`, not the query syntax.

## DEC-025 — Config-driven rate-limit buckets

**Decision** A route whose limit comes from the environment opts in with `@RateLimitBucket(name)`. `UserThrottlerGuard` then replaces the default throttler's limit with the bucket's configured value: `chat` reads `RATE_LIMIT_CHAT_PER_MINUTE`, and every other route uses `RATE_LIMIT_DEFAULT_PER_MINUTE`. Counting is per user and per route over one minute. Fixed product limits, 10 uploads and 3 reindex requests per minute, stay literal `@Throttle` values.

**Why** `@Throttle` arguments are fixed when the decorator runs, before the DI-time configuration exists (DEC-016), so the guard resolves configured limits at request time. The guard runs after `AuthGuard`: it tracks users rather than IP addresses and never counts a 401.

**How to apply** A new configurable limit adds a bucket name, its environment variable and one entry in the guard's bucket map. Counters live in process memory, so each API instance allows the full limit. A 429 carries both the `Retry-After` header and `retryAfter` in the body.

## DEC-026 — Chat stream rules

**Decision** `POST /api/conversations/:id/messages` stores the question first, then streams `meta`, `sources`, `delta…`, `usage` and `done`. `sources` lists exactly the passages placed in the prompt, after `RAG_CONTEXT_TOKEN_BUDGET` dropped whole ones, and `done` follows only the persisted answer. An aborted or failed stream stores its partial answer (`finish_reason` `aborted` or `error`) only if a token arrived, so nothing is stored before the first token. Every stored answer is metered, and is estimated when the provider sent no usage.

**Why** Citation markers index `sources`, so the list must match the prompt, and `done` promises a persisted message (DEC-008). A partial answer is still what the user saw, whereas an empty assistant row would be noise. Metering every stored answer keeps usage honest for cancelled streams too.

**How to apply** Add an event to `chatSseEventSchemas` first, and never emit `done` before the answer is stored. The SSE writer always drains the generator, so persistence runs after a client disconnects. A failure inside the stream becomes an `error` event carrying the JSON error mapping, and a comment every 15 s keeps proxies from closing an idle stream.

## DEC-027 — Citation.score semantics

**Decision** `Citation.score` is the Reciprocal Rank Fusion score in hybrid mode: Σ 1/(k + rank), at most 2/(k + 1), or about 0.033 with `RAG_RRF_K` = 60. In vector mode it is the cosine similarity. It orders one message's citations; it is not a probability, and scores from the two modes are not comparable.

**Why** A fused rank has no calibrated similarity, and reporting the cosine of a chunk that only keyword search found would mislead. Exposing the signal that actually selected the passage keeps the interface honest.

**How to apply** Show a score only relative to the other citations of the same message, never as a percentage. The mode is stored in `metadata.retrieval.mode` but is not part of the contract yet; a client that needs the absolute scale must wait until it is.

## DEC-028 — Query-rewrite policy

**Decision** When `RAG_QUERY_REWRITE` is on and the conversation has history, the chat model first rewrites the question into a standalone search query. It sees the last 6 messages, each cut to 300 tokens, and has 256 output tokens and 4 seconds. The first line of its answer, stripped of labels and quotes and capped at 4,000 code points, drives both vector and keyword search. The answer prompt keeps the user's own question. Any error, a timeout or an empty rewrite falls back to the raw question.

**Why** A follow-up such as "and the price?" retrieves nothing on its own. A bounded, best-effort rewrite fixes that without letting a slow or failing model hold up the answer. Answering the original question means a poor rewrite can change only what is retrieved, never what is asked.

**How to apply** The rewrite is metered as `query_rewrite` and stored in `metadata.retrieval.rewrittenQuery`. Set `RAG_QUERY_REWRITE=false` for providers where the extra call is too slow or too costly.
