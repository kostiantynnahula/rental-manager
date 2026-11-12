export interface IncomingPhoto {
  fileId: string;
  // As reported by Telegram; may be absent.
  fileSize?: number;
  filename: string;
}
