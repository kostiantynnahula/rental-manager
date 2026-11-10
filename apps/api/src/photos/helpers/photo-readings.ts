import type { Zone } from '../../generated/prisma/enums.js';
import type { PhotoReading } from '../interfaces/photo-reading.interface.js';
import type { PhotoWithReadings } from './photo-with-readings.js';

// One entry per reading linked to the photo (in the include's order), with the zones read from this photo.
export function photoReadings(photo: PhotoWithReadings): PhotoReading[] {
  const byId = new Map<string, PhotoReading>();
  for (const { zone, reading } of photo.readingValues) {
    const entry = byId.get(reading.id) ?? { reading, zones: [] as Zone[] };
    entry.zones.push(zone);
    byId.set(reading.id, entry);
  }
  return [...byId.values()];
}
