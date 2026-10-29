import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client.js';

// Maps expected Prisma errors to HTTP errors; everything else falls through to Nest's
// default handler (logged, generic 500 — no SQL details leak to the client).
// Codes: https://www.prisma.io/docs/orm/reference/error-reference
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    super.catch(toHttpException(exception) ?? exception, host);
  }
}

function toHttpException(e: Prisma.PrismaClientKnownRequestError): HttpException | undefined {
  const fields = constraintFields(e);
  switch (e.code) {
    case 'P2002':
      return new ConflictException(
        fields ? `Already exists: duplicate value for ${fields}` : 'Already exists',
      );
    case 'P2003':
      return new ConflictException(
        fields
          ? `Related record constraint failed on ${fields}`
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

// Prisma 7 driver adapters report the constrained columns under meta.driverAdapterError.
function constraintFields(e: Prisma.PrismaClientKnownRequestError): string | undefined {
  const meta = e.meta as
    | {
        target?: string[];
        driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
      }
    | undefined;
  const fields = meta?.target ?? meta?.driverAdapterError?.cause?.constraint?.fields;
  return fields?.length ? fields.join(', ') : undefined;
}
