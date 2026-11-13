import { HttpException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { toHttpException } from '../../prisma/helpers/to-http-exception.js';

// Why a reading's confirm was refused, for the batch confirm: a business-rule HttpException (400/409 from
// ReadingsService.confirm) or a known Prisma error mapped like PrismaExceptionFilter (e.g. the unique index of
// confirmed readings losing a race). null = not a refusal (unexpected) → the caller rethrows.
export function refusalReason(error: unknown): string | null {
  const http =
    error instanceof Prisma.PrismaClientKnownRequestError ? toHttpException(error) : error;
  if (!(http instanceof HttpException)) return null;
  const response = http.getResponse();
  const message =
    typeof response === 'string' ? response : (response as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join('; ');
  return typeof message === 'string' ? message : http.message;
}
