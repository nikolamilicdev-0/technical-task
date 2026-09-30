# Feature Specification: AI-Powered Knowledge Base

**Feature Branch**: `main` (the initial build; later features branch from `develop`)

**Created**: 2026-09-29

**Status**: Implemented

**Input**: User description: "Build an AI-Powered Knowledge Base. Users sign up and sign in (Supabase Auth); create, read, update and delete documents with a title, Markdown or plain-text content, optional tags and timestamps; documents are chunked and embedded into pgvector when they are created or updated; users ask questions in a chat that retrieves the relevant chunks and answers with that context, and the conversation history is kept. The AI layer is provider-agnostic: any OpenAI-compatible provider through configuration. Stretch goals: streaming responses, persistent conversations, source citations, PDF/TXT upload, usage and token tracking. Stack: Turborepo, Next.js, NestJS, Supabase (Postgres and pgvector), OpenAI SDK."

## Clarifications

### Session 2026-09-29

- Q: Which stretch goals are in scope? → A: All five: answers that appear as they are written, conversations that persist, source citations, file upload (PDF, plain text and Markdown) and a usage view.
- Q: Does "conversation history kept" mean context within a chat or saved conversations? → A: Both. Follow-up questions are answered in the context of the earlier turns, and conversations persist across sessions with their sources.
- Q: May answers draw on the model's general knowledge? → A: No. Answers use only the user's own documents, cite them, and say plainly when the documents do not contain the answer.
- Q: Where does the data live while developing and evaluating? → A: A local database stack by default. A hosted project, and a setup that needs no database tooling at all, must work too, so an evaluator can run the product without special tooling.
- Q: Must answering and indexing use the same AI provider? → A: No. Each is configured on its own, so one provider can answer while another indexes; by default indexing follows the answering provider.
- Q: What does usage tracking cover? → A: Every AI request made on the user's behalf (answers, follow-up rewrites and indexing), per day and per model, over the last 30 days.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - My knowledge base is private to me (Priority: P1)

As a new user, I want to create an account with my email address and a password and sign in, so that my documents and conversations belong to me alone.

**Why this priority**: every other story stores personal material. Without accounts and strict isolation nothing else can ship, and a leak between users would be the worst possible defect.

**Independent Test**: sign up two users, have the first create a document and a conversation, then as the second user open the first user's links and use them directly against the service; every attempt must look as if the record does not exist.

**Acceptance Scenarios**:

1. **Given** no account, **When** I sign up with a valid email address and a password, **Then** I am signed in and land on my empty library, or, where the deployment requires it, I am told to confirm my email address first.
2. **Given** an account, **When** I sign in with the right credentials, **Then** I reach my library; **When** the credentials are wrong, **Then** I see a clear error and stay on the sign-in screen.
3. **Given** I am signed out, **When** I open any page of the workspace, **Then** I am asked to sign in and returned to that page afterwards.
4. **Given** I am signed in, **When** I sign out, **Then** the workspace is unreachable from this browser until I sign in again.
5. **Given** a link to another user's document or conversation, **When** I open it or use its identifier, **Then** it behaves exactly like a link to something that does not exist.
6. **Given** my session expires while I work, **When** my next action needs the service, **Then** the session is renewed silently once, and only if that fails am I signed out and told why.

---

### User Story 2 - I write and organise documents (Priority: P1)

As a signed-in user, I want to create, read, edit and delete documents with a title, Markdown or plain-text content and optional tags, so that my knowledge lives in one place.

**Why this priority**: documents are the material every answer comes from; with accounts they already form a useful private notebook.

**Independent Test**: create, edit, tag, search, filter and delete documents from the library and the editor; confirm the times, the preview and every validation message.

**Acceptance Scenarios**:

1. **Given** my library, **When** I create a document with a title and content, **Then** it appears in the library with its tags, its status and when it was last updated.
2. **Given** a document, **When** I edit its title, content or tags and save, **Then** the changes persist and its last-updated time moves.
3. **Given** Markdown content, **When** I switch to the preview, **Then** headings, lists, tables, links and code render as formatted text, and nothing embedded in the content runs.
4. **Given** a document, **When** I delete it and confirm, **Then** it leaves my library and is no longer used to answer questions.
5. **Given** many documents, **When** I search by title or filter by tags, **Then** only matching documents show, and one action clears the search and filters.
6. **Given** invalid input (an empty title, a title over 200 characters, content over 500,000 characters, more than 20 tags or a tag over 40 characters), **When** I save, **Then** each problem is explained next to its field and nothing is saved.
7. **Given** unsaved edits, **When** I reload or close the page, **Then** I am asked to confirm before the edits are lost.

