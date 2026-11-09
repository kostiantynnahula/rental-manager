import type { components } from '../../api/schema.js';

type Meter = components['schemas']['MeterResponseDto'];

// "ELECTRICITY DAY_NIGHT "kitchen" last 2026-10-01 DAY=1520.000 NIGHT=830.000" — for logs.
export function describeMeter(m: Meter): string {
  const label = m.label ? ` "${m.label}"` : '';
  const last = m.lastReading
    ? ` last ${m.lastReading.period} ${m.lastReading.values.map((v) => `${v.zone}=${v.value}`).join(' ')}`
    : ' no readings';
  return `${m.utility} ${m.zoneScheme}${label}${last}`;
}
