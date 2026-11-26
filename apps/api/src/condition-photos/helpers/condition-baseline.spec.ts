import type { ConditionPhoto } from '../../generated/prisma/client.js';
import { ConditionPhotoEvent } from '../../generated/prisma/enums.js';
import { conditionBaseline } from './condition-baseline.js';

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

function photo(
  id: string,
  event: ConditionPhotoEvent,
  takenOn: string,
  uploadedAt = '2026-01-01T00:00:00.000Z',
): ConditionPhoto {
  return { id, event, takenOn: day(takenOn), uploadedAt: new Date(uploadedAt) } as ConditionPhoto;
}

const ids = (r: { photos: ConditionPhoto[] }) => r.photos.map((p) => p.id);
const { CHECK_IN, CHECK_OUT, CHANGE } = ConditionPhotoEvent;

describe('conditionBaseline', () => {
  it('takes the latest check-in day and the changes after it', () => {
    const result = conditionBaseline(
      [
        photo('old-in', CHECK_IN, '2025-01-10'),
        photo('old-change', CHANGE, '2025-03-01'),
        photo('in1', CHECK_IN, '2026-02-01'),
        photo('in2', CHECK_IN, '2026-02-01', '2026-02-01T10:00:00.000Z'),
        photo('ch', CHANGE, '2026-04-01'),
      ],
      day('2026-06-01'),
    );
    expect(result.checkInOn).toEqual(day('2026-02-01'));
    expect(ids(result)).toEqual(['in1', 'in2', 'ch']);
  });

  it('ignores photos after the date', () => {
    const result = conditionBaseline(
      [photo('in', CHECK_IN, '2026-02-01'), photo('later', CHANGE, '2026-05-01')],
      day('2026-04-01'),
    );
    expect(ids(result)).toEqual(['in']);
  });

  it('uses an earlier check-in when a later one is after the date', () => {
    const result = conditionBaseline(
      [photo('in1', CHECK_IN, '2025-01-01'), photo('in2', CHECK_IN, '2026-09-01')],
      day('2026-01-01'),
    );
    expect(result.checkInOn).toEqual(day('2025-01-01'));
    expect(ids(result)).toEqual(['in1']);
  });

  it('excludes CHECK_OUT photos', () => {
    const result = conditionBaseline(
      [photo('in', CHECK_IN, '2026-01-01'), photo('out', CHECK_OUT, '2026-01-20')],
      day('2026-02-01'),
    );
    expect(ids(result)).toEqual(['in']);
  });

  it('includes a change on the check-in day, after the check-in', () => {
    const result = conditionBaseline(
      [photo('ch', CHANGE, '2026-01-01'), photo('in', CHECK_IN, '2026-01-01')],
      day('2026-01-01'),
    );
    expect(ids(result)).toEqual(['in', 'ch']);
  });

  it('without a check-in returns every change up to the date', () => {
    const result = conditionBaseline(
      [
        photo('b', CHANGE, '2026-03-01'),
        photo('a', CHANGE, '2026-01-01'),
        photo('c', CHANGE, '2026-09-01'),
      ],
      day('2026-06-01'),
    );
    expect(result.checkInOn).toBeNull();
    expect(ids(result)).toEqual(['a', 'b']);
  });

  it('is empty for no photos', () => {
    expect(conditionBaseline([], day('2026-06-01'))).toEqual({ checkInOn: null, photos: [] });
  });
});
