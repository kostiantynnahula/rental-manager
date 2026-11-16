import { monthsBetween } from './months-between.js';

describe('monthsBetween', () => {
  it('counts months within a year', () => {
    expect(monthsBetween('2026-09', '2026-11')).toBe(2);
  });

  it('counts months across a year', () => {
    expect(monthsBetween('2025-11', '2026-02')).toBe(3);
  });

  it('is 0 for the same period', () => {
    expect(monthsBetween('2026-11', '2026-11')).toBe(0);
  });
});
