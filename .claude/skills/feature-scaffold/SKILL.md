---
name: feature-scaffold
description: End-to-end checklist for adding a feature to this monorepo — the Spec Kit run, then contracts, migration, API module, web feature, tests, docs and a DEC entry, in that order. Use when starting a new feature, resource or route family, or when planning or reviewing its tasks.
---

# Feature Scaffold

The order is fixed: contract, schema, API, web, tests, then the decision and docs. The worked example is documents: `packages/contracts/src/documents.ts` → `supabase/migrations/20260929100100_documents.sql` → `apps/api/src/modules/documents/` → `apps/web/features/documents/`.

## 0. Specify

- `/speckit-specify <what and why>` creates `specs/NNN-slug/spec.md` with the next sequential number and points `.specify/feature.json` at it. Then `/speckit-clarify` for open questions, `/speckit-plan` (the Constitution Check lists principles I to X), `/speckit-tasks`, `/speckit-analyze` and `/speckit-implement`. `specs/001-knowledge-base/` is the complete example.
- Work on a `feat/<slug>` branch cut from `develop`.

## 1. Contracts (`packages/contracts/src/<resource>.ts`)

- Input schemas (`create…Schema`; `update…Schema` built from the undefaulted fields), output schemas, a list query extending `paginationQuerySchema`, a list from `paginatedSchema(item)`; types by `z.infer`; `withoutNul` on every stored string; enums as `as const` tuples; new limits in `limits.ts`.
- Paths in `apiRoutes` (`routes.ts`); a new error code only in `errors.ts`, with its status; new stream events in `chatSseEventSchemas` (`chat.ts`).
- Export from `index.ts`, with accept and reject tables in `packages/contracts/__tests__/unit/<resource>.test.ts`.

## 2. Schema (`supabase/migrations/`)

- `pnpm db:new <name>`: table, constraints matching the limits, indexes, RLS policies, explicit grants and functions with `search_path = ''` (the `data-layer` skill). Then `pnpm db:reset`, `pnpm db:types`, and the new relations or functions in `apps/api/src/database/database.constants.ts`.

## 3. API (`apps/api/src/modules/<feature>/`)

- Module, controller, service, repository (`db` first), mapper, types and constants (the `api-conventions` skill); import the module in `apps/api/src/app.module.ts`.
- Unit tests in `apps/api/__tests__/unit/modules/<feature>/`, an in-memory repository in `apps/api/__tests__/fakes/`, a pipeline test `apps/api/__tests__/unit/<feature>.pipeline.test.ts` and a walkthrough in `http/<feature>.http`.
- A new environment variable goes into `.env.example`, `env.schema.ts`, `ENV_DEFAULTS` and `buildAppConfig` together.

## 4. Web (`apps/web/features/<feature>/`)

- `types.ts`, `constants.ts`, `services/<feature>-service.ts`, `lib/<feature>-keys.ts`, `lib/<feature>-strings.ts`, `lib/get-<feature>-view.ts`, hooks, and the `<Feature>Body`, `<Feature>Client`, `<Feature>Skeleton` and `<Feature>Empty` components (the `web-conventions` skill).
- A copy root in `apps/web/messages/en.json`; the path in `apps/web/core/config/routes.ts` (and in `PROTECTED_PREFIXES` for signed-in pages); a nav entry in `apps/web/core/config/navigation.ts` if it needs one; `apps/web/app/(app)/<route>/page.tsx` and `loading.tsx`.
- Tests in `apps/web/__tests__/unit/<feature>/` for every `lib/` function and each interactive component.

## 5. Close

- A new architectural choice appends a `DEC-NNN` entry to `DECISIONS.md`. Update `docs/api.md` (routes, errors, limits), `docs/architecture.md` (behaviour) and `README.md` (features, settings, improvements).
- Tick the tasks in `specs/NNN-slug/tasks.md`, get `pnpm check` green and run `/pr-review`.
- Commit by scope (`feat(contracts)`, `feat(db)`, `feat(api)`, `feat(web)`, `docs(docs)`); push and open the pull request to `develop` only with the maintainer's go-ahead.
