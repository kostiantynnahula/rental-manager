import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TariffDetail } from '@/lib/api/queries/tariffs';
import { formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';

// Where the tariff applies (API order: newest attachment first). Attaching/ending happens on the apartment's tab.
export function TariffApartments({ tariff }: { tariff: TariffDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Квартири</CardTitle>
      </CardHeader>
      <CardContent>
        {tariff.apartments.length === 0 ? (
          <p className="text-muted-foreground">Не підключено до квартир</p>
        ) : (
          <ul className="space-y-2">
            {tariff.apartments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/apartments/${a.apartmentId}?tab=tariffs`}
                  className={cn(
                    'block space-y-0.5 rounded-lg border p-3 transition-colors hover:bg-muted active:bg-muted',
                    !a.isCurrent && 'opacity-70',
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.apartmentName}</span>
                    {!a.isCurrent && <Badge variant="secondary">Завершено</Badge>}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    з {formatPeriod(a.activeFrom)}
                    {a.activeTo && ` по ${formatPeriod(a.activeTo)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
