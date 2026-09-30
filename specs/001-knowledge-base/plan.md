# Implementation Plan: AI-Powered Knowledge Base

**Branch**: `main` (the initial build) | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-knowledge-base/spec.md`

## Summary

A private knowledge base: users keep Markdown documents (typed or uploaded), and a chat answers their questions only from those documents, streaming the answer and citing the passages it used. The build is a Turborepo monorepo with a Next.js 16 web app, a NestJS 12 API and three shared packages: `@kb/contracts` (zod schemas for every DTO, route, SSE event, limit and error code), `@kb/ai` (provider-agnostic chat and embedding ports with one OpenAI-compatible adapter) and `@kb/ui` (primitives and design tokens). Supabase provides Postgres 17 with pgvector and Auth; row-level security is the security boundary because every user request queries through a client that carries the caller's JWT.

Documents are indexed by a durable queue that is the `documents` table itself: a trigger re-queues on every content change, and an in-process worker claims rows with `FOR UPDATE SKIP LOCKED`, splits Markdown along headings into 400-token chunks with `Title › Heading` breadcrumbs, embeds only chunks whose hash is new and publishes the set atomically. A question is rewritten into a standalone query when it is a follow-up, then retrieved by vector search and full-text search in parallel, fused with Reciprocal Rank Fusion in TypeScript, placed in a grounded prompt and streamed back as typed Server-Sent Events over `POST`. The answer is stored with a snapshot of its sources, and every provider call is metered for the usage view. The research behind each choice is in [research.md](./research.md); the reasoning is recorded as DEC-001 to DEC-034 in [DECISIONS.md](../../DECISIONS.md).

## Technical Context

**Language/Version**: TypeScript `~6.0.3` (strict, `verbatimModuleSyntax`) on Node 22 LTS (at least 22.22); pnpm 12.6.0 workspaces with a version catalog; Turborepo 2.11.5

**Primary Dependencies**: web: Next.js 16.3.7 (App Router, `proxy.ts`), React 19.3, Tailwind CSS 4.3, TanStack Query 5.104, React Hook Form 7.89 with `@hookform/resolvers`, `@supabase/ssr` 0.12, react-markdown 10 with remark-gfm, sonner; API: NestJS 12.1 as ESM with `@nestjs/event-emitter`, `@nestjs/schedule` and `@nestjs/throttler` 6.7, `@supabase/supabase-js` 2.117, js-tiktoken 1.0, unpdf 1.8, multer; shared: zod 4.6 (`@kb/contracts`), openai 7.23 behind the `@kb/ai` ports, radix-ui, class-variance-authority, tailwind-merge and lucide-react (`@kb/ui`)

**Storage**: Supabase Postgres 17 with pgvector: `document_chunks.embedding vector(1536)` under an HNSW cosine index and a generated `tsvector` under GIN; RLS on every table; schema in 12 migrations under `supabase/migrations/`; generated types committed as `apps/api/src/database/database.types.ts`

**Testing**: Vitest 4.1 in every package's `__tests__/unit/` (node for the API, contracts and AI; jsdom with Testing Library for the web and UI); API pipeline tests boot the whole Nest app on a random port with in-memory repositories, a fake JWT verifier and fake AI models; CI runs `pnpm format:check`, `lint`, `typecheck`, `test` and `build` with no `.env`

**Target Platform**: evergreen desktop and mobile browsers; Node 22 server processes for the web (:3000) and the API (:4000); local Supabase stack in Docker (API 54321, Postgres 54322, Studio 54323) or a hosted Supabase project

**Project Type**: web application in a Turborepo monorepo: `apps/web`, `apps/api`, `packages/{contracts,ai,ui,eslint-config,typescript-config}`

**Contracts Touched**: all of `packages/contracts/src` (created by this feature): `common`, `errors`, `limits`, `routes`, `documents`, `conversations`, `messages`, `chat`, `usage`, `health`, `conversation-title`

**Data Changes**: tables `documents`, `document_chunks`, `conversations`, `messages`, `usage_events`; view `document_summaries`; enums `embedding_status`, `message_role`, `usage_kind`; ingestion, search, usage and readiness functions; explicit grants (see [data-model.md](./data-model.md))

**AI Usage**: chat completions (streamed answers and follow-up rewrites) and embeddings (ingestion batches and query embeddings), each metered as one `usage_events` row of kind `chat`, `query_rewrite` or `embedding`

**Performance Goals**: first answer token within about 3 s with a responsive provider; a 5,000-word document ready within 60 s; re-indexing embeds only changed chunks; chunking stays linear on adversarial input (time-budget tests)

**Constraints**: every user query under RLS; the secret key only in the ingestion worker, the usage recorder and the readiness probe; one root `.env`; limits shared by contracts and SQL checks (title 200, content 500,000, 20 tags of 40, message 4,000, upload 10 MiB); a fixed 1536-dimension vector column; `pnpm build` and every test run without keys, Docker or network

**Scale/Scope**: single-tenant-per-user workspaces; per-user rate limits (120 requests a minute by default, 20 questions, 10 uploads, 3 re-index requests); about 440 TypeScript source files and 160 test files across 7 workspace packages

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Derived from `.specify/memory/constitution.md` v1.0.0:

- [x] **I. Contracts First**: every DTO, query, route, SSE event, limit and error code is in `packages/contracts/src` with accept and reject tables in `packages/contracts/__tests__/unit/`; the API validates through `ZodBody`, `ZodQuery` and `ZodParam`, the web through `useZodResolver` and response schemas in each feature service.
- [x] **II. RLS boundary**: `SupabaseClientFactory.forUser` builds the per-request client; every repository takes `db` first; `serviceRole()` is called only by the ingestion worker and service, the usage recorder and the readiness check in the health service (DEC-004, DEC-015, DEC-020); every table has own-row policies and explicit grants (`20260929100800_grants_hardening.sql`); foreign ids answer 404.
- [x] **III. Provider-agnostic AI**: `apps/api` injects `CHAT_MODEL` and `EMBEDDING_MODEL`; seven profiles (OpenAI, Groq, Together, OpenRouter, Gemini, Ollama, custom) share one adapter; chat and embeddings are configured separately through `AI_*`; chunks carry the embedding signature; an incomplete setup binds failing stand-ins.
- [x] **IV. Durable ingestion**: only the `documents_before_write` trigger and the ingestion SQL functions move `embedding_status`; the worker is woken by `DOCUMENT_INGESTION_REQUESTED` and never awaited on a request path; `classifyIngestionFailure` has a branch and a test per failure kind.
- [x] **V. Web tiers**: route files in `apps/web/app/` compose a feature's `*Body` (the auth layout its `AuthShell`) and hold no logic; `features/{auth,documents,chat,usage}` import `core/` and `@kb/ui` only; the ESLint tier and copy rules in `packages/eslint-config/next.js` pass; all copy is in `apps/web/messages/en.json` behind strings getters.
- [x] **VI. Primitives and tokens**: all layout goes through `Flex`, `Grid`, `Container`, `Section` and `Text`; tokens come from `packages/ui/src/styles/theme.css`; icons from `apps/web/core/icons`; semantic `table` elements appear only for tabular data (the usage table and rendered Markdown tables).
- [x] **VII. States**: every route segment has `loading.tsx`; `get-list-view.ts`, `get-thread-view.ts` and `get-usage-view.ts` derive the states; `ErrorState`, `NotFoundState` and the `error.tsx` boundaries cover failures; there is no mock data.
- [x] **VIII. Gates**: unit tests cover every pure module (chunker, fusion, prompt builder, citation parser, SSE parser, reducers, mappers, env schemas); `app.setup.test.ts` and five `*.pipeline.test.ts` files drive every route over HTTP; `pnpm check` is green.
- [x] **IX. Decision log**: DEC-001 to DEC-014 were recorded while planning and DEC-015 to DEC-034 as the build settled details; research.md cites them per topic.
- [x] **X. Commits and flow**: history is conventional commits with known scopes, enforced by husky and commitlint. The initial build landed on `main` before `develop` existed; later features branch from `develop` and merge through pull requests.

**Post-design re-check (after Phase 1)**: all items still hold; no violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/001-knowledge-base/
├── spec.md                  # /speckit-specify output (8 user stories, FR-001…FR-045, SC-001…SC-012)
├── checklists/
│   └── requirements.md      # spec quality checklist
├── plan.md                  # this file
├── research.md              # Phase 0: decisions, rationale, alternatives
├── data-model.md            # Phase 1: tables, policies, functions, state machine
├── contracts/
│   ├── rest-api.md          # Phase 1: REST endpoints, errors, limits
│   └── sse-stream.md        # Phase 1: chat event stream
├── quickstart.md            # Phase 1: bootstrap, run and verify
└── tasks.md                 # Phase 2: /speckit-tasks output (all tasks complete)
```

