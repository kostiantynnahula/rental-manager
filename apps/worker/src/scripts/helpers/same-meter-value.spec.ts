import { sameMeterValue } from './same-meter-value.js';

describe('sameMeterValue', () => {
  it('ignores trailing zeros after the decimal point', () => {
    expect(sameMeterValue('19.70', '19.7')).toBe(true);
    expect(sameMeterValue('19.0', '19')).toBe(true);
    expect(sameMeterValue('19.000', '19')).toBe(true);
  });

  it('does not trim zeros of an integer', () => {
    expect(sameMeterValue('20', '2')).toBe(false);
  });

  it('tells different values apart', () => {
    expect(sameMeterValue('19.71', '19.7')).toBe(false);
  });
});
