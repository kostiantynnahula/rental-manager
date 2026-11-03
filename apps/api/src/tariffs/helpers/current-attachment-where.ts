import { Prisma } from '../../generated/prisma/client.js';

// Attachments that haven't ended before `period` — the query form of isAttachmentCurrent().
export function currentAttachmentWhere(period: Date): Prisma.ApartmentTariffWhereInput {
  return { OR: [{ activeTo: null }, { activeTo: { gte: period } }] };
}
