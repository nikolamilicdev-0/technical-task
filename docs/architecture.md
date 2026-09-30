# Architecture notes

The [README](../README.md) gives the overview; this file holds the details behind it: the security model, the data model, ingestion, chunking, retrieval, prompt construction, provider resolution, every environment variable and the operational behaviour. Decisions are referenced as DEC-NNN from [`DECISIONS.md`](../DECISIONS.md).

## Security model

Row-level security is the boundary ([DEC-004]). The API never answers a user request with an admin client: `AuthGuard` verifies the bearer token and attaches a Supabase client built from the publishable key plus that token, and every repository method takes this client as its first argument. Postgres then evaluates each query as the role `authenticated` with `auth.uid()` set to the caller, so a missing `where user_id = …` in application code cannot leak another user's rows; it only returns fewer of them.

| Client (`SupabaseClientFactory`) | Key                    | Used by                                                                                   | RLS      |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- | -------- |
| `forUser(token)`                 | publishable + user JWT | Every user request: documents, conversations, messages, retrieval, usage summary, reindex | Applies  |
| `serviceRole()`                  | secret                 | Ingestion worker, usage recorder, readiness probe ([DEC-015])                             | Bypassed |
| `anonymous()`                    | publishable            | JWT verification (`getClaims`), which caches the JWKS                                     | n/a      |

Grants decide which statements a role may run; policies decide which rows. `20260929100800_grants_hardening.sql` sets both explicitly rather than relying on Supabase's default privileges, which a hosted project may have changed:

| Relation             | `authenticated` may                                                                                        | Policy                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `documents`          | select, delete; insert `title, content, tags, source_type, source_filename`; update `title, content, tags` | Own rows (`user_id = (select auth.uid())`) for every command |
| `document_summaries` | select (a `security_invoker` view, so the `documents` policy applies)                                      | Inherited                                                    |
| `document_chunks`    | select                                                                                                     | Own rows                                                     |
| `conversations`      | select, insert, update, delete                                                                             | Own rows                                                     |
| `messages`           | select, insert (messages are immutable)                                                                    | Own rows; insert also requires owning the conversation       |
| `usage_events`       | select                                                                                                     | Own rows                                                     |

`anon` has no table privileges. `authenticated` also loses `TRUNCATE`, `REFERENCES`, `TRIGGER` and, on Postgres 17, `MAINTAIN`. `service_role` may read and write every table. The bookkeeping columns (`content_hash`, `embedding_status`, `embedding_error`, `embedding_model`, `chunk_count`, `ingestion_attempts`, `next_attempt_at`, `processing_started_at`) are therefore out of users' reach: the `documents_before_write` trigger computes the hash and re-queues on content changes, and only the ingestion SQL functions below move a document through its states.

| Function                                                                                                                                            | Security                                      | Executable by                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------- |
| `claim_pending_documents`, `upsert_document_chunks`, `finalize_document_ingestion`, `mark_document_ingestion_failed`, `requeue_documents_for_model` | invoker                                       | `service_role`                  |
| `requeue_documents(p_document_id)`                                                                                                                  | definer, checks `user_id = auth.uid()` itself | `authenticated`, `service_role` |
| `match_chunks`, `search_chunks_keyword`                                                                                                             | invoker (RLS applies)                         | `authenticated`, `service_role` |
| `usage_summary`                                                                                                                                     | invoker, filters by `auth.uid()`              | `authenticated`                 |
| `embedding_column_dimensions()`                                                                                                                     | definer, catalog read only                    | `authenticated`, `service_role` |

Every function sets `search_path = ''` and qualifies every object. JWT verification uses `supabase.auth.getClaims`: ES256 tokens (Supabase CLI and current hosted projects) are checked locally against the cached JWKS, legacy HS256 tokens through the Auth server. Only `role: "authenticated"` tokens with a subject pass, so the publishable and secret keys themselves are rejected as bearer tokens. When Auth is unreachable the request fails with a 500 rather than a 401, so the web app does not sign users out during an outage.

