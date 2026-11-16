import type { ButtonAction } from '../interfaces/button-action.interface.js';
import {
  base64urlToUuid,
  encodeAction,
  parseCallbackData,
  uuidToBase64url,
} from './callback-data.js';

const BATCH = '3f2a9c1e-7b4d-4e8a-9c3f-1d2e3f4a5b6c';
const READING = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const PHOTO = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
const APARTMENT = '00000000-0000-4000-8000-000000000000';

const ACTIONS: ButtonAction[] = [
  { kind: 'confirm', batchId: BATCH, readingId: READING },
  { kind: 'cancel', batchId: BATCH, readingId: READING },
  { kind: 'confirm-batch', batchId: BATCH },
  { kind: 'assign', photoId: PHOTO, apartmentId: APARTMENT },
];

describe('encodeAction / parseCallbackData', () => {
  it.each(ACTIONS)('round-trips $kind', (action) => {
    expect(parseCallbackData(encodeAction(action))).toEqual(action);
  });

  it.each(ACTIONS)('fits $kind into 64 bytes', (action) => {
    expect(Buffer.byteLength(encodeAction(action))).toBeLessThanOrEqual(64);
  });
});

describe('parseCallbackData', () => {
  const id = uuidToBase64url(BATCH);

  it.each([
    ['a button of the old bot', 'a:sometoken'],
    ['a reading button with one id', `rc:${id}`],
    ['a cancel button with three ids', `rx:${id}:${id}:${id}`],
    ['a batch button with two ids', `bc:${id}:${id}`],
    ['an assign button with one id', `as:${id}`],
    ['an unknown prefix', `zz:${id}`],
    ['bad base64url', `bc:${'!'.repeat(22)}`],
    ['a value that is not 16 bytes', `bc:${id}AA`],
    ['an empty string', ''],
  ])('returns null for %s', (_, data) => {
    expect(parseCallbackData(data)).toBeNull();
  });
});

describe('uuidToBase64url / base64urlToUuid', () => {
  it('encodes a UUID as 22 characters and decodes it back', () => {
    const encoded = uuidToBase64url(READING);
    expect(encoded).toHaveLength(22);
    expect(base64urlToUuid(encoded)).toBe(READING);
  });

  it.each(['A'.repeat(21), 'A'.repeat(24), 'A'.repeat(21) + '=', 'A'.repeat(21) + '+'])(
    'returns null for %s',
    (value) => {
      expect(base64urlToUuid(value)).toBeNull();
    },
  );
});