---

### User Story 3 - My documents become searchable on their own (Priority: P1)

As a user, I want every document I save to be prepared for question answering automatically, and to see how far that has got, so that I never have to think about indexing.

**Why this priority**: questions can only be answered from prepared documents; this story turns the notebook into a knowledge base.

**Independent Test**: save a document and watch its status move from Queued to Indexing to Ready without reloading; edit it, break the AI credentials, restart the service mid-run, and confirm the documented recovery each time.

**Acceptance Scenarios**:

1. **Given** I save a new document, **When** I stay on the library or in the editor, **Then** its status moves from Queued through Indexing to Ready without a reload, and Ready shows how many passages it was split into.
2. **Given** a ready document, **When** I change its title or content, **Then** it is prepared again, and passages whose text did not change are reused rather than processed again.
3. **Given** a ready document, **When** I change only its tags, **Then** it stays Ready.
4. **Given** the AI provider fails temporarily, **When** it recovers, **Then** preparation resumes on its own after increasing delays; **Given** it fails for a lasting reason such as invalid credentials, **Then** the document shows Failed with the reason and a Retry indexing action.
5. **Given** the service restarts while a document is being prepared, **When** it is running again, **Then** the document finishes without any action from me.
6. **Given** I ask for an unchanged document to be prepared again, **When** I ask a question meanwhile, **Then** its passages keep answering; text I removed by editing never answers again.

---

### User Story 4 - I ask questions and get grounded, cited answers (Priority: P1)

As a user, I want to ask a question in plain language and get an answer drawn from my documents, written out as it is generated and citing the passages it used, so that I can trust it and check it.

**Why this priority**: this is the product. Together with stories 1 to 3 it forms the minimum viable knowledge base.

**Independent Test**: with a few ready documents, ask an answerable question, a follow-up and an unanswerable question; open the citations; stop an answer midway; restrict a question to one document.

**Acceptance Scenarios**:

1. **Given** ready documents, **When** I ask a question, **Then** the answer starts to appear within seconds, grows as it is written and uses only my documents.
2. **Given** an answer that states something from a document, **When** I read it, **Then** a numbered marker follows the sentence, and opening the marker shows the passage, its document and headings, and a link to the document.
3. **Given** my documents do not contain the answer, **When** I ask, **Then** the assistant says it could not find it in my documents and cites nothing.
4. **Given** an earlier exchange, **When** I ask a follow-up such as "and the price?", **Then** the answer takes the earlier exchange into account.
5. **Given** an answer is being written, **When** I press Stop, **Then** writing stops, the text so far stays, and it is kept for later.
6. **Given** I pick specific documents before asking, **When** I ask, **Then** only those documents are used.
7. **Given** some documents are not ready yet or failed, **When** I open the chat, **Then** I am told that answers cannot use them yet.
8. **Given** the AI provider is unavailable or I ask too often, **When** I ask, **Then** I see a clear message that says when I can try again, and I can retry the question.

---

### User Story 5 - I come back to past conversations (Priority: P2)

As a returning user, I want my conversations saved with their answers and sources, so that I can reread, continue, rename or delete them.

**Why this priority**: persistence turns one-off answers into a record I can build on, but asking and answering already work without it.

**Independent Test**: hold two conversations, sign out and in again, then reopen, continue, rename and delete them; edit and delete a cited document and reopen the answer that cited it.

**Acceptance Scenarios**:

1. **Given** I asked questions earlier, **When** I return in a later session, **Then** my conversations are listed with the most recently active first, each titled from its first question.
2. **Given** a past conversation, **When** I open it, **Then** every question and answer shows with the citations it had when it was written, even if the cited documents were edited or deleted since.
3. **Given** a past conversation, **When** I continue it, **Then** the new answer uses the earlier turns as context and the conversation moves to the top of the list.
4. **Given** a conversation, **When** I rename it or delete it after confirming, **Then** the list reflects the change at once; deleting the conversation I am viewing takes me to a new chat.
5. **Given** an answer I stopped midway, **When** I reopen the conversation, **Then** the partial answer is there, marked as stopped.

---

### User Story 6 - I upload existing files (Priority: P2)

As a user, I want to upload PDF, plain-text or Markdown files instead of retyping them, so that material I already have becomes searchable too.

**Why this priority**: it removes the main barrier to filling the knowledge base, but writing documents by hand already covers the need.

