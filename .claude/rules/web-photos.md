---
paths:
  - 'apps/web/components/photos/**'
---

# Photos (Web)

## Photos (`components/photos/`)

- API images only via `ApiImage` (refresh + one reload on error); `fileUrl` = original, `thumbnailUrl` = 400px WebP.
- Tab "Фото": `?photos=all` (default "unassigned"); delete follows the list's `canDelete` (tap on a disabled one
  explains why — no tooltips on a phone). Upload = plain `<input type="file" multiple>`, multipart via
  `bodySerializer` → `FormData`; error texts in `helpers/upload-error-message.ts`.
- Review screen `/apartments/[id]/photos/[photoId]`: photo (fullscreen zoom with `react-zoom-pan-pinch`), readings
  already taken from it, one-meter form. No worker yet → saved with `confirm: true` + `photoId` (source PHOTO).
  Meter select = `GET /apartments/:id/readings?period=` (MISSING preselected, CONFIRMED disabled); previous values
  from the meter's `lastReading`. Defaults live in `formDefaults()` so a worker DRAFT can prefill them later.
- Period/date rules shared with batch entry: `components/readings/helpers/reading-date-issue.ts`.
- `useCreateReading` with a `photoId` also invalidates `photoKeys.all` (the photo leaves "unassigned").
