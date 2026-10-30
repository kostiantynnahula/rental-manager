import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { pgErrorInfo } from './pg-error-info.js';

// Readable messages for our raw-SQL constraints (see the migrations).
const CONSTRAINT_MESSAGES: Record<string, string> = {
  leases_no_overlap: 'Lease dates overlap with another lease',
  leases_dates_check: 'endDate must be on or after startDate',
  lease_tenants_one_primary: 'A lease must have exactly one PRIMARY tenant',
  users_email_normalized: 'email must be lowercase and trimmed',
  meters_removed_after_installed: 'removedAt must be on or after installedAt',
  readings_period_first_of_month: 'period must be the first day of a month',
  readings_confirmed_has_confirmer: 'A confirmed reading must record who confirmed it and when',
  reading_values_non_negative: 'Meter values must not be negative',
  readings_one_confirmed_regular_per_period:
    'A confirmed reading for this meter and period already exists',
  readings_one_confirmed_initial: 'This meter already has a confirmed INITIAL reading',
  readings_one_confirmed_final: 'This meter already has a confirmed FINAL reading',
};

// Prisma codes: https://www.prisma.io/docs/orm/reference/error-reference
// Postgres codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
// Returns undefined for anything unexpected → Nest's default handler (logged, generic 500).
// Never pass e.message or meta.detail to the client: they contain SQL and row data.
export function toHttpException(
  e: Prisma.PrismaClientKnownRequestError,
): HttpException | undefined {
  const { code, constraint, fields } = pgErrorInfo(e);
  const known = constraint ? CONSTRAINT_MESSAGES[constraint] : undefined;

  if (e.code === 'P2002' || code === '23505') {
    if (known) return new ConflictException(known);
    return new ConflictException(
      fields?.length
        ? `Already exists: duplicate value for ${fields.join(', ')}`
        : 'Already exists',
    );
  }
  if (code === '23P01') {
    return new ConflictException(known ?? 'Conflicts with an existing record');
  }
  if (code === '23514') {
    return new BadRequestException(known ?? `Value violates constraint ${constraint ?? 'check'}`);
  }
  switch (e.code) {
    case 'P2003':
      return new ConflictException(
        fields?.length
          ? `Related record constraint failed on ${fields.join(', ')}`
          : 'Related record constraint failed',
      );
    case 'P2025':
      return new NotFoundException('Record not found');
    case 'P2000':
      return new BadRequestException('Value too long for column');
    default:
      return undefined;
  }
}
