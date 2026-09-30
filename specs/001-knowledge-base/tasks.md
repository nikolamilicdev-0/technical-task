---
description: 'Task list for the AI-Powered Knowledge Base'
---

# Tasks: AI-Powered Knowledge Base

**Input**: Design documents from `/specs/001-knowledge-base/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, contracts/sse-stream.md, quickstart.md

**Tests**: Constitution Principle VIII makes tests part of the deliverable. Every non-trivial pure module has unit tests in its package's `__tests__/unit/`, every API route is driven over HTTP by a pipeline test, and every external boundary has a fake, so each story's test task lands with its implementation.

**Organization**: grouped by user story in priority order. US1 to US4 (P1) are the minimum viable knowledge base; US5 to US7 (P2) and US8 (P3) build on it. The Foundational phase holds everything two or more stories share: the contract primitives, the AI layer, the database baseline, and the API and web skeletons.

**Status**: every task is complete; the paths are the files as they exist in the repository.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 to US8 from spec.md
- Every task names its files

## Path Conventions

Fixed layout, taken from plan.md: contracts in `packages/contracts/src/`, the AI layer in `packages/ai/src/`, primitives in `packages/ui/src/`, schema in `supabase/migrations/`, API modules in `apps/api/src/modules/<feature>/`, web features in `apps/web/features/<feature>/` with thin routes in `apps/web/app/`, copy in `apps/web/messages/en.json`, and tests in each package's `__tests__/unit/`.

---

## Phase 1: Setup

**Purpose**: the workspace, shared presets and the gates every later task passes through.

- [x] T001 Scaffold the workspace root: `package.json` (scripts, `packageManager: pnpm@12.6.0`, `engines.node >=22.22.0`), `pnpm-workspace.yaml` (catalog, `allowBuilds`), `turbo.json` (a `transit` node for lint, typecheck and test), `.nvmrc`, `.editorconfig` and `.gitignore`
- [x] T002 [P] Add the shared presets: `packages/typescript-config/{base,nestjs,nextjs,node-library,react-library}.json` and the ESLint 10 flat configs `packages/eslint-config/{base,library,nest,next,react-internal}.js`, with the web tier boundaries and the no-hardcoded-copy rule in `packages/eslint-config/next.js`
- [x] T003 [P] Wire formatting, hooks and test aliases: `.prettierrc`, `.prettierignore`, `lint-staged.config.mjs`, `commitlint.config.mjs` (scopes), `.husky/pre-commit`, `.husky/commit-msg` and `vitest.shared.ts` (`@kb/*` resolved to source)
- [x] T004 [P] Add the single CI job (frozen install, format check, lint, typecheck, test, build, deliberately without `.env`) in `.github/workflows/ci.yml`
- [x] T005 Document every environment variable (Supabase, web, API, `AI_CHAT_*`, `AI_EMBEDDING_*`, `RAG_*`, ingestion, rate limits) in `.env.example`
- [x] T006 Write the contributor guide and the decision log: `AGENTS.md`, `CLAUDE.md` and `DECISIONS.md` with DEC-001 to DEC-014 from planning

**Checkpoint**: `pnpm install` is clean and `pnpm check` runs on an empty workspace.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contract primitives, the AI layer, the database baseline and both app skeletons.

**Critical**: no user story work can begin until this phase is complete.

- [x] T007 Add the contract primitives: `idSchema`, `timestampSchema`, `withoutNul` and pagination in `packages/contracts/src/common.ts`, and every limit in `packages/contracts/src/limits.ts`
- [x] T008 [P] Define the one error shape (`ERROR_CODES`, `ERROR_HTTP_STATUS`, `apiErrorSchema`) in `packages/contracts/src/errors.ts` and the `apiRoutes` builders in `packages/contracts/src/routes.ts`, exported through `packages/contracts/src/index.ts`
- [x] T009 [P] Add accept and reject tables in `packages/contracts/__tests__/unit/{common,errors,routes}.test.ts` with `packages/contracts/__tests__/fixtures.ts`
- [x] T010 Define the AI ports and neutral errors in `packages/ai/src/ports/{chat-model.types,embedding-model.types,embedding-contract}.ts` and `packages/ai/src/errors/{ai-provider-error,ai-provider-error.types,abort-error}.ts`
- [x] T011 Add the provider profile table and endpoint resolution in `packages/ai/src/providers/{provider-ids,provider-profiles,provider-profiles.types,resolve-endpoint,resolve-endpoint.types}.ts`
- [x] T012 Decode `AI_CHAT_*` and `AI_EMBEDDING_*` independently (inheritance only between matching providers, errors named by variable) in `packages/ai/src/config/{ai-config.schema,ai-env.schema}.ts`
- [x] T013 Implement the OpenAI-compatible adapters and the SDK error mapping in `packages/ai/src/adapters/openai-compatible/{create-openai-client,openai-like-client.types,openai-compatible-chat-model,openai-compatible-embedding-model,mappers}.ts` and `packages/ai/src/errors/map-openai-error.ts`
- [x] T014 Build both ports from one config in `packages/ai/src/factory/{create-ai-clients,create-ai-clients.types}.ts` and export only the public surface from `packages/ai/src/index.ts`
- [x] T015 [P] Ship deterministic fakes in `packages/ai/src/testing/{fake-chat-model,fake-embedding-model,fake-models.types,fake-constants,next-macrotask}.ts`
- [x] T016 [P] Test adapters, error mapping, endpoint resolution and fakes against a fake OpenAI client: `packages/ai/__tests__/{fake-openai-client,fixtures}.ts`, `packages/ai/__tests__/unit/{adapters,errors,ports,testing}/*.test.ts`, `packages/ai/__tests__/unit/providers/resolve-endpoint.test.ts`
- [x] T017 Configure the local stack, pgvector and explicit privileges: `supabase/config.toml`, `supabase/migrations/20260929100000_extensions.sql`, `supabase/migrations/20260929100800_grants_hardening.sql`, `supabase/migrations/20260929100900_maintain_privilege.sql`
- [x] T018 Write the dependency-free bootstrap and database scripts: `scripts/setup.mjs`, `scripts/setup/{main,database,prompt}.mjs`, `scripts/db.mjs`, `scripts/lib/{env,exec,log,supabase}.mjs`
- [x] T019 Load the root `.env` and validate it into a typed `APP_CONFIG` in `apps/api/src/config/{root-env,env.schema,env-issues,app-config,app-config.types,config.module,config.constants,package-version}.ts` (DEC-010, DEC-016)
- [x] T020 Boot the ESM Nest app (CORS for `WEB_ORIGIN`, 2 MB JSON limit, `/api` prefix, exception filter, shutdown hooks) with request ids and logging: `apps/api/src/{main,app.module,app.setup}.ts`, `apps/api/src/common/http/{request-id.middleware,request-logging.middleware,accepts-event-stream,abort-on-close,http.constants}.ts`
- [x] T021 Map every failure onto the shared shape and validate request parts with contract schemas: `apps/api/src/common/errors/{api-http.exception,error-mapping,api-exception.filter,describe-error,error.constants,errors.types}.ts`, `apps/api/src/common/validation/{zod-validation.pipe,zod-params.decorators,zod-issues,validation.types}.ts`
- [x] T022 Add user-scoped database access and helpers: `apps/api/src/database/{supabase-client.factory,database.module,database-client.types,user-context.types,database.constants,database-error,postgrest-filters,exact-count,column-schemas}.ts`, the generated `apps/api/src/database/database.types.ts`, `apps/api/src/common/utils/{hash,text,chunk-array,elapsed}.ts`
- [x] T023 Bind the AI ports to `CHAT_MODEL` and `EMBEDDING_MODEL` and count cl100k tokens in `apps/api/src/ai/{ai.module,ai.constants,ai-status.types,token-counter,token-counter.types,long-runs}.ts`
- [x] T024 Serve liveness and readiness (database answer and vector-column size through the service role, DEC-015) in `apps/api/src/modules/health/{health.module,health.controller,health.service,health.repository,health.types,health.constants,readiness}.ts`
- [x] T025 [P] Drive the skeleton in-process: `apps/api/__tests__/fakes/{test-app,fake-database}.ts`, `apps/api/__tests__/fixtures.ts`, `apps/api/__tests__/unit/app.setup.test.ts`, `apps/api/__tests__/unit/common/{errors,validation,http}/*.test.ts`, `apps/api/__tests__/unit/common/utils/{chunk-array,hash,text}.test.ts`, `apps/api/__tests__/unit/config/{app-config,root-env}.test.ts`, `apps/api/__tests__/unit/database/*.test.ts`, `apps/api/__tests__/unit/modules/health/readiness.test.ts`
- [x] T026 [P] Build the primitives and design tokens: `packages/ui/src/components/*.tsx`, `packages/ui/src/lib/{cn,field,responsive,space}.ts`, `packages/ui/src/styles/theme.css`, `packages/ui/src/{index,types}.ts`, with `packages/ui/__tests__/unit/*.test.{ts,tsx}`
- [x] T027 Scaffold the web app and its copy: `apps/web/next.config.ts` (root `.env`, derived `NEXT_PUBLIC_*`, `transpilePackages`), `apps/web/app/{layout,page,error,not-found}.tsx`, `apps/web/app/globals.css`, `apps/web/messages/en.json`, `apps/web/core/i18n/{dictionary,translation-context,useT,interpolate}.ts`, `apps/web/core/i18n/TranslationProvider.tsx`
- [x] T028 Add web configuration and providers: `apps/web/core/config/{env,routes,query,navigation,locale}.ts`, `apps/web/core/providers/{AppProviders,QueryProvider}.tsx`, `apps/web/core/providers/get-query-client.ts`
- [x] T029 Add the API client layer (Bearer token, response schemas, error parsing, one session refresh on 401) in `apps/web/core/api/{client,browser-client,api-error,get-access-token,get-error-message,form-errors,handle-unauthorized,json,abort,types}.ts`
- [x] T030 Add the shell, states, dialogs, forms and utilities: `apps/web/core/components/shell/*.tsx`, `apps/web/core/components/states/{ErrorState,NotFoundState,RouteErrorFallback}.tsx`, `apps/web/core/components/dialogs/ConfirmDialog.tsx`, `apps/web/core/icons/index.ts`, `apps/web/core/forms/{useZodResolver,zod-error-map}.ts`, `apps/web/core/utils/*.ts`, `apps/web/core/hooks/useNow.ts`
- [x] T031 [P] Test the web core with jsdom: `apps/web/vitest.config.ts` (timeouts sized for small CI runners), `apps/web/__tests__/setup.ts`, `apps/web/__tests__/helpers/render.tsx`, `apps/web/__tests__/unit/core/{api-error,form-errors,format-date,format-number,get-error-message,interpolate,is-active-path,zod-error-map}.test.ts`, `apps/web/__tests__/unit/components/ErrorState.test.tsx`

**Checkpoint**: `GET /api/health` answers, a request without a token gets the 401 shape, a malformed body gets a 422 with field errors, and the web builds with no `.env`.

---

## Phase 3: User Story 1 - My knowledge base is private to me (Priority: P1)

**Goal**: sign-up, sign-in, sign-out, protected routes and strict per-user isolation.

**Independent Test**: two users; the second opens the first user's links and calls the API with their ids; every attempt is a not-found.

- [x] T032 [US1] Verify JWTs behind the `JwtVerifier` port and attach the caller's client in `apps/api/src/auth/{jwt-verifier.types,supabase-jwt.verifier,bearer-token,auth.guard,auth.module,auth.constants}.ts`, `apps/api/src/common/auth/{public.decorator,current-user.decorator}.ts` and `apps/api/src/common/types/request.types.ts`
- [x] T033 [P] [US1] Test token parsing, verification and the guard in `apps/api/__tests__/unit/auth/{auth.guard,bearer-token,supabase-jwt.verifier}.test.ts`
- [x] T034 [US1] Keep the Supabase session in cookies and redirect by route in `apps/web/proxy.ts` and `apps/web/core/auth/{client,server,proxy-session,get-current-user,resolve-auth-redirect,sign-out,useSignOut}.ts`
- [x] T035 [US1] Build sign-in and sign-up, including the confirm-your-email state: `apps/web/features/auth/{schema,types,constants}.ts`, `apps/web/features/auth/services/auth-service.ts`, `apps/web/features/auth/lib/{auth-strings,map-auth-error}.ts`, `apps/web/features/auth/hooks/{useLoginForm,useSignupForm,useAuthRedirect}.ts`, `apps/web/features/auth/components/*.tsx`
- [x] T036 [US1] Add the auth and protected route groups in `apps/web/app/(auth)/{layout,login/page,signup/page}.tsx` and `apps/web/app/(app)/{layout,error}.tsx`
- [x] T037 [P] [US1] Test auth errors, redirects and the refresh-once rule in `apps/web/__tests__/unit/auth/map-auth-error.test.ts` and `apps/web/__tests__/unit/core/{resolve-auth-redirect,client}.test.ts`

**Checkpoint**: a signed-out visit to `/documents` lands on `/login?next=/documents`; after sign-in the user returns there; sign-out ends the session.

---

## Phase 4: User Story 2 - I write and organise documents (Priority: P1)

**Goal**: document CRUD with Markdown, tags, search, filter and every state.

**Independent Test**: create, edit, tag, search, filter and delete from the library and the editor; every validation message appears next to its field.

- [x] T038 [US2] Define the document schemas (title 1 to 200, content 1 to 500,000, 20 tags of 40, an update schema without defaults) in `packages/contracts/src/documents.ts`, tested in `packages/contracts/__tests__/unit/documents.test.ts`
- [x] T039 [US2] Create `documents` with the content-hash trigger, own-row policies, column grants and the `document_summaries` view in `supabase/migrations/20260929100100_documents.sql`, then regenerate `apps/api/src/database/database.types.ts`
- [x] T040 [US2] Implement the documents module (controller, service, repository with `db` first, mapper) in `apps/api/src/modules/documents/{documents.module,documents.controller,documents.service,documents.repository,documents.mapper,documents.types,documents.constants}.ts`
- [x] T041 [P] [US2] Test the module and drive it over HTTP: `apps/api/__tests__/unit/modules/documents/{documents.mapper,documents.repository,documents.service}.test.ts`, `apps/api/__tests__/unit/documents.pipeline.test.ts`, `apps/api/__tests__/fakes/in-memory-documents.repository.ts`, `apps/api/__tests__/fixtures/documents.ts`
- [x] T042 [US2] Add the web data layer: `apps/web/features/documents/{types,constants}.ts`, `apps/web/features/documents/services/documents-service.ts`, `apps/web/features/documents/lib/{documents-keys,documents-strings,document-cache,to-form-values,to-update-input}.ts`, `apps/web/features/documents/hooks/{useDocuments,useDocument,useDocumentsList,useDocumentMutations,useDocumentForm}.ts`
- [x] T043 [US2] Build the library with search, tag filter and its loading, empty, no-match and error states: `apps/web/features/documents/components/{DocumentsListBody,DocumentsListClient,DocumentsToolbar,DocumentsTagFilter,DocumentsGrid,DocumentCard,DocumentsEmpty,DocumentsListSkeleton}.tsx`, `apps/web/features/documents/lib/{filter-documents,collect-tags,tags,get-list-view,to-plain-preview}.ts`, `apps/web/app/(app)/documents/(list)/{page,loading}.tsx`
- [x] T044 [US2] Build the editor with Markdown preview, tags, delete confirmation and the unsaved-changes guard: `apps/web/features/documents/components/{DocumentCreateBody,DocumentCreateClient,DocumentEditorBody,DocumentEditorClient,DocumentEditorSkeleton,DocumentPageShell,DocumentForm,DocumentFormActions,DocumentFormSkeleton,DocumentTagsField,TagsInput,ContentEditor,ContentEditorTabs,DocumentDangerZone}.tsx`, `apps/web/core/components/markdown/{MarkdownContent,MarkdownLink,markdown-components}.tsx`, `apps/web/core/forms/useUnsavedChangesWarning.ts`, `apps/web/app/(app)/documents/new/{page,loading}.tsx`, `apps/web/app/(app)/documents/[id]/{page,loading}.tsx`
- [x] T045 [P] [US2] Test forms, filters and cache updates: `apps/web/__tests__/unit/documents/{DocumentForm,TagsInput,useDocumentMutations}.test.tsx`, `apps/web/__tests__/unit/documents/{filter-documents,collect-tags,tags,get-list-view,document-cache,documents-keys,documents-strings,to-form-values,to-plain-preview,to-update-input}.test.ts`, `apps/web/__tests__/fixtures/documents.ts`

**Checkpoint**: full CRUD from the browser; a second user gets 404 on the first user's document; a tags-only edit keeps the status.

---

## Phase 5: User Story 3 - My documents become searchable on their own (Priority: P1)

**Goal**: durable, idempotent indexing with live status and recovery.

**Independent Test**: a saved document goes Queued, Indexing, Ready without a reload; an edit re-embeds only changed chunks; a bad key fails with a reason and Retry indexing; a restart mid-run recovers.

- [x] T046 [US3] Store chunks with the HNSW cosine index, the weighted `tsvector` and the `(document_id, content_hash)` key in `supabase/migrations/20260929100200_document_chunks.sql`
- [x] T047 [US3] Add the queue functions (claim with `SKIP LOCKED`, hash-reusing upsert, finalize, failure, both re-queues, the dimension probe) in `supabase/migrations/20260929100500_ingestion_functions.sql`
- [x] T048 [US3] Implement the markdown-aware chunker (400/512/50 tokens, breadcrumbs, whole code fences, hash keys) in `apps/api/src/modules/ingestion/chunking/{chunker,chunker.constants,chunker.types,markdown-sections,blocks,code-fences,sentences,pack-units}.ts`
- [x] T049 [P] [US3] Test the chunker and tokenizer, adversarial inputs included, within `LINEAR_TIME_BUDGET_MS`: `apps/api/__tests__/unit/modules/ingestion/chunking/*.test.ts`, `apps/api/__tests__/unit/ai/{token-counter,long-runs}.test.ts`, `apps/api/__tests__/fixtures/{markdown,timing}.ts`
- [x] T050 [US3] Implement one ingestion run (embed only new hashes in batches, upsert in batches of 50, finalize) and its retry policy in `apps/api/src/modules/ingestion/{ingestion.service,ingestion.repository,ingestion.mapper,ingestion.types,ingestion.constants,ingestion.events,ingestion.backoff,ingestion-failure}.ts`
- [x] T051 [US3] Run the in-process worker (wakes on events, reindex and a sweep; one drain at a time) and the reindex routes in `apps/api/src/modules/ingestion/{ingestion.worker,reindex.service,ingestion.controller,ingestion.module}.ts`
- [x] T052 [P] [US3] Test the run, worker, backoff and failure classes: `apps/api/__tests__/unit/modules/ingestion/*.test.ts`, `apps/api/__tests__/unit/reindex.pipeline.test.ts`, `apps/api/__tests__/fakes/{in-memory-ingestion.repository,word-counter}.ts`
- [x] T053 [US3] Show status live in the web (badge; status bar with passage count, reason and Retry indexing; polling every 3 s while indexing): `apps/web/features/documents/components/{DocumentStatusBadge,DocumentStatusBar}.tsx`, `apps/web/features/documents/lib/get-refetch-interval.ts`
- [x] T054 [P] [US3] Test status rendering and polling in `apps/web/__tests__/unit/documents/{DocumentStatusBadge,DocumentStatusBar}.test.tsx` and `apps/web/__tests__/unit/documents/get-refetch-interval.test.ts`

**Checkpoint**: a created document is Ready with `chunk_count > 0` within seconds; changing the embedding model re-queues ready documents on the next start.

---

## Phase 6: User Story 4 - I ask questions and get grounded, cited answers (Priority: P1)

**Goal**: hybrid retrieval, a grounded prompt, a streamed answer with citations, stop and retry, and the conversation and message storage every exchange needs.

**Independent Test**: an answerable question streams with `[n]` chips; a follow-up resolves its reference; an unanswerable one says so; Stop keeps the partial answer; a scoped question uses only the chosen document.

- [x] T055 [US4] Define citations, messages, conversations, the derived title, the send schema, `ChatResult` and the SSE events with `parseChatSseEvent` in `packages/contracts/src/{messages,conversations,conversation-title,chat}.ts`, tested in `packages/contracts/__tests__/unit/{messages,conversations,conversation-title,chat}.test.ts`
- [x] T056 [US4] Create `conversations` and immutable `messages` with the touch trigger and ownership policies in `supabase/migrations/20260929100300_conversations_messages.sql`
- [x] T057 [US4] Add the two searches and fuse them with RRF: `supabase/migrations/20260929100600_search_functions.sql`, `apps/api/src/modules/retrieval/{retrieval.module,retrieval.service,retrieval.repository,retrieval.mapper,retrieval.types,retrieval.constants,rank-fusion}.ts`
- [x] T058 [P] [US4] Test fusion and retrieval in `apps/api/__tests__/unit/modules/retrieval/{rank-fusion,retrieval.repository,retrieval.service}.test.ts` with `apps/api/__tests__/fakes/scripted-retrieval.repository.ts`
- [x] T059 [US4] Store conversations and messages and serve the conversation routes (create, list, detail, rename, delete) in `apps/api/src/modules/chat/{conversations.controller,conversations.service,conversations.repository,conversations.mapper,conversations.schema,messages.repository,messages.mapper,chat.module}.ts`
- [x] T060 [US4] Build the grounded prompt within token budgets, the bounded follow-up rewrite and the citation parser in `apps/api/src/modules/chat/{prompt-builder,prompt.constants,query-rewriter,rewrite-prompt,citation-parser,citations.mapper}.ts`
- [x] T061 [US4] Stream the answer, store it before `done` and keep partial answers on abort in `apps/api/src/modules/chat/{rag-chat.service,chat.controller,sse-writer,sse-format,chat-result-collector,chat-errors,chat.types,chat.constants}.ts`
- [x] T062 [US4] Limit requests per user with configurable buckets (DEC-025) in `apps/api/src/throttling/{throttling.module,user-throttler.guard,rate-limit-bucket.decorator,throttling.constants,throttling.types}.ts`
- [x] T063 [P] [US4] Test the chat pipeline: `apps/api/__tests__/unit/modules/chat/*.test.ts`, `apps/api/__tests__/unit/throttling/user-throttler.guard.test.ts`, `apps/api/__tests__/unit/{chat,conversations}.pipeline.test.ts`, `apps/api/__tests__/fakes/in-memory-chat.repositories.ts`, `apps/api/__tests__/fixtures/chat.ts`
- [x] T064 [US4] Hold the conversation and read the stream in the web: `apps/web/features/chat/{types,constants}.ts`, `apps/web/features/chat/services/{chat-stream-service,conversations-service}.ts`, `apps/web/features/chat/lib/{parse-sse,parse-chat-event,chat-stream-reducer,to-stream-error,commit-stream-result,conversations-keys,conversation-cache,derive-title}.ts`, `apps/web/features/chat/hooks/{useChatStream,useChatSession,useActiveConversationId,useConversation,useConversationMutations}.ts`
- [x] T065 [US4] Build the thread, composer, citations, sources, scope picker and indexing notice, and their routes: `apps/web/features/chat/components/{ChatThreadBody,ChatThreadSection,ChatThreadClient,ChatThreadHeader,ChatThreadSkeleton,MessageList,MessagesSkeleton,MessageBubble,StreamingCursor,StreamStatus,StreamErrorRow,StreamStoppedRow,Composer,ChatEmptyState,CitationChip,CitationLink,SourcesList,SourceCard,DocumentScopePicker,IndexingNotice}.tsx`, `apps/web/features/chat/lib/{build-message-list,get-thread-view,should-submit-on-key,scroll-pinning,citations,citation-context,scope,get-indexing-summary,chat-strings}.ts`, `apps/web/features/chat/hooks/{useAutoScroll,useAutosizeTextarea,useCitationActions}.ts`, `apps/web/app/(app)/chat/page.tsx`, `apps/web/app/(app)/chat/[conversationId]/{page,loading}.tsx`
- [x] T066 [P] [US4] Test the stream and the thread: `apps/web/__tests__/unit/chat/{parse-sse,parse-chat-event,chat-stream-reducer,to-stream-error,commit-stream-result,build-message-list,get-thread-view,should-submit-on-key,scroll-pinning,citations,scope,get-indexing-summary,chat-strings,useChatSession}.test.ts`, `apps/web/__tests__/unit/chat/{Composer,MessageBubble,useChatStream,useChatStream.errors}.test.tsx`, `apps/web/__tests__/helpers/chat-stream.tsx`, `apps/web/__tests__/fixtures/chat.ts`

**Checkpoint**: `curl -N` shows `meta`, `sources`, `delta`, `usage`, `done`; without `Accept` the same request returns JSON; aborting stores a partial answer with `finish_reason = 'aborted'`; the 21st question in a minute gets a 429 with `retryAfter`; the first message on `/chat` streams while the URL becomes `/chat/<id>`.

---

## Phase 7: User Story 5 - I come back to past conversations (Priority: P2)

**Goal**: past conversations are listed, reopened with their citation snapshots, renamed and deleted.

**Independent Test**: sign out and in, reopen, continue, rename and delete conversations; an answer citing a deleted document still shows its passage.

- [x] T067 [US5] Build the conversation sidebar (most recent first, skeleton and empty state, a drawer below `lg`), kept mounted across chat routes: `apps/web/features/chat/components/{ChatLayoutBody,ConversationListClient,ConversationListItem,ConversationListSkeleton,MobileConversationsButton}.tsx`, `apps/web/features/chat/hooks/useConversations.ts`, `apps/web/features/chat/lib/conversation-path.ts`, `apps/web/app/(app)/chat/layout.tsx`
- [x] T068 [US5] Rename and delete conversations (optimistic delete; deleting the open conversation leads to a new chat): `apps/web/features/chat/components/RenameConversationDialog.tsx`, `apps/web/features/chat/hooks/useRenameConversationForm.ts` and the rename and delete mutations in `apps/web/features/chat/hooks/useConversationMutations.ts`
- [x] T069 [US5] Reopen a conversation from its URL, rendering history from the stored snapshots, and show `apps/web/features/chat/components/ConversationNotFound.tsx` for an unknown or foreign id
- [x] T070 [P] [US5] Test the list and its cache in `apps/web/__tests__/unit/chat/ConversationListClient.test.tsx` and `apps/web/__tests__/unit/chat/conversation-lib.test.ts`

**Checkpoint**: a reload of `/chat/<id>` shows the history with citations; the list reorders when a conversation continues; rename and delete apply at once.

---

## Phase 8: User Story 6 - I upload existing files (Priority: P2)

**Goal**: PDF, plain-text and Markdown uploads that become documents.

**Independent Test**: a Markdown file and a multi-page PDF become documents; a scanned PDF, an 11 MiB file and a `.png` are rejected with specific messages.

- [x] T071 [US6] Accept one file of at most 10 MiB by MIME type or extension and extract its text in `apps/api/src/modules/upload/{upload.module,upload.controller,upload.service,upload.schema,upload.types,upload.constants,upload-file-filter,upload-title}.ts` and `apps/api/src/modules/upload/extractors/{text-extractor.types,plain-text.extractor,pdf.extractor,select-extractor,text-extraction.error}.ts`
- [x] T072 [P] [US6] Test extraction and every rejection with PDF fixtures: `apps/api/__tests__/unit/modules/upload/*.test.ts`, `apps/api/__tests__/unit/modules/upload/extractors/*.test.ts`, `apps/api/__tests__/fixtures/{two-pages,no-text,nul-text}.pdf`, and the upload cases in `apps/api/__tests__/unit/documents.pipeline.test.ts`
- [x] T073 [US6] Build the upload dialog with drag and drop, checks against the contract limits and XHR progress: `apps/web/features/documents/components/{UploadDocumentDialog,UploadDropzone,UploadFileSummary}.tsx`, `apps/web/features/documents/hooks/useUploadDocument.ts`, `apps/web/features/documents/lib/validate-upload.ts`, `apps/web/core/api/upload.ts`
- [x] T074 [P] [US6] Test the dropzone and the checks in `apps/web/__tests__/unit/documents/UploadDropzone.test.tsx` and `apps/web/__tests__/unit/documents/validate-upload.test.ts`

**Checkpoint**: `.txt`, `.md` and `.pdf` uploads create documents that index; 413, 415 and 422 map to their own messages.

---

## Phase 9: User Story 7 - The operator chooses the AI providers by configuration (Priority: P2)

**Goal**: env-only provider swaps, independent chat and embedding providers, and graceful degradation.

**Independent Test**: switch providers in `.env` only, restart, and get cited answers again after the automatic re-index.

- [x] T075 [US7] Add the Gemini profile over Google's OpenAI-compatible endpoint, with embeddings requested at 1536 dimensions (DEC-017), in `packages/ai/src/providers/provider-profiles.ts`, covered by `packages/ai/__tests__/unit/providers/provider-profiles.test.ts`
- [x] T076 [US7] Degrade instead of failing when AI is not configured: stand-ins in `apps/api/src/ai/unconfigured-ai-clients.ts`, the `ai` readiness check in `apps/api/src/modules/health/readiness.ts` and an idle worker in `apps/api/src/modules/ingestion/ingestion.worker.ts`
- [x] T077 [US7] Keep vector spaces apart: zero-padding and the width check in `apps/api/src/common/utils/vector.ts`, and the once-per-process signature re-queue in `apps/api/src/modules/ingestion/ingestion.worker.ts` (DEC-014)
- [x] T078 [P] [US7] Test configuration end to end: `packages/ai/__tests__/unit/config/{ai-env.schema,ai-config.schema}.test.ts`, `packages/ai/__tests__/unit/factory/create-ai-clients.test.ts`, `apps/api/__tests__/unit/ai/{ai.module,unconfigured-ai-clients}.test.ts`, `apps/api/__tests__/unit/common/utils/vector.test.ts`, and the drift check against `.env.example` in `apps/api/__tests__/unit/config/env.schema.test.ts`

**Checkpoint**: invalid `AI_*` values are named at boot while documents keep working; a new embedding model re-indexes the library on the next start.

---

## Phase 10: User Story 8 - I can see my AI usage (Priority: P3)

**Goal**: every provider call metered, summarised for the last 30 days.

**Independent Test**: after questions and an upload, the usage page's totals, days and per-model rows match the activity.

- [x] T079 [US8] Define the summary query (IANA time zones only) and response in `packages/contracts/src/usage.ts`, tested in `packages/contracts/__tests__/unit/usage.test.ts`
- [x] T080 [US8] Create `usage_events` (users read, the service role writes) and `usage_summary()` in `supabase/migrations/20260929100400_usage_events.sql` and `supabase/migrations/20260929100700_usage_functions.sql`
- [x] T081 [US8] Meter every provider call fire-and-forget, estimating missing usage with cl100k (DEC-020), and serve the summary: `apps/api/src/modules/usage/{usage-recorder,usage-estimate,usage.module,usage.controller,usage.service,usage.repository,usage.mapper,usage.types,usage.constants,usage-window}.ts`
- [x] T082 [P] [US8] Test metering and the summary in `apps/api/__tests__/unit/modules/usage/*.test.ts` and `apps/api/__tests__/unit/usage.pipeline.test.ts`
- [x] T083 [US8] Build the usage page (stat tiles, bars by day in the viewer's time zone, a table by model, the empty state): `apps/web/features/usage/{types,constants}.ts`, `apps/web/features/usage/services/usage-service.ts`, `apps/web/features/usage/hooks/useUsageSummary.ts`, `apps/web/features/usage/lib/{usage-keys,usage-strings,usage-window,get-usage-view,format-usage,compute-bar-widths}.ts`, `apps/web/features/usage/components/{UsageBody,UsageClient,UsageSection,UsageStatTiles,UsageByDayBars,UsageByModelTable,UsageEmpty,UsageSkeleton}.tsx`, `apps/web/app/(app)/usage/{page,loading}.tsx`
- [x] T084 [P] [US8] Test the usage view in `apps/web/__tests__/unit/usage/{UsageByModelTable,UsageStatTiles,useUsageSummary}.test.tsx`, `apps/web/__tests__/unit/usage/{compute-bar-widths,usage-lib}.test.ts` and `apps/web/__tests__/fixtures/usage.ts`

**Checkpoint**: `GET /api/usage/summary` returns totals, `byDay` and `byModel`; the page shows them, or the empty state.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [x] T085 Harden ingestion and search after an independent review (fuzz, scale and timing probes; fifteen findings; DEC-018 to DEC-024): finalize and failure guards in `supabase/migrations/20260929101000_ingestion_guards.sql`, searches by content hash with OR-ed terms in `supabase/migrations/20260929101100_search_consistency.sql`, the failure policy in `apps/api/src/modules/ingestion/ingestion-failure.ts` and linear-time chunking in `apps/api/src/modules/ingestion/chunking/`
- [x] T086 Polish accessibility and layout: focus rules for dialogs and scroll regions (DEC-033) in `packages/ui/src/components/{Dialog,ScrollArea}.tsx` and `apps/web/core/components/dialogs/ConfirmDialog.tsx`, the skip link and mobile navigation in `apps/web/core/components/shell/{SkipLink,MobileNav}.tsx`, the `(list)` route group and the `lg` conversation sidebar (DEC-034)
- [x] T087 [P] Document the system and its decisions: `README.md`, `docs/api.md`, `docs/architecture.md`, `docs/loom-script.md`, the REST Client walkthroughs `http/README.md` and `http/{documents,chat,usage}.http`, and DEC-015 to DEC-034 in `DECISIONS.md`
- [x] T088 Record the process: the constitution in `.specify/memory/constitution.md`, this feature run in `specs/001-knowledge-base/`, the project skills in `.claude/skills/` and the preview configurations in `.claude/launch.json`
- [x] T089 Run `pnpm check` and the scenarios in `specs/001-knowledge-base/quickstart.md`

---

## Requirement Coverage

| Requirements                             | Tasks                                    |
| ---------------------------------------- | ---------------------------------------- |
| FR-001 to FR-005 (accounts and access)   | T029, T032 to T037                       |
| FR-006 to FR-012 (documents)             | T038 to T045                             |
| FR-013 to FR-021 (indexing)              | T046 to T054, T085                       |
| FR-022 to FR-031 (questions and answers) | T055 to T066                             |
| FR-032 to FR-035 (conversations)         | T055, T056, T059, T067 to T070           |
| FR-036 and FR-037 (upload)               | T071 to T074                             |
| FR-038 to FR-040 (AI providers)          | T010 to T016, T075 to T078               |
| FR-041 and FR-042 (usage)                | T079 to T084                             |
| FR-043 (rate limits)                     | T062                                     |
| FR-044 (loading, empty and error states) | T027, T030, T043, T044, T065, T067, T083 |
| FR-045 (error categories)                | T008, T021, T029, T030                   |

## Dependencies & Execution Order

- **Setup (Phase 1)** has no dependencies. **Foundational (Phase 2)** depends on it and blocks every story.
- **US1** comes first among the stories: every other story's API routes sit behind its guard.
- **US2** depends on US1. **US3** depends on US2 (it indexes documents) and on the AI layer from Phase 2. **US4** depends on US3 (it retrieves chunks) and brings the conversation and message storage every exchange needs.
- **US5** builds on US4's storage and routes. **US6** depends only on US2's create path. **US7** depends on the AI layer and on US3's worker. **US8** hooks into US3 (ingestion batches) and US4 (answers and rewrites).
- **Polish** follows the stories it touches.

Within each story: contract before migration, migration before repository, repository and mapper before service, service before controller, API before web, and tests alongside each pure module.

## Parallel Opportunities

- Phase 1: T002, T003 and T004 together after T001.
- Phase 2: the contract (T007 to T009), AI (T010 to T016), database (T017, T018) and primitive (T026) tracks are independent; the API skeleton (T019 to T025) and the web skeleton (T027 to T031) run side by side once the contracts exist.
- Every task marked [P] is a test task or a file set no other open task touches.
- In the build, API and web work ran in parallel git worktrees: the web primitives, shell and sign-in (T026 to T031, T034 to T036) alongside the API skeleton, guard and documents module (T019 to T024, T032, T038 to T041), then the web documents screens with status and upload (T042 to T045, T053, T073) alongside the ingestion worker (T046 to T052).

## Implementation Strategy

- **MVP**: Phase 1, Phase 2, then US1 to US4: a private knowledge base whose documents index themselves and answer questions with citations.
- **Increments**: US5 (persistence), US6 (upload), US7 (provider guarantees) and US8 (usage) each added value without breaking the stories before them, and each ended at a green `pnpm check`.
- **Hardening**: an independent review of ingestion and search after the API stories produced the guards and policies in T085, each with a new DEC entry and tests.
