'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatPhone } from '@/lib/phone';
import type { LeaseTenantValue } from './helpers/lease-tenants-schema';
import { NewTenantSheet } from './new-tenant-sheet';
import { TenantSearchCombobox } from './tenant-search-combobox';

interface LeaseTenantsFieldProps {
  value: LeaseTenantValue[];
  onChange: (value: LeaseTenantValue[]) => void;
  error?: string;
  idPrefix: string;
}

// The lease's tenants: exactly one "Основний" (radio), the rest "Контактна особа". Controlled (RHF Controller);
// the rules themselves are in helpers/lease-tenants-schema.ts.
export function LeaseTenantsField({ value, onChange, error, idPrefix }: LeaseTenantsFieldProps) {
  const primaryId = value.find((t) => t.role === 'PRIMARY')?.tenantId ?? '';

  function add(tenant: { id: string; fullName: string; phone: string }) {
    if (value.some((t) => t.tenantId === tenant.id)) return;
    // The first tenant becomes the PRIMARY; later ones are contacts until you pick otherwise.
    const role = value.some((t) => t.role === 'PRIMARY') ? 'CONTACT' : 'PRIMARY';
    onChange([
      ...value,
      { tenantId: tenant.id, fullName: tenant.fullName, phone: tenant.phone, role },
    ]);
  }

  function remove(tenantId: string) {
    const rest = value.filter((t) => t.tenantId !== tenantId);
    // Removing the PRIMARY promotes the first remaining tenant, so the lease never lacks one.
    if (rest.length > 0 && !rest.some((t) => t.role === 'PRIMARY'))
      rest[0] = { ...rest[0], role: 'PRIMARY' };
    onChange(rest);
  }

  function setPrimary(tenantId: string) {
    onChange(value.map((t) => ({ ...t, role: t.tenantId === tenantId ? 'PRIMARY' : 'CONTACT' })));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <RadioGroup value={primaryId} onValueChange={setPrimary} aria-label="Основний орендар">
          <ul className="space-y-2">
            {value.map((tenant) => {
              const radioId = `${idPrefix}-primary-${tenant.tenantId}`;
              return (
                <li
                  key={tenant.tenantId}
                  className="flex items-center gap-3 rounded-lg border p-2 pl-3"
                >
                  {/* The whole label is the touch target for the radio. */}
                  <label
                    htmlFor={radioId}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3"
                  >
                    <RadioGroupItem id={radioId} value={tenant.tenantId} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{tenant.fullName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {tenant.role === 'PRIMARY' ? 'Основний' : 'Контактна особа'} ·{' '}
                        <span className="whitespace-nowrap">{formatPhone(tenant.phone)}</span>
                      </span>
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(tenant.tenantId)}
                    aria-label={`Прибрати ${tenant.fullName}`}
                  >
                    <X />
                  </Button>
                </li>
              );
            })}
          </ul>
        </RadioGroup>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <TenantSearchCombobox excludeIds={value.map((t) => t.tenantId)} onSelect={add} />
        <NewTenantSheet onCreated={add} />
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
