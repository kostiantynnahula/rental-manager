import { lastReading, meter } from '../../test/builders.js';
import { plausibilityWarnings } from './plausibility-warnings.js';

// ELECTRICITY TOTAL (single-zone) limit: 200 kWh/month (CONSUMPTION_LIMITS in @rental/shared).
const elec = (period: string, value: string) =>
  meter({
    utility: 'ELECTRICITY',
    zoneScheme: 'SINGLE',
    lastReading: lastReading(period, { TOTAL: value }),
  });

describe('plausibilityWarnings', () => {
  it('has nothing to compare without a lastReading', () => {
    expect(plausibilityWarnings(meter(), 'TOTAL', '5', '2026-11')).toEqual([]);
  });

  it('has nothing to compare when the last reading lacks the zone', () => {
    const m = meter({
      zoneScheme: 'DAY_NIGHT',
      lastReading: lastReading('2026-10', { DAY: '100.000' }),
    });
    expect(plausibilityWarnings(m, 'NIGHT', '50', '2026-11')).toEqual([]);
  });

  it('warns about a value lower than the last confirmed one', () => {
    expect(plausibilityWarnings(elec('2026-10', '1520.000'), 'TOTAL', '1519.5', '2026-11')).toEqual(
      ['менше за останнє підтверджене (1519.5 < 1520.000)'],
    );
  });

  it('accepts consumption within the limit', () => {
    expect(plausibilityWarnings(elec('2026-10', '1000.000'), 'TOTAL', '1200', '2026-11')).toEqual(
      [],
    );
  });

  it('warns above the monthly limit', () => {
    const [warning] = plausibilityWarnings(
      elec('2026-10', '1000.000'),
      'TOTAL',
      '1200.5',
      '2026-11',
    );
    expect(warning).toContain('за 1 міс.');
    expect(warning).toContain('200/міс.');
  });

  it('scales the limit by the months since the last reading', () => {
    const m = elec('2026-09', '1000.000');
    expect(plausibilityWarnings(m, 'TOTAL', '1399', '2026-11')).toEqual([]);
    expect(plausibilityWarnings(m, 'TOTAL', '1401', '2026-11')[0]).toContain('за 2 міс.');
  });

  it('counts at least one month (same period)', () => {
    const m = elec('2026-11', '1000.000');
    expect(plausibilityWarnings(m, 'TOTAL', '1150', '2026-11')).toEqual([]);
    expect(plausibilityWarnings(m, 'TOTAL', '1250', '2026-11')[0]).toContain('за 1 міс.');
  });
});
