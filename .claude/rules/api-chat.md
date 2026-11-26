---
paths:
  - 'apps/api/src/chat/**'
---

# Apartment chat (API)

Epic #157: a chat per apartment with an agent (#159) that answers from read-only tools. This file covers the storage
and the CRUD routes (#158). The agent, streaming and the tools come later.

- **Chat** (`chats`): belongs to one **apartment** (`onDelete: Restrict`; apartments are archived, never deleted).
  `title` ≤ 100, null = untitled (#159 sets it from the first ~60 chars of the first question; `PATCH` renames).
  `updatedAt` orders the list.
- **ChatMessage** (`chat_messages`): `role` USER | ASSISTANT, `parts` Json = AI SDK `UIMessage` parts, `createdAt`.
  `ON DELETE CASCADE` with its chat. Index (`chatId`, `createdAt`).
  - **One row per message, not one Json array on `Chat`**: messages are only appended, and #159 reads the last
    `CHAT_HISTORY_LIMIT` by the index. A growing array would be rewritten on every message, and two parallel writes
    could lose one.
  - `parts` are **stored as-is** (no validation in #158: no route writes messages yet; #159 writes them). Returned as
    an array of objects (`additionalProperties: true`), not `type: Object`, which the web types turn into
    `Record<string, never>`.
  - Stored: the questions and the final answers (with sources), not tool results.
- **The server owns the history**: the client sends only its new message, and the API loads the history from the
  DB. A client can't forge earlier turns or trim what the model sees.
- Routes (human-only, no `@Scopes`: API keys are denied):
  - `POST /apartments/:id/chats` (no body) → an empty, untitled chat. Unknown **or archived** apartment → **404**,
    as condition photos.
  - `GET /apartments/:id/chats` → `id, title, updatedAt, messageCount` (Prisma `_count`), `updatedAt desc, id desc`.
    Unknown apartment → 404. Archived apartment → still listed.
  - `GET /chats/:id` → the chat + all messages, `createdAt asc, id asc`.
  - `PATCH /chats/:id { title }`: the key is required, and null or blank (trimmed) → null.
  - `DELETE /chats/:id` → 204, messages cascade.
  - Unknown chat → 404 `Chat not found`. An archived apartment's chats can still be read, renamed and deleted.
