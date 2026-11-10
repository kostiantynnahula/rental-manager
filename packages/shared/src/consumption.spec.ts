import { describe, expect, it } from 'vitest';
import { consumptionLimit, consumptionWarnings, type ConsumptionInput } from './consumption.js';

const base: ConsumptionInput = {
  utility: 'ELECTRICITY',
  zone: 'DAY',
  consumption: '0',
  months: 1,
  hasLease: false,
};

const warn = (input: Partial<ConsumptionInput>) => consumptionWarnings({ ...base, ...input });

describe('consumptionLimit', () => {
  it.each([
    ['ELECTRICITY', 'DAY', 130],
    ['ELECTRICITY', 'NIGHT', 70],
    ['ELECTRICITY', 'TOTAL', 200],
    ['COLD_WATER', 'TOTAL', 20],
    ['HOT_WATER', 'TOTAL', 20],
    ['GAS', 'TOTAL', 20],
  ] as const)('%s %s → %s', (utility, zone, limit) => {
    expect(consumptionLimit(utility, zone)).toBe(limit);
  });

  it('has no limit for a zone the utility does not have', () => {
    expect(consumptionLimit('COLD_WATER', 'DAY')).toBeNull();
  });
});

describe('consumptionWarnings', () => {
  it('is fine at the limit and warns 0.001 above it', () => {
    expect(warn({ consumption: '130' })).toEqual([]);
    expect(warn({ consumption: '130.001' })).toEqual(['ABOVE_LIMIT']);
  });

  it.each([
    ['NIGHT', '70', '70.5'],
    ['TOTAL', '200', '200.1'],
  ] as const)('uses the %s limit', (zone, ok, above) => {
    expect(warn({ zone, consumption: ok })).toEqual([]);
    expect(warn({ zone, consumption: above })).toEqual(['ABOVE_LIMIT']);
  });

  it('checks water and gas', () => {
    expect(warn({ utility: 'COLD_WATER', zone: 'TOTAL', consumption: '20' })).toEqual([]);
    expect(warn({ utility: 'HOT_WATER', zone: 'TOTAL', consumption: '20.01' })).toEqual([
      'ABOVE_LIMIT',
    ]);
    expect(warn({ utility: 'GAS', zone: 'TOTAL', consumption: '25' })).toEqual(['ABOVE_LIMIT']);
  });

  it('scales the limit by the months between readings', () => {
    expect(warn({ consumption: '390', months: 3 })).toEqual([]);
    expect(warn({ consumption: '390.001', months: 3 })).toEqual(['ABOVE_LIMIT']);
  });

  it('counts less than one month as one', () => {
    expect(warn({ consumption: '130', months: 0 })).toEqual([]);
    expect(warn({ consumption: '131', months: 0 })).toEqual(['ABOVE_LIMIT']);
  });

  it('flags zero electricity only when a lease covers the period', () => {
    expect(warn({ consumption: '0', hasLease: true })).toEqual(['ZERO_CONSUMPTION']);
    expect(warn({ consumption: '0.000', zone: 'TOTAL', hasLease: true })).toEqual([
      'ZERO_CONSUMPTION',
    ]);
    expect(warn({ consumption: '0', hasLease: false })).toEqual([]);
    expect(warn({ consumption: '0.001', hasLease: true })).toEqual([]);
  });

  it('never flags zero water or gas', () => {
    expect(warn({ utility: 'COLD_WATER', zone: 'TOTAL', hasLease: true })).toEqual([]);
    expect(warn({ utility: 'GAS', zone: 'TOTAL', hasLease: true })).toEqual([]);
  });

  it('skips the limit for a zone without one', () => {
    expect(warn({ utility: 'GAS', zone: 'DAY', consumption: '1000' })).toEqual([]);
  });
});
