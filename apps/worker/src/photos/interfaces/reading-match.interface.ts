import type { components } from '../../api/schema.js';
import type { ExtractedReading } from '../../extraction/interfaces/extracted-reading.interface.js';

type Meter = components['schemas']['MeterResponseDto'];

// What matchReadings decided for one extracted reading: the meter it goes to, or why it is skipped (logged only).
export type ReadingMatch =
  | { reading: ExtractedReading; meter: Meter; skip?: never }
  | { reading: ExtractedReading; meter?: never; skip: string };
