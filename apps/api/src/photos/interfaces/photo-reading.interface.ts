import type { Zone } from '../../generated/prisma/enums.js';
import type { PhotoWithReadings } from '../helpers/photo-with-readings.js';

// A reading linked to a photo through one or more of its values.
export interface PhotoReading {
  reading: PhotoWithReadings['readingValues'][number]['reading'];
  // Zones whose values were read from this photo.
  zones: Zone[];
}
