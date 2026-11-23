---
paths:
  - 'apps/web/components/condition-photos/**'
  - 'apps/web/lib/api/queries/condition-photos.ts'
  - 'apps/web/app/(app)/apartments/*/condition-photos/**'
---

# Condition photos (Web)

Epic #125, API: `api-condition-photos.md`. Photos of the apartment's condition (check-in / check-out / changes),
separate from meter photos (`web-photos.md`): no parsing, no review screen.

- Shown in two places, both via `ConditionPhotoTimeline`:
  - Apartment tab «Стан» (`?tab=condition`, `ApartmentConditionTab`): the whole history; upload defaults to «Зміна».
    The tab renders the upload itself (timeline `canUpload={false}`), so it stays while searching.
  - Lease page, card «Стан квартири»: `lease={lease}` → `range = { from: startDate, to: endDate }` (open-ended →
    `from` only), the same rule the API uses to derive a photo's lease (`helpers/is-within-lease.ts`). Upload
    defaults (`helpers/default-event.ts`, `default-taken-on.ts`): an ended lease → «Виїзд» on its **last day** (today
    would fall outside the lease and the photo would leave the page); otherwise «Заїзд», today. A date outside the
    lease shows a hint «Дата поза договором…» (e.g. check-in before an upcoming lease starts — its start date is in
    the future, so it can't be the default); such a photo shows only on the apartment tab.
  - Upload is hidden for an archived apartment (the API answers 404). On the lease page it's hidden only once the
    apartment is known to be archived (`isActive !== false`): while it loads or if it failed, the API decides.
- Timeline: groups by `takenOn` + event in API order (`takenOn desc, uploadedAt desc`; `helpers/group-by-day-event.ts`),
  heading «Заїзд · 01.11.2026 · N». Thumbnail tap → `ConditionPhotoLightbox` = `PhotoFullscreen` (zoom) with a
  `footer`: ‹ › over the whole list on screen (arrow keys too), event · date · «N з M», note. Closes itself when the list empties. The event choice is toggle buttons
  (`aria-pressed`), not a radiogroup.
- Search (apartment tab only, #131): input → `useDebouncedValue(300)` → `?q=` (the tenants pattern), event filter
  toggles «Усі · Заїзд · Виїзд · Зміна» → `?event=` (`parseEventFilter`, default `all` left out) — applies to the
  timeline too. `q` set → `ConditionPhotoSearchResults` instead of the timeline: rows (thumbnail, event · date,
  `description.summary`) in API order, a row opens the lightbox over the results. No score (#141): every result
  already passed the API's rerank threshold, and a correct 0.5 would read as a bad match. `keepPreviousData` (results
  or the empty state dimmed while the next query loads); empty → «Нічого не знайдено» + only photos already in the
  search (INDEXED) are searched. Empty also means nothing was relevant enough. `parseQuery` trims and caps `?q=`
  (500, the API's limit).
  The lightbox is rendered outside the states (as in the timeline), so it closes itself when a refetch empties the
  results. `useConditionPhotoSearch` is disabled for an empty `q`; API default limit.
- Lightbox detail (`ConditionPhotoDescription`, keyed by photo): `indexStatus` line unless INDEXED
  (`constants/index-status.ts`; FAILED + `indexNote`) and a collapsed «Опис» (`aria-expanded`): room
  (`constants/rooms.ts`, OTHER hidden), summary, items `назва ×N — стан`. `description` is typed in OpenAPI.
  Read-only: editing is on the photo's page. «Відкрити» links there and also closes the lightbox (the tab stays
  mounted, hidden — it would still be open on Back).
- Photo page `/apartments/[id]/condition-photos/[photoId]` (#143, `ConditionPhotoPage`; states as the meter photo
  review page): `useConditionPhoto` (`conditionPhotoKeys.detail(id)` under `all`, so every mutation refreshes it;
  polls 5 s while PENDING / DESCRIBED), `PhotoViewer` (zoom), event · date as the title, note, the lease line (the
  derived `lease` → `/leases/<id>?from=apartment` with dates · primary tenant, else «Поза договором»), `indexStatus`.
  ⋯ menu = the card's edit sheet and delete dialog (`onDeleted` → `router.replace` to `?tab=condition`). The back
  link always goes to `?tab=condition`, also when opened from a lease page.
- Description editor (`ConditionPhotoDescriptionForm`, zod `descriptionSchema`, the API's limits copied into
  `constants/description.ts`): room (`ROOM_OPTIONS`, all 7 — «Інше» is selectable here), summary, items via
  `useFieldArray` (name; count as text, blank = left out; condition, blank = left out) → `PATCH { description }`, the
  whole description. No description yet (PENDING / FAILED) → an empty form: describe by hand.
  - «Змінено вручну · дата» when `descriptionEditedAt`. «Повернути опис моделі» only when edited **and**
    `generatedDescription` exists → `ConfirmDialog` → `PATCH { description: null }`. 409 (changed meanwhile) →
    «Опис змінився, поки ви редагували. Оновіть сторінку».
  - Remount (`ConditionPhotoDescriptionSection`): key `id:descriptionEditedAt:description===null` → fresh defaults
    after a save, a restore, an edit elsewhere or the worker's first description — **but not while dirty** (the
    poll must not throw a draft away; the form reports `onDirtyChange`). Another photo id always remounts (a kept
    draft would be saved to the previous photo). A restore resets the form first, so the restored text shows.
  - `useUnsavedChanges` guard; `markSaved()` after a save (a page hidden right after resets to the saved values).
- Upload (`UploadConditionPhotosSheet` + form): plain `<input type="file" multiple>` with local previews
  (`FilePreview`: object URL revoked by the React 19 ref cleanup; the first 12, then «ще N»), then one event, date (today, not in the future)
  and note for all files. `useUploadConditionPhotos` sends **chunks of `PHOTO_MAX_FILES`** one after another; a failed
  chunk after stored ones → `UploadPartialError` («Завантажено N з M. <reason>»). The sheet stays open on errors and
  can't be closed mid-upload; sending the same files again is safe (stored ones come back `duplicate: true`).
  Error texts: `helpers/upload-error-message.ts` (404 archived, 409 another apartment; file errors reuse the meter
  photos' helper).
- Edit / delete from the card's ⋯ menu: `EditConditionPhotoForm` (shared `ConditionPhotoFields`, zod
  `conditionPhotoSchema`) PATCHes only changed fields (cleared note → `null`; nothing changed → no request);
  delete = `ConfirmDialog`, always allowed. Every mutation invalidates `conditionPhotoKeys.all` (lists of both pages + searches).
