import { ValidationOptions, registerDecorator } from 'class-validator';

// Same tenant twice in one lease would hit the (leaseId, tenantId) PK; reject it as a 400 instead.
export function UniqueTenantIds(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'uniqueTenantIds',
      target: target.constructor,
      propertyName: propertyName as string,
      options: { message: '$property must not list the same tenant twice', ...options },
      validator: {
        validate: (value: unknown) => {
          if (!Array.isArray(value)) return false;
          const ids = value.map((t: { tenantId?: unknown }) => t?.tenantId);
          return new Set(ids).size === ids.length;
        },
      },
    });
}