The web app keeps the Supabase session in cookies through `@supabase/ssr`: `proxy.ts` refreshes it on navigation and redirects signed-out visitors, and server components read claims with `getClaims`. The browser sends the access token to the API as a bearer header; the API sets no cookies, CORS allows only `WEB_ORIGIN` without credentials, and SSE is consumed with `fetch`, so no request depends on ambient cookies.

## Data model

| Table                | Purpose                                  | Notable columns and indexes                                                                                                                                                                                                                                                   |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documents`          | User documents and their ingestion state | `content_hash` (SHA-256 of title and content, set by trigger), `embedding_status` enum, attempts, `next_attempt_at`; partial indexes for the queue, for stale claims and for ready documents per model; GIN on `tags`                                                         |
| `document_chunks`    | Embedded passages                        | `embedding vector(1536)` with an HNSW cosine index; generated `tsv` (heading weight A, content weight B) with a GIN index; `content_hash` unique per document; `document_content_hash` and `embedding_model` record which content version and vector space a chunk belongs to |
| `conversations`      | Chat threads                             | `title` nullable until the first message; `updated_at` bumped by a trigger on every new message                                                                                                                                                                               |
| `messages`           | Questions and answers                    | `citations` jsonb snapshot, `metadata` jsonb (retrieval mode, query, rewritten query, source count, latency; first-token and total time), model, finish reason, token counts, `usage_estimated`                                                                               |
| `usage_events`       | One row per provider call                | `kind` (`chat`, `embedding`, `query_rewrite`), provider, model, token counts, `estimated`, latency, optional links to conversation, message and document (set null on delete)                                                                                                 |
| `document_summaries` | View for lists                           | The document columns without `content`, `content_hash` and `processing_started_at`, plus a 240-character preview and the content length                                                                                                                                       |

All user-owned tables reference `auth.users` with `on delete cascade`; chunks cascade from documents and messages from conversations. Check constraints repeat the contract limits: titles of 1 to 200 characters, content up to 500,000, at most 20 tags, conversation titles of 1 to 120, message content up to 100,000 (answers included).

## Ingestion state machine

`documents.embedding_status` is the queue ([DEC-005]); only SQL functions and the trigger change it.

```mermaid
stateDiagram-v2
  [*] --> pending: document inserted
  pending --> processing: claimed by the worker
  processing --> ready: finalize with the claimed content hash
  processing --> failed: failure recorded on the current claim
  processing --> processing: claim older than 10 minutes is taken again
  processing --> pending: title or content edited mid-run
  failed --> processing: retry due and attempts left
  failed --> pending: content edited or Retry indexing
  ready --> pending: content edited, Retry indexing or embedding model changed
