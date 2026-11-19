import type { RawDescription } from '../interfaces/raw-description.interface.js';
import { normalizeDescription } from './normalize-description.js';

function raw(overrides: Partial<RawDescription> = {}): RawDescription {
  return {
    room: 'KITCHEN',
    items: [{ name: 'холодильник', count: null, condition: null }],
    summary: 'Кухня.',
    ...overrides,
  };
}

describe('normalizeDescription', () => {
  it('omits null count and condition', () => {
    expect(normalizeDescription(raw())).toEqual({
      room: 'KITCHEN',
      items: [{ name: 'холодильник' }],
      summary: 'Кухня.',
    });
  });

  it('keeps a count only when it is an integer above 1', () => {
    const items = normalizeDescription(
      raw({
        items: [
          { name: 'стілець', count: 4, condition: null },
          { name: 'стіл', count: 1, condition: null },
          { name: 'лампа', count: 2.5, condition: null },
        ],
      }),
    ).items;
    expect(items).toEqual([{ name: 'стілець', count: 4 }, { name: 'стіл' }, { name: 'лампа' }]);
  });

  it('trims texts and drops items without a name or blank conditions', () => {
    const result = normalizeDescription(
      raw({
        items: [
          { name: '  змішувач ', count: null, condition: ' іржа на основі ' },
          { name: '   ', count: null, condition: 'щось' },
          { name: 'плита', count: null, condition: '  ' },
        ],
        summary: '  Кухня.  ',
      }),
    );
    expect(result.items).toEqual([
      { name: 'змішувач', condition: 'іржа на основі' },
      { name: 'плита' },
    ]);
    expect(result.summary).toBe('Кухня.');
  });

  it('replaces an unknown room with OTHER', () => {
    expect(normalizeDescription(raw({ room: 'GARAGE' })).room).toBe('OTHER');
  });

  it("cuts texts and the item list to the API's limits", () => {
    const result = normalizeDescription(
      raw({
        items: Array.from({ length: 120 }, () => ({
          name: 'а'.repeat(300),
          count: null,
          condition: 'б'.repeat(600),
        })),
        summary: 'в'.repeat(2500),
      }),
    );
    expect(result.items).toHaveLength(100);
    expect(result.items[0].name).toHaveLength(200);
    expect(result.items[0].condition).toHaveLength(500);
    expect(result.summary).toHaveLength(2000);
    expect(result.summary.endsWith('…')).toBe(true);
  });

  it('throws on an empty summary', () => {
    expect(() => normalizeDescription(raw({ summary: '  ' }))).toThrow(/empty summary/);
  });
});
