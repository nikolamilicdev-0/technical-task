---
name: project-architecture
description: Where code belongs in this Turborepo — the two apps, the five shared packages, the web tiers and the API layers. Use when creating a file, deciding where code goes, adding a package or dependency, moving modules, or reviewing structure and imports.
---

# Project Architecture

Two apps and five packages, with one direction of dependency: `apps/*` import `packages/*`, never the reverse. The constitution (`.specify/memory/constitution.md`) and `AGENTS.md` are the rules; `DECISIONS.md` is the why.

| Path                         | Package                 | Holds                                                                        | Test for placement                                   |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/contracts`         | `@kb/contracts`         | zod schemas and inferred types, `apiRoutes`, SSE events, limits, error codes | Must the web and the API agree on it?                |
| `packages/ai`                | `@kb/ai`                | `ChatModel`/`EmbeddingModel` ports, provider profiles, the adapter, fakes    | Does it know which AI provider is in use?            |
| `packages/ui`                | `@kb/ui`                | React primitives (Radix, CVA) and `theme.css` tokens                         | Could another product use it unchanged?              |
| `packages/eslint-config`     | `@kb/eslint-config`     | ESLint 10 flat configs; `next.js` enforces web tiers and copy                | Lint policy only                                     |
| `packages/typescript-config` | `@kb/typescript-config` | tsconfig presets (base, nestjs, nextjs, node-library, react-library)         | Compiler policy only                                 |
| `apps/api`                   | `api`                   | NestJS 12 ESM: REST and SSE, ingestion worker, usage recorder                | Server behaviour behind `/api`                       |
| `apps/web`                   | `web`                   | Next.js 16 App Router, no `src/`                                             | Anything the browser renders                         |
| `supabase/`                  |                         | `config.toml` and timestamped `migrations/`                                  | Schema, policies, grants, SQL functions              |
| `scripts/`                   |                         | dependency-free `pnpm bootstrap` and `db:*` scripts                          | Must run before `pnpm install`                       |
| `specs/`, `.specify/`        |                         | Spec Kit feature runs, constitution, templates, scripts                      | Process artefacts, one `specs/NNN-slug/` per feature |

## Web tiers (lint errors, `packages/eslint-config/next.js`)

`app/` → `features/<feature>/` → `core/` → `@kb/ui`.

- `app/`: route files only (`page`, `layout`, `loading`, `error`), each composing a feature's `*Body`.
- `features/<feature>/`: code owned by one route family: `components/`, `hooks/`, `lib/`, `services/`, `types.ts`, `constants.ts`.
- `core/`: app-wide pieces used by two or more features or by the shell: `api/`, `auth/`, `config/`, `i18n/`, `forms/`, `providers/`, `components/{shell,states,markdown,dialogs}`, `icons/`, `utils/`.
- `core/` never value-imports `features/`, and nothing imports `app/`; type-only imports are allowed.

## API layers

Per module in `apps/api/src/modules/<feature>/`: controller → service → repository → mapper (see the `api-conventions` skill). Cross-cutting code lives beside the modules: `src/common/` (errors, validation, http, auth decorators, utils), `src/database/`, `src/auth/`, `src/ai/`, `src/config/`, `src/throttling/`.

## Hard rules

- Put code in the most specific home: feature, then `core/`, then a package. Promote it only when a second real consumer appears.
- `@kb/contracts` and `@kb/ai` compile to `dist/` with types served from `src/`; `@kb/ui` ships source (`transpilePackages`, `@source` in `apps/web/app/globals.css`). A new runtime package copies the `@kb/contracts` scripts (DEC-001).
- Shared dependency versions live in the catalog in `pnpm-workspace.yaml` and are referenced as `catalog:`.
- One root `.env` (DEC-010). A new variable touches `.env.example` plus `apps/api/src/config/env.schema.ts`, `ENV_DEFAULTS` and `buildAppConfig`, or `packages/ai/src/config/ai-env.schema.ts` for `AI_*`; a variable the web build reads also goes into `apps/web/turbo.json`.
- Tests live in each package's `__tests__/unit/`, mirroring `src/`. Fakes live in test folders or `packages/ai/src/testing/`; product code never contains mock data.
- One exported component or class per file; comments of at most two lines, only for non-obvious constraints.

## Where to read first

`docs/architecture.md` (how it works), `docs/api.md` (the HTTP contract), `specs/001-knowledge-base/` (spec, plan, data model, contracts, tasks), `DECISIONS.md` (DEC-001 to DEC-034).
