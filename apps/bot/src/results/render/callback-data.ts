import type { ButtonAction } from '../interfaces/button-action.interface.js';

// callback_data ≤ 64 bytes: a UUID as base64url is 22 chars (36 as text), so two of them fit with a prefix.
//   rc:<batch>:<reading>  confirm a reading      rx:<batch>:<reading>  cancel a reading
//   bc:<batch>            confirm the batch      as:<photo>:<apartment> assign an apartment to a photo
// The batch is in the reading buttons so the summary can be re-rendered after the tap.

export function uuidToBase64url(uuid: string): string {
  return Buffer.from(uuid.replaceAll('-', ''), 'hex').toString('base64url');
}

// null for anything that isn't 16 bytes.
export function base64urlToUuid(value: string): string | null {
  if (!/^[A-Za-z0-9_-]{22}$/.test(value)) return null;
  const hex = Buffer.from(value, 'base64url').toString('hex');
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function encodeAction(action: ButtonAction): string {
  const b = uuidToBase64url;
  switch (action.kind) {
    case 'confirm':
      return `rc:${b(action.batchId)}:${b(action.readingId)}`;
    case 'cancel':
      return `rx:${b(action.batchId)}:${b(action.readingId)}`;
    case 'confirm-batch':
      return `bc:${b(action.batchId)}`;
    case 'assign':
      return `as:${b(action.photoId)}:${b(action.apartmentId)}`;
  }
}

// null = not one of ours or malformed (e.g. a button of the old bot) → «Кнопка застаріла».
export function parseCallbackData(data: string): ButtonAction | null {
  const [prefix, ...rest] = data.split(':');
  const ids = rest.map(base64urlToUuid);
  if (ids.some((id) => id === null)) return null;
  const [first, second] = ids as string[];
  if ((prefix === 'rc' || prefix === 'rx') && ids.length === 2) {
    return { kind: prefix === 'rc' ? 'confirm' : 'cancel', batchId: first, readingId: second };
  }
  if (prefix === 'bc' && ids.length === 1) return { kind: 'confirm-batch', batchId: first };
  if (prefix === 'as' && ids.length === 2) {
    return { kind: 'assign', photoId: first, apartmentId: second };
  }
  return null;
}
