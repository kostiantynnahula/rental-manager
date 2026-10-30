import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client.js';
import { toHttpException } from './helpers/to-http-exception.js';

// Maps expected DB errors (Prisma + our raw-SQL constraints) to HTTP errors; everything else
// falls through to Nest's default handler (logged, generic 500 — no SQL details leak).
// Prisma 7 reports unique/FK/restrict/check/exclusion violations as PrismaClientKnownRequestError.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    super.catch(toHttpException(exception) ?? exception, host);
  }
}
