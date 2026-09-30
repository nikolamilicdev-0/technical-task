# Quickstart: AI-Powered Knowledge Base

How to set the product up, run it and prove that every user story works. Contracts: [rest-api.md](./contracts/rest-api.md) and [sse-stream.md](./contracts/sse-stream.md). Schema and states: [data-model.md](./data-model.md). Full setup options: the [README](../../README.md#quick-start).

## 1. Prerequisites

| Tool            | Version                          | Notes                                   |
| --------------- | -------------------------------- | --------------------------------------- |
| Node.js         | 22 LTS, at least 22.22           | `nvm install && nvm use` reads `.nvmrc` |
| pnpm            | 10 or newer (the repo pins 12.6) | `corepack enable pnpm`                  |
| Docker Desktop  | running                          | Only for the local database stack       |
| AI provider key | OpenAI or Gemini to start        | Ollama needs none                       |

## 2. Bootstrap

```bash
pnpm bootstrap --local     # or --hosted, or --skip-db; without a flag it asks
```

It checks Node, pnpm and git, installs with a frozen lockfile, copies `.env.example` to `.env` (an existing `.env` is never overwritten), starts the local Supabase stack, copies its URL and keys into `.env`, applies `supabase/migrations/`, regenerates the database types and builds the internal packages. Running it again is safe. `--hosted` pushes the migrations to a hosted project with `supabase db push --db-url`; `--skip-db` prints the steps for the SQL editor.

Add one AI key to the root `.env`. The `.env.example` defaults already name OpenAI models:

```bash
AI_CHAT_API_KEY=sk-...
```

## 3. Run

```bash
pnpm dev                                   # web http://localhost:3000, API http://localhost:4000/api
curl http://localhost:4000/api/health/ready
```

Expected: `{"status":"ok","checks":{"database":"ok","embeddingDimensions":"ok","ai":"ok"}}`. `"ai":"unconfigured"` means an `AI_*` value is missing, and the API log names it.

## 4. Automated checks

```bash
pnpm check     # format check, lint, typecheck, unit and pipeline tests, build; identical to CI
```

Expected: green with no `.env`, key, Docker or network access to AI or database services. Useful subsets:

```bash
pnpm --filter @kb/contracts test           # accept and reject tables for every schema
pnpm --filter api exec vitest run pipeline # the whole API over HTTP with fakes
pnpm --filter api exec vitest run chunker  # chunker, including adversarial time budgets
pnpm --filter web exec vitest run chat     # SSE parser, stream reducer, citations
```

## 5. Scenarios

Sign up at http://localhost:3000 (the local stack needs no email confirmation). Keep a Markdown document with a few headings and a short PDF at hand.

| #   | Story | Steps                                                                                                                     | Expect                                                                                                                                 |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | US1   | Open `/documents` in a private window                                                                                     | Redirect to `/login?next=/documents`; after signing in, back on `/documents`                                                           |
| 2   | US1   | Sign up a second user; open the first user's document URL                                                                 | The not-found state, exactly as for an unknown id; the API answers 404                                                                 |
| 3   | US2   | Create a document with a title, Markdown content and two tags; preview it; edit it; search; filter by a tag               | Card with tags and status; formatted preview; last-updated time moves; search and tag filter narrow the list and clear in one action   |
| 4   | US2   | Save with an empty title, then with 21 tags                                                                               | Field errors next to the fields; nothing saved                                                                                         |
| 5   | US3   | Stay on the library after saving                                                                                          | Queued → Indexing → Ready without a reload; the status bar shows the passage count                                                     |
| 6   | US3   | Edit one paragraph and save; watch the API log                                                                            | Back to Ready; the worker log line shows most passages reused and only the changed ones embedded                                       |
| 7   | US3   | Set an invalid `AI_EMBEDDING_API_KEY`, restart the API, save a document                                                   | Failed with the reason and **Retry indexing**; restoring the key and pressing it makes the document Ready                              |
| 8   | US4   | Ask a question the document answers; open a `[1]` chip                                                                    | The answer streams in; the chip opens the source card with document, heading path and a link                                           |
| 9   | US4   | Ask a follow-up ("and the second one?"), then a question the documents cannot answer                                      | The follow-up resolves the reference (the API log shows the rewritten query); the other says it found nothing and cites nothing        |
| 10  | US4   | Press Stop mid-answer, then reload                                                                                        | The partial answer stays, marked Stopped, before and after the reload                                                                  |
| 11  | US4   | Pick one document in the scope picker and ask                                                                             | Sources come only from that document                                                                                                   |
| 12  | US5   | Sign out and in; open the conversation list; rename and delete a conversation                                             | Conversations newest first, titled from the first question; rename and delete apply at once; deleting the open one leads to a new chat |
| 13  | US5   | Delete a cited document, then reopen the answer                                                                           | The citation still shows its passage; its link leads to the not-found state                                                            |
| 14  | US6   | Upload the Markdown file, the PDF, a file over 10 MiB and a `.png`                                                        | Two documents titled after their files, indexing; the last two rejected with their specific messages                                   |
| 15  | US7   | Switch to another provider in `.env` (for example `AI_CHAT_PROVIDER=gemini`, key set, both model names blank) and restart | Log line about re-queued documents; they become Ready again; the same question gets a cited answer                                     |
| 16  | US8   | Open `/usage`                                                                                                             | Totals, tokens per day in the browser's time zone and rows per provider, model and kind (`chat`, `embedding`, `query_rewrite`)         |

## 6. API-level checks

The [API reference](../../docs/api.md) shows how to obtain an access token with curl. With `$API` and `$TOKEN` set:

```bash
curl -s "$API/documents"                                   # 401 {"code":"unauthenticated",...}
curl -s "$API/documents" -H "Authorization: Bearer $TOKEN" # {"items":[...],"total":...}
curl -N "$API/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' -d '{"content":"What changed in the latest release?"}'
```

Expected: the stream shows `meta`, `sources`, `delta` frames, `usage` and `done` in that order. Without the `Accept` header the same request returns a `ChatResult` as JSON. The `http/*.http` files run the same walkthroughs from VS Code's REST Client.

## 7. Recovery paths

- **Restart mid-run**: stop the API while a large document shows Indexing and start it again. Once the claim is older than `INGESTION_STALE_AFTER_MINUTES` (10 by default), the worker claims it again and the document becomes Ready.
- **Rate limits**: send more than 20 questions in a minute. The composer shows when to try again, and the API answers 429 with `Retry-After`.
- **Provider outage**: point `AI_CHAT_BASE_URL` at a closed port and restart. Questions end with the provider-unavailable message and a retry; documents and conversations keep working.
