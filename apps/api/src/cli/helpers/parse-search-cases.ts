import { isUUID } from 'class-validator';
import { ConditionPhotoEvent } from '../../generated/prisma/enums.js';
import type { SearchCase } from '../interfaces/search-case.interface.js';

const EVENTS = Object.values(ConditionPhotoEvent) as string[];

// Validates the whole file first and lists every problem (by case index), so nothing is called with a broken file.
export function parseSearchCases(raw: unknown): SearchCase[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('The cases file must be a non-empty JSON array');
  }
  const problems: string[] = [];
  raw.forEach((c: unknown, i) => {
    const at = (what: string) => problems.push(`  case ${i}: ${what}`);
    if (typeof c !== 'object' || c === null || Array.isArray(c)) return at('not an object');
    const { apartmentId, q, event, expected, ...rest } = c as Record<string, unknown>;
    if (Object.keys(rest).length) at(`unknown fields: ${Object.keys(rest).join(', ')}`);
    if (typeof apartmentId !== 'string' || !isUUID(apartmentId)) at('apartmentId must be a uuid');
    if (typeof q !== 'string' || !q.trim()) at('q must be a non-empty string');
    if (event !== undefined && (typeof event !== 'string' || !EVENTS.includes(event))) {
      at(`event must be one of ${EVENTS.join(', ')}`);
    }
    if (!Array.isArray(expected) || expected.length === 0) {
      at('expected must be a non-empty array of photo ids');
    } else {
      if (expected.some((id) => typeof id !== 'string' || !isUUID(id))) {
        at('expected must hold uuids');
      }
      if (new Set(expected).size !== expected.length) at('expected has duplicates');
    }
  });
  if (problems.length) throw new Error(`Invalid cases file:\n${problems.join('\n')}`);
  return (raw as SearchCase[]).map((c) => ({ ...c, q: c.q.trim() }));
}
