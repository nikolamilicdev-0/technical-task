# Contract: Chat Event Stream

`POST /api/conversations/:id/messages` with `Accept: text/event-stream` answers as Server-Sent Events over the `POST` response (DEC-008, DEC-026). The event schemas are `chatSseEventSchemas` in [`packages/contracts/src/chat.ts`](../../../packages/contracts/src/chat.ts), and `parseChatSseEvent(name, json)` validates a frame on either side. The request itself is described in [rest-api.md](./rest-api.md#messages).

## Before the stream

Authentication, the rate limit (20 per user per minute by default), body validation (`sendMessageSchema`) and the conversation lookup run first. Their failures are ordinary JSON errors with their status (401, 429, 422, 404), and nothing is stored. Once they pass, the question is stored and the stream opens.

## Response headers

Sent and flushed before the first event:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

No compression runs on the API, and the browser calls the API origin directly, so no proxy buffers the frames.

## Frames

Each event is one frame: `event: <type>`, a newline, `data: <the whole event as one line of JSON>`, then a blank line (`formatSseEvent` in `apps/api/src/modules/chat/sse-format.ts`). The JSON repeats `type`, so a frame is self-describing. A comment frame, `: keep-alive`, follows every 15 s so idle proxies keep the connection open; parsers skip it.

## Events

| Event     | Payload                                                                 | Rules                                                                                                                  |
| --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `meta`    | `conversationId`, `userMessageId`, `title` (string or null)             | Always first. The question is already stored, and an untitled conversation has been named from it.                     |
| `sources` | `citations: Citation[]`, every `cited: false`                           | Exactly the passages placed in the prompt, in prompt order, after the context budget dropped whole ones; may be empty. |
| `delta`   | `text`                                                                  | The next piece of the answer; zero or more.                                                                            |
| `usage`   | `promptTokens`, `completionTokens`, `totalTokens`, `estimated`, `model` | The answer's token counts; `estimated` when the provider sent none and cl100k counted them.                            |
| `done`    | `userMessageId`, `assistantMessageId`, `finishReason`                   | Last event of a successful answer, sent only after the answer is stored with its citations.                            |
| `error`   | `code` (an error code), `message`, optional `retryAfter` (seconds)      | Terminal. The same code and client-safe message the JSON error mapping would produce.                                  |

**Order**: `meta`, `sources`, any number of `delta`, `usage`, `done`. A failure after `meta` replaces the rest with one `error`. `finishReason` is one of `stop`, `length`, `content_filter`, `aborted`, `error`, `unknown`.

**Citations**: `index` is the 1-based prompt position, so `[n]` in the answer text refers to `citations[n - 1]`. The stored answer keeps the whole list with `cited: true` on each source its markers name (parsed from `[1]`, `[2][3]` and `[1, 2]` outside code; Markdown links and out-of-range numbers are ignored). `score` is the Reciprocal Rank Fusion score in hybrid mode and the cosine similarity in vector mode; it orders the sources of one answer and is not a probability (DEC-027).

## Persistence guarantees

- The question is stored before `meta`.
- The answer is stored before `done`, with its citation snapshot, model, provider, finish reason, token counts and retrieval metadata, and it is metered as a `chat` usage event.
- A provider failure after `meta` stores the partial answer with `finishReason: "error"` only if at least one `delta` was sent, then emits `error`.
- A client disconnect (a closed tab, `AbortController.abort()`, Ctrl-C) aborts the provider request; if at least one token arrived the partial answer is stored with `finishReason: "aborted"` and metered, and nothing more is sent. The writer drains the event generator after the disconnect so this persistence still runs.
- An empty answer is never stored.

## JSON fallback

Without `Accept: text/event-stream` (a non-zero quality is required; `*/*` alone does not count), the same pipeline runs to completion and answers 200 with `ChatResult` (`{ userMessage, assistantMessage, usage? }`) once the answer is stored. An `error` event becomes the HTTP error response, for example `503 ai_provider_unavailable` with `retryAfter`. A client that leaves early gets nothing.

## Client rules (web)

- The web sends the request with `fetch` (`features/chat/services/chat-stream-service.ts`) and reads the body with `parseSse` (`features/chat/lib/parse-sse.ts`), which follows the HTML standard: CR, LF and CRLF line endings, multi-line `data`, comment lines, frames split across chunks and multi-byte characters split across reads. A final frame without its blank line is still delivered.
- `parseChatEvent` validates each frame against the contract; unknown names, malformed JSON and a `type` that disagrees with the event name are dropped.
- `chatStreamReducer` moves through `idle`, `connecting`, `streaming`, then `done`, `stopped` or `error`, and ignores events while it is not receiving. On `done` the exchange is committed to the conversation cache and the conversation lists and usage summary are invalidated; on Stop the partial answer is committed and the detail is marked stale without an immediate refetch (the API stores the partial answer only once it notices the abort), so the stored version replaces it on the next fetch.
- A stream that ends without `done` or `error` is reported as interrupted; a 429 or 503 shows when to retry.

## Where the contract is pinned

- `packages/contracts/__tests__/unit/chat.test.ts`: every event schema and `parseChatSseEvent`.
- `apps/api/__tests__/unit/modules/chat/sse-format.test.ts`, `sse-writer.test.ts`, `chat-result-collector.test.ts`, `citation-parser.test.ts` and `rag-chat.service.test.ts`: frame format, heartbeat, draining after disconnect, event order, stored partial answers, error events.
- `apps/api/__tests__/unit/chat.pipeline.test.ts`: the stream and the JSON fallback over HTTP.
- `apps/api/__tests__/unit/common/http/accepts-event-stream.test.ts`: the `Accept` negotiation.
- `apps/web/__tests__/unit/chat/parse-sse.test.ts`, `parse-chat-event.test.ts`, `chat-stream-reducer.test.ts`, `useChatStream.test.tsx` and `useChatStream.errors.test.tsx`: the client side.
