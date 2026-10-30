import { ValidationOptions, registerDecorator } from 'class-validator';
import { LeaseTenantRole } from '../../generated/prisma/enums.js';

// Array-level rule for lease tenants. The DB partial unique index only guarantees "at most one".
export function ExactlyOnePrimary(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'exactlyOnePrimary',
      target: target.constructor,
      propertyName: propertyName as string,
      options: { message: '$property must contain exactly one PRIMARY tenant', ...options },
      validator: {
        validate: (value: unknown) =>
          Array.isArray(value) &&
          value.filter((t: { role?: unknown }) => t?.role === LeaseTenantRole.PRIMARY).length === 1,
      },
    });
}
