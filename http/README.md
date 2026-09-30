# HTTP walkthroughs

Request files for the VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension (`humao.rest-client`). Each file signs in against Supabase Auth, reuses the access token and runs from top to bottom. No secret is stored in them.

| File             | Covers                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documents.http` | Sign-up and sign-in, create, list with filters, read, tags-only and content updates, uploads (Markdown, PDF, text-less PDF, unsupported type), validation errors, reindex, delete, 404 |
| `chat.http`      | Create a conversation, streamed and JSON answers, a rewritten follow-up, document scope, the detail with its citation snapshot, rename, validation and 404 cases, delete               |
| `usage.http`     | The 30-day summary, a custom window and time zone, validation errors                                                                                                                   |

1. Start the database (`pnpm db:start`, or use a hosted project) and the API (`pnpm dev:api`) with an AI key in `.env`.
2. Export the variables the files read through `$processEnv`, then start VS Code from the same shell:

   ```bash
   export SUPABASE_PUBLISHABLE_KEY=$(node --env-file=.env -p process.env.SUPABASE_PUBLISHABLE_KEY)
   export KB_EMAIL=you@example.com KB_PASSWORD='a-long-password'
   ```

3. Run `documents.http` first (request 0 signs the user up once; the local stack needs no email confirmation), wait until a document is indexed, then run `chat.http` and `usage.http`.

The files target the local stack (`@supabaseUrl = http://127.0.0.1:54321`); change that line for a hosted project. The PDF requests upload fixtures from `apps/api/__tests__/fixtures/`. REST Client shows a response once it completes; to watch an answer stream token by token, use `curl -N` as in [docs/api.md](../docs/api.md#streaming-contract-sse).
