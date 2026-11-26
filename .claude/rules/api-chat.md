---
paths:
  - 'apps/api/src/chat/**'
---

# Apartment chat (API)

Epic #157: a chat per apartment with an agent (#159) that answers from read-only tools. This file covers the storage,
the CRUD routes (#158) and the agent with its streaming route (#159).

- **Chat** (`chats`): belongs to one **apartment** (`onDelete: Restrict`; apartments are archived, never deleted).
  `title` ≤ 100, null = untitled (#159 sets it from the first ~60 chars of the first question; `PATCH` renames).
  `updatedAt` orders the list: Prisma's `@updatedAt` only changes when the chat row is written, so #159 must touch
  the chat (e.g. `chat.update({ data: { updatedAt: new Date() } })`) in the transaction that adds messages. A
  rename bumps it too, which counts as activity.
- **ChatMessage** (`chat_messages`): `role` USER | ASSISTANT, `parts` Json = AI SDK `UIMessage` parts, `createdAt`,
  `seq`. `ON DELETE CASCADE` with its chat. Index (`chatId`, `seq`).
  - **Ordered by `seq`** (autoincrement = insertion order), never by `createdAt`: a question and its answer saved in
    one transaction get the same `createdAt` (`CURRENT_TIMESTAMP` = transaction start), and the uuid v4 `id` is
    random, so neither breaks the tie. `seq` is internal (not in responses).
  - **One row per message, not one Json array on `Chat`**: messages are only appended, and #159 reads the last
    `CHAT_HISTORY_LIMIT` by the index. A growing array would be rewritten on every message, and two parallel writes
    could lose one.
  - `parts` are written only by `ChatAgentService`: the question as one `{ type: 'text', text }` (built from the
    validated DTO), the answer as its text parts + a `data-sources` part. The response still falls back to `[]` for a
    non-array. Returned as an array of objects (`additionalProperties: true`), not `type: Object`, which the web types turn into
    `Record<string, never>`.
  - Stored: the questions and the final answers (with sources), not tool results.
- **The server owns the history**: the client sends only its new message, and the API loads the history from the
  DB. A client can't forge earlier turns or trim what the model sees.
- Routes (human-only, no `@Scopes`: API keys are denied):
  - `POST /apartments/:id/chats` (no body) → an empty, untitled chat. Unknown **or archived** apartment → **404**,
    as condition photos.
  - `GET /apartments/:id/chats` → `id, title, updatedAt, messageCount` (Prisma `_count`), `updatedAt desc, id desc`.
    Unknown apartment → 404. Archived apartment → still listed.
  - `GET /chats/:id` → the chat + all messages, oldest first (`seq asc`).
  - `PATCH /chats/:id { title }`: the key is required, and null or blank (trimmed) → null.
  - `DELETE /chats/:id` → 204, messages cascade.
  - Unknown chat → 404 `Chat not found`. An archived apartment's chats can still be read, renamed and deleted.
  - `POST /chats/:id/messages { message }` → the agent's answer, streamed (below).

## Agent (#159)

- **Stack**: `createAgent` from `langchain` v1 (the current agent API, on LangGraph) with `ChatAnthropic`
  (`CHAT_MODEL`, default Sonnet; `maxTokens` 4096). The stream goes through `@ai-sdk/langchain` (`toBaseMessages` →
  `agent.stream` → `toUIMessageStream`) into the AI SDK UI message stream protocol (`createUIMessageStream` →
  `pipeUIMessageStreamToResponse`, SSE).
- **Env**: `ANTHROPIC_API_KEY` is **shared with the worker** (one root `.env`), optional: without it the route answers
  **503** before saving. A placeholder that passes the `sk-ant-` check gets a failed run (an error part) instead.
  `CHAT_HISTORY_LIMIT` (20), `CHAT_MAX_TOOL_CALLS` (5).
- **Request**: `message` = a user `UIMessage` with text parts only (`ChatUserMessageDto`). The parts joined and trimmed
  give 1–2000 chars (`helpers/question.ts`), else 400. The client's message `id` is not stored.
- **Flow** (`ChatAgentService.send`):
  1. 400/409/404/503 checks, before any byte is written, so they stay normal JSON errors. An **archived apartment's
     chat still answers**.
  2. The question is saved **first** (+ the title from it, ~60 chars on a word boundary, if untitled, + `updatedAt`),
     in one transaction. A failed run leaves the question unanswered; the user asks again.
  3. History = the last `CHAT_HISTORY_LIMIT` (20) messages by `seq`, new question included, text parts only. It
     starts at a question (`toHistory` drops leading answers): an even window of alternating turns starts with an
     answer, and the model's conversation must open with the user.
  4. On success: a `data-sources` part, then the answer is saved (text parts + `data-sources`, + `updatedAt`), then
     `finish`. Saving before `finish` lets a client reload the chat on finish and see the answer.
  5. Any failure after the stream started → one error part with a fixed Ukrainian text (the cause goes to the log
     only), and **no answer saved**. A client disconnect aborts the run (no answer saved either).
- **One run per chat**: an in-process `Set` of chat ids → 409. One API process, and a restart ends the run anyway. A
  second process would need a shared lock. Released only once the run itself is over: the pipe returns as soon as
  the client disconnects, so the service also awaits `execute`.
- **Tools** (`agent/chat-tools.ts`): read-only and bound to the chat's apartment. The model never names an apartment.
  - `search_photos { query, event?, from?, to? }` → `ConditionPhotosService.search` (the reranked search), 10 max.
  - `get_condition_baseline { date? }` (default today, Kyiv) → `ConditionPhotosService.baseline`, grouped by room.
  - `get_leases {}` → start, end, the PRIMARY tenant's name. Never phones, emails, notes or rent (`toLeaseFact`).
  - A photo = `photoId, event, takenOn, room, summary, items, note` (`toPhotoFact`). `room`/`summary` null = not
    described yet.
  - A tool's 400 (e.g. `from` after `to`) goes back to the model as `{ error }` to fix its call. Any other failure
    (Voyage/rerank down) **ends the run** (`ctx.fail` aborts it), so an answer never says "no photos" when search failed.
  - `CHAT_MAX_TOOL_CALLS` (5): `toolCallLimitMiddleware({ runLimit, exitBehavior: 'continue' })`, not
    `recursionLimit`. A recursion limit throws (no answer). With `continue`, a call past the limit gets an error
    message, and the model answers with what it has.
- **Sources** (`helpers/sources.ts`): the agent cites `[[photo:<id>]]` (system prompt). Only ids a tool returned **in
  this run** are kept: `photoMarkerFilter` strips any other marker (any id shape, made-up ones too) from the streamed
  text. A marker split across deltas is held back while the tail can still become one (no length cap), and flushed at
  the text part's end. `data-sources` = `{ photoIds }` in order of first mention.
- **Agent setup** (`agent/chat-agent.ts`): `newRunContext`, `buildChatAgent` (tools, system prompt, tool-call limit)
  and `usageCallback`, shared by `ChatAgentService` and the `chat:debug` CLI, so the CLI runs the route's agent.
- **`chat:debug`** (`src/cli/chat-debug.ts`, own `ChatDebugModule`: the condition-photos module needs Redis):
  `pnpm --filter api chat:debug -- --apartment <id|name> "<question>"` runs the agent once, with no chat and no
  history (nothing saved). It prints the tool calls (args, count, ms; a failed run still lists those that ran), the answer after `stripUnknownMarkers`, the
  kept and stripped photo ids (`citedIds` − `sourcesInOrder`) and the tokens. The question and the answer go to
  stdout, never to a log.
- **Log** (one line per run): outcome, ms, each tool's name, result count and ms, and token usage (summed per model
  call by a `handleLLMEnd` callback, so failed runs count too). Never the question or the answer text.
