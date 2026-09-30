# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  Fixed by the repository (constitution, Platform Constraints): do not re-litigate per feature.
  Fill only the feature-specific entries from "Contracts Touched" down; mark unknowns
  NEEDS CLARIFICATION.
-->

**Language/Version**: TypeScript `~6.0.3` (strict) on Node 22 LTS; pnpm 12.6 workspaces and Turborepo 2.11

**Primary Dependencies**: Next.js 16 App Router, React 19.3, Tailwind CSS 4.3, TanStack Query 5 and React Hook Form (web); NestJS 12 as ESM (API); zod 4 in `@kb/contracts`; the OpenAI SDK behind the `@kb/ai` ports; `@kb/ui` primitives (Radix, CVA)

**Storage**: Supabase Postgres 17 with pgvector (HNSW, cosine) and RLS on every table; schema only through `supabase/migrations/`

**Testing**: Vitest 4 in each package's `__tests__/unit/` (node for API, contracts and AI; jsdom and Testing Library for web and UI); API pipeline tests with in-memory repositories and fake AI models

**Target Platform**: evergreen browsers; Node 22 server (web on :3000, API on :4000)

**Project Type**: web application in a Turborepo monorepo: `apps/web`, `apps/api`, shared `packages/*`

**Contracts Touched**: [schemas, routes or SSE events added or changed in `@kb/contracts`, or "none"]

**Data Changes**: [new migrations: tables, columns, functions, policies, grants; or "none"]

**AI Usage**: [provider calls added (chat, embedding, rewrite) and how they are metered, or "none"]

**Performance Goals**: [domain-specific, or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g. limits shared by contracts and SQL checks, or NEEDS CLARIFICATION]

**Scale/Scope**: [modules and files touched, or NEEDS CLARIFICATION]

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Derived from `.specify/memory/constitution.md` v1.0.0. Every item must be checked, or the deviation recorded in Complexity Tracking:

- [ ] **I. Contracts First**: every new DTO, route, event and limit is a zod schema or constant in `@kb/contracts` with accept and reject tests; types are inferred; API and web import the same schema.
- [ ] **II. RLS boundary**: user requests use the caller's client (`db` first in repositories); no new service-role use without a DEC; new tables get RLS policies, explicit grants and `search_path = ''` functions; foreign ids answer 404.
- [ ] **III. Provider-agnostic AI**: `apps/*` use only the `ChatModel` and `EmbeddingModel` ports; provider behaviour lives in a profile or adapter in `@kb/ai`; configuration only through `AI_*`; embedding signatures respected.
- [ ] **IV. Durable ingestion**: no application write to `embedding_status`; ingestion never awaited on a request path; new failure kinds classified and tested.
- [ ] **V. Web tiers**: thin `app/` routes; imports flow `features/` → `core/` → `@kb/ui`; all copy in `messages/en.json` through strings getters; `Body`/`Section`/`Client` naming; one component per file, about 250 lines at most.
- [ ] **VI. Primitives and tokens**: `@kb/ui` primitives over raw tags; theme tokens only; logical properties; icons through `core/icons`; accessible dialogs and scroll regions.
- [ ] **VII. States**: every new data view has loading, empty and error states from a pure `get-*-view` function, a `loading.tsx` per route and no mock data.
- [ ] **VIII. Gates**: unit tests for every non-trivial pure function, a pipeline test for every new HTTP surface, fakes for every boundary, comments of at most two lines; `pnpm check` green is the exit criterion.
- [ ] **IX. Decision log**: the DEC entries the plan relies on are cited; each new architectural choice gets a DEC entry in the same change.
- [ ] **X. Commits and flow**: conventional commits with a known scope; a feature branch cut from `develop`; a pull request with CI green.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

<!--
  This repository has a fixed layout. Keep only the paths this feature actually touches and expand
  them with concrete file names. The delivered plan must list real paths, not placeholders.
-->

```text
packages/contracts/src/<resource>.ts             # zod schemas, inferred types, limits, apiRoutes entries
packages/contracts/__tests__/unit/<resource>.test.ts
supabase/migrations/<timestamp>_<name>.sql       # `pnpm db:new <name>`, then `pnpm db:types`
apps/api/src/database/database.types.ts          # generated; never hand-edited
apps/api/src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts                      # thin: @CurrentUser + ZodBody / ZodQuery / ZodParam
├── <feature>.service.ts                         # orchestration; ApiHttpException for expected failures
├── <feature>.repository.ts                      # Supabase queries; `db` is the first argument
├── <feature>.mapper.ts                          # rows → contract DTOs; snake_case stops here
└── <feature>.types.ts · <feature>.constants.ts
apps/api/__tests__/unit/modules/<feature>/*.test.ts
apps/api/__tests__/unit/<feature>.pipeline.test.ts
apps/web/app/(app)/<route>/{page,loading}.tsx    # thin route files
apps/web/features/<feature>/
├── components/                                  # <Feature>Body, <Feature>Client, <Feature>Section, skeletons
├── hooks/                                       # React Query hooks
├── lib/                                         # <feature>-keys, <feature>-strings, get-<feature>-view, pure logic
├── services/<feature>-service.ts                # apiRoutes + contract schemas through core/api
└── types.ts · constants.ts
apps/web/messages/en.json                        # every new user-facing string
apps/web/__tests__/unit/<feature>/*.test.ts(x)
DECISIONS.md · docs/api.md · docs/architecture.md · .env.example
```

**Structure Decision**: [List the real files this feature adds or changes and, if anything lands outside the tiers above, why]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
