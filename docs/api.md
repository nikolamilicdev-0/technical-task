# API reference

The NestJS API serves JSON under `http://localhost:4000/api` (the port is `API_PORT`). Every route except the two health checks needs `Authorization: Bearer <Supabase access token>`. Request and response bodies are the zod schemas in [`packages/contracts/src`](../packages/contracts/src); the tables below name them. Every response carries an `x-request-id` header (a well-formed incoming one is kept), and the same id appears in the API log line for the request.

## Authentication

The API accepts Supabase Auth access tokens. `AuthGuard` verifies them with `supabase.auth.getClaims` (ES256 against the cached JWKS, legacy HS256 through Auth), requires `role: "authenticated"` and a subject, and builds a Supabase client that carries the token, so row-level security scopes every query to the caller. Local tokens live for 3600 s (`jwt_expiry` in `supabase/config.toml`); the web app refreshes its session and retries once on a 401.

To get a token with curl, run from the repository root (works for the local stack and hosted projects):

```bash
# The two values the web app also uses, read with Node's .env parser.
export SUPABASE_URL=$(node --env-file=.env -p process.env.SUPABASE_URL)
export SUPABASE_PUBLISHABLE_KEY=$(node --env-file=.env -p process.env.SUPABASE_PUBLISHABLE_KEY)
export API=http://localhost:4000/api
AUTH_BODY='{"email":"you@example.com","password":"a-long-password"}'

# Sign up once; the local stack signs users in without email confirmation.
curl -s "$SUPABASE_URL/auth/v1/signup" -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H 'Content-Type: application/json' -d "$AUTH_BODY" > /dev/null

# Sign in and keep the access token (or pipe to `jq -r .access_token`).
export TOKEN=$(curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H 'Content-Type: application/json' -d "$AUTH_BODY" \
  | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).access_token')

curl -s "$API/documents" -H "Authorization: Bearer $TOKEN"
```

Without a token the API answers `401 {"code":"unauthenticated","messages":["Missing bearer token"]}`; with an invalid or expired one, `"Invalid or expired access token"`. The [`http/`](../http) walkthroughs perform the same sign-in for the VS Code REST Client.

## Endpoints

All paths are relative to `/api` and come from `apiRoutes` in `packages/contracts/src/routes.ts`. Besides the codes listed, every authenticated route can answer 401, 429 and 500, and JSON bodies over 2 MB get 413. Limits count requests per user, per route, per minute; health checks are not limited.

| Method   | Path                          | Request                                                            | Response                            | Status codes                 | Limit |
| -------- | ----------------------------- | ------------------------------------------------------------------ | ----------------------------------- | ---------------------------- | ----- |
| `GET`    | `/health`                     | Public                                                             | `Health`                            | 200                          | none  |
| `GET`    | `/health/ready`               | Public                                                             | `Readiness`                         | 200 ready, 503 not ready     | none  |
| `GET`    | `/documents`                  | Query `listDocumentsQuerySchema`                                   | `DocumentList`                      | 200, 422                     | 120   |
| `POST`   | `/documents`                  | Body `createDocumentSchema`                                        | `Document`                          | 201, 422                     | 120   |
| `GET`    | `/documents/:id`              | `id` is a UUID                                                     | `Document`                          | 200, 404, 422                | 120   |
| `PATCH`  | `/documents/:id`              | Body `updateDocumentSchema`                                        | `Document`                          | 200, 404, 422                | 120   |
| `DELETE` | `/documents/:id`              | None                                                               | Empty                               | 204, 404, 422                | 120   |
| `POST`   | `/documents/upload`           | Multipart: `file`, optional `title`, one `tags` part per tag       | `Document`                          | 201, 413, 415, 422           | 10    |
| `POST`   | `/documents/:id/reindex`      | None                                                               | `ReindexResult` (`{ queued }`)      | 200, 404, 422                | 3     |
| `POST`   | `/documents/reindex-all`      | None                                                               | `ReindexResult`                     | 200                          | 3     |
| `GET`    | `/conversations`              | Query `listConversationsQuerySchema` (`limit`, `offset`)           | `ConversationList`                  | 200, 422                     | 120   |
| `POST`   | `/conversations`              | Body `createConversationSchema` (optional; may be empty)           | `Conversation`                      | 201, 422                     | 120   |
| `GET`    | `/conversations/:id`          | None                                                               | `ConversationDetail`                | 200, 404, 422                | 120   |
| `PATCH`  | `/conversations/:id`          | Body `updateConversationSchema`                                    | `Conversation`                      | 200, 404, 422                | 120   |
| `DELETE` | `/conversations/:id`          | None                                                               | Empty                               | 204, 404, 422                | 120   |
| `POST`   | `/conversations/:id/messages` | Body `sendMessageSchema`; `Accept: text/event-stream` for a stream | SSE stream, or `ChatResult` as JSON | 200, 404, 422, 429, 502, 503 | 20    |
| `GET`    | `/usage/summary`              | Query `usageSummaryQuerySchema`                                    | `UsageSummary`                      | 200, 422                     | 120   |

