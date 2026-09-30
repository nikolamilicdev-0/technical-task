# AGENTS.md

Contributor guide for humans and coding agents. Read it before changing code; `DECISIONS.md` explains why things are the way they are, and `docs/architecture.md` how they work.

## Commands

| Command                                                                  | Purpose                                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `pnpm bootstrap [--local \| --hosted \| --skip-db] [--yes]`              | One-shot setup: install, create `.env`, configure Supabase, build packages (`--help` lists every flag) |
| `pnpm dev` · `pnpm dev:web` · `pnpm dev:api`                             | Web on :3000, API on :4000, internal packages rebuilt in watch mode; or one app and its dependencies   |
| `pnpm check`                                                             | **Definition of done**: format check, lint, typecheck, unit tests, build                               |
| `pnpm lint` · `pnpm typecheck` · `pnpm test`                             | Individual gates (turbo, cached)                                                                       |
| `pnpm format`                                                            | Apply Prettier                                                                                         |
| `pnpm --filter api test` · `pnpm --filter api exec vitest run <pattern>` | One package's task · test files matching a pattern                                                     |
| `pnpm db:new <name>`                                                     | Create a migration in `supabase/migrations`                                                            |
| `pnpm db:reset` · `pnpm db:migrate` · `pnpm db:types`                    | Rebuild the local database · apply pending migrations · regenerate database types                      |

## Layout

- `apps/web`: Next.js 16 App Router, no `src/`. Tiers: `app/` (thin route files) → `features/*` → `core/*` → `@kb/ui`.
- `apps/api`: NestJS 12 (ESM). Controllers → services → repositories → mappers; snake_case never leaves a repository.
- `packages/contracts`: zod DTOs, `apiRoutes`, SSE events, limits and error codes: the single source of truth.
- `packages/ai`: provider-agnostic chat/embedding ports, provider profiles, the OpenAI-compatible adapter and test fakes.
- `packages/ui`: React primitives and the Tailwind v4 theme tokens (`@kb/ui/theme.css`).
- `packages/eslint-config`, `packages/typescript-config`: shared lint and compiler presets.
- `supabase/migrations`: schema, RLS policies, grants, ingestion and search functions.
- `scripts/`: dependency-free `bootstrap` and `db:*` scripts. `http/`: REST Client walkthroughs. `docs/`: API reference, architecture notes, Loom outlines.

## Rules

1. Contracts first: change `@kb/contracts`, then the API, then the web. Types are `z.infer`-ed, never hand-written.
2. Never hand-edit `apps/api/src/database/database.types.ts`; regenerate it with `pnpm db:types`.
3. Never edit an applied migration; add a new one with `pnpm db:new`.
4. A new env var touches `.env.example` and, in `apps/api/src/config/`, `env.schema.ts`, `ENV_DEFAULTS` and `buildAppConfig` (`AI_*` ones: `packages/ai/src/config/ai-env.schema.ts`); if the web build reads it, also `apps/web/turbo.json`. Drift tests compare `.env.example` with the schemas.
5. RLS is the security boundary: repositories take the user-scoped client as their first argument. The service-role client belongs to the ingestion worker, the usage recorder and the readiness probe; any other use needs a DEC entry.
6. Web tiers are lint-enforced: `core/` never value-imports `features/`, nothing imports `app/`, and JSX copy comes from `messages/en.json`.
7. Nest: never `import type` a class that is injected (decorator metadata would become `Object`); relative imports end in `.js`.
8. Unit tests live in each package's `__tests__/unit/` and cover every non-trivial pure function; external boundaries use fakes.
9. Comments: at most two lines, only for non-obvious constraints; never restate the code.
10. No `any`; name every constant; one exported component per file, about 250 lines at most.
11. Conventional commits (`type(scope): subject`; scopes in `commitlint.config.mjs`). Husky runs lint-staged and commitlint.
12. Record architectural choices in `DECISIONS.md`: append a new `DEC-NNN`, never rewrite an old one.

## Gotchas

- Internal packages run from `dist/` but are typed from `src/`. During `pnpm dev` the API can restart before `@kb/contracts` re-emits; save again.
- `lint`, `typecheck` and `test` depend on turbo's `transit` node rather than `^build`: they run in parallel yet re-run when a dependency changes.
- The API reads `.env` once at boot; restart it after editing. `.env.example` sets OpenAI model names, so blank them when switching providers.
- pnpm 12 holds back versions younger than its release-age window; the exemptions it writes to `pnpm-workspace.yaml` name exact versions.
- The Prettier Tailwind plugin only applies to `apps/web` and `packages/ui` (see `.prettierrc` overrides). This file is excluded from Prettier.
- `next.config.ts` sets `agentRules: false`, so `next dev` does not write its own `AGENTS.md` into the app.

## Environment

- One root `.env` (copied from `.env.example` by `pnpm bootstrap`) serves both apps; it is never committed or printed.
- The web derives its `NEXT_PUBLIC_*` values in `next.config.ts`; never give the secret key a public name.
- CI runs without `.env` or provider keys: every external boundary has a fake in tests.

## Before you finish

- `pnpm check` is green.
- New behaviour has unit tests; new user-facing copy lives in `messages/en.json`.
- `.env.example`, `README.md`, `docs/` and `DECISIONS.md` reflect any new setting, route, event or decision.
- Never push, open a pull request or create a remote repository without the maintainer's explicit go-ahead.