```

| Transition                                | Performed by                                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| insert or content change → `pending`      | Trigger `documents_before_write`, whenever `content_hash` changes; resets error, attempts and the retry time                                                |
| → `processing`                            | `claim_pending_documents(batch 5, stale 10 min, max attempts 5)` with `FOR UPDATE SKIP LOCKED`; increments `ingestion_attempts`                             |
| `processing` → `ready`                    | `finalize_document_ingestion`: locks the row, checks the hash and status, deletes every chunk outside this run's set, sets `chunk_count`                    |
| `processing` → `failed`                   | `mark_document_ingestion_failed`: only while status, hash and attempt number still match the run's claim; `next_attempt_at` is the retry time or `infinity` |
| any state except `processing` → `pending` | `requeue_documents` (the user's **Retry indexing** or reindex-all), resetting attempts                                                                      |
| `ready` → `pending`                       | `requeue_documents_for_model`, run once per API process for documents whose `embedding_model` differs from the configured signature                         |

The worker (`IngestionWorker`) runs in the API process when `INGESTION_WORKER_ENABLED=true` and AI is configured. A drain starts on boot, on `document.ingestion.requested` (emitted after a create or a title or content change), after a reindex, and every `INGESTION_SWEEP_INTERVAL_MS`. Only one drain runs at a time; wakes during a drain coalesce into one more pass, and a pass that claimed rows asks for another. Documents are processed one at a time, which bounds provider concurrency ([DEC-022]).

`IngestionService.process` for one claimed document:

1. A claim past `INGESTION_MAX_ATTEMPTS` (only possible through the stale branch, after runs that died midway) fails for good before chunking, so a poison document cannot crash-loop.
2. Chunk the document; more than 1,000 chunks fails for good.
3. Read the chunk hashes already stored for the document under the current signature; embed only the missing chunks, `AI_EMBEDDING_BATCH_SIZE` (32) texts per request, and record one `embedding` usage event per request.
4. Upsert rows in batches of 50 with `upsert_document_chunks`; reused chunks send `embedding: null`, and SQL copies the stored vector. The function returns -1 when the content hash no longer matches, and the run stops quietly: the trigger has already re-queued the newer content.
5. `finalize_document_ingestion` publishes exactly the run's chunk set atomically ([DEC-023]).

`classifyIngestionFailure` decides retries ([DEC-018]). Provider `rate_limited`, `timeout`, `connection` and `server` errors, database requests without an answer or with 408, 429 or 5xx, and a reused vector that vanished mid-run (SQLSTATE 23502) retry after `max(30 s × 2^(attempt − 1) capped at 1,800 s, the provider's Retry-After)`. Authentication and invalid-request errors, more than 1,000 chunks, a vector wider than the column and the last attempt fail for good; unexpected errors are logged with their stack and stored as a generic message. Because stored vectors are reused on every attempt, a run cut short by a rate limit resumes where it stopped.

## Chunking algorithm

`chunkDocument` in `apps/api/src/modules/ingestion/chunking/chunker.ts`; constants in `chunker.constants.ts` ([DEC-006], [DEC-019]). All token counts are cl100k (`js-tiktoken/lite`).

1. **Normalize**: `\r\n` and `\r` become `\n`, trailing spaces go, runs of spaces and tabs are cut to 64, three or more line breaks become two, the text is trimmed. Empty text yields no chunks; text of at most 512 tokens yields one chunk.
2. **Sections**: split at ATX headings (up to three spaces of indent, one to six `#`) outside ``` and `~~~` fences. A heading stack tracks the path by level; a closing `#` run is removed only after whitespace, so `C#` stays intact. A heading with no body and no deeper heading after it keeps its own text as the body, so an outline still produces chunks.
3. **Blocks**: blank lines separate blocks; a fenced block is one block including its blank lines, and an unclosed fence runs to the end of the section.
4. **Units**: a block of at most 512 tokens is one unit. A larger code block splits into lines; larger prose splits after `.`, `!`, `?` or `…` (closing quotes and brackets allowed) and at line breaks, so lists and tables split between rows. A piece still over 512 tokens is cut into 400-token windows, and a window that still counts over 512 is cut again with half the budget.
5. **Packing**: units fill a chunk greedily up to 400 tokens, counting the tokens each separator adds. When a unit does not fit, the chunk closes and the next one opens with the previous chunk's trailing units worth at most 50 tokens (never the whole chunk, and none if they would push the new unit past 400). The last chunk of a section merges into the one before when it adds under 60 tokens of new text and the result stays within 512.
6. **Breadcrumb**: the title and the headings above the passage, joined by `›` with a space on each side, as in `Title › Setup › Linux`. Each heading is cut to 80 characters ending in `…`; case-insensitive repeats of the previous segment collapse (a document titled "Handbook" that opens with `# Handbook`); while the breadcrumb exceeds 64 tokens, its outermost heading goes, never the title.
7. **Chunks**: content is right-trimmed; the embedded text is `breadcrumb + "\n\n" + content`, and its SHA-256 is the chunk's `content_hash`. A repeated hash within the document is dropped, so each passage is stored once; `index` is the position.

Every unit is at most 512 tokens, so every chunk is too. The regular expressions match runs of blanks or punctuation only from a run's first character, headings are parsed by slicing, and `TokenCounter` encodes runs of one character class (whitespace, letters, other symbols) longer than 32 code units in slices, because js-tiktoken's merge is quadratic in the length of one pre-tokenized piece. The tests hold adversarial inputs to a time budget. The known limit: unbroken CJK text still costs about 20 µs per character, so a 200,000-character run occupies the event loop for about 20 s.

## Retrieval and fusion

`RetrievalService.retrieve` embeds nothing itself: `RagChatService` embeds the query (the rewritten one for follow-ups), then retrieval runs both searches in parallel through the user's client ([DEC-007], [DEC-024]).

- **`match_chunks`** takes the query vector, the embedding signature, `RAG_VECTOR_K` (20), `RAG_MIN_SIMILARITY` (0), optional document ids and the user id. It fetches the `2 × K` nearest chunks by cosine distance (`<=>`, HNSW `vector_cosine_ops`) among the user's chunks with that signature, joins their documents, keeps chunks whose `document_content_hash` equals the document's current `content_hash`, applies the similarity floor and returns the top K with `similarity = 1 − distance`.
- **`search_chunks_keyword`** builds a tsquery from the query's English lexemes, each quoted and joined with `|`, falling back to `websearch_to_tsquery` when there are none. It matches the generated `tsv` column through its GIN index, ranks with `ts_rank_cd`, fetches `2 × RAG_KEYWORD_K`, applies the same content-hash filter and returns the top `RAG_KEYWORD_K` (20).
- **`fuseRankings`** (pure, unit-tested) gives every chunk `Σ 1/(RAG_RRF_K + rank)` over the lists that returned it, rank counted from 1 and a chunk listed twice counted at its better position. Ties go to the higher vector similarity, then the lower chunk id. The best `RAG_TOP_N` (6) go to the prompt builder.

Both SQL functions are `security invoker`, so RLS decides visibility; `p_user_id` is passed only so the planner can use the `(user_id, embedding_model)` index. `RAG_RETRIEVAL_MODE=vector` skips full-text search, and fusion over one list keeps the vector order. The content-hash filter means a document keeps its searchable chunks while it is re-queued or partly re-indexed, while text removed by an edit disappears at once.

Scaling note: an HNSW scan applies the `user_id` and signature filters after the index returns about `hnsw.ef_search` candidates (pgvector's default is 40, which equals `2 × RAG_VECTOR_K` at the defaults). With many users the planner may choose the B-tree plus an exact sort instead; when it does use HNSW, a selective filter can return fewer than K rows. The local stack runs pgvector 0.8.2, whose iterative scans (`hnsw.iterative_scan`) address this, as would per-user partitioning.

## Prompt construction

`PromptBuilder.build` (`apps/api/src/modules/chat/prompt-builder.ts`) returns the messages and the sources it kept:

1. **System message**: `SYSTEM_RULES`, then `Sources:`, then one block per source, all separated by blank lines. A source block is `[n] «label»` on one line and the chunk text below it; the label is the breadcrumb, or the document title when the breadcrumb is empty. Sources are added in fused order while the formatted blocks fit `RAG_CONTEXT_TOKEN_BUDGET` (3,000); a source that would overflow is skipped whole and the next one tried, and numbering follows inclusion, so the numbers stay contiguous. With no sources, `NO_SOURCES_NOTICE` replaces the list and tells the model to say it found nothing rather than answer from general knowledge.
2. **History**: the last 20 messages, paired into question and answer turns (a question without a non-empty answer is dropped), newest first until `RAG_HISTORY_TOKEN_BUDGET` (2,000) would be exceeded; the first turn that does not fit ends the history, so it has no gaps.
3. **Question**: the user's own words, even when retrieval used a rewritten query.

The answer is requested with `RAG_MAX_ANSWER_TOKENS` (1,024), sent as `max_completion_tokens` or `max_tokens` depending on the profile; temperature is sent only when `AI_CHAT_TEMPERATURE` is set, because some reasoning models reject it. The system rules are quoted in the [README](../README.md#the-prompt).

The follow-up rewrite ([DEC-028]) is a separate call with these instructions as the system message:

```text
Rewrite the follow-up question as a standalone search query for the user's documents.
- Resolve references such as "it", "that" or "the second one" using the conversation.
- Keep names, identifiers, numbers and quoted terms exactly as written.
- Do not answer the question and do not add facts.
- Reply with the query only: one line, no quotes, no label.
```

The user message is `Conversation:` followed by the last 6 messages as `User: …` and `Assistant: …` lines (each clipped to 300 tokens, with `…` marking a cut), a blank line, and `Follow-up question: <question>`. The call gets 256 output tokens and 4 s. The first line of the reply, stripped of a `query:` label and wrapping quotes and capped at 4,000 code points, becomes the search query; an error, a timeout or an empty reply falls back to the question.

## Providers and embedding dimensions

The provider table with base URLs and default models is in the [README](../README.md#how-to-swap-providers); the values come from `packages/ai/src/providers/provider-profiles.ts`. Resolution (`resolve-endpoint.ts`) applies configured values over the profile:

| Setting        | Chat                                                                | Embeddings                                                                                                           |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Provider       | `AI_CHAT_PROVIDER`, default `openai`                                | `AI_EMBEDDING_PROVIDER`, default the chat provider                                                                   |
| API key        | `AI_CHAT_API_KEY`; keyless profiles get a placeholder               | `AI_EMBEDDING_API_KEY`, else the chat key when the providers match                                                   |
| Base URL       | `AI_CHAT_BASE_URL`, else the profile's                              | `AI_EMBEDDING_BASE_URL`, else the chat value when the providers match, else the profile's                            |
| Model          | `AI_CHAT_MODEL`, else the profile default                           | `AI_EMBEDDING_MODEL`, else the profile default (never the chat model)                                                |
| Headers        | OpenRouter attribution from `AI_APP_*`, then `AI_CHAT_HEADERS_JSON` | Attribution, then `AI_EMBEDDING_HEADERS_JSON`, else the chat headers when the providers match                        |
| Streamed usage | `AI_CHAT_STREAM_USAGE`, else the profile (on for every profile)     | n/a                                                                                                                  |
| Dimensions     | n/a                                                                 | `AI_EMBEDDING_DIMENSIONS`, else the profile default (Gemini: 1536), sent only where the profile accepts `dimensions` |

Validation reports every problem at once with variable names, for example `AI_EMBEDDING_PROVIDER: Groq does not serve embeddings; use one of: openai, together, openrouter, gemini, ollama, custom`, `AI_CHAT_BASE_URL: Custom OpenAI-compatible server needs a base URL` or `AI_CHAT_API_KEY: OpenAI requires an API key`. The embedding adapter always requests `encoding_format: "float"`, restores input order from `index` (treating a missing index as 0, as Gemini sends it), checks that one vector came back per text, and checks that every vector has the configured size or, without one, the size of the first response.

### Embedding dimensions

- `document_chunks.embedding` is `vector(1536)` because an HNSW index needs a fixed dimension ([DEC-014]). `toStoredVector` zero-pads shorter vectors; trailing zeros change neither dot products nor norms, so cosine similarity is unchanged. A longer vector raises `VectorDimensionError`, a permanent ingestion failure whose message points at `AI_EMBEDDING_DIMENSIONS`.
- The signature is `model` or `model#dims` when dimensions are configured. Every chunk stores it in `embedding_model`, both searches filter by the current one, and the worker re-queues `ready` documents with any other signature once per process. Changing the embedding model or its dimensions therefore re-indexes the library on the next start; the chat model can change freely.
- Going above 1536 dimensions takes a migration: drop the HNSW index, delete the stored chunks (a 1536-dimension vector cannot be cast to a wider one), alter the column and the `match_chunks` parameter to the new size, recreate the index, then raise `EMBEDDING_DIMENSIONS_DEFAULT` in `packages/contracts/src/limits.ts` (the API's `VECTOR_DIMENSIONS`), run `pnpm db:types`, restart and call `POST /api/documents/reindex-all`. pgvector's HNSW index supports up to 2,000 dimensions for `vector` and 4,000 for `halfvec`, so a 3072-dimension model needs `halfvec(3072)` with `halfvec_cosine_ops`. `/api/health/ready` reports `embeddingDimensions: "mismatch"` while the column and the code disagree.

## Environment variables

One root `.env` serves both apps ([DEC-010]); blank values count as unset. The API validates everything at boot and lists every invalid variable in one error ([DEC-016]); an incomplete `AI_*` setup is reported instead of stopping the API. `.env.example` documents the same defaults, and unit tests fail when the example and the schemas drift apart.

| Variable                        | Default                                                       | Read by           | Purpose                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                  | required                                                      | API, web, scripts | Supabase API URL; the web receives it as `NEXT_PUBLIC_SUPABASE_URL`                                                              |
| `SUPABASE_PUBLISHABLE_KEY`      | required                                                      | API, web          | Browser-safe key (`sb_publishable_…` or legacy anon JWT); web: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                            |
| `SUPABASE_SECRET_KEY`           | required                                                      | API               | Service-role key for the worker, the usage recorder and the readiness probe                                                      |
| `SUPABASE_DB_URL`               | `postgresql://postgres:postgres@127.0.0.1:54322/postgres`     | scripts           | Hosted projects only: the Session pooler string `db:*` and `bootstrap --hosted` connect with (local runs use `--local`)          |
| `SUPABASE_PROJECT_REF`          | empty                                                         | scripts           | With `SUPABASE_ACCESS_TOKEN` (not in `.env.example`), lets `pnpm db:types` use the Management API; `bootstrap --hosted` fills it |
| `NEXT_PUBLIC_API_URL`           | `http://localhost:4000` in `.env.example`                     | web               | API origin the browser calls                                                                                                     |
| `API_PORT`                      | `4000`                                                        | API               | Listening port                                                                                                                   |
| `WEB_ORIGIN`                    | `http://localhost:3000`                                       | API               | The only CORS origin; normalized to scheme, host and port                                                                        |
| `LOG_LEVEL`                     | `log`                                                         | API               | `fatal`, `error`, `warn`, `log`, `debug` or `verbose`; each includes the ones before it                                          |
| `AI_CHAT_PROVIDER`              | `openai`                                                      | API               | `openai`, `groq`, `together`, `openrouter`, `gemini`, `ollama` or `custom`                                                       |
| `AI_CHAT_API_KEY`               | none                                                          | API               | Required except for `ollama` and `custom`                                                                                        |
| `AI_CHAT_MODEL`                 | profile default; `.env.example` sets `gpt-4o-mini`            | API               | Chat model; required for `custom`                                                                                                |
| `AI_CHAT_BASE_URL`              | profile default                                               | API               | Override; required for `custom`                                                                                                  |
| `AI_CHAT_TIMEOUT_MS`            | `60000`                                                       | API               | SDK timeout until response headers arrive; a stalled stream ends when the client aborts                                          |
| `AI_CHAT_MAX_RETRIES`           | `2`                                                           | API               | SDK retries for connection errors, 408, 409, 429 and 5xx                                                                         |
| `AI_CHAT_STREAM_USAGE`          | profile (true)                                                | API               | Sends `stream_options.include_usage`; `false` for servers that reject it                                                         |
| `AI_CHAT_TEMPERATURE`           | unset                                                         | API               | 0 to 2; unset leaves the provider default                                                                                        |
| `AI_CHAT_HEADERS_JSON`          | unset                                                         | API               | Extra request headers as a JSON object                                                                                           |
| `AI_EMBEDDING_PROVIDER`         | the chat provider                                             | API               | Must serve embeddings (not `groq`)                                                                                               |
| `AI_EMBEDDING_API_KEY`          | the chat key when the providers match                         | API               | Embedding provider key                                                                                                           |
| `AI_EMBEDDING_MODEL`            | profile default; `.env.example` sets `text-embedding-3-small` | API               | Embedding model; required for `custom`                                                                                           |
| `AI_EMBEDDING_BASE_URL`         | chat value when the providers match, else profile             | API               | Override; required for `custom` unless inherited                                                                                 |
| `AI_EMBEDDING_DIMENSIONS`       | profile default (Gemini 1536), else native                    | API               | Requested size where supported, validated everywhere; at most 1536 without a migration                                           |
| `AI_EMBEDDING_BATCH_SIZE`       | `32`                                                          | API               | Texts per embedding request during ingestion                                                                                     |
| `AI_EMBEDDING_TIMEOUT_MS`       | `30000`                                                       | API               | SDK timeout for embedding requests                                                                                               |
| `AI_EMBEDDING_MAX_RETRIES`      | `2`                                                           | API               | SDK retries for embedding requests                                                                                               |
| `AI_EMBEDDING_HEADERS_JSON`     | chat headers when the providers match                         | API               | Extra embedding request headers                                                                                                  |
| `AI_APP_NAME`                   | unset; `.env.example` sets `ai-knowledge-base`                | API               | OpenRouter `X-Title`                                                                                                             |
| `AI_APP_URL`                    | unset; `.env.example` sets `http://localhost:3000`            | API               | OpenRouter `HTTP-Referer`                                                                                                        |
| `RAG_RETRIEVAL_MODE`            | `hybrid`                                                      | API               | `hybrid` or `vector`                                                                                                             |
| `RAG_QUERY_REWRITE`             | `true`                                                        | API               | Rewrite follow-ups into standalone queries                                                                                       |
| `RAG_VECTOR_K`                  | `20`                                                          | API               | Vector candidates per query                                                                                                      |
| `RAG_KEYWORD_K`                 | `20`                                                          | API               | Full-text candidates per query                                                                                                   |
| `RAG_TOP_N`                     | `6`                                                           | API               | Fused chunks offered to the prompt                                                                                               |
| `RAG_MIN_SIMILARITY`            | `0`                                                           | API               | Cosine floor for vector hits, from -1 to 1                                                                                       |
| `RAG_RRF_K`                     | `60`                                                          | API               | RRF constant; larger values flatten the rank bonus                                                                               |
| `RAG_CONTEXT_TOKEN_BUDGET`      | `3000`                                                        | API               | Tokens of sources in the prompt                                                                                                  |
| `RAG_HISTORY_TOKEN_BUDGET`      | `2000`                                                        | API               | Tokens of past turns in the prompt                                                                                               |
| `RAG_MAX_ANSWER_TOKENS`         | `1024`                                                        | API               | Answer length cap                                                                                                                |
| `INGESTION_WORKER_ENABLED`      | `true`                                                        | API               | Run the ingestion worker in this process                                                                                         |
| `INGESTION_SWEEP_INTERVAL_MS`   | `30000`                                                       | API               | Periodic drain for retries and stale claims                                                                                      |
| `INGESTION_BATCH_SIZE`          | `5`                                                           | API               | Documents per claim                                                                                                              |
| `INGESTION_STALE_AFTER_MINUTES` | `10`                                                          | API               | Age after which a `processing` claim is taken again                                                                              |
| `INGESTION_MAX_ATTEMPTS`        | `5`                                                           | API               | Attempts before a document stops retrying on its own                                                                             |
| `RATE_LIMIT_DEFAULT_PER_MINUTE` | `120`                                                         | API               | Requests per user, per route, per minute                                                                                         |
| `RATE_LIMIT_CHAT_PER_MINUTE`    | `20`                                                          | API               | Chat messages per user per minute                                                                                                |

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are derived in `apps/web/next.config.ts`; do not set them. Ollama's own `OLLAMA_CONTEXT_LENGTH=8192` belongs to the Ollama server, not to `.env`.

## Operations

- **Ports**: web 3000, API 4000, and the local Supabase stack on 54321 (API gateway), 54322 (Postgres), 54323 (Studio), 54324 (Mailpit) and 54320 (the shadow database used by `supabase db diff`).
- **Readiness**: `GET /api/health/ready` is 200 once the database answers within 3 s and the embedding column has 1536 dimensions, 503 otherwise; `ai` reports `unconfigured` without failing readiness. `GET /api/health` is liveness with uptime and version.
- **Logs**: Nest's logger, filtered by `LOG_LEVEL`. Each request ends with one line such as `GET /api/documents 200 12ms [<request-id>] user=<uuid>` (`aborted` instead of a status when the client left). 5xx errors are logged with their stack under the request id; 4xx rejections at `debug`. The worker logs each indexed document as chunks, embedded, reused and signature; retrieval logs fused ranks at `debug` with ids only, never document text. `x-request-id` is echoed on every response.
- **Worker toggle**: `INGESTION_WORKER_ENABLED=false` keeps an API instance from indexing, for example to run several request-serving replicas and one indexer. The queue is safe with several workers (`SKIP LOCKED`). Without a complete AI setup the worker logs why and stays idle.
- **Shutdown**: on SIGTERM the worker stops claiming and finishes only the document in progress (the rest of its batch is claimed again once stale), the usage recorder flushes pending inserts, and open SSE connections are closed.
- **Configuration changes**: the API reads `.env` once at boot, so restart it after editing; `pnpm dev` watches source files, not `.env`. The web inlines `NEXT_PUBLIC_*` values when `next dev` or `next build` starts.
- **Scaling limits**: rate-limit counters live in each process's memory, so every API instance allows the full limit; ingestion runs on the API's event loop (see the chunking note on CJK text).

[DEC-004]: ../DECISIONS.md#dec-004--security-boundary-postgres-rls-with-per-request-user-scoped-clients
[DEC-005]: ../DECISIONS.md#dec-005--ingestion-queue-the-documents-status-column-is-the-durable-queue
[DEC-006]: ../DECISIONS.md#dec-006--chunking-markdown-aware-splitting-at-40051250-tokens-with-heading-breadcrumbs
[DEC-007]: ../DECISIONS.md#dec-007--retrieval-hybrid-vector-and-full-text-search-fused-with-rrf-in-typescript
[DEC-010]: ../DECISIONS.md#dec-010--configuration-one-root-env-public-variables-derived
[DEC-014]: ../DECISIONS.md#dec-014--embeddings-a-fixed-1536-dimension-column-zero-padding-and-a-model-signature
[DEC-015]: ../DECISIONS.md#dec-015--readiness-probe-embedding_column_dimensions-through-the-service-role-client
[DEC-016]: ../DECISIONS.md#dec-016--configuration-an-own-app_config-factory-module-instead-of-nestjsconfig
[DEC-018]: ../DECISIONS.md#dec-018--ingestion-retry-policy
[DEC-019]: ../DECISIONS.md#dec-019--chunker-refinements-and-bounds-on-hostile-input
[DEC-022]: ../DECISIONS.md#dec-022--ingestion-worker-lifecycle
[DEC-023]: ../DECISIONS.md#dec-023--finalize-and-failure-guards
[DEC-024]: ../DECISIONS.md#dec-024--search-by-content-consistency-and-any-query-term-amends-dec-007
[DEC-028]: ../DECISIONS.md#dec-028--query-rewrite-policy
