// What a button does. A single reading's confirm/cancel fits into callback_data (stateless, survives a restart);
// the others go through a token in ResultsStateService (Telegram allows 64 bytes of callback_data).
export type ResultAction =
  | { kind: 'confirm'; readingId: string }
  | { kind: 'cancel'; readingId: string }
  | { kind: 'confirm-all'; readingIds: string[] }
  | { kind: 'assign'; photoId: string; apartmentId: string; apartmentName: string };
