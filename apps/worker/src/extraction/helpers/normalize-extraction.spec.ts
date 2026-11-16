import { extracted, meter } from '../../test/builders.js';
import type { ExtractedReading } from '../interfaces/extracted-reading.interface.js';
import { normalizeExtraction } from './normalize-extraction.js';

const single = meter({ id: 'm1', zoneScheme: 'SINGLE' });

function normalizeOne(reading: ExtractedReading, meters = [single]): ExtractedReading {
  const result = normalizeExtraction({ readings: [reading], photoIssues: [] }, meters);
  expect(result.readings).toHaveLength(1);
  return result.readings[0];
}

describe('normalizeExtraction', () => {
  describe('value', () => {
    it('turns a decimal comma into a dot and drops leading zeros', () => {
      expect(normalizeOne(extracted({ value: '00532,20' })).value).toBe('532.20');
    });

    it('keeps a single leading zero before the decimal point', () => {
      expect(normalizeOne(extracted({ value: '0.5' })).value).toBe('0.5');
    });

    it('trims whitespace', () => {
      expect(normalizeOne(extracted({ value: ' 72.9 ' })).value).toBe('72.9');
    });

    it('flags a value that is not a meter number, but keeps it', () => {
      const r = normalizeOne(extracted({ value: '12.3456' }));
      expect(r.value).toBe('12.3456');
      expect(r.issues).toContain('value is not a meter number');
      expect(r.confidence).toBe('low');
    });
  });

  describe('serial', () => {
    it('keeps digits only', () => {
      expect(normalizeOne(extracted({ serialNumber: '№ 02-006 847' })).serialNumber).toBe(
        '02006847',
      );
    });

    it('is null without digits', () => {
      expect(normalizeOne(extracted({ serialNumber: '—' })).serialNumber).toBeNull();
      expect(normalizeOne(extracted({ serialNumber: null })).serialNumber).toBeNull();
    });
  });

  describe('meterId', () => {
    it('keeps a known meterId', () => {
      expect(normalizeOne(extracted({ meterId: 'm1' })).meterId).toBe('m1');
    });

    it('replaces an unknown meterId with null + an issue + low confidence', () => {
      const r = normalizeOne(extracted({ meterId: 'nope', confidence: 'high' }));
      expect(r.meterId).toBeNull();
      expect(r.issues).toContain('unknown meterId');
      expect(r.confidence).toBe('low');
    });

    it('flags a zone the matched meter does not have', () => {
      const r = normalizeOne(extracted({ meterId: 'm1', zone: 'DAY', confidence: 'high' }));
      expect(r.meterId).toBe('m1');
      expect(r.issues).toContain('zone DAY not on a SINGLE meter');
      expect(r.confidence).toBe('low');
    });
  });

  it('leaves the confidence of a clean reading unchanged', () => {
    const r = normalizeOne(extracted({ meterId: 'm1', confidence: 'medium', issues: ['glare'] }));
    expect(r.confidence).toBe('medium');
    expect(r.issues).toEqual(['glare']);
  });

  it("keeps the model's issues before our own", () => {
    const r = normalizeOne(extracted({ meterId: 'nope', issues: ['glare'] }));
    expect(r.issues).toEqual(['glare', 'unknown meterId']);
  });

  it('drops nothing and passes photoIssues through', () => {
    const result = normalizeExtraction(
      {
        readings: [extracted({ value: 'abc' }), extracted({ meterId: 'nope' }), extracted()],
        photoIssues: ['glare'],
      },
      [single],
    );
    expect(result.readings).toHaveLength(3);
    expect(result.photoIssues).toEqual(['glare']);
  });
});
