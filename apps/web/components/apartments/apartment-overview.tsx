import { Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Apartment } from '@/lib/api/queries/apartments';
import { formatMoney, telHref } from '@/lib/format';
import { contactTenants, formatLeaseTerm, primaryTenant, type LeaseTenant } from '@/lib/leases';
import { formatPhone } from '@/lib/phone';

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={telHref(phone)}
      className="inline-flex min-h-11 items-center gap-2 text-primary underline-offset-4 hover:underline md:min-h-0"
    >
      <Phone className="size-4" />
      {formatPhone(phone)}
    </a>
  );
}

function TenantLine({ tenant }: { tenant: LeaseTenant }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
      <span>{tenant.fullName}</span>
      <PhoneLink phone={tenant.phone} />
    </div>
  );
}

export function ApartmentOverview({ apartment }: { apartment: Apartment }) {
  const lease = apartment.currentLease;
  const primary = primaryTenant(lease);
  const contacts = lease ? contactTenants(lease) : [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Поточний договір</CardTitle>
        </CardHeader>
        <CardContent>
          {lease ? (
            <dl className="space-y-4">
              {primary && (
                <div>
                  <dt className="text-muted-foreground">Орендар</dt>
                  <dd>
                    <TenantLine tenant={primary} />
                  </dd>
                </div>
              )}
              {contacts.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">Контакти</dt>
                  {contacts.map((contact) => (
                    <dd key={contact.tenantId}>
                      <TenantLine tenant={contact} />
                    </dd>
                  ))}
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Оренда</dt>
                <dd className="font-medium">{formatMoney(lease.monthlyRent)} / міс.</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Термін</dt>
                <dd>{formatLeaseTerm(lease.startDate, lease.endDate)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground">Немає активного договору</p>
          )}
        </CardContent>
      </Card>

      {apartment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Нотатки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{apartment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
