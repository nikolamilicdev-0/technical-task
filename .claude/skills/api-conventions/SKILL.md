---
name: api-conventions
description: How NestJS code in apps/api is written — module layout (controller → service → repository → mapper), ZodBody/ZodQuery/ZodParam validation, ApiHttpException and the shared error shape, the user-scoped database client, service-role confinement, rate limits, SSE, and unit plus pipeline tests. Use when adding or changing an API route, module, repository, error, event or API test.
---

# API Conventions (`apps/api`)

NestJS 12 as native ESM. Reference module: `src/modules/documents/`.

```
src/modules/<feature>/
  <feature>.module.ts       # providers; export the service when another module reuses it
  <feature>.controller.ts   # thin: route from apiRoutes, @CurrentUser(), Zod* params, return the service call
  <feature>.service.ts      # orchestration; ApiHttpException for expected failures; emits events
  <feature>.repository.ts   # Supabase queries; `db: DatabaseClient` is always the first argument
  <feature>.mapper.ts       # rows → contract DTOs, parsed with zod; snake_case stops here
  <feature>.types.ts        # row and internal types, from Tables<'…'> in database.types.ts
  <feature>.constants.ts    # route params, column lists, messages
```

## Rules

- **Routes**: `@Controller(apiRoutes.<resource>.collection)` with sub-routes from the module constants; paths never appear as literals.
- **Validation**: `@ZodBody(schema)`, `@ZodQuery(schema)` and `@ZodParam(name, idSchema)` from `src/common/validation/zod-params.decorators.ts`, with schemas from `@kb/contracts` (the web uses the same objects). A failure is `422 invalid_payload` with dotted field paths in `errors`.
- **Caller**: `@CurrentUser() user: UserContext` (`src/database/user-context.types.ts`); pass `user.db` to the repository. `@Public()` is for health checks only.
- **Errors**: throw `new ApiHttpException(code, [message], { errors, retryAfter })` (`src/common/errors/api-http.exception.ts`); the code picks the status through `ERROR_HTTP_STATUS`. Everything else goes through `mapErrorToResponse` (`error-mapping.ts`): `AiProviderError` becomes 502 or 503, unknown errors a generic 500 whose cause is logged under the request id.
- **Ownership**: RLS hides other users' rows, so a missing row is `not_found`; never answer 403 for ownership.
- **Database**: `db.from(DATABASE_RELATIONS.x)` and `db.rpc(DATABASE_FUNCTIONS.x, …)` (`src/database/database.constants.ts`); wrap failures with `toDatabaseError`, read counts with `exactCount`, send vectors as `toStoredVector()` literals.
- **Service role**: `SupabaseClientFactory.serviceRole()` belongs to the ingestion worker and service, `UsageRecorder` and the readiness check. Any new use needs a DEC entry first (DEC-004, DEC-015).
- **AI**: inject `@Inject(CHAT_MODEL) chat: ChatModel` or `EMBEDDING_MODEL` (`src/ai/ai.constants.ts`) and count tokens with `TokenCounter`; never import an adapter. Meter every provider call through `UsageRecorder`, fire-and-forget.
- **Config**: inject `APP_CONFIG` for typed sections; `process.env` is read only inside `src/config/` (DEC-016).
- **Background work**: emit `DOCUMENT_INGESTION_REQUESTED` or call `IngestionWorker.wake()`; never await ingestion or metering on a request path.
- **Rate limits**: an env-driven limit uses `@RateLimitBucket(name)` plus a bucket in `UserThrottlerGuard`; a fixed product limit uses `@Throttle`; health uses `@SkipThrottle()` (DEC-025).
- **Streaming**: take `const signal = abortOnClose(res)`, then `sse.stream(res, run.events(signal))` (`src/modules/chat/chat.controller.ts`); new events go into `chatSseEventSchemas` first, and `done` follows persistence (DEC-026).
- **ESM**: relative imports end in `.js`; a class that is injected is never imported with `import type`; use `import.meta.dirname` for paths.

## Tests

- Unit tests mirror `src/` under `__tests__/unit/`. Pure functions get tables of cases; repositories run against the scripted client in `__tests__/fakes/fake-database.ts`; services use the in-memory repositories in `__tests__/fakes/` and `FakeChatModel`/`FakeEmbeddingModel` from `@kb/ai`.
- Every route has a pipeline test, `__tests__/unit/<feature>.pipeline.test.ts`: `TestApp.start()` (`__tests__/fakes/test-app.ts`) boots `AppModule` on a random port with providers overridden, `signIn()` returns auth headers for a fresh user, and `call()` drives the route; assert statuses and parse bodies with the contract schemas.
- Run `pnpm --filter api test`, or `pnpm --filter api exec vitest run <pattern>`; `http/*.http` covers the same routes by hand.
