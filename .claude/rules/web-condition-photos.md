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
  - Lease page, card «Стан квартири»: `range = { from: startDate, to: endDate }` (open-ended → `from` only), the
    same rule the API uses to derive a photo's lease. Upload defaults to «Заїзд», or «Виїзд» once the lease has
    ended (`helpers/default-event.ts`). A photo dated outside the lease (e.g. check-in the day before an upcoming
    lease starts) shows only on the apartment tab.
  - Upload is hidden for an archived apartment (the API answers 404).
- Timeline: groups by `takenOn` + event in API order (`takenOn desc, uploadedAt desc`; `helpers/group-by-day-event.ts`),
  heading «Заїзд · 01.11.2026 · N». Thumbnail tap → `ConditionPhotoLightbox` = `PhotoFullscreen` (zoom) with a
  `footer`: ‹ › over the whole list on screen (arrow keys too), event · date · «N з M», note.
- Upload (`UploadConditionPhotosSheet` + form): plain `<input type="file" multiple>` with local previews
  (`FilePreview`: object URL revoked by the React 19 ref cleanup), then one event, date (today, not in the future)
  and note for all files. `useUploadConditionPhotos` sends **chunks of `PHOTO_MAX_FILES`** one after another; a failed
  chunk after stored ones → `UploadPartialError` («Завантажено N з M. <reason>»). The sheet stays open on errors and
  can't be closed mid-upload; sending the same files again is safe (stored ones come back `duplicate: true`).
  Error texts: `helpers/upload-error-message.ts` (404 archived, 409 another apartment; file errors reuse the meter
  photos' helper).
- Edit / delete from the card's ⋯ menu: `EditConditionPhotoForm` (shared `ConditionPhotoFields`, zod
  `conditionPhotoSchema`) PATCHes only changed fields (cleared note → `null`; nothing changed → no request);
  delete = `ConfirmDialog`, always allowed. Every mutation invalidates `conditionPhotoKeys.lists()` (both pages).
