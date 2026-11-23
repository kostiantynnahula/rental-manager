import type { Prisma } from '../../generated/prisma/client.js';
import type { ConditionPhotoDescription } from '../interfaces/condition-photo-description.interface.js';

// A plain object for a Json column (a validated DTO is a class instance; JSON drops the prototype).
export function toDescriptionJson(description: ConditionPhotoDescription): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(description)) as Prisma.InputJsonObject;
}