The 120 and 20 per-minute limits come from `RATE_LIMIT_DEFAULT_PER_MINUTE` and `RATE_LIMIT_CHAT_PER_MINUTE`; the upload and reindex limits are fixed. A 422 on a path parameter means it is not a UUID; a document or conversation that exists but belongs to someone else is a 404, because RLS hides it.

### Documents

- **`DocumentSummary`** (list items): `id`, `title`, `contentPreview` (first 240 characters), `contentLength`, `tags`, `sourceType` (`editor` or `upload`), `sourceFilename`, `embeddingStatus` (`pending`, `processing`, `ready`, `failed`), `embeddingError`, `embeddingModel` (the embedding signature, `model` or `model#dims`), `chunkCount`, `ingestionAttempts`, `nextAttemptAt` (`null` means no automatic retry is scheduled), `createdAt`, `updatedAt`. **`Document`** adds `content`.
- **List**: `search` matches the title case-insensitively anywhere (`*` matches any one character), `tag` must be one of the document's tags, `status` filters by embedding status. Items are ordered by `updatedAt` descending, then `id`. `total` is the exact number of matches, and an `offset` past the end returns an empty page with the real total.
- **Create**: `title` 1 to 200 characters (trimmed), `content` 1 to 500,000 characters, `tags` at most 20 of 1 to 40 characters (trimmed, duplicates removed; default `[]`). The response has `embeddingStatus: "pending"`, and indexing starts immediately.
- **Update**: any non-empty subset of `title`, `content` and `tags`. Changing the title or content sets the status back to `pending` (a trigger compares content hashes); changing only the tags keeps it.
- **Delete**: removes the document and its chunks. Usage rows keep their counts and lose the link.
- **Upload**: one `file` part of at most 10 MiB. It is accepted by MIME type (`text/plain`, `text/markdown`, `application/pdf`) or, when the type is generic such as `application/octet-stream`, by extension (`.txt`, `.md`, `.pdf`). Text files must be UTF-8 (a byte-order mark is dropped, line endings become `\n`); PDFs contribute the text of every page. Without a `title` part, the title is the filename without its extension. Errors: 413 over 10 MiB; 415 for other types; 422 for a missing file, no extractable text (a scanned PDF), a damaged or encrypted PDF, text that is not UTF-8, more than 500,000 characters, or a NUL character in the text or filename.
- **Reindex**: re-queues the document and resets its attempts. It answers `{ "queued": 1 }`, or `{ "queued": 0 }` while the document is being processed; `reindex-all` answers the number of the caller's documents it re-queued. Unchanged chunks reuse their stored vectors, so only changed text or a new embedding model costs provider calls.

### Conversations

