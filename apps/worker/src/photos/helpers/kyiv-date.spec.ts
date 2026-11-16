import { kyivDate } from './kyiv-date.js';

describe('kyivDate', () => {
  it('uses the Kyiv day in winter (UTC+2)', () => {
    expect(kyivDate(new Date('2026-10-31T22:30:00Z'))).toBe('2026-11-01');
  });

  it('uses the Kyiv day in summer (UTC+3)', () => {
    expect(kyivDate(new Date('2026-06-30T21:30:00Z'))).toBe('2026-07-01');
  });

  it('keeps the same day before midnight in Kyiv', () => {
    expect(kyivDate(new Date('2026-10-31T21:30:00Z'))).toBe('2026-10-31');
  });
});
