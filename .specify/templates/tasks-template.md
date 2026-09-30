---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Per constitution Principle VIII, every non-trivial pure function gets Vitest unit tests in its package's `__tests__/unit/`, every new API route an in-process pipeline test, and every external boundary a fake; thin composition does not need tests. Include test tasks accordingly, not only when the spec asks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This repository has a fixed layout; take exact paths from plan.md:

- **Contracts**: `packages/contracts/src/<resource>.ts` with tests in `packages/contracts/__tests__/unit/`; always the first task that touches a DTO, route, event or limit
- **Database**: a new file in `supabase/migrations/` (`pnpm db:new <name>`), then `pnpm db:types` regenerates `apps/api/src/database/database.types.ts`; applied migrations are never edited
- **API**: `apps/api/src/modules/<feature>/` (module, controller, service, repository, mapper, types, constants); tests in `apps/api/__tests__/unit/modules/<feature>/` plus `<feature>.pipeline.test.ts`
- **AI**: `packages/ai/src/` (ports, profiles, adapters, factory); apps use only the ports
- **Web**: thin routes in `apps/web/app/`; feature code in `apps/web/features/<feature>/` (components, hooks, lib, services, types, constants); copy in `apps/web/messages/en.json`; tests in `apps/web/__tests__/unit/<feature>/`
- **UI primitives**: `packages/ui/src/components/` only for business-free building blocks

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Add the feature's schemas, inferred types and limits in packages/contracts/src/[resource].ts and export them from packages/contracts/src/index.ts
- [ ] T002 [P] Add accept and reject tables in packages/contracts/**tests**/unit/[resource].test.ts
- [ ] T003 [P] Add route builders to apiRoutes in packages/contracts/src/routes.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Add the migration (table, RLS policies, explicit grants, functions with search_path = '') in supabase/migrations/[timestamp]_[name].sql
- [ ] T005 Regenerate apps/api/src/database/database.types.ts with pnpm db:types
- [ ] T006 [P] Add any new environment variable to .env.example and apps/api/src/config/env.schema.ts together
- [ ] T007 [P] Add the feature's copy root to apps/web/messages/en.json and its strings getter in apps/web/features/[feature]/lib/[feature]-strings.ts
- [ ] T008 Record the architectural decision as a new DEC entry in DECISIONS.md
- [ ] T009 Add the query-key factory in apps/web/features/[feature]/lib/[feature]-keys.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (required for non-trivial logic: Principle VIII) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Unit test for [pure function] in apps/api/**tests**/unit/modules/[feature]/[name].test.ts
- [ ] T011 [P] [US1] Pipeline test for [route] in apps/api/**tests**/unit/[feature].pipeline.test.ts

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implement the repository (db first) and mapper in apps/api/src/modules/[feature]/
- [ ] T013 [US1] Implement the service and the thin controller in apps/api/src/modules/[feature]/ (depends on T012)
- [ ] T014 [P] [US1] Implement the web service and React Query hooks in apps/web/features/[feature]/services/ and hooks/
- [ ] T015 [US1] Build the Body, Client and skeleton components in apps/web/features/[feature]/components/
- [ ] T016 [US1] Derive loading, empty and error states in apps/web/features/[feature]/lib/get-[feature]-view.ts
- [ ] T017 [US1] Add the thin route files in apps/web/app/(app)/[route]/page.tsx and loading.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (required for non-trivial logic: Principle VIII) ⚠️

- [ ] T018 [P] [US2] Unit test for [pure function] in apps/web/**tests**/unit/[feature]/[name].test.ts
- [ ] T019 [P] [US2] Component test for [form or list] in apps/web/**tests**/unit/[feature]/[Component].test.tsx

### Implementation for User Story 2

- [ ] T020 [P] [US2] Extend the contract in packages/contracts/src/[resource].ts
- [ ] T021 [US2] Extend the API module in apps/api/src/modules/[feature]/
- [ ] T022 [US2] Implement [component] in apps/web/features/[feature]/components/
- [ ] T023 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (required for non-trivial logic: Principle VIII) ⚠️

- [ ] T024 [P] [US3] Unit test for [pure function] in apps/api/**tests**/unit/modules/[feature]/[name].test.ts
- [ ] T025 [P] [US3] Pipeline test for [route] in apps/api/**tests**/unit/[feature].pipeline.test.ts

### Implementation for User Story 3

- [ ] T026 [P] [US3] Extend the repository and mapper in apps/api/src/modules/[feature]/
- [ ] T027 [US3] Extend the service in apps/api/src/modules/[feature]/
- [ ] T028 [US3] Implement [component] in apps/web/features/[feature]/components/

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Update docs/api.md, docs/architecture.md and README.md for every new route, event or setting
- [ ] TXXX [P] Additional unit tests for edge cases in the owning package's **tests**/unit/
- [ ] TXXX Audit the web feature: primitives over raw tags, tokens only, no copy in JSX, one component per file of about 250 lines at most
- [ ] TXXX Confirm RLS: another user's ids answer 404 and no new service-role use lacks a DEC entry
- [ ] TXXX Run pnpm check (format, lint, typecheck, test, build)
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests for pure logic are written first and FAIL before implementation
- Contracts before migrations, migrations before repositories
- Repositories and mappers before services, services before controllers
- API before web; web services and hooks before components
- Story complete (and `pnpm check` green) before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Unit test for [pure function] in apps/api/__tests__/unit/modules/[feature]/[name].test.ts"
Task: "Pipeline test for [route] in apps/api/__tests__/unit/[feature].pipeline.test.ts"

# Launch all models for User Story 1 together:
Task: "Implement the repository and mapper in apps/api/src/modules/[feature]/"
Task: "Implement the web service and hooks in apps/web/features/[feature]/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
