---
paths:
  - 'apps/web/components/chat/**'
  - 'apps/web/components/ai-elements/**'
  - 'apps/web/lib/api/queries/chats.ts'
  - 'apps/web/lib/api/chat-fetch.ts'
---

# Apartment chat (Web)

Epic #157, API: `api-chat.md`. The apartment tab «Чат» (#161): ask about the apartment's condition, get a streamed
answer that cites condition photos.

- **URL**: `?tab=chat` = the list, `&chat=<id>` = one chat (one screen at a time on a phone). `parseChatId`: not a
  uuid → the list. Back («‹ Чати») clears `chat`.
- **List** (`ChatList`): last active first (API order), title or «Без назви», date · message count. «Новий чат»
  creates and opens it (hidden for an archived apartment: the API answers 404; its chats can still be read,
  renamed, deleted). ⋯ → rename (`RenameChatDialog`, one field so no RHF; blank → null, ≤ 100) and delete
  (`ConfirmDialog`). Mutations invalidate `chatKeys.all`; delete removes the detail instead (it would 404).
- **Conversation** (`ChatConversation` → `ChatSession`):
  - History from `GET /chats/:id` (`useChatDetail`; not `useChat`, that's the AI SDK's hook) → `toUIMessages` →
    `useChat({ id, messages })`. useChat takes its initial messages only once, so `ChatSession` is keyed by the
    query's `dataUpdatedAt`: a refetch remounts it. Nothing refetches mid-answer: no window-focus refetch, and
    `onFinish` only marks the detail stale (`refetchType: 'none'`) + invalidates the lists. The header title comes
    from the list (refetched after the answer that titled the chat), the detail's as a fallback.
  - Transport: `DefaultChatTransport` → `/api/chats/:id/messages`, `credentials: 'same-origin'`,
    `prepareSendMessagesRequest` sends **only `{ message }`** (the last one: the API owns the history).
  - `fetch: chatFetch` (`lib/api/chat-fetch.ts`): the openapi-fetch `authMiddleware` never sees this request, so the
    same rule is repeated: 401 → the shared single-flight `refreshOnce()` → one retry with the same init (a JSON
    string body, replayable); refresh failed → `endSession()`.
  - Layout: the open chat fills the viewport below the sticky app header (minus the phone's bottom nav) and is
    scrolled into view on open, so the input is always on screen; messages scroll inside `Conversation`
    (use-stick-to-bottom).
- **Rendering** (`ChatMessageView`): a question = plain text. An answer's parts:
  - `text` → `ChatAnswerText`: `[[photo:<id>]]` → `[фото](#photo:<id>)` (`photoMarkersToLinks`), and the
    Streamdown `a` override renders such a link as an inline `PhotoChip` (thumbnail
    `/api/condition-photos/<id>/thumbnail` — the API's `thumbnailUrl`, built from the id — linking to the photo's
    page). A hash link survives Streamdown's link hardening. Other links open in a new tab.
  - Tool parts (`dynamic-tool` from `@ai-sdk/langchain`) → `ToolStatus` only while running and only on the
    streaming message: «Шукаю фото: <query>…», «Дивлюсь стан квартири…», «Дивлюсь договори…»
    (`constants/tool-labels.ts`). A finished call shows nothing.
  - `data-sources` → «Джерела»: a row of chips (`ChatSources`), in the API's order.
  - «Думаю…» (`isThinking`): waiting for the first byte, or streaming with nothing showing (before the first part,
    after a tool's output while the model plans the next step).
- **Input** (`ChatInput`): Textarea ≤ 2000. Enter sends with a fine pointer; on a touch screen Enter is a new line
  (the button sends). While `submitted`/`streaming` the button is «Зупинити» → `stop()`: the API aborts the run and
  saves no answer, so the partial text stays on screen only until the chat is reopened.
- **Errors** (`chatErrorMessage`): an HTTP error comes before the stream as `APICallError` with `statusCode` (409 «ще
  готується», 503 no model key, 404, 400, 429, else generic). A failure mid-stream is the API's error part, already
  Ukrainian, shown as is. Offline = a `TypeError`.
- **Streaming through the `/api` rewrite**: the rewrite proxy itself streams, but Next's built-in `compression`
  (on by default, also for rewritten responses) gzips `text/event-stream` and held the whole answer until it ended
  (one chunk at ~6 s). The API sends `Cache-Control: no-cache, no-transform`, which `compression` skips — keep it
  on any streamed route. A route handler would not help: its response goes through the same compression. Check with
  a `fetch` in the page that reads `res.body` and logs chunk times (many chunks, no `content-encoding`).
- **AI Elements** (`components/ai-elements/`, shadcn from `registry.ai-sdk.dev`): `conversation`, `loader` as
  generated; `message` trimmed to `Message`/`MessageContent`/`MessageResponse` (no branches/attachments/actions, so
  no `button-group`/`tooltip`). Re-adding one: answer **no** to overwriting existing `ui/*` (the 44px sizes). Streamdown's
  classes are in Tailwind's sources (`@source` in `globals.css`).
