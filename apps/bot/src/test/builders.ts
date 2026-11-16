import type { components } from '../api/schema.js';

type Schemas = components['schemas'];
type Batch = Schemas['PhotoBatchResponseDto'];
type BatchApartment = Schemas['PhotoBatchApartmentResponseDto'];
type Reading = Schemas['PhotoBatchReadingResponseDto'];
type Value = Schemas['PhotoBatchValueResponseDto'];
type Meter = Schemas['PhotoBatchMeterResponseDto'];
type Photo = Schemas['PhotoBatchPhotoResponseDto'];
type Warning = Schemas['PhotoBatchWarningResponseDto'];
type Apartment = Pick<Schemas['ApartmentDetailResponseDto'], 'id' | 'name'>;

// Test-only builders: valid defaults, override what the test is about. Ids are real UUIDs, so they survive
// callback_data (UUID ↔ base64url).

export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

export const BATCH_ID = uuid(1);
export const PHOTO_ID = uuid(2);
export const APARTMENT_ID = uuid(3);
export const READING_ID = uuid(4);
export const METER_ID = uuid(5);

// The default batch: one photo, read into one DRAFT reading of one apartment.
export function batch(overrides: Partial<Batch> = {}): Batch {
  return {
    batchId: BATCH_ID,
    photos: [batchPhoto()],
    apartments: [batchApartment()],
    ...overrides,
  };
}

export function batchPhoto(overrides: Partial<Photo> = {}): Photo {
  return { id: PHOTO_ID, parseStatus: 'PARSED', parseNote: null, ...overrides };
}

export function batchApartment(overrides: Partial<BatchApartment> = {}): BatchApartment {
  return {
    id: APARTMENT_ID,
    name: 'Shevchenka 12/5',
    isActive: true,
    readings: [reading()],
    ...overrides,
  };
}

export function reading(overrides: Partial<Reading> = {}): Reading {
  return {
    id: READING_ID,
    status: 'DRAFT',
    period: '2026-10',
    readingDate: '2026-10-28',
    note: null,
    meter: batchMeter(),
    canConfirm: true,
    missingZones: [],
    values: [value()],
    ...overrides,
  };
}

export function batchMeter(overrides: Partial<Meter> = {}): Meter {
  return {
    id: METER_ID,
    utility: 'ELECTRICITY',
    label: null,
    serialNumber: null,
    zoneScheme: 'SINGLE',
    ...overrides,
  };
}

export function value(overrides: Partial<Value> = {}): Value {
  return {
    zone: 'TOTAL',
    value: '1520.350',
    photoId: PHOTO_ID,
    previousValue: '1400.350',
    consumption: '120.000',
    lowerThanPrevious: false,
    warnings: [],
    ...overrides,
  };
}

export function warning(overrides: Partial<Warning> = {}): Warning {
  return { code: 'ABOVE_LIMIT', limit: 100, months: 1, ...overrides };
}

export function apartment(overrides: Partial<Apartment> = {}): Apartment {
  return { id: APARTMENT_ID, name: 'Shevchenka 12/5', ...overrides };
}
