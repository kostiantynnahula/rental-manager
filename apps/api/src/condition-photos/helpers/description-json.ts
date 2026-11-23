import { Prisma } from '../../generated/prisma/client.js';
import type { ConditionPhotoDescription } from '../interfaces/condition-photo-description.interface.js';

// A plain object for a Json column (a validated DTO is a class instance; JSON drops the prototype).
// Same content, whatever the key order (jsonb reorders keys; a DTO keeps the client's order). Item order counts.
export function sameDescription(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
  );
}

export function toDescriptionJson(description: ConditionPhotoDescription): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(description)) as Prisma.InputJsonObject;
}

// A `where` filter matching a nullable Json column's current value (SQL NULL, never a JSON null, in these columns).
export function jsonEquals(
  value: Prisma.JsonValue | null,
): Prisma.JsonNullableFilter<'ConditionPhoto'> {
  return { equals: value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue) };
}
