import { conditionDescription } from '../../test/condition-photo-services.js';
import { formatDescription, formatItem } from './format-description.js';

describe('formatItem', () => {
  it('shows the count only when more than one', () => {
    expect(formatItem({ name: 'стілець', count: 2 })).toBe('стілець ×2');
    expect(formatItem({ name: 'стіл', count: 1 })).toBe('стіл');
  });

  it('adds the trimmed condition when there is one', () => {
    expect(formatItem({ name: 'холодильник', condition: ' подряпина ' })).toBe(
      'холодильник — подряпина',
    );
    expect(formatItem({ name: 'холодильник', condition: '  ' })).toBe('холодильник');
    expect(formatItem({ name: 'стілець', count: 3, condition: 'потертий' })).toBe(
      'стілець ×3 — потертий',
    );
  });
});

describe('formatDescription', () => {
  it('lists the items, then the summary', () => {
    const lines = formatDescription(
      conditionDescription({
        items: [{ name: 'мийка' }, { name: 'кран', condition: 'тече' }],
        summary: 'Кухня.',
      }),
    );
    expect(lines).toEqual(['  - мийка', '  - кран — тече', '  summary: Кухня.']);
  });

  it('says so when there are no items', () => {
    expect(formatDescription(conditionDescription({ items: [], summary: 'Порожньо.' }))).toEqual([
      '  (no items)',
      '  summary: Порожньо.',
    ]);
  });
});
