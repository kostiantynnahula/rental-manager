import { extracted, meter } from '../../test/builders.js';
import { inboxSummary } from './inbox-summary.js';
import { DIFFERENT_APARTMENTS_SKIP } from './one-apartment.js';

describe('inboxSummary', () => {
  it('says the meters are of different apartments', () => {
    expect(
      inboxSummary([
        { reading: extracted(), skip: DIFFERENT_APARTMENTS_SKIP },
        { reading: extracted(), skip: DIFFERENT_APARTMENTS_SKIP },
      ]),
    ).toBe('Лічильники різних квартир на одному фото');
  });

  it('says the serial was not found when nothing matched', () => {
    expect(inboxSummary([{ reading: extracted(), skip: 'serial 02006847 matches no meter' }])).toBe(
      'Серійний номер не знайдено серед активних лічильників',
    );
  });

  it('is null when nothing was read', () => {
    expect(inboxSummary([])).toBeNull();
  });

  it('is null when something matched', () => {
    expect(
      inboxSummary([
        { reading: extracted(), meter: meter() },
        { reading: extracted(), skip: 'no serial' },
      ]),
    ).toBeNull();
  });
});
