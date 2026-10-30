// Shape of meta.driverAdapterError.cause from @prisma/adapter-pg (only the fields we read).
export interface DriverAdapterCause {
  originalCode?: string;
  originalMessage?: string;
  constraint?: { fields?: string[]; index?: string };
  table?: string;
}
