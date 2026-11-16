import { extracted, meter } from '../../test/builders.js';
import type { ReadingMatch } from '../interfaces/reading-match.interface.js';
import { DIFFERENT_APARTMENTS_SKIP, oneApartment } from './one-apartment.js';

describe('oneApartment', () => {
  it('keeps matches of one apartment unchanged', () => {
    const matches: ReadingMatch[] = [
      { reading: extracted({ zone: 'DAY' }), meter: meter({ id: 'm1', apartmentId: 'a1' }) },
      { reading: extracted({ zone: 'TOTAL' }), meter: meter({ id: 'm2', apartmentId: 'a1' }) },
      { reading: extracted(), skip: 'serial 1234 matches no meter' },
    ];
    expect(oneApartment(matches)).toEqual(matches);
  });

  it('keeps an empty list', () => {
    expect(oneApartment([])).toEqual([]);
  });

  it('skips every matched reading when meters of several apartments matched', () => {
    const unmatched: ReadingMatch = { reading: extracted(), skip: 'no serial' };
    const a = extracted({ serialNumber: '11111111' });
    const b = extracted({ serialNumber: '22222222' });
    const result = oneApartment([
      { reading: a, meter: meter({ id: 'm1', apartmentId: 'a1' }) },
      { reading: b, meter: meter({ id: 'm2', apartmentId: 'a2' }) },
      unmatched,
    ]);
    expect(result).toEqual([
      { reading: a, skip: DIFFERENT_APARTMENTS_SKIP },
      { reading: b, skip: DIFFERENT_APARTMENTS_SKIP },
      unmatched,
    ]);
  });
});
