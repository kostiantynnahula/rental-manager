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
  already taken from it (with the zones from this photo), one-meter form. Every typed value gets this `photoId`
  (source PHOTO). A two-zone meter: checkboxes "Зони на цьому фото" (one photo = one register). A meter with a DRAFT
  this month: its values shown read-only (`DraftValues`), the form fills only the missing zones → PATCH (kept values
  keep their photo, `mergeDraftValues`). Complete → confirmed right away; partial → saved as DRAFT ("Зберегти
  чернетку", "бракує: Ніч"); a complete untouched draft (worker) gets "Підтвердити чернетку".
  Meter select = `GET /apartments/:id/readings?period=` (MISSING preselected, then DRAFT; CONFIRMED disabled); previous
  values from the meter's `lastReading`. Defaults live in `formDefaults()`.
- 📷 elsewhere (history — one per distinct photo of the values, `HistoryPhotoLinks`; statement meters):
  `PhotoLinkButton({ photoId, label })` — loads the photo on tap and
  opens `PhotoFullscreen` (the same zoom dialog the review screen uses); 404 → "Фото видалено".
- Period/date rules shared with batch entry: `components/readings/helpers/reading-date-issue.ts`.
- `useCreateReading` / `useUpdateReading` / `useConfirmReading` with a value that has a `photoId` also invalidate
  `photoKeys.all` (the photo leaves "unassigned").
