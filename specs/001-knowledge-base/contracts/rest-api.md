# Contract: REST API

The NestJS API under `/api` (`API_PREFIX`), on port 4000 by default. Every path is built from `apiRoutes` in [`packages/contracts/src/routes.ts`](../../../packages/contracts/src/routes.ts), and every request and response body is a zod schema exported by `@kb/contracts`. The user-facing reference with curl examples is [docs/api.md](../../../docs/api.md); this file is the contract the implementation and its tests hold to.

## Conventions

- **Authentication**: every route except the two health checks requires `Authorization: Bearer <Supabase access token>`. `AuthGuard` verifies it with `getClaims`, requires `role: "authenticated"` and a subject, and attaches a Supabase client carrying the token, so RLS scopes every query to the caller.
- **Validation**: bodies (`ZodBody`), query strings (`ZodQuery`, numbers coerced) and path parameters (`ZodParam`, UUIDs) are parsed with the schema named below; a failure is `422 invalid_payload` with a field map.
- **Ownership**: a record that exists but belongs to another user is `404 not_found`, because RLS hides it; `403` is never used for ownership.
- **Shapes**: JSON in camelCase; ids are UUIDs; timestamps are ISO 8601 with an offset (`timestampSchema`); collections are `{ items, total, limit, offset }` (`paginatedSchema`).
- **Tracing**: every response carries `x-request-id` (a well-formed incoming one is kept), and the API log line for the request repeats it.
- **Limits**: JSON bodies over 2 MB are `413`; per-user rate limits apply per route and per minute (below).

## Endpoints

| Method   | Path                          | Request                                                            | Success                                                          | Other statuses          | Limit per minute |
| -------- | ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------- | ---------------- |
| `GET`    | `/health`                     | public                                                             | 200 `healthSchema`                                               |                         | none             |
| `GET`    | `/health/ready`               | public                                                             | 200 `readinessSchema`                                            | 503 not ready           | none             |
| `GET`    | `/documents`                  | query `listDocumentsQuerySchema`                                   | 200 `documentListSchema`                                         | 422                     | 120              |
| `POST`   | `/documents`                  | body `createDocumentSchema`                                        | 201 `documentSchema`                                             | 422                     | 120              |
| `GET`    | `/documents/:id`              | param `idSchema`                                                   | 200 `documentSchema`                                             | 404, 422                | 120              |
| `PATCH`  | `/documents/:id`              | body `updateDocumentSchema`                                        | 200 `documentSchema`                                             | 404, 422                | 120              |
| `DELETE` | `/documents/:id`              | param `idSchema`                                                   | 204                                                              | 404, 422                | 120              |
| `POST`   | `/documents/upload`           | multipart: `file`, optional `title`, one `tags` part per tag       | 201 `documentSchema`                                             | 413, 415, 422           | 10               |
| `POST`   | `/documents/:id/reindex`      | param `idSchema`                                                   | 200 `reindexResultSchema`                                        | 404, 422                | 3                |
| `POST`   | `/documents/reindex-all`      | none                                                               | 200 `reindexResultSchema`                                        |                         | 3                |
| `GET`    | `/conversations`              | query `listConversationsQuerySchema`                               | 200 `conversationListSchema`                                     | 422                     | 120              |
| `POST`   | `/conversations`              | body `createConversationSchema` (may be empty)                     | 201 `conversationSchema`                                         | 422                     | 120              |
| `GET`    | `/conversations/:id`          | param `idSchema`                                                   | 200 `conversationDetailSchema`                                   | 404, 422                | 120              |
| `PATCH`  | `/conversations/:id`          | body `updateConversationSchema`                                    | 200 `conversationSchema`                                         | 404, 422                | 120              |
| `DELETE` | `/conversations/:id`          | param `idSchema`                                                   | 204                                                              | 404, 422                | 120              |
| `POST`   | `/conversations/:id/messages` | body `sendMessageSchema`; `Accept: text/event-stream` for a stream | 200 SSE ([sse-stream.md](./sse-stream.md)) or `chatResultSchema` | 404, 422, 429, 502, 503 | 20               |
| `GET`    | `/usage/summary`              | query `usageSummaryQuerySchema`                                    | 200 `usageSummarySchema`                                         | 422                     | 120              |

