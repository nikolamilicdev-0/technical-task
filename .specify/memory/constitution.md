<!--
Sync Impact Report
- Version change: none (template) → 1.0.0 (initial ratification for the AI Knowledge Base monorepo)
- Principles: I–X added (first version; nothing renamed or removed)
- Added sections: Core Principles, Platform Constraints, Development Workflow, Governance
- Removed sections: none
- Templates aligned:
  - .specify/templates/plan-template.md: aligned (fixed Technical Context; Constitution Check lists
    principles I–X by number)
  - .specify/templates/spec-template.md: aligned (questions every spec of this product answers)
  - .specify/templates/tasks-template.md: aligned (path conventions, test policy, polish gates)
  - .specify/templates/checklist-template.md: unchanged (generic)
- Runtime guidance kept in step: AGENTS.md, CLAUDE.md, .claude/skills/*
- Deferred TODOs: none
-->

# AI Knowledge Base Constitution

A Turborepo monorepo in which users keep documents and ask questions that are answered from those
documents with citations: a Next.js web app, a NestJS API, Supabase (Postgres, pgvector, Auth) and a
provider-agnostic AI layer. This constitution is the authority the Spec Kit gates enforce.
`AGENTS.md` is the day-to-day operating guide and `DECISIONS.md` records why things are the way they
are; when either disagrees with this document, this document wins and the other is updated in the
same change.

## Core Principles

### I. Contracts First (NON-NEGOTIABLE)

Every DTO, query schema, route path, SSE event, limit and error code lives in `@kb/contracts`
(`packages/contracts/src`) as a zod 4 schema or an `as const` value.

- TypeScript types are `z.infer`-ed from the schemas. A hand-written DTO type or a repeated limit
  literal is a defect.
- A change starts in the contract, then the API, then the web. The API validates each request part
  with the same schema object the web form uses (`ZodBody`, `ZodQuery` and `ZodParam` on the API,
  `useZodResolver` on the web), and the web parses every API response with its contract schema.
- Paths come from `apiRoutes` (API and web) and `routes` (web pages); no inline path literals.
- Limits the database also enforces (title, content, tag count, conversation title) are repeated as
  SQL check constraints and are never loosened on one side only.
- Every schema has accept and reject unit tests in `packages/contracts/__tests__/unit/`.

**Rationale**: one schema object on both sides makes client and server drift impossible and turns
every boundary into a typed, tested surface (DEC-002).

### II. Row-Level Security Is the Security Boundary (NON-NEGOTIABLE)

Postgres row-level security, not application code, decides what a user can see or change.

- Every user request runs through a per-request Supabase client built from the publishable key and
  the caller's JWT (`SupabaseClientFactory.forUser`). Repository methods take that client, `db`, as
  their first argument, so the data path is visible in every signature.
- The service-role client is confined to the ingestion worker, the usage recorder and the readiness
  probe. Any other use requires a new DEC entry first (DEC-004, DEC-015).
- Every table enables RLS with `user_id = (select auth.uid())` policies. Grants are explicit per role
  and per column: users never write ingestion bookkeeping, chunks or usage rows, and messages are
  immutable. Every SQL function pins `search_path = ''`, and worker functions are executable by
  `service_role` alone.
- Another user's row is indistinguishable from a missing one: the API answers 404, never 403.
- JWTs are verified with `supabase.auth.getClaims` behind the `JwtVerifier` port; only
  `role: authenticated` tokens with a subject pass. The secret key never gets a `NEXT_PUBLIC_` name.

**Rationale**: a forgotten `where user_id = …` then returns fewer rows instead of leaking another
user's data, and column privileges keep system state out of users' reach.

### III. Provider-Agnostic AI Behind Ports

Application code depends on the `@kb/ai` ports, never on a provider SDK.

- `ChatModel` (`complete`, `stream`) and `EmbeddingModel` (`embed`, `signature`) are the only AI
  types `apps/*` use. Nest binds them to the `CHAT_MODEL` and `EMBEDDING_MODEL` tokens, and adapters
  throw only `AiProviderError`, whose neutral codes drive retries and HTTP statuses.
- A provider is a row in the profile table (`packages/ai/src/providers/provider-profiles.ts`) served
  by the one OpenAI-compatible adapter; `createAiClients` is the only place that picks an adapter. A
  provider with its own wire protocol adds an adapter class and one factory `case`, and nothing in
  `apps/*` changes.
- Chat and embeddings are configured independently through `AI_CHAT_*` and `AI_EMBEDDING_*`
  variables. Swapping a provider is a configuration change and an API restart, never a code change.
- Vector spaces never mix: every chunk records its embedding signature (`model` or `model#dims`),
  retrieval filters by the current one, the worker re-indexes other signatures, and the
  `vector(1536)` column changes only through a migration (DEC-014).
- An incomplete AI configuration degrades (stand-in models, `ai: unconfigured` in readiness) instead
  of stopping the API. Deterministic fakes (`FakeChatModel`, `FakeEmbeddingModel`) back every test.

**Rationale**: most providers speak the OpenAI wire protocol, so one adapter plus per-profile quirks
covers them, and the ports keep the rest of the system unaware of which one is in use (DEC-003).

### IV. Durable Ingestion on Postgres

Indexing is a durable job whose queue is the `documents` table itself.

- `documents.embedding_status` (`pending → processing → ready | failed`) is the queue. Only the
  `documents_before_write` trigger and the ingestion SQL functions change it; application code never
  writes it, and users re-queue through `requeue_documents` (DEC-005).
- The worker claims with `FOR UPDATE SKIP LOCKED`, recovers stale claims, retries transient failures
  with capped exponential backoff and fails permanent ones for good (`classifyIngestionFailure`).
  Every write re-checks the claimed content hash and attempt under a row lock (DEC-018, DEC-023).
- Chunks are keyed by content hash, so a re-index embeds only changed passages, and finalizing
  publishes exactly the run's chunk set.
- Ingestion is never awaited on a request path: services emit `DOCUMENT_INGESTION_REQUESTED` or wake
  the worker. Chunking stays linear on hostile input, proven by adversarial tests within a time
  budget (DEC-019).

**Rationale**: the queue survives restarts and is safe with several API instances without extra
infrastructure, and no code path can change content without re-indexing it.

### V. Tiered Web Architecture, Lint-Enforced

The web app (`apps/web`, no `src/`) is layered `app/` → `features/*` → `core/*` → `@kb/ui`, and ESLint
enforces the layers (`packages/eslint-config/next.js`).

- `app/` holds only thin route files (metadata, gating, composition); `core/` never value-imports
  `features/`; nothing imports `app/`.
- Every user-facing string, including `aria-label`, `placeholder` and `title` attributes, comes from
  `apps/web/messages/en.json`: `getDictionary()` on the server, `useT()` on the client and a strings
  getter per feature (`features/<x>/lib/<x>-strings.ts`). `react/jsx-no-literals` rejects hardcoded
  copy in `features/**` and `core/components/**`.
- Server components gate, load copy and render the shell. Data lives in React Query hooks inside
  `*Client.tsx` leaves, with one query-key factory per feature (`features/<x>/lib/<x>-keys.ts`) and
  services that call `apiRoutes` through `core/api`.
- One exported PascalCase component per file, about 250 lines at most, named by role: `*Body` for a
  route's composition, `*Section` for a block of a page, `*Client` for an interactive leaf. No logic
  in JSX returns; types live in `types.ts`, named constants in `constants.ts`, pure logic in `lib/`.

**Rationale**: uniform placement keeps the app navigable as it grows, and making the boundaries lint
errors keeps them from eroding under deadline pressure.

### VI. Shared UI Primitives and Design Tokens

New UI is composed from `@kb/ui` (`packages/ui/src`) and styled only with its tokens.

- `Text`, `Button`, `Flex`, `Grid`/`GridItem`, `Container`, `Section`, `Card`, `EmptyState`,
  `FormField`, `Dialog`, `Menu`, `Tooltip`, `ScrollArea` and `Skeleton` replace raw tags; a `div`
  with a flex or grid class outside `@kb/ui` is a violation. Semantic elements without a primitive
  (`form`, `table`) are allowed, and the text inside them still goes through `Text`.
- Colours, radii and fonts come from `@kb/ui/theme.css` (Material 3 role names resolved with
  `light-dark()`); raw colour values exist only in that file. Utilities use logical properties
  (`ps-*`, `ms-*`, `text-start`) and respect reduced motion.
- Class names are static maps inside the primitives, never assembled from template strings. Icons
  come from `lucide-react` through `apps/web/core/icons`, never inline SVG. Only the Radix-wrapping
  primitives are client components.
- Dialogs restore focus, destructive confirmations open on Cancel, and scroll regions that hold
  primary content are named and focusable (DEC-033).

**Rationale**: the primitives carry accessibility, theming and dark mode once; bypassing them forks
the UI.

### VII. Explicit Loading, Empty and Error States

No data-driven surface shows a blank frame or fails silently.

- Every route has a `loading.tsx` that renders the skeleton its client leaf shows while fetching;
  route groups keep a list's loading screen off its sibling routes (DEC-034).
- Each view derives its state (`loading`, `error`, `empty`, `noMatches`, `results`, …) in a pure,
  tested `lib/get-*-view.ts` function, and loaded data wins over a failed background refetch.
- Failed queries render `ErrorState` with a retry, unknown ids render `NotFoundState`, `error.tsx`
  boundaries exist at the root and in `(app)`, and mutation outcomes are toasts. Error copy is chosen
  by contract error code (`getErrorMessage`), and a 429 says when to try again.
- Product code never ships mock or placeholder data: nothing to show means the designed empty state.

**Rationale**: perceived quality depends on every frame being intentional, and honest states make
failures recoverable instead of confusing.

### VIII. Quality Gates and Tests

`pnpm check` is the definition of done and runs what CI runs: format check, lint, typecheck, unit
tests and build.

- Every non-trivial pure function has Vitest unit tests in its package's `__tests__/unit/`. Every
  HTTP surface of the API is driven in-process by a pipeline test (`app.setup.test.ts` and
  `*.pipeline.test.ts` in `apps/api/__tests__/unit/`), and component tests cover forms, the composer
  and message rendering.
- External boundaries have fakes (AI models, repositories, the JWT verifier, the OpenAI client), so
  tests and CI run without keys, Docker or network.
- Comments are at most two lines and only state non-obvious constraints; they never restate the
  code. No `any`, every constant is named, and `database.types.ts` is generated, never hand-edited.
- A change that fails a gate is not finished, and a gate is never weakened to let a change pass.

**Rationale**: gates are cheap and catch drift early; during the build they caught a zod default
that wiped tags, a Turborepo cache blind to dependency changes and quadratic regular expressions.

### IX. Append-Only Decision Log

`DECISIONS.md` records every architectural choice as a `DEC-NNN` entry with **Decision**, **Why** and
**How to apply**.

- Entries are never edited or deleted. A changed decision gets a new entry that names the one it
  supersedes or amends.
- A plan cites the entries it relies on. A change that contradicts an entry, uses the service-role
  client in a new place or upgrades a pinned major version adds an entry in the same change.
- Specs, plans and research link entries instead of restating their reasoning.

**Rationale**: the next contributor, human or agent, needs to know what was rejected and why, so
settled questions stay settled.

### X. Conventional Commits and Git Flow

History stays readable, and every change reaches `main` through review.

- Commits follow Conventional Commits, `type(scope): subject`, with the scopes in
  `commitlint.config.mjs` (`repo`, `web`, `api`, `contracts`, `ai`, `ui`, `db`, `ci`, `docs`,
  `deps`); husky runs lint-staged and commitlint on every commit.
- Branches follow git flow: `main` holds released history, `develop` integrates, and work happens on
  `feature/<slug>`, `fix/<slug>`, `docs/<slug>` or `chore/<slug>` branches cut from `develop`. Changes
  land through pull requests with CI green; nobody commits directly to `develop` or `main`.
- A spec directory name (`specs/NNN-slug`) is independent of the branch name.
- Pushing, opening or merging a pull request and creating a remote happen only with the
  maintainer's explicit go-ahead; a shared branch is never force-pushed.

**Rationale**: small, typed commits on reviewed branches keep `main` releasable and make history
searchable by area.

## Platform Constraints

- Tooling: Node 22 LTS (`.nvmrc`, `engines.node >=22.22.0`), pnpm 12.6 workspaces with a version
  catalog in `pnpm-workspace.yaml`, Turborepo 2.11, TypeScript `~6.0.3` (DEC-001, DEC-012).
- Web: Next.js 16 App Router with `proxy.ts`, React 19.3, Tailwind CSS 4.3 (CSS-first), TanStack
  Query 5, React Hook Form with zod resolvers.
- API: NestJS 12 as native ESM. Relative imports end in `.js`, and a class that is injected is never
  imported with `import type`.
- Data: Supabase with Postgres 17, pgvector (HNSW, cosine) and Auth. The schema changes only through
  timestamped migrations in `supabase/migrations/`; an applied migration is never edited (DEC-011).
- Configuration: one root `.env` read by both apps (DEC-010) and validated at boot by the API's zod
  env schema (DEC-016). `.env.example` and the schemas change together, and drift tests hold them
  equal.
- Ports: web 3000, API 4000, Supabase API 54321, Postgres 54322, Studio 54323.

## Development Workflow

- Non-trivial features follow Spec Kit: `/speckit-specify`, `/speckit-clarify` when questions remain,
  `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`, then `/speckit-implement`; `/speckit-checklist`
  and `/speckit-converge` are optional quality passes. Artefacts live in `specs/NNN-slug/`, and the
  machine-local `.specify/feature.json` points the commands at the active feature.
- Every plan passes the Constitution Check before Phase 0 research and again after Phase 1 design.
  An unjustified violation blocks implementation; a justified one is recorded in the plan's
  Complexity Tracking table.
- Implementation follows `AGENTS.md` and the project skills in `.claude/skills/`
  (`project-architecture`, `api-conventions`, `web-conventions`, `data-layer`, `ai-provider-layer`,
  `feature-scaffold`).
- Inside a feature the order is: contracts, migration and generated types, API module, web feature,
  tests, then the DEC entry and docs. A task is done when its checkbox is ticked and `pnpm check` is
  green.
- Before a pull request, the diff gets an independent review (`/pr-review` checks the house rules),
  and every finding is fixed or recorded.

## Governance

- This constitution supersedes other practice documents for spec-driven work. `AGENTS.md`,
  `CLAUDE.md` and the project skills must agree with it.
- An amendment is a pull request that changes this file, prepends a Sync Impact Report and realigns
  the dependent templates (`plan`, `spec`, `tasks`) and the runtime guidance in the same change.
- Versions follow semantic versioning: MAJOR for a removed or redefined principle, MINOR for a new
  principle or materially expanded guidance, PATCH for clarifications.
- Compliance is checked at the Constitution Check gate of `/speckit-plan` and in the review of the
  resulting pull request. A deviation is recorded in the plan's Complexity Tracking table with the
  simpler alternative and why it was rejected; a lasting deviation becomes a DEC entry.

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
