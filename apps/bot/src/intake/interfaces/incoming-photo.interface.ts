export interface IncomingPhoto {
  fileId: string;
  // As reported by Telegram; may be absent.
  fileSize?: number;
  // Sent to the API as the original filename (metadata only).
  filename: string;
  // The file's own name, shown when it is rejected; null for a compressed photo (it has none → «фото N»).
  displayName: string | null;
}
