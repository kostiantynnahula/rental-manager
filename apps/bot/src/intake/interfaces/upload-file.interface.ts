// A downloaded photo, ready for POST /photos.
export interface UploadFile {
  bytes: Uint8Array<ArrayBuffer>;
  filename: string;
  // For the reply if the API rejects it.
  name: string;
}
