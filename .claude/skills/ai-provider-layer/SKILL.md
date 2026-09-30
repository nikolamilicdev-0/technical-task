---
name: ai-provider-layer
description: How the provider-agnostic AI layer in packages/ai works and how to extend it — the ChatModel and EmbeddingModel ports, provider profiles, the one OpenAI-compatible adapter, the AI_* split between chat and embeddings, embedding dimensions and signatures, errors, metering and fakes. Use when adding or changing a provider or model default, an AI_* variable, token usage, or any code that calls a model.
---

# AI Provider Layer (`packages/ai`, `@kb/ai`)

Framework-free; apps depend on the ports alone (DEC-003).

| File                                 | Role                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ports/chat-model.types.ts`      | `ChatModel`: `complete(request)` and `stream(request)` (`delta` events, then `done` with finish reason, usage and model)                                                                     |
| `src/ports/embedding-model.types.ts` | `EmbeddingModel`: `embed({ texts })`, `signature` (`model` or `model#dims`), `dimensions`                                                                                                    |
| `src/errors/ai-provider-error.ts`    | `AiProviderError` with neutral codes: `authentication`, `permission`, `not_found`, `invalid_request`, `rate_limited`, `timeout`, `connection`, `server`, `aborted`, `unsupported`, `unknown` |
| `src/providers/provider-profiles.ts` | `PROVIDER_PROFILES`: base URL, key policy, default models, embedding and streamed-usage support, `dimensions` support, `maxTokensParam`, attribution headers                                 |
| `src/providers/resolve-endpoint.ts`  | Profile plus configuration → base URL, key, headers, model and flags                                                                                                                         |
| `src/config/ai-env.schema.ts`        | `aiEnvSchema` (the flat `AI_*` variables) and `aiConfigFromEnv`, whose errors name the variable                                                                                              |
| `src/config/ai-config.schema.ts`     | The nested configuration, checked against the profiles in a `superRefine`                                                                                                                    |
| `src/adapters/openai-compatible/`    | The one adapter pair over the OpenAI SDK, with pure mappers                                                                                                                                  |
| `src/factory/create-ai-clients.ts`   | The only place that picks an adapter (exhaustive `switch`)                                                                                                                                   |
| `src/testing/`                       | `FakeChatModel` and `FakeEmbeddingModel`, deterministic                                                                                                                                      |

## Configuration split

- `AI_CHAT_*` and `AI_EMBEDDING_*` are independent. `AI_EMBEDDING_PROVIDER` defaults to the chat provider; the embedding key, base URL and headers are inherited only when both providers match; model names never carry over. Blank values count as unset.
- `.env.example` names OpenAI models, so switching providers means blanking or replacing `AI_CHAT_MODEL` and `AI_EMBEDDING_MODEL`.
- The API merges `aiEnvSchema` into `apps/api/src/config/env.schema.ts`. An incomplete setup binds the stand-ins from `apps/api/src/ai/unconfigured-ai-clients.ts` (readiness reports `ai: unconfigured`) instead of failing the boot.

## Adding a provider

- **OpenAI-compatible**: add the id to `PROVIDER_IDS` (`src/providers/provider-ids.ts`), a profile with its quirks as flags in `provider-profiles.ts`, and a `case` in both switches of `create-ai-clients.ts` (the compiler lists every place). Cover it in `__tests__/unit/providers/provider-profiles.test.ts` and `__tests__/unit/factory/create-ai-clients.test.ts`, then extend the README provider table and the examples in `.env.example`.
- **Own wire protocol** (Anthropic's Messages API, for instance): a new adapter class implementing `ChatModel` and/or `EmbeddingModel` that maps every SDK failure to `AiProviderError`, tested against a fake client like `__tests__/fake-openai-client.ts`, then the steps above. Nothing in `apps/*` changes.
- A profile with non-obvious behaviour gets a DEC entry, as DEC-017 does for Gemini.

## Dimension rules (DEC-014)

- The column is `vector(1536)`. `toStoredVector` zero-pads shorter vectors (cosine similarity is unchanged) and fails longer ones with `VectorDimensionError`: set `AI_EMBEDDING_DIMENSIONS` to at most 1536 where the provider accepts `dimensions` (OpenAI, Gemini), or migrate the column.
- `AI_EMBEDDING_DIMENSIONS` is sent only to profiles with `supportsEmbeddingDimensions`; elsewhere it only validates the returned size.
- The signature changes with the model or its dimensions. Retrieval filters by it, and the worker re-queues documents with another signature once per process, so vector spaces never mix.

## Calling models from the API

- Inject `CHAT_MODEL` or `EMBEDDING_MODEL`, pass the request's `signal`, cap answers with `RAG_MAX_ANSWER_TOKENS` and leave temperature unset unless `AI_CHAT_TEMPERATURE` is configured.
- Meter every call through `UsageRecorder` with kind `chat`, `embedding` or `query_rewrite`, estimating with `TokenCounter` when the provider sends no usage (DEC-020).
- `AiProviderError` reaches HTTP only through `mapErrorToResponse` (502 for permanent, 503 with `retryAfter` for transient failures); ingestion retries follow `classifyIngestionFailure`.

## Tests

`pnpm --filter @kb/ai test` covers env decoding and inheritance, profile consistency, endpoint resolution, both adapters against the fake client (stream deltas, usage, aborts, vector order and size) and error mapping including `Retry-After`. Consumers use the fakes; no test calls a real provider.
