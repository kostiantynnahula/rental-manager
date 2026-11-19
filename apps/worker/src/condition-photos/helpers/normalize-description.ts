import type { ConditionPhotoDescription } from '../interfaces/condition-photo-description.interface.js';
import type { RawDescription } from '../interfaces/raw-description.interface.js';
import { ROOMS } from './rooms.js';

// The API's limits (ConditionPhotoDescriptionDto): over them the PUT would be a 400, so texts are cut instead.
const MAX_ITEMS = 100;
const MAX_NAME = 200;
const MAX_CONDITION = 500;
const MAX_SUMMARY = 2000;

// The model's answer → the API body: trimmed, cut to the API's limits, unknown room → OTHER (the schema's enum is
// only a hint), items without a name dropped, count only when > 1, null → omitted. Throws on an empty summary
// (a plain Error: the job is retried, a new answer may have one).
export function normalizeDescription(raw: RawDescription): ConditionPhotoDescription {
  const summary = cut(raw.summary.trim(), MAX_SUMMARY);
  if (!summary) throw new Error('The model returned an empty summary');
  const room = (ROOMS as readonly string[]).includes(raw.room)
    ? (raw.room as ConditionPhotoDescription['room'])
    : 'OTHER';
  const items = raw.items
    .map(({ name, count, condition }) => {
      const cleanCondition = condition?.trim();
      return {
        name: cut(name.trim(), MAX_NAME),
        ...(Number.isInteger(count) && count! > 1 && { count: count! }),
        ...(cleanCondition && { condition: cut(cleanCondition, MAX_CONDITION) }),
      };
    })
    .filter((item) => item.name)
    .slice(0, MAX_ITEMS);
  return { room, items, summary };
}

function cut(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