**Independent Test**: upload a Markdown file, a multi-page PDF, a scanned PDF, a file over 10 MiB and a file of another type; check the resulting documents and each rejection message.

**Acceptance Scenarios**:

1. **Given** a supported file of up to 10 MiB, **When** I upload it by picking it or dropping it, **Then** upload progress shows, a document is created from its text, titled after the file name, and indexing starts.
2. **Given** a PDF, **When** I upload it, **Then** the text of every page becomes the document content.
3. **Given** a file that is too large, of another type, empty, or without usable text (such as a scanned PDF), **When** I try to upload it, **Then** I am told exactly why and nothing is created.

---

### User Story 7 - The operator chooses the AI providers by configuration (Priority: P2)

As the operator of a deployment, I want to choose which AI provider answers questions and which one prepares documents, through configuration alone, so that I can balance cost, privacy and quality without changing the product.

**Why this priority**: provider independence is a core requirement, but users see the same product whichever provider runs it.

**Independent Test**: run the product on one provider, change only the configuration to another provider (or split answering and indexing between two) and restart; the same questions still get cited answers.

**Acceptance Scenarios**:

1. **Given** a provider that offers the industry-standard chat and embedding interfaces, **When** I set its name, credentials and models in the configuration and restart, **Then** answering and indexing use it, with no code change.
2. **Given** one provider for answering and another for indexing, **When** I configure them separately, **Then** each task uses its own provider.
3. **Given** I change the indexing model, **When** the service restarts, **Then** documents prepared with the previous model are prepared again automatically, and no answer ever mixes passages prepared by two models.
4. **Given** an incomplete or invalid AI configuration, **When** the service starts, **Then** it names each offending setting, keeps serving documents and reports AI as not configured instead of failing.
5. **Given** a provider that cannot prepare documents, **When** I select it for indexing, **Then** the configuration is rejected with a message that names the setting and the providers that can.

---

### User Story 8 - I can see my AI usage (Priority: P3)

As a user, I want to see how much AI processing my questions and documents used, so that I understand what my activity costs.

**Why this priority**: useful transparency, but nothing else depends on it.

**Independent Test**: ask a few questions and upload a document, then open Usage and compare the totals, the days and the per-model rows with the activity.

**Acceptance Scenarios**:

1. **Given** activity in the last 30 days, **When** I open Usage, **Then** I see totals (all, prompt and completion tokens, and requests), tokens per day in my own time zone, and a breakdown by provider, model and kind (answers, follow-up rewrites, indexing).
2. **Given** a provider that does not report usage, **When** it is used, **Then** its usage is estimated and marked as estimated.
3. **Given** no activity in the period, **When** I open Usage, **Then** I see an empty state instead of a page of zeros.

---

### Edge Cases

- A document is edited while it is being prepared: the older run stops without publishing anything, and the new content is prepared instead.
- Several service instances run at once: each document is prepared by exactly one of them.
- A document that is only an outline (headings without body text) still becomes searchable.
- A document that would split into more than 1,000 passages fails with a reason instead of being indexed partially.
- Hostile input (thousands of blanks in a row, enormous headings) is bounded, so one upload cannot stall other users' requests.
- A question arrives while none of the user's documents is ready: the assistant says it found nothing instead of answering from general knowledge.
- The user closes the tab mid-answer: generation stops at the provider, and the partial answer is kept if any text arrived; if none arrived, nothing is stored.
- The model writes a citation number that does not exist, or a number inside a code sample: neither becomes a citation.
- A cited document is edited or deleted later: the answer keeps showing the passage it cited, and the link to a deleted document leads to a not-found page.
- Text inside a document that tries to instruct the assistant is treated as quoted material and ignored as an instruction.
- A PDF that is encrypted, damaged or scanned, a text file that is not UTF-8, or text containing NUL characters is rejected with a reason instead of failing the request.
- Changing only a document's title prepares every passage again, because the title is part of each passage's context.
- A user sends many questions, uploads or re-index requests in a minute: the request is refused with the time to wait.
- The AI provider omits usage figures: they are estimated and marked as estimated.
- The service's database is unreachable: readiness reports not ready, and every screen shows its error state with a retry.
- Each screen (sign-in, library, editor, chat, usage) has a designed loading state, an empty state and an error state, and never flashes a blank frame.
- The usage view is opened across a time-zone boundary: days follow the viewer's time zone.
- Another user's identifier is used anywhere: it must look as if the record does not exist.
- Every limit (lengths, sizes, counts) is the same in the forms, in the service and in storage.

