import { extracted } from '../../test/builders.js';
import { draftNote } from './draft-note.js';

describe('draftNote', () => {
  it('is undefined for a high-confidence reading without warnings', () => {
    expect(draftNote(extracted({ confidence: 'high', issues: ['glare'] }), [])).toBeUndefined();
  });

  it('lists the warnings', () => {
    expect(draftNote(extracted({ zone: 'DAY' }), ['w1', 'w2'])).toBe('Фото DAY: w1; w2');
  });

  it("adds the model's confidence and issues when not high", () => {
    expect(
      draftNote(extracted({ confidence: 'low', issues: ['glare', 'blurred last digit'] }), ['w1']),
    ).toBe('Фото TOTAL: w1; впевненість low: glare, blurred last digit');
  });

  it('adds the confidence without issues', () => {
    expect(draftNote(extracted({ confidence: 'medium' }), [])).toBe(
      'Фото TOTAL: впевненість medium',
    );
  });

  it('truncates to 1000 characters', () => {
    const note = draftNote(extracted(), ['x'.repeat(2000)]);
    expect(note).toHaveLength(1000);
    expect(note?.endsWith('…')).toBe(true);
  });

  it('keeps a note of exactly 1000 characters', () => {
    const prefix = 'Фото TOTAL: ';
    const note = draftNote(extracted(), ['x'.repeat(1000 - prefix.length)]);
    expect(note).toHaveLength(1000);
    expect(note?.endsWith('x')).toBe(true);
  });
});
