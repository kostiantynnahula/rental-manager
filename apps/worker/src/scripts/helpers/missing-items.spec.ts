import { missingItems } from './missing-items.js';

describe('missingItems', () => {
  const items = [{ name: 'Мийка (раковина)' }, { name: 'змішувач' }, { name: 'холодильник' }];

  it('finds an expected name as a case-insensitive substring of an item name', () => {
    expect(missingItems(['раковина', 'ХОЛОДИЛЬНИК', ' змішувач '], items)).toEqual([]);
  });

  it('returns the expected names not found, in order', () => {
    expect(missingItems(['пральна машина', 'мийка', 'кран'], items)).toEqual([
      'пральна машина',
      'кран',
    ]);
  });

  it('ignores blank expectations and handles no items', () => {
    expect(missingItems(['', '  '], items)).toEqual([]);
    expect(missingItems(['стіл'], [])).toEqual(['стіл']);
  });
});
