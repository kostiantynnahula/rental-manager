---
paths:
  - 'apps/web/components/condition-photos/**'
  - 'apps/web/lib/api/queries/condition-photos.ts'
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
  `description.summary`, «збіг N%» = `round(score × 100)`) in API order, a row opens the lightbox over the results;
  `keepPreviousData` (dimmed while the next query loads); empty → «Нічого не знайдено» + only described photos are
  searched. `useConditionPhotoSearch` is disabled for an empty `q`; API default limit.
- Lightbox detail (`ConditionPhotoDescription`, keyed by photo): `indexStatus` line unless INDEXED
  (`constants/index-status.ts`; FAILED + `indexNote`) and a collapsed «Опис» (`aria-expanded`): room
  (`constants/rooms.ts`, OTHER hidden), summary, items `назва ×N — стан`. `description` is typed in OpenAPI.
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
