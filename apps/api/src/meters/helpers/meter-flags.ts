// What the UI may offer for a meter. Same rules the service enforces on DELETE and PUT initial-values
// (those stay the source of truth; the flags only let the client disable actions up front).

export interface MeterUsage {
  // REGULAR or FINAL readings of any status (cancelled ones too): DELETE refuses any.
  regularOrFinal: number;
  // Non-cancelled REGULAR readings: initial values are frozen once one exists.
  activeRegular: number;
}

export interface MeterFlags {
  canDelete: boolean;
  canEditInitialValues: boolean;
}

export const NO_USAGE: MeterUsage = { regularOrFinal: 0, activeRegular: 0 };

export function meterFlags(meter: { removedAt: Date | null }, usage: MeterUsage): MeterFlags {
  return {
    canDelete: usage.regularOrFinal === 0,
    canEditInitialValues: meter.removedAt === null && usage.activeRegular === 0,
  };
}
