import type { components } from '../api/schema.js';
import type { ExtractedReading } from '../extraction/interfaces/extracted-reading.interface.js';

type Schemas = components['schemas'];
type Meter = Schemas['MeterResponseDto'];
type ReadingSummary = Schemas['ReadingSummaryResponseDto'];
type PhotoDetail = Schemas['PhotoDetailResponseDto'];

// Test-only builders: valid defaults, override what the test is about.

export function meter(overrides: Partial<Meter> = {}): Meter {
  return {
    id: 'meter-1',
    apartmentId: 'apt-1',
    utility: 'ELECTRICITY',
    zoneScheme: 'SINGLE',
    label: null,
    serialNumber: null,
    installedAt: '2026-01-15',
    removedAt: null,
    notes: null,
    lastReading: null,
    canDelete: false,
    canEditInitialValues: false,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

export function extracted(overrides: Partial<ExtractedReading> = {}): ExtractedReading {
  return {
    meterId: null,
    serialNumber: null,
    utility: 'ELECTRICITY',
    zone: 'TOTAL',
    value: '100',
    confidence: 'high',
    issues: [],
    ...overrides,
  };
}

// The meter's last CONFIRMED reading: period "YYYY-MM", values per zone.
export function lastReading(
  period: string,
  values: Partial<Record<Schemas['Zone'], string>>,
): ReadingSummary {
  return {
    id: 'reading-1',
    kind: 'REGULAR',
    period,
    readingDate: `${period}-28`,
    values: Object.entries(values).map(([zone, value]) => ({
      zone: zone as Schemas['Zone'],
      value,
    })),
  };
}

export function photo(overrides: Partial<PhotoDetail> = {}): PhotoDetail {
  return {
    id: 'photo-1',
    apartmentId: 'apt-1',
    mimeType: 'image/jpeg',
    size: 3,
    sha256: 'e3b0c442',
    width: 1200,
    height: 1600,
    originalFilename: 'meter.jpg',
    uploadedById: 'user-1',
    // Kyiv: 2026-11-01 00:30 → readingDate 2026-11-01, period 2026-11.
    createdAt: '2026-10-31T22:30:00.000Z',
    parseStatus: 'PENDING',
    parseNote: null,
    batchId: null,
    fileUrl: '/api/photos/photo-1/file',
    thumbnailUrl: '/api/photos/photo-1/thumbnail',
    readings: [],
    ...overrides,
  };
}
