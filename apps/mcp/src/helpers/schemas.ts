import { z } from 'zod';
import type { components } from '../api/schema.js';
import { kopiykyToUah } from './money.js';

// Shared input pieces and output shapes. Every mapper is a field allowlist: only what is listed leaves the server.
type Schemas = components['schemas'];

export const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM')
  .describe('Month, YYYY-MM (e.g. 2026-11)');
export const idSchema = z.uuid();

export const utility = z.enum(['ELECTRICITY', 'COLD_WATER', 'HOT_WATER', 'GAS']);
export const zone = z.enum(['TOTAL', 'DAY', 'NIGHT']);
export const readingKind = z.enum(['REGULAR', 'INITIAL', 'FINAL']);
const uah = z.string().describe('UAH, e.g. "15864.00"');

export const zoneValue = z.object({ zone, value: z.string() });

export const meterSummary = z.object({
  id: z.string(),
  utility,
  zoneScheme: z.enum(['SINGLE', 'DAY_NIGHT']),
  label: z.string().nullable(),
  serialNumber: z.string().nullable(),
});

export function toMeterSummary(
  m: Schemas['MeterSummaryResponseDto'],
): z.infer<typeof meterSummary> {
  return {
    id: m.id,
    utility: m.utility,
    zoneScheme: m.zoneScheme,
    label: m.label ?? null,
    serialNumber: m.serialNumber ?? null,
  };
}

export const tariffSummary = z.object({
  tariffId: z.string(),
  name: z.string(),
  kind: z
    .enum(['METERED', 'FIXED', 'MANUAL'])
    .describe('FIXED = a monthly fee; MANUAL = amount from a bill'),
  utilities: z.array(utility),
  activeFrom: z.string().describe('YYYY-MM'),
  activeTo: z.string().nullable().describe('YYYY-MM, null = open-ended'),
  prices: z
    .array(z.object({ zone, price: uah, effectiveFrom: z.string() }))
    .describe('Prices in effect this month (UAH per unit; for FIXED, per month)'),
});

export function toTariffSummary(
  a: Schemas['ApartmentTariffResponseDto'],
): z.infer<typeof tariffSummary> {
  return {
    tariffId: a.tariff.id,
    name: a.tariff.name,
    kind: a.tariff.kind,
    utilities: a.tariff.utilities,
    activeFrom: a.activeFrom,
    activeTo: a.activeTo ?? null,
    prices: a.tariff.currentPrices.map((p) => ({
      zone: p.zone,
      price: p.price,
      effectiveFrom: p.effectiveFrom,
    })),
  };
}

export const statementLine = z.object({
  type: z.enum(['RENT', 'FIXED', 'METERED', 'MANUAL']),
  name: z.string(),
  zone: zone.nullable(),
  utilities: z.array(utility),
  quantity: z.string().nullable(),
  unitPrice: uah.nullable(),
  amount: uah,
  meters: z.array(
    z.object({
      utility,
      label: z.string().nullable(),
      serialNumber: z.string().nullable(),
      consumption: z.string(),
    }),
  ),
});

export function toStatementLine(
  l: Schemas['StatementLineResponseDto'],
): z.infer<typeof statementLine> {
  return {
    type: l.type,
    name: l.name,
    zone: l.zone ?? null,
    utilities: l.utilities ?? [],
    quantity: l.quantity ?? null,
    unitPrice: l.unitPrice ?? null,
    amount: kopiykyToUah(l.amount),
    meters: (l.meters ?? []).map((m) => ({
      utility: m.utility,
      label: m.label ?? null,
      serialNumber: m.serialNumber ?? null,
      consumption: m.consumption,
    })),
  };
}

export const statementWarning = z.object({
  code: z.enum([
    'MISSING_READING',
    'NO_PRICE',
    'NO_METERS',
    'MULTIPLE_LEASES',
    'UNUSUAL_CONSUMPTION',
    'MISSING_MANUAL_AMOUNT',
  ]),
  utility: utility.nullable(),
  label: z.string().nullable(),
  tariffName: z.string().nullable(),
  zone: zone.nullable(),
  consumption: z.string().nullable(),
  limit: z.number().nullable(),
  months: z.number().nullable(),
  reason: z.enum(['ABOVE_LIMIT', 'ZERO_CONSUMPTION']).nullable(),
});

export function toStatementWarning(
  w: Schemas['StatementWarningResponseDto'],
): z.infer<typeof statementWarning> {
  return {
    code: w.code,
    utility: w.utility ?? null,
    label: w.label ?? null,
    tariffName: w.tariffName ?? null,
    zone: w.zone ?? null,
    consumption: w.consumption ?? null,
    limit: w.limit ?? null,
    months: w.months ?? null,
    reason: w.reason ?? null,
  };
}
