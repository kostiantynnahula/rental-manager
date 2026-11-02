import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Meter } from '@/lib/api/queries/meters';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ZONE_SCHEME_LABELS } from '@/lib/utilities';
import { meterTitle } from './helpers/meter-title';
import { MeterActionsMenu } from './meter-actions-menu';
import { MeterLastValues } from './meter-last-values';

export function MeterCard({ meter }: { meter: Meter }) {
  const removed = meter.removedAt !== null;
  return (
    <Card className={cn(removed && 'opacity-60')}>
      <CardContent className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{meterTitle(meter)}</span>
            <Badge variant="outline">{ZONE_SCHEME_LABELS[meter.zoneScheme]}</Badge>
            {removed && <Badge variant="secondary">Знято {formatDate(meter.removedAt!)}</Badge>}
          </div>
          {meter.serialNumber && (
            <p className="text-sm break-all text-muted-foreground">№ {meter.serialNumber}</p>
          )}
          <MeterLastValues meter={meter} />
        </div>
        <MeterActionsMenu meter={meter} />
      </CardContent>
    </Card>
  );
}
