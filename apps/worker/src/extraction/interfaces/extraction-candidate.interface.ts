import type { components } from '../../api/schema.js';

type Meter = components['schemas']['MeterResponseDto'];

// A meter the model may match a register to: of the photo's apartment (GET /apartments/:id/meters), or every active
// meter for an inbox photo (GET /meters?active=true).
export type ExtractionCandidate = Pick<
  Meter,
  'id' | 'utility' | 'zoneScheme' | 'serialNumber' | 'label'
>;
