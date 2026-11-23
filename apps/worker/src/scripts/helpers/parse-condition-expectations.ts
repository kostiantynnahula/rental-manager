import type { ConditionSampleExpectation } from '../interfaces/condition-sample-expectation.interface.js';

// describe:samples' expected.json → entries with trimmed, non-blank item names. Throws a message naming the file
// on a wrong shape, instead of a TypeError later.
export function parseConditionExpectations(json: unknown): ConditionSampleExpectation[] {
  if (!Array.isArray(json)) throw new Error('expected.json must be an array of { file, items }');
  return json.map((entry: unknown, i) => {
    const { file, items } = (entry ?? {}) as { file?: unknown; items?: unknown };
    if (typeof file !== 'string' || !file) {
      throw new Error(`expected.json[${i}]: "file" must be a non-empty string`);
    }
    if (!Array.isArray(items) || !items.every((x) => typeof x === 'string')) {
      throw new Error(`expected.json[${i}] (${file}): "items" must be an array of strings`);
    }
    return { file, items: items.map((x: string) => x.trim()).filter(Boolean) };
  });
}