## Requirements _(mandatory)_

### Functional Requirements

**Accounts and access**

- **FR-001**: Users MUST be able to sign up with an email address and a password, sign in and sign out.
- **FR-002**: The system MUST support deployments that require email confirmation before the first sign-in, telling the user to check their inbox.
- **FR-003**: Every workspace page MUST require a signed-in user; a signed-out visitor MUST be asked to sign in and then returned to the requested page.
- **FR-004**: Every document, passage, conversation, message and usage record MUST belong to exactly one user and MUST be invisible to, and unchangeable by, every other user; a request for another user's record MUST behave as if the record did not exist.
- **FR-005**: An expired session MUST be renewed once without interrupting the user; only when renewal fails MUST the user be signed out and told why.

**Documents**

- **FR-006**: Users MUST be able to create, view, edit and delete documents with a title (1 to 200 characters), content (1 to 500,000 characters of Markdown or plain text) and up to 20 tags of 1 to 40 characters each; duplicate tags MUST collapse into one.
- **FR-007**: The system MUST record when each document was created and last changed; a change to its title, content or tags MUST move the last-changed time.
- **FR-008**: Users MUST be able to preview Markdown as formatted text, and rendered content MUST NOT run embedded markup or scripts.
- **FR-009**: Users MUST be able to find documents by title and filter them by tag, and clear both in one action.
- **FR-010**: The same limits MUST apply wherever a value is entered or stored, and validation problems MUST be reported per field.
- **FR-011**: Deleting a document MUST require confirmation and MUST remove the document and all its prepared passages at once.
- **FR-012**: Reloading or closing the editor with unsaved edits MUST ask for confirmation.

**Indexing**

- **FR-013**: Creating a document or changing its title or content MUST queue it for preparation automatically; changing only its tags MUST NOT.
- **FR-014**: Preparation MUST split a document into passages that follow its heading structure, keep code blocks whole, and label each passage with its document title and headings.
- **FR-015**: Preparing a document again MUST process only passages whose text or context changed and reuse the others.
- **FR-016**: Each document MUST show its preparation status (queued, indexing, ready or failed), its number of passages when ready and the reason when failed, and the status MUST update without a page reload.
- **FR-017**: Temporary failures MUST be retried automatically with increasing delays up to a set number of attempts; lasting failures MUST stop and wait for the user.
- **FR-018**: Users MUST be able to ask for one document, or all their documents, to be prepared again.
- **FR-019**: Preparation MUST survive service restarts and run safely on several service instances, finishing each document once.
- **FR-020**: An edit made while a document is being prepared MUST win: the older run MUST NOT publish its passages.
- **FR-021**: A document that would produce more than 1,000 passages MUST fail with a reason rather than be prepared partially.

**Questions and answers**

- **FR-022**: Users MUST be able to ask a question of up to 4,000 characters and receive an answer drawn only from their own prepared documents.
- **FR-023**: Finding passages MUST combine matching by meaning with matching by exact words, so that names, codes and identifiers are found as reliably as paraphrases.
- **FR-024**: Users MUST be able to restrict a question to between 1 and 20 chosen documents.
- **FR-025**: A follow-up question MUST be interpreted in the context of the earlier turns of its conversation.
- **FR-026**: Answers MUST appear progressively while they are generated.
- **FR-027**: Every statement taken from a source MUST carry a numbered marker that opens the cited passage with its document title, headings and a link to the document; markers MUST refer only to passages the answer was given.
- **FR-028**: When the documents do not contain the answer, the assistant MUST say so and MUST NOT answer from general knowledge.
- **FR-029**: Users MUST be able to stop an answer, and the text received until then MUST be kept.
- **FR-030**: Text inside the user's documents MUST be treated as material to quote, never as instructions to the assistant.
- **FR-031**: When some documents are not ready or failed, the chat MUST say that answers cannot use them yet.

**Conversations**

- **FR-032**: Conversations MUST persist across sessions, be listed by most recent activity, be titled automatically from the first question (at most 60 characters) and be renamable (1 to 120 characters).
- **FR-033**: Reopening a conversation MUST show every question and answer with the sources exactly as they were cited, even after those documents change or are deleted.
- **FR-034**: Users MUST be able to delete a conversation after confirming, and its messages MUST go with it.
- **FR-035**: A stored question or answer MUST never change afterwards.

**Upload**

