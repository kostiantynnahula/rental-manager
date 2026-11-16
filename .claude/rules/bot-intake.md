---
paths:
  - 'apps/bot/src/intake/**'
---

# Photo intake (bot, `src/intake/`)

- Accepted: `message:photo` (the largest size) and `message:document` with an `image/*` MIME (sent as a file =
  original quality). Any other document → «Надішліть фото лічильника». The API decides the real type by content.
- **Buffer, then one upload**: an album is one update per photo (same `media_group_id`). `AlbumBuffer` (pure class)
  collects them by `album:<media_group_id>`, else `chat:<chatId>`, until 1.5 s of silence or 10 photos (Telegram's
  album maximum = the API's default `PHOTO_MAX_FILES`). Then: download each (`getFile`, over
  `min(20 MB Bot API limit, PHOTO_MAX_FILE_SIZE_MB)` → not downloaded), then **one `POST /photos`** with all files and
  `replyTo = <chatId>:<messageId of the first photo>` → one `batchId` for the album.
- **Relaxed rule** (was "never buffer photos before upload"): the handler returns before the upload, so a crash
  inside the window loses the buffered photos — the user resends; resending is safe (sha256 dedup).
- The API rejects a request with a bad file as a whole (`400 files[i]: …`, nothing stored): the bot drops file `i`
  and sends the rest again. 413 → the rest is "too large"; 401/403 → "no access to the API" (logged: check the key and
  scope); other errors → "try again".
- **One reply** to the first photo: «Прийнято N фото, розпізнаю…», «N фото вже отримано раніше.» (duplicates), one
  line per rejected file — its file name, or «фото N» (position) for a compressed photo. A failed reply is only
  logged (the photos are in the inbox).
- The file download URL (`<apiRoot>/file/bot<token>/…`, root, environment and token taken from the grammY `Api`,
  never hardcoded or read from config) contains the token: its errors are rethrown without URL or cause.
