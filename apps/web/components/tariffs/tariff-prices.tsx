'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TariffDetail } from '@/lib/api/queries/tariffs';
import { todayDateOnly } from '@/lib/format';
import { ARCHIVED_REASON } from './constants/labels';
import { TariffPriceRow } from './tariff-price-row';
import { TariffPriceSheet } from './tariff-price-sheet';

// Price history, newest first (API order). A price change is a new row; a row's menu only fixes mistakes.
export function TariffPrices({ tariff }: { tariff: TariffDetail }) {
  const [adding, setAdding] = useState(false);
  const currentIds = new Set(tariff.currentPrices.map((p) => p.id));
  const thisMonth = todayDateOnly().slice(0, 7);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ціни</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            disabled={!tariff.isActive}
            aria-describedby={tariff.isActive ? undefined : 'tariff-prices-archived'}
            onClick={() => setAdding(true)}
          >
            <Plus />
            Нова ціна
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {!tariff.isActive && (
          <p id="tariff-prices-archived" className="text-sm text-muted-foreground">
            {ARCHIVED_REASON} — відновіть його, щоб змінювати ціни
          </p>
        )}
        <ul className="space-y-2">
          {tariff.prices.map((price) => (
            <TariffPriceRow
              key={price.id}
              tariff={tariff}
              price={price}
              current={currentIds.has(price.id)}
              upcoming={price.effectiveFrom > thisMonth}
            />
          ))}
        </ul>
      </CardContent>
      <TariffPriceSheet tariff={tariff} open={adding} onOpenChange={setAdding} />
    </Card>
  );
}