Every authenticated route can also answer 401, 429 and 500.

## Resources

### Health

- `GET /health` is liveness: `{ status: "ok", uptimeSeconds, version }`.
- `GET /health/ready` reports `checks.database` (`ok` when the database answers within 3 s), `checks.embeddingDimensions` (`ok` when `document_chunks.embedding` has the 1536 dimensions the API writes, `mismatch` otherwise, `unknown` when unreachable) and `checks.ai` (`ok` or `unconfigured`). It answers 503 unless the database and the dimension checks pass; an unconfigured AI setup is reported without failing readiness.

### Documents

- `DocumentSummary`: `id`, `title`, `contentPreview` (240 characters), `contentLength`, `tags`, `sourceType` (`editor` or `upload`), `sourceFilename`, `embeddingStatus` (`pending`, `processing`, `ready`, `failed`), `embeddingError`, `embeddingModel` (the signature), `chunkCount`, `ingestionAttempts`, `nextAttemptAt` (null when no automatic retry is scheduled), `createdAt`, `updatedAt`. `Document` adds `content`.
- `createDocumentSchema`: `title` 1 to 200 characters after trimming; `content` 1 to 500,000 characters; `tags` at most 20, each 1 to 40 characters after trimming, duplicates removed, default `[]`. No field may contain U+0000. The response has `embeddingStatus: "pending"`, and the worker is woken at once.
- `updateDocumentSchema`: a non-empty subset of `title`, `content` and `tags`, with no defaults applied. A title or content change resets the status to `pending`; a tags-only change keeps it.
- `listDocumentsQuerySchema`: `search` (case-insensitive title match; `*` matches any single character), `tag`, `status`, `limit` 1 to 200 (default 50), `offset` from 0 (default 0). Items are ordered by `updatedAt` descending, then `id`; `total` is exact, and an offset past the end returns an empty page with the real total.
- Upload: one `file` part of at most 10 MiB, accepted by MIME type (`text/plain`, `text/markdown`, `application/pdf`) or, for a generic type, by extension (`.txt`, `.md`, `.pdf`); text fields are limited to 4 KiB. Text must be UTF-8 (a byte-order mark is dropped, line endings become `\n`); a PDF contributes the text of every page. Without a `title` part the title is the file name without its extension. `413` over 10 MiB; `415` for other types; `422` for a missing file, no extractable text, a damaged or encrypted PDF, non-UTF-8 text, more than 500,000 characters or a NUL character.
- Reindex: `{ queued: 1 }` when the document was re-queued, `{ queued: 0 }` while it is being processed; `reindex-all` answers the number of the caller's documents it re-queued. Unchanged chunks reuse their stored vectors.

### Conversations

- `Conversation`: `id`, `title` (null until named), `createdAt`, `updatedAt`; lists are ordered by `updatedAt` descending, and every new message bumps it.
- `createConversationSchema`: optional `title` of 1 to 120 characters. An untitled conversation is named from its first message by `deriveConversationTitle`: the first line, whitespace collapsed, cut at a word boundary to at most 60 characters.
- `ConversationDetail`: `{ conversation, messages }`, messages oldest first. `Message`: `id`, `conversationId`, `role`, `content`, `citations`, and for answers `model`, `finishReason` and `usage` (`promptTokens`, `completionTokens`, `totalTokens`, `estimated`).
- Deleting a conversation deletes its messages; usage rows keep their counts and lose the link.

### Messages

`sendMessageSchema`: `content` 1 to 4,000 characters after trimming, and optional `documentIds` of 1 to 20 UUIDs that restrict retrieval. With `Accept: text/event-stream` (a non-zero quality; wildcards alone do not count) the answer streams as described in [sse-stream.md](./sse-stream.md). Otherwise the same pipeline runs to completion and answers `ChatResult`: `{ userMessage, assistantMessage, usage? }`, where `usage` adds `model` to the token counts; an `error` event becomes the HTTP error response.

### Usage

