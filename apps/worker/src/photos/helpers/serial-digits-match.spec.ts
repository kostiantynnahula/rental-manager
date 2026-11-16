import { serialDigitsMatch } from './serial-digits-match.js';

describe('serialDigitsMatch', () => {
  it('matches equal serials', () => {
    expect(serialDigitsMatch('02006847', '02006847')).toBe(true);
  });

  it('matches a prefix of >= 6 digits (serial cut off at the photo edge)', () => {
    expect(serialDigitsMatch('8486065', '848606502415')).toBe(true);
    expect(serialDigitsMatch('848606502415', '8486065')).toBe(true);
  });

  it('matches a suffix of >= 6 digits (leading year)', () => {
    expect(serialDigitsMatch('202402006847', '02006847')).toBe(true);
    expect(serialDigitsMatch('006847', '202402006847')).toBe(true);
  });

  it('does not match a 5-digit fragment', () => {
    expect(serialDigitsMatch('84860', '848606502415')).toBe(false);
    expect(serialDigitsMatch('06847', '202402006847')).toBe(false);
  });

  it('does not match different serials', () => {
    expect(serialDigitsMatch('12345678', '87654321')).toBe(false);
  });
});
