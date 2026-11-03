import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TariffDetail } from '@/lib/api/queries/tariffs';
import { TARIFF_KIND_LABELS } from './constants/labels';
import { priceUnit } from './helpers/price-unit';
import { tariffUtilitiesLabel } from './helpers/tariff-utilities-label';

export function TariffOverview({ tariff }: { tariff: TariffDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Опис</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Тип</dt>
          <dd>{TARIFF_KIND_LABELS[tariff.kind]}</dd>
          {tariff.kind === 'METERED' && (
            <>
              <dt className="text-muted-foreground">Послуга</dt>
              <dd>{tariffUtilitiesLabel(tariff.utilities)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Одиниця</dt>
          <dd>{priceUnit(tariff)}</dd>
          {tariff.notes && (
            <>
              <dt className="text-muted-foreground">Нотатки</dt>
              <dd className="whitespace-pre-wrap">{tariff.notes}</dd>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
