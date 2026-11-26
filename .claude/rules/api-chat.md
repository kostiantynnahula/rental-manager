---
paths:
  - 'apps/api/src/chat/**'
---

# Apartment chat (API)

Epic #157: a chat per apartment with an agent (#159) that answers from read-only tools. This file covers the storage
and the CRUD routes (#158). The agent, streaming and the tools come later.

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
  - `parts` are **stored as-is** (no validation in #158: no route writes messages yet). #159 must validate them as
    an array of objects on write; the response falls back to `[]` for a non-array. Returned as an array of objects (`additionalProperties: true`), not `type: Object`, which the web types turn into
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
