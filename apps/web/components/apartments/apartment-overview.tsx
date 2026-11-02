import { CurrentLeaseCard } from '@/components/leases/current-lease-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Apartment } from '@/lib/api/queries/apartments';

export function ApartmentOverview({ apartment }: { apartment: Apartment }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CurrentLeaseCard lease={apartment.currentLease} />
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
