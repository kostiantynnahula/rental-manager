import { kopiykyToUah, uahToKopiyky } from './money.js';

describe('money', () => {
  it.each([
    [1586400, '15864.00'],
    [5, '0.05'],
    [0, '0.00'],
    [12345, '123.45'],
    [-250, '-2.50'],
  ])('%i kopiyky → %s UAH', (kopiyky, uah) => {
    expect(kopiykyToUah(kopiyky)).toBe(uah);
  });

  it.each([
    ['123.45', 12345],
    ['123.4', 12340],
    ['123', 12300],
    ['0.05', 5],
  ])('%s UAH → %i kopiyky', (uah, kopiyky) => {
    expect(uahToKopiyky(uah)).toBe(kopiyky);
  });

  it.each(['1.234', '-1', '1,50', '', 'abc'])('rejects %j', (uah) => {
    expect(() => uahToKopiyky(uah)).toThrow();
  });

  it('rejects a non-integer amount from the API', () => {
    expect(() => kopiykyToUah(1.5)).toThrow();
  });
});