- **FR-036**: Users MUST be able to upload one PDF, plain-text or Markdown file of up to 10 MiB at a time and get a document made from its text, titled after the file name unless they give a title.
- **FR-037**: A file that is too large, of another type, not valid UTF-8 text, or without usable text MUST be rejected with a specific reason, and nothing MUST be created.

**AI providers**

- **FR-038**: The operator MUST be able to choose the provider, model and credentials for answering and for indexing independently, through configuration alone, among providers that offer the industry-standard chat and embedding interfaces.
- **FR-039**: Changing the indexing model MUST prepare the affected documents again automatically, and answers MUST never combine passages prepared by different models.
- **FR-040**: An invalid or incomplete AI configuration MUST be reported by setting name at start-up without stopping the parts of the product that need no AI.

**Usage**

- **FR-041**: Every AI request made on a user's behalf (answers, follow-up rewrites and indexing) MUST be recorded for that user with its provider, model, kind and token counts, and recording MUST never slow down or fail the request itself.
- **FR-042**: Users MUST be able to see their usage for the last 30 days as totals, per day in their own time zone, and per provider, model and kind; figures a provider did not report MUST be estimated and marked as estimated.

**Reliability**

- **FR-043**: Requests MUST be limited per user and per minute, with separate limits for questions, uploads and re-index requests, and a refused request MUST say when to try again.
- **FR-044**: Every screen MUST show a designed state while loading, when there is nothing to show and when a request fails, with a way to retry.
- **FR-045**: Every failure MUST reach the user as a stable error category with a readable message; internal details MUST never be shown.

### Key Entities

- **User**: an account identified by an email address; owns every other entity.
- **Document**: a title, content, tags, its origin (written in the editor or uploaded, with the file name), creation and change times, and its preparation state: status, attempts, next retry time, failure reason, number of passages and the model that prepared it.
- **Passage**: a piece of one document with its position, its heading path, its text, and the representation used to find it by meaning and by words; it records which model prepared it and which version of the document it came from.
- **Conversation**: an optional title, creation and last-activity times, and an ordered list of messages.
- **Message**: a question or an answer. An answer keeps a snapshot of every source it was given, with a flag on the ones it cited, plus the model, why generation ended and its token counts.
- **Usage record**: one AI request with its kind (answer, follow-up rewrite or indexing), provider, model, token counts, whether they were estimated, its duration, and links to the conversation, message or document it served.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time user can sign up, write a short document and read a cited answer about it in under 3 minutes.
- **SC-002**: 100% of attempts to read, change or delete another user's documents or conversations fail as "not found".
- **SC-003**: A newly saved document of up to 5,000 words is ready for questions within 60 seconds when the AI provider responds normally.
- **SC-004**: After an edit, 0 unchanged passages are sent for preparation again.
- **SC-005**: In 9 out of 10 questions, the first words of the answer appear within 3 seconds when the AI provider responds normally.
- **SC-006**: 100% of citation markers in stored answers open a passage the answer was given.
- **SC-007**: An answer stopped midway keeps its text after a reload in 100% of trials.
- **SC-008**: A document whose preparation was interrupted by a restart finishes without user action within the recovery window (10 minutes by default).
- **SC-009**: Moving answering or indexing to another supported provider takes configuration changes and a restart only: 0 code changes.
- **SC-010**: Every answer, follow-up rewrite and indexing request that reached the AI provider appears in its user's usage view under the right day, model and kind.
- **SC-011**: Each of the five screens (sign-in, library, editor, chat, usage) shows a designed loading, empty and error state, and no blank frame appears while data loads.
- **SC-012**: An evaluator gets from a fresh checkout to a working product with one setup command plus an AI key, and the full automated checks pass without an AI key, a database or any network service.

## Assumptions

- Users are individuals; there is no sharing, team space or public document.
- Email and password is the only sign-in method; password reset and social sign-in are out of scope.
- The interface is in English, and all its text lives in one dictionary so more languages can follow; matching by exact words assumes English text.
- Documents are text. Uploads accept PDF, plain text and Markdown only; scanned PDFs are rejected because image text recognition is out of scope.
- The operator supplies the AI credentials. Providers are external services whose speed and availability bound how fast answers and preparation can be.
- One answering provider and one indexing provider are active per deployment at a time.
- The usage view covers the last 30 calendar days and shows tokens, not money; budgets and prices are out of scope.
- Request limits hold per service instance.
- Local development signs users in without email confirmation; hosted deployments may require it.
- Known limit: very long unbroken text in scripts written without spaces (such as Chinese or Japanese) is prepared on the shared service process and can hold it for several seconds; moving preparation out of process is planned.
