import { badFileIndex } from './bad-file-index.js';

describe('badFileIndex', () => {
  it('returns the index of the API per-file error', () => {
    expect(badFileIndex('files[2]: unsupported type image/gif')).toBe(2);
    expect(badFileIndex('files[0]: too large')).toBe(0);
  });

  it.each(['', 'Unauthorized', 'files: too many', 'files[x]: bad', 'error in files[1]: bad'])(
    'returns null for %j',
    (message) => {
      expect(badFileIndex(message)).toBeNull();
    },
  );
});
