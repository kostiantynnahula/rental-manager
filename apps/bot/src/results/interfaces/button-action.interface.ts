// What a result button does; everything it needs is in its callback_data (render/callback-data.ts), so a button
// works after a restart.
export type ButtonAction =
  | { kind: 'confirm'; batchId: string; readingId: string }
  | { kind: 'cancel'; batchId: string; readingId: string }
  | { kind: 'confirm-batch'; batchId: string }
  | { kind: 'assign'; photoId: string; apartmentId: string };
