// One POST /photos, as the intake needs it (helpers/upload-photos.ts).
export type UploadResponse =
  // In the order sent.
  | { kind: 'stored'; duplicates: boolean[] }
  // 400 `files[i]: …`: that file is bad (type, corrupt) — drop it and send the rest again.
  | { kind: 'bad-file'; index: number }
  | { kind: 'too-large' }
  // 401/403: the key is wrong, revoked or lacks photos:upload — a retry can't help.
  | { kind: 'unauthorized'; status: number }
  // Any other status or a network error; `detail` is for the log ("HTTP 500 (…)", "network error").
  | { kind: 'failed'; detail: string };
