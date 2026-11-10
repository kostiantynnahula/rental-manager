import type { components } from '../../api/schema.js';

type Meter = components['schemas']['MeterResponseDto'];

// A meter of the photo's apartment the model may match a register to (GET /apartments/:id/meters).
export type ExtractionCandidate = Pick<
  Meter,
  'id' | 'utility' | 'zoneScheme' | 'serialNumber' | 'label'
>;