`usageSummaryQuerySchema`: `from` and `to` (ISO 8601 with an offset, `from` before `to`; defaults are the last 30 days up to now) and `timezone` (an IANA name; numeric offsets are rejected because Postgres would read their sign inverted; default UTC). `UsageSummary`: `from`, `to`, `totals` (`requests`, `promptTokens`, `completionTokens`, `totalTokens`, `estimatedRequests`), `byDay` (`day` as `YYYY-MM-DD` in that time zone, oldest first) and `byModel` (`provider`, `model`, `kind`, ordered by total tokens).

## Errors

Every failure, from any layer, has one shape (`apiErrorSchema` in `packages/contracts/src/errors.ts`): `{ code, messages: string[], errors?: Record<field path, string[]>, retryAfter?: seconds }`. `errors` appears only for validation failures; `retryAfter` appears on 429 and on some 503 responses, with a matching `Retry-After` header.

| Code                      | Status | When                                                                                        |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `invalid_payload`         | 422    | A body, query or path parameter fails its schema; malformed JSON; unusable upload text      |
| `unauthenticated`         | 401    | Missing, malformed, expired or non-user token                                               |
| `forbidden`               | 403    | Reserved                                                                                    |
| `not_found`               | 404    | Unknown route, or a record the caller cannot see                                            |
| `payload_too_large`       | 413    | JSON body over 2 MB, upload over 10 MiB                                                     |
| `unsupported_media_type`  | 415    | Upload that is not `.txt`, `.md` or `.pdf`                                                  |
| `rate_limited`            | 429    | A per-user limit was reached                                                                |
| `ai_provider_error`       | 502    | The provider refused for good (credentials, unknown model, invalid request, not configured) |
| `ai_provider_unavailable` | 503    | A transient provider failure (rate limit, timeout, connection, 5xx)                         |
| `internal_error`          | 500    | Anything else                                                                               |

The status of each code is `ERROR_HTTP_STATUS`. Messages of 5xx responses are generic; the cause is logged under the request id and never returned.

## Limits

| Limit              | Value                                  | Constant                                                                       |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------ |
| Document title     | 1 to 200 characters                    | `DOCUMENT_TITLE_MAX` (also a SQL check)                                        |
| Document content   | 1 to 500,000 characters                | `DOCUMENT_CONTENT_MAX` (also a SQL check)                                      |
| Tags               | 20 per document, 40 characters each    | `MAX_TAGS` (also a SQL check), `TAG_MAX_LENGTH`                                |
| Upload             | one file of 10 MiB                     | `MAX_UPLOAD_BYTES`, `ACCEPTED_UPLOAD_MIME_TYPES`, `ACCEPTED_UPLOAD_EXTENSIONS` |
| Message            | 1 to 4,000 characters                  | `MESSAGE_MAX_LENGTH`                                                           |
| Document scope     | 1 to 20 documents                      | `MAX_SCOPE_DOCUMENTS`                                                          |
| Conversation title | 1 to 120 characters; derived titles 60 | `CONVERSATION_TITLE_MAX` (also a SQL check), `CONVERSATION_TITLE_DERIVED_MAX`  |
| Page size          | 1 to 200, default 50                   | `PAGE_SIZE_MAX`, `PAGE_SIZE_DEFAULT`                                           |
| Embedding size     | 1536 dimensions                        | `EMBEDDING_DIMENSIONS_DEFAULT` (the column type)                               |

Rate limits count per user, per route and per minute: 120 by default (`RATE_LIMIT_DEFAULT_PER_MINUTE`), 20 for messages (`RATE_LIMIT_CHAT_PER_MINUTE`), 10 uploads and 3 reindex requests (fixed). Counters live in each API process.

## Where the contract is pinned

- `packages/contracts/__tests__/unit/*.test.ts`: accept and reject tables for every schema, route builders against their patterns.
- `apps/api/__tests__/unit/app.setup.test.ts`: health, authentication, body limits, request ids and CORS over HTTP.
- `apps/api/__tests__/unit/{documents,reindex,conversations,chat,usage}.pipeline.test.ts`: every route over HTTP against in-memory repositories and fake models.
- `apps/api/__tests__/unit/common/errors/error-mapping.test.ts` and `api-exception.filter.test.ts`: the error shape and status for every error class.
- `http/{documents,chat,usage}.http`: manual walkthroughs against a running API.
