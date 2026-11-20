import { truncate } from './truncate.js';

describe('truncate', () => {
  it('keeps a shorter text', () => {
    expect(truncate('abc', 5)).toBe('abc');
  });

  it('keeps a text of exactly max characters', () => {
    expect(truncate('abcde', 5)).toBe('abcde');
  });

  it('cuts a longer text to max characters ending with …', () => {
    expect(truncate('abcdefgh', 5)).toBe('abcd…');
  });
});