### Source Code (repository root)

```text
.github/workflows/ci.yml                  # one job: format, lint, typecheck, test, build
.husky/{pre-commit,commit-msg}            # lint-staged, commitlint
supabase/
├── config.toml                           # local stack: ports, trimmed services, auth without confirmation
└── migrations/                           # 12 files, 20260929100000_extensions … 20260929101100_search_consistency
scripts/
├── setup.mjs · setup/{main,database,prompt}.mjs   # pnpm bootstrap (local | hosted | skip-db)
├── db.mjs                                # db:migrate | db:push | db:types
└── lib/{env,exec,log,supabase}.mjs
packages/
├── contracts/src/                        # @kb/contracts: common, errors, limits, routes, documents,
│                                         #   conversations, messages, chat (SSE), usage, health, conversation-title
├── ai/src/
│   ├── ports/                            # ChatModel, EmbeddingModel, embedding-contract (signature)
│   ├── providers/                        # PROVIDER_IDS, PROVIDER_PROFILES, resolve-endpoint
│   ├── config/                           # aiConfigSchema, aiEnvSchema + aiConfigFromEnv
│   ├── adapters/openai-compatible/       # chat and embedding adapters, mappers, client factory
│   ├── errors/                           # AiProviderError, map-openai-error, abort-error
│   ├── factory/create-ai-clients.ts      # the only place that picks an adapter
│   └── testing/                          # FakeChatModel, FakeEmbeddingModel
├── ui/src/
│   ├── components/                       # Text, Button, Flex, Grid, Container, Section, EmptyState, Dialog, Menu, …
│   ├── lib/{cn,field,responsive,space}.ts
│   └── styles/theme.css                  # the only file with raw colours
├── eslint-config/{base,library,nest,next,react-internal}.js   # next.js holds the tier and copy rules
└── typescript-config/{base,nestjs,nextjs,node-library,react-library}.json
apps/api/src/
├── main.ts · app.module.ts · app.setup.ts
├── config/                               # root-env, env.schema (+ aiEnvSchema), app-config (APP_CONFIG)
├── common/                               # errors (ApiHttpException, filter, mapping), validation (ZodBody…),
│                                         #   http (request id, logging, SSE accept, abort-on-close), auth decorators, utils
├── database/                             # SupabaseClientFactory, DatabaseClient, database.types.ts (generated), constants
├── auth/                                 # AuthGuard, JwtVerifier port, supabase-jwt.verifier, bearer-token
├── ai/                                   # AiModule (CHAT_MODEL, EMBEDDING_MODEL), TokenCounter, unconfigured stand-ins
├── throttling/                           # UserThrottlerGuard, @RateLimitBucket
└── modules/
    ├── health/                           # GET /health, GET /health/ready
    ├── documents/                        # CRUD controller, service, repository, mapper
    ├── upload/                           # multipart upload, file filter, plain-text and PDF extractors
    ├── ingestion/                        # worker, service, repository (RPCs), backoff, failure policy, reindex
    │   └── chunking/                     # chunker, markdown-sections, blocks, code-fences, sentences, pack-units
    ├── retrieval/                        # retrieval service and repository, rank-fusion (RRF)
    ├── chat/                             # conversations, messages, RagChatService, prompt builder, query rewriter,
    │                                     #   citation parser, SSE writer and format, result collector
    └── usage/                            # UsageRecorder, usage service, repository, window
apps/api/__tests__/{unit,fakes,fixtures}  # unit tests mirror src/; app.setup.test.ts + 5 *.pipeline.test.ts
apps/web/
├── proxy.ts                              # session refresh and auth redirects
├── app/                                  # layout, error, not-found; (auth)/{login,signup}; (app)/{documents,chat,usage}
├── core/                                 # api (client, errors, upload), auth, config (routes, env, query), i18n,
│                                         #   forms, providers, components (shell, states, markdown, dialogs), icons, utils
├── features/
│   ├── auth/                             # login and sign-up forms, auth service, error mapping
│   ├── documents/                        # list, editor, upload dialog, status bar, cache helpers, polling
│   ├── chat/                             # conversation list, thread, composer, SSE parser, stream reducer, citations
│   └── usage/                            # stat tiles, bars by day, table by model
├── messages/en.json                      # every user-facing string
└── __tests__/{unit,fixtures,helpers}     # core, auth, documents, chat, usage, components
http/{documents,chat,usage}.http          # REST Client walkthroughs
docs/{api,architecture,loom-script}.md
AGENTS.md · CLAUDE.md · DECISIONS.md · README.md · .env.example
```

