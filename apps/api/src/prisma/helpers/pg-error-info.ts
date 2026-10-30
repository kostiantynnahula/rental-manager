import { Prisma } from '../../generated/prisma/client.js';
import type { DriverAdapterCause } from '../interfaces/driver-adapter-cause.interface.js';
import type { PgErrorInfo } from '../interfaces/pg-error-info.interface.js';

// Prisma 7 driver adapters put the Postgres error under meta.driverAdapterError.cause. Exclusion
// and check violations have no dedicated kind: their constraint name is only in the message.
export function pgErrorInfo(e: Prisma.PrismaClientKnownRequestError): PgErrorInfo {
  const meta = e.meta as
    { target?: string[]; driverAdapterError?: { cause?: DriverAdapterCause } } | undefined;
  const cause = meta?.driverAdapterError?.cause;
  const constraint =
    cause?.constraint?.index ?? cause?.originalMessage?.match(/constraint "([^"]+)"/)?.[1];
  return {
    code: cause?.originalCode,
    constraint,
    fields:
      meta?.target ?? cause?.constraint?.fields ?? fieldsFromIndexName(constraint, cause?.table),
  };
}

// Unique violations often come with only the index name; Prisma names them <table>_<cols>_key.
function fieldsFromIndexName(index?: string, table?: string): string[] | undefined {
  const prefix = `${table}_`;
  if (!index || !table || !index.startsWith(prefix) || !index.endsWith('_key')) return undefined;
  return [index.slice(prefix.length, -'_key'.length)];
}
