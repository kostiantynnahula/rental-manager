import { isUUID } from 'class-validator';
import type { PrismaService } from '../../prisma/prisma.service.js';

// --apartment of the CLIs: a uuid, or a case-insensitive part of the name matching exactly one apartment (an exact
// name wins). Archived apartments too: their condition photos are still listed and searched.
export async function findApartment(
  prisma: PrismaService,
  ref: string,
): Promise<{ id: string; name: string }> {
  const select = { id: true, name: true };
  if (isUUID(ref)) {
    const apartment = await prisma.apartment.findUnique({ where: { id: ref }, select });
    if (!apartment) throw new Error(`No apartment with id ${ref}`);
    return apartment;
  }
  const matches = await prisma.apartment.findMany({
    where: { name: { contains: ref, mode: 'insensitive' } },
    select,
    orderBy: { name: 'asc' },
  });
  const exact = matches.find((a) => a.name.toLowerCase() === ref.toLowerCase());
  if (exact) return exact;
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`No apartment matches "${ref}"`);
  throw new Error(`"${ref}" matches several apartments: ${matches.map((a) => a.name).join(', ')}`);
}