- **`Conversation`**: `id`, `title` (`null` until named), `createdAt`, `updatedAt`. Lists are ordered by `updatedAt` descending, and every new message bumps it.
- **Create**: the body may be empty. Without a `title` (1 to 120 characters), the first message names the conversation: its first line, cut at a word boundary to at most 60 characters.
- **`ConversationDetail`**: `{ conversation, messages }`, messages oldest first. A **`Message`** has `id`, `conversationId`, `role` (`user` or `assistant`), `content`, `citations` (the snapshot described under [Citations](#citations)), and for answers `model`, `finishReason` (`stop`, `length`, `content_filter`, `aborted`, `error`, `unknown`) and `usage` (`promptTokens`, `completionTokens`, `totalTokens`, `estimated`).
- **Delete**: removes the conversation and its messages.

### Messages

`POST /conversations/:id/messages` takes `{ "content": string, "documentIds"?: string[] }`: `content` is 1 to 4,000 characters after trimming, and `documentIds` (1 to 20 UUIDs) limits retrieval to those documents. With `Accept: text/event-stream` the answer streams as described in the [streaming contract](#streaming-contract-sse). Otherwise the API runs the same pipeline and answers 200 with a **`ChatResult`**, `{ userMessage, assistantMessage, usage? }`, once the answer is stored; `usage` adds `model` to the token counts.

### Usage

`GET /usage/summary` accepts `from` and `to` (ISO 8601 timestamps with an offset, `from` earlier than `to`) and `timezone` (an IANA name such as `Europe/Paris`; numeric offsets are rejected because Postgres would read their sign inverted). Defaults: `to` is now, `from` is 30 days before `to`, the time zone is UTC. The response, **`UsageSummary`**, holds `from`, `to`, `totals` (`requests`, `promptTokens`, `completionTokens`, `totalTokens`, `estimatedRequests`), `byDay` (`day` as `YYYY-MM-DD` in that time zone, oldest first, with the same counters) and `byModel` (`provider`, `model`, `kind` of `chat`, `embedding` or `query_rewrite`, ordered by total tokens).

### Health

- `GET /health` is liveness: `{"status":"ok","uptimeSeconds":1,"version":"0.0.0"}`.
- `GET /health/ready` answers 200 with `{"status":"ok","checks":{"database":"ok","embeddingDimensions":"ok","ai":"ok"}}` when the database answers within 3 s and `document_chunks.embedding` has the 1536 dimensions the API writes. Otherwise it answers 503 with `"status":"error"`, and `embeddingDimensions` is `mismatch` (wrong column size) or `unknown` (database unreachable). `ai` is `unconfigured` when the `AI_*` variables are incomplete; that is reported but does not fail readiness.

## Streaming contract (SSE)

```bash
export CONVERSATION_ID=$(curl -s -X POST "$API/conversations" -H "Authorization: Bearer $TOKEN" \
  | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).id')

curl -N "$API/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' -d '{"content":"What changed in the latest release?"}'
```

The response starts with these headers, flushed before the first event:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

Each frame is `event: <type>`, then `data: <the whole event as one line of JSON>`, then a blank line; the JSON repeats `type`. A comment frame, `: keep-alive`, follows every 15 s so proxies keep a quiet stream open; SSE parsers skip it. The event schemas are `chatSseEventSchemas` in `packages/contracts/src/chat.ts`, and `parseChatSseEvent(name, json)` validates one frame on either side.

| Event     | Payload                                                                 | Meaning                                                                  |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `meta`    | `conversationId`, `userMessageId`, `title`                              | First event; the question is already stored and the conversation titled  |
| `sources` | `citations: Citation[]`, all `cited: false`                             | Exactly the passages placed in the prompt, in prompt order; may be empty |
| `delta`   | `text`                                                                  | The next piece of the answer; zero or more                               |
| `usage`   | `promptTokens`, `completionTokens`, `totalTokens`, `estimated`, `model` | Token counts of the answer; `estimated` when the provider reported none  |
| `done`    | `userMessageId`, `assistantMessageId`, `finishReason`                   | Last event of a successful answer, sent only after the answer is stored  |
| `error`   | `code`, `message`, optional `retryAfter`                                | Terminal; the same code and client-safe copy a JSON error would carry    |

The order is always `meta`, `sources`, any number of `delta`, `usage`, `done`; a failure replaces the remainder with one `error`. An abridged stream:

```text
event: meta
data: {"type":"meta","conversationId":"6f1c…","userMessageId":"0b7e…","title":"What changed in the latest release?"}

event: sources
data: {"type":"sources","citations":[{"index":1,"documentId":"2a41…","documentTitle":"Release notes","chunkId":"c9d0…","chunkIndex":0,"headingPath":"Release notes","excerpt":"# Release notes - Documents are searchable by title and tag. - Uploads accept .txt, .md and .pdf.","score":0.0328,"cited":false}]}

event: delta
data: {"type":"delta","text":"Uploads now accept"}

event: delta
data: {"type":"delta","text":" .txt, .md and .pdf files [1]."}

event: usage
data: {"type":"usage","promptTokens":812,"completionTokens":14,"totalTokens":826,"estimated":false,"model":"gpt-4o-mini"}

event: done
data: {"type":"done","userMessageId":"0b7e…","assistantMessageId":"9d2a…","finishReason":"stop"}
```

**Failures before the stream starts** (invalid token, invalid body, unknown conversation, rate limit) are ordinary JSON errors with their status code, and nothing is stored. **Failures after `meta`** (the embedding or chat provider failing, say) arrive as an `error` event on the 200 stream; a partial answer is stored with `finishReason: "error"` only if at least one `delta` was sent.

**Aborting**: when the client disconnects (a closed tab, `AbortController.abort()`, Ctrl-C on curl), the API aborts the provider request. If at least one token arrived, the partial answer is stored with `finishReason: "aborted"` and metered; nothing else is sent. The web app's Stop button does exactly this, so the partial answer survives a reload.

**JSON fallback**: an `Accept` header must name `text/event-stream` with a non-zero quality to get a stream; wildcards alone get JSON. In JSON mode an `error` event becomes the HTTP error response (for example 503 `ai_provider_unavailable`), and a client that leaves early gets nothing.

### Citations

`Citation` = `index` (1-based position in the prompt; `[n]` in the answer refers to `citations[n - 1]`), `documentId`, `documentTitle`, `chunkId`, `chunkIndex`, `headingPath` (the `Title › Heading` breadcrumb), `excerpt` (first 240 characters of the chunk), `score` and `cited`. The stored assistant message keeps the whole list with `cited: true` on every source its `[n]` markers name, so history renders from the snapshot even after documents are edited, re-indexed or deleted. `score` is the Reciprocal Rank Fusion score in hybrid mode (at most 2/61, about 0.033, with `RAG_RRF_K=60`) and the cosine similarity with `RAG_RETRIEVAL_MODE=vector`; compare it only within one answer.

## Errors

Every failure, from any layer, has one shape (`apiErrorSchema` in `packages/contracts/src/errors.ts`):

```json
{
  "code": "invalid_payload",
  "messages": ["Invalid request payload"],
  "errors": {
    "title": ["Too small: expected string to have >=1 characters"],
    "tags.0": ["Too big: expected string to have <=40 characters"]
  }
}
```

`errors` maps dotted field paths to messages and appears only for validation failures; `retryAfter` (seconds) appears on 429 and on some 503 responses, together with a `Retry-After` header.

| Code                      | Status | When                                                                                                       |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `invalid_payload`         | 422    | A body, query or path parameter fails its schema; malformed JSON; an upload whose text cannot be used      |
| `unauthenticated`         | 401    | Missing, malformed, expired or non-user token                                                              |
| `forbidden`               | 403    | Reserved; the API reports other users' rows as 404 because RLS hides them                                  |
| `not_found`               | 404    | Unknown route, or a document or conversation the caller cannot see                                         |
| `payload_too_large`       | 413    | JSON body over 2 MB, upload over 10 MiB                                                                    |
| `unsupported_media_type`  | 415    | Upload that is not `.txt`, `.md` or `.pdf`                                                                 |
| `rate_limited`            | 429    | Per-user limit reached; `retryAfter` says when to try again                                                |
| `ai_provider_error`       | 502    | The provider refused for good: bad key, unknown model, invalid request, or AI not configured               |
| `ai_provider_unavailable` | 503    | A transient provider failure: rate limit, timeout, connection error or provider 5xx; `retryAfter` if known |
| `internal_error`          | 500    | Anything else; the message is generic and the details are in the API log under the request id              |

Messages of 5xx responses are always generic; the cause is logged, never returned.

## Pagination and limits

`GET /documents` and `GET /conversations` take `limit` (1 to 200, default 50) and `offset` (0 or more, default 0) and return `{ items, total, limit, offset }`. The web app loads up to 200 documents and filters them client-side.

| Limit              | Value                                  | Source                                                     |
| ------------------ | -------------------------------------- | ---------------------------------------------------------- |
| Document title     | 1 to 200 characters                    | `DOCUMENT_TITLE_MAX`, SQL check constraint                 |
| Document content   | 1 to 500,000 characters                | `DOCUMENT_CONTENT_MAX`, SQL check constraint               |
| Tags               | 20 per document, 40 characters each    | `MAX_TAGS`, `TAG_MAX_LENGTH`                               |
| Upload             | one file, 10 MiB; text fields 4 KiB    | `MAX_UPLOAD_BYTES`, `UPLOAD_LIMITS`                        |
| Message            | 1 to 4,000 characters                  | `MESSAGE_MAX_LENGTH`                                       |
| Document scope     | 1 to 20 documents                      | `MAX_SCOPE_DOCUMENTS`                                      |
| Conversation title | 1 to 120 characters; derived titles 60 | `CONVERSATION_TITLE_MAX`, `CONVERSATION_TITLE_DERIVED_MAX` |
| Page size          | 1 to 200, default 50                   | `PAGE_SIZE_MAX`, `PAGE_SIZE_DEFAULT`                       |
| JSON body          | 2 MB                                   | `JSON_BODY_LIMIT` in `apps/api`                            |
| Any stored string  | no U+0000 characters                   | `withoutNul` in `@kb/contracts`                            |

Contract limits live in `packages/contracts/src/limits.ts`, so the web forms enforce the same numbers before a request is sent.
