import { extracted, meter } from '../../test/builders.js';
import { matchReadings } from './match-readings.js';

const byApartment = { serialOnly: false };
const inbox = { serialOnly: true };

describe('matchReadings', () => {
  describe('a recognized serial decides alone', () => {
    it('matches the meter with that serial', () => {
      const target = meter({ id: 'm1', serialNumber: '02006847' });
      const other = meter({ id: 'm2', serialNumber: '11112222' });
      const [match] = matchReadings(
        [extracted({ serialNumber: '02006847' })],
        [other, target],
        byApartment,
      );
      expect(match.meter?.id).toBe('m1');
    });

    it('compares digits only of the stored serial', () => {
      const target = meter({ id: 'm1', serialNumber: '02-006 847' });
      const [match] = matchReadings(
        [extracted({ serialNumber: '02006847' })],
        [target],
        byApartment,
      );
      expect(match.meter?.id).toBe('m1');
    });

    it('skips when the serial matches no meter, without a utility fallback', () => {
      // The only ELECTRICITY TOTAL meter would fit by utility, but the serial says it's another meter.
      const only = meter({ id: 'm1', serialNumber: '11112222' });
      const [match] = matchReadings([extracted({ serialNumber: '99998888' })], [only], byApartment);
      expect(match.meter).toBeUndefined();
      expect(match.skip).toBe('serial 99998888 matches no meter');
    });

    it('skips when the serial matches two meters', () => {
      const a = meter({ id: 'm1', serialNumber: '848606502415' });
      const b = meter({ id: 'm2', serialNumber: '848606509999' });
      const [match] = matchReadings([extracted({ serialNumber: '8486065' })], [a, b], byApartment);
      expect(match.meter).toBeUndefined();
      expect(match.skip).toBe('serial 8486065 matches 2 meters');
    });
  });

  describe('without a serial (< 4 digits)', () => {
    it('matches the one meter of that utility + zone', () => {
      const elec = meter({ id: 'm1', utility: 'ELECTRICITY', zoneScheme: 'DAY_NIGHT' });
      const gas = meter({ id: 'm2', utility: 'GAS' });
      const [match] = matchReadings(
        [extracted({ serialNumber: '27', utility: 'ELECTRICITY', zone: 'NIGHT' })],
        [gas, elec],
        byApartment,
      );
      expect(match.meter?.id).toBe('m1');
    });

    it('skips when utility + zone fit several meters', () => {
      const kitchen = meter({ id: 'm1', utility: 'COLD_WATER', label: 'kitchen' });
      const bathroom = meter({ id: 'm2', utility: 'COLD_WATER', label: 'bathroom' });
      const [match] = matchReadings(
        [extracted({ utility: 'COLD_WATER' })],
        [kitchen, bathroom],
        byApartment,
      );
      expect(match.meter).toBeUndefined();
      expect(match.skip).toBe('2 COLD_WATER meters with TOTAL, no serial');
    });

    it('skips when no meter has that utility + zone', () => {
      const [match] = matchReadings(
        [extracted({ utility: 'GAS' })],
        [meter({ utility: 'ELECTRICITY' })],
        byApartment,
      );
      expect(match.skip).toBe('0 GAS meters with TOTAL, no serial');
    });
  });

  it('skips a zone the matched meter does not have', () => {
    const single = meter({ id: 'm1', serialNumber: '02006847', zoneScheme: 'SINGLE' });
    const [match] = matchReadings(
      [extracted({ serialNumber: '02006847', zone: 'NIGHT' })],
      [single],
      byApartment,
    );
    expect(match.meter).toBeUndefined();
    expect(match.skip).toBe('zone NIGHT not on a SINGLE meter');
  });

  it('skips a value that is not a meter number', () => {
    const [match] = matchReadings([extracted({ value: '12,5' })], [meter()], byApartment);
    expect(match.meter).toBeUndefined();
    expect(match.skip).toBe('value "12,5" is not a meter number');
  });

  it('skips both readings of the same meter + zone', () => {
    const only = meter({ id: 'm1' });
    const matches = matchReadings(
      [extracted({ value: '100' }), extracted({ value: '200' })],
      [only],
      byApartment,
    );
    expect(matches.map((m) => m.meter)).toEqual([undefined, undefined]);
    expect(matches.map((m) => m.skip)).toEqual([
      'TOTAL read twice for one meter',
      'TOTAL read twice for one meter',
    ]);
  });

  it('keeps two zones of one meter', () => {
    const dayNight = meter({ id: 'm1', zoneScheme: 'DAY_NIGHT' });
    const matches = matchReadings(
      [extracted({ zone: 'DAY' }), extracted({ zone: 'NIGHT' })],
      [dayNight],
      byApartment,
    );
    expect(matches.map((m) => m.meter?.id)).toEqual(['m1', 'm1']);
  });

  it('serialOnly: skips a reading without a serial', () => {
    const [match] = matchReadings([extracted({ serialNumber: null })], [meter()], inbox);
    expect(match.meter).toBeUndefined();
    expect(match.skip).toBe('no serial (inbox photo: matched by serial only)');
  });

  it('serialOnly: matches by serial', () => {
    const target = meter({ id: 'm1', serialNumber: '02006847' });
    const [match] = matchReadings([extracted({ serialNumber: '02006847' })], [target], inbox);
    expect(match.meter?.id).toBe('m1');
  });

  it("ignores the model's meterId", () => {
    const bySerial = meter({ id: 'm1', serialNumber: '02006847' });
    const modelsPick = meter({ id: 'm2', serialNumber: '11112222' });
    const [match] = matchReadings(
      [extracted({ meterId: 'm2', serialNumber: '02006847' })],
      [bySerial, modelsPick],
      byApartment,
    );
    expect(match.meter?.id).toBe('m1');
  });

  it("does not match by the model's meterId when nothing else fits", () => {
    const a = meter({ id: 'm1' });
    const b = meter({ id: 'm2' });
    const [match] = matchReadings([extracted({ meterId: 'm1' })], [a, b], byApartment);
    expect(match.meter).toBeUndefined();
  });
});
