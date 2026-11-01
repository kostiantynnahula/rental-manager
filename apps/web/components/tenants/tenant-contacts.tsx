import { Mail, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tenant } from '@/lib/api/queries/tenants';
import { telHref } from '@/lib/format';
import { formatPhone, viberHref } from '@/lib/phone';

export function TenantContacts({ tenant }: { tenant: Tenant }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Контакти</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-lg font-medium whitespace-nowrap">{formatPhone(tenant.phone)}</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button asChild>
              <a href={telHref(tenant.phone)}>
                <Phone />
                Подзвонити
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={viberHref(tenant.phone)}>
                <MessageCircle />
                Viber
              </a>
            </Button>
          </div>
        </div>
        {tenant.email && (
          <div className="space-y-2">
            <p className="break-all">{tenant.email}</p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={`mailto:${tenant.email}`}>
                <Mail />
                Написати
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
