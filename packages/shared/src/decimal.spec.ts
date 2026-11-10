import { describe, expect, it } from 'vitest';
import { fromThousandths, toThousandths } from './decimal.js';

describe('toThousandths', () => {
  it.each([
    ['0', 0n],
    ['12', 12000n],
    ['532.2', 532200n],
    ['0.001', 1n],
    ['12.345', 12345n],
    ['-1.5', -1500n],
  ])('%s → %s', (input, expected) => {
    expect(toThousandths(input)).toBe(expected);
  });
});

describe('fromThousandths', () => {
  it.each([
    [0n, '0'],
    [532200n, '532.2'],
    [1n, '0.001'],
    [12000n, '12'],
    [-1500n, '-1.5'],
  ])('%s → %s', (input, expected) => {
    expect(fromThousandths(input)).toBe(expected);
  });
});
