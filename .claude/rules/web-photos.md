---
paths:
  - 'apps/web/components/photos/**'
---

# Photos (Web)

## Photos (`components/photos/`)

- API images only via `ApiImage` (refresh + one reload on error); `fileUrl` = original, `thumbnailUrl` = 400px WebP.
- Tab "Фото": `?photos=all` (default "unassigned"); delete follows the list's `canDelete` (tap on a disabled one
  explains why — no tooltips on a phone). Upload = plain `<input type="file" multiple>`, multipart via
  `bodySerializer` → `FormData`; error texts in `helpers/upload-error-message.ts`. "Нерозібрані" also keeps photos
  whose values are still in a DRAFT (the worker's), until confirmed.
- Parse status (`parseStatus` / `parseNote` from the API): card badge for PENDING / NOT_MATCHED / FAILED
  (`constants/parse-statuses.ts`, else "Використано"); a status line on the review screen (`PhotoParseStatusLine`,
  the worker's note under "Деталі"). The list and `usePhoto` poll every 5 s while a photo is PENDING; when the status
  changes the review screen invalidates the month's readings and remounts the form (`key = photoId:parseStatus`).
- Review screen `/apartments/[id]/photos/[photoId]`: photo (fullscreen zoom with `react-zoom-pan-pinch`), readings
  already taken from it (with the zones from this photo), one-meter form. Every typed value gets this `photoId`
  (source PHOTO). A two-zone meter: checkboxes "Зони на цьому фото" (one photo = one register). A meter with a DRAFT
  this month: the zones it took from **this** photo (the worker's proposal) come prefilled and editable; its other
  values shown read-only (`DraftValues`); the missing zones can be added → PATCH (kept values keep their photo,
  `mergeDraftValues`). The draft's `note` (worker warnings/doubts) is shown above. Complete → confirmed right away;
  partial → saved as DRAFT ("Зберегти чернетку", "бракує: Ніч"); a complete draft whose prefill nobody changed gets
  "Підтвердити чернетку" (confirm only).
  Meter select = `GET /apartments/:id/readings?period=` (a draft with a value from this photo preselected, then
  MISSING, then DRAFT; CONFIRMED disabled); previous values from the meter's `lastReading`. Defaults live in
  `formDefaults()` (a photo with a DRAFT opens on its month).
- 📷 elsewhere (history — one per distinct photo of the values, `HistoryPhotoLinks`; statement meters):
  `PhotoLinkButton({ photoId, label })` — loads the photo on tap and
  opens `PhotoFullscreen` (the same zoom dialog the review screen uses); 404 → "Фото видалено".
- Period/date rules shared with batch entry: `components/readings/helpers/reading-date-issue.ts`.
- `useCreateReading` / `useUpdateReading` / `useConfirmReading` with a value that has a `photoId` also invalidate
  `photoKeys.all` (the photo leaves "unassigned").