**Structure Decision**: two apps and five packages. Contracts and AI are framework-free packages compiled to ESM `dist/` with types served from `src/`, so Node and Nest execute JavaScript while editors and tests read live types (DEC-001); `@kb/ui` ships source that Next compiles. The API follows controller → service → repository → mapper per module, and the web follows the `app/` → `features/` → `core/` → `@kb/ui` tiers. Everything the web and the API must agree on lives in `@kb/contracts`, and nothing outside `@kb/ai` knows which provider is in use.

## Phases

- **Phase 0, research** ([research.md](./research.md)): the sixteen choices that shape the system, each with the decision, the rationale and the alternatives rejected, cross-referenced to DECISIONS.md.
- **Phase 1, design** ([data-model.md](./data-model.md), [contracts/rest-api.md](./contracts/rest-api.md), [contracts/sse-stream.md](./contracts/sse-stream.md), [quickstart.md](./quickstart.md)): schema, policies, grants, SQL functions and the ingestion state machine; the REST and streaming contracts as the zod schemas define them; the bootstrap and verification path.
- **Phase 2, tasks** ([tasks.md](./tasks.md)): setup and foundational phases, one phase per user story in priority order, then polish. The build ran in this order: monorepo scaffold and contracts; the AI layer; the database; the API skeleton; documents and upload; ingestion; retrieval, chat and usage in the API; UI primitives, shell and auth in the web; web documents, chat and usage; hardening after an independent review; documentation.

## Complexity Tracking

No constitution violations. The deliberate exceptions live inside the principles and are recorded as DEC entries: the service-role client in the ingestion worker, the usage recorder and the readiness probe (DEC-004, DEC-015, DEC-020); zero-padding shorter embeddings into the fixed `vector(1536)` column (DEC-014); and the in-process worker sharing the API's event loop, whose known cost on unbroken CJK text is documented with the planned remedy (DEC-019, DEC-022).
