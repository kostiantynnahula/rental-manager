import { parseUserIds } from './parse-user-ids.js';

describe('parseUserIds', () => {
  it('parses a comma-separated list, ignoring spaces and empty parts', () => {
    expect(parseUserIds(' 123, 456 ,,789, ')).toEqual(new Set([123, 456, 789]));
  });

  it('parses a single id', () => {
    expect(parseUserIds('42')).toEqual(new Set([42]));
  });

  it('drops duplicates', () => {
    expect(parseUserIds('1,1,2')).toEqual(new Set([1, 2]));
  });
});
