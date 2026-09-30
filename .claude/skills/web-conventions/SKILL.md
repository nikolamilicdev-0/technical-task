---
name: web-conventions
description: How the Next.js app in apps/web is written — tiers, Body/Section/Client components, @kb/ui primitives and tokens, copy from messages/en.json through strings getters, services and React Query keys, the mutation matrix, loading/empty/error states, and tests. Use when writing or reviewing any page, component, hook, service, form or web test.
---

# Web Conventions (`apps/web`)

Next.js 16 App Router with React 19 and no `src/`. Reference features: `features/documents/` (the fullest) and `features/usage/` (the smallest).

## Shape of a page

- **Route file** (`app/(app)/<route>/page.tsx`): `metadata` from `getDictionary()` and a render of the feature's `*Body`; `loading.tsx` renders the same Body with `loading`, so the skeleton always matches. Nothing else lives in `app/`.
- **`*Body.tsx`** (server component): the page shell (`Container`, `PageHeader`), copy from the feature's strings getter, then the `*Client` leaf.
- **`*Client.tsx`** (`'use client'`): reads hooks, switches on the view state and composes sections.
- **`*Section.tsx`**: one titled block of a page. Skeletons are `*Skeleton.tsx`, empty states `*Empty.tsx`.
- One exported PascalCase component per file, about 250 lines at most. The JSX return holds no logic: derive values above it or in `lib/`.

## Copy (lint-enforced)

- Every string, including `aria-label`, `placeholder`, `title`, toasts and errors, lives in `messages/en.json`: `getDictionary()` on the server, `useT()` (`core/i18n/useT.ts`) on the client, and one getter per feature (`features/<x>/lib/<x>-strings.ts`) with helpers built on `interpolate` and `pluralize` (`core/i18n/interpolate.ts`).
- `react/jsx-no-literals` and the copy-attribute rule in `packages/eslint-config/next.js` reject literals in `features/**` and `core/components/**`.
- Error copy is chosen by contract error code through `getErrorMessage` (`core/api/get-error-message.ts`); a 429 interpolates `retryAfter`.

## UI

- Compose `@kb/ui` primitives (`Text`, `Button`, `Flex`, `Grid`, `Container`, `Section`, `Card`, `EmptyState`, `FormField`, `Dialog`, `Menu`, `Tooltip`, `ScrollArea`, `Skeleton`); a `div` with flex or grid classes is a violation. Use tokens only (`bg-surface-container`, `text-on-surface-variant`, `border-outline-variant`, …), logical properties (`ps-*`, `ms-*`, `text-start`) and `motion-safe:`/`motion-reduce:`.
- Icons come from `core/icons/index.ts` (lucide), never inline SVG. Destructive actions confirm through `core/components/dialogs/ConfirmDialog.tsx`, which opens on Cancel (DEC-033).

## Data

- A service (`features/<x>/services/<x>-service.ts`) calls `getApiClient().request(apiRoutes…, { schema })`, so every response is parsed with its contract schema; uploads use `core/api/upload.ts` and chat uses the client's `stream()` (`core/api/client.ts`). A 401 refreshes the session once and retries.
- Query keys come from one factory per feature (`lib/<x>-keys.ts`: `all`, `lists()`, `list(params)`, `details()`, `detail(id)`), never inline arrays.
- Mutation matrix: create sets the detail cache and invalidates `lists()`; update is optimistic on the detail with rollback and field errors applied to the form (`applyFieldErrors` in `core/api/form-errors.ts`); delete removes optimistically from lists; uploads and new conversations invalidate lists; a finished answer is committed to the conversation detail and invalidates the conversation lists and `usageKeys.all`.
- Poll only while needed (`features/documents/lib/get-refetch-interval.ts`: every 3 s while anything indexes); stale times live in `core/config/query.ts` or the feature's constants.
- Forms use React Hook Form with `useZodResolver(schema)` (`core/forms/useZodResolver.ts`). Forms that post to the API use the contract schema; the auth forms use `features/auth/schema.ts` because sign-in talks to Supabase Auth directly.
- Links and redirects come from `routes` (`core/config/routes.ts`). While a stream is open the chat URL changes with `history.replaceState`, never `router.push` (DEC-029).

## States

- Each view has a pure `lib/get-<x>-view.ts` (`loading`, `error`, `empty`, `noMatches`, `results`, …) that its Client switches on; loaded data wins over a failed background refetch.
- Failed queries render `ErrorState` with `onRetry`, unknown or foreign ids render `NotFoundState`, and `app/error.tsx` and `app/(app)/error.tsx` catch the rest; mutation outcomes are `toast` calls (sonner).

## Tests

- In `__tests__/unit/<feature>/`, every `lib/` function gets a table test. Components render through `renderWithProviders` (`__tests__/helpers/render.tsx`, with the real dictionary) and `@testing-library/user-event`; hooks get a fresh `QueryClient` with retries off.
- Fixtures live in `__tests__/fixtures/`, never in product code. Run `pnpm --filter web test` or `pnpm --filter web exec vitest run <pattern>`.
