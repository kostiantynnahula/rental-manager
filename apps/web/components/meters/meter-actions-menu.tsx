'use client';

import { Eraser, MoreVertical, Pencil, PlugZap, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Meter } from '@/lib/api/queries/meters';
import { DeleteMeterDialog } from './delete-meter-dialog';
import { EditMeterSheet } from './edit-meter-sheet';
import { FixInitialValuesSheet } from './fix-initial-values-sheet';
import { meterActionReasons } from './helpers/meter-action-reasons';
import { meterTitle } from './helpers/meter-title';
import { MeterActionItem } from './meter-action-item';
import { RemoveMeterSheet } from './remove-meter-sheet';

type Panel = 'edit' | 'fix' | 'remove' | 'delete' | null;

export function MeterActionsMenu({ meter }: { meter: Meter }) {
  const [panel, setPanel] = useState<Panel>(null);
  const reasons = meterActionReasons(meter);
  const close = (open: boolean) => !open && setPanel(null);

  return (
    <>
      {/* Non-modal: a Sheet/Dialog opened from an item would otherwise fight the menu over focus and leave
          pointer-events disabled on <body>. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Дії: ${meterTitle(meter)}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <MeterActionItem
            icon={<Pencil />}
            label="Редагувати"
            disabledReason={null}
            onSelect={() => setPanel('edit')}
          />
          <MeterActionItem
            icon={<Eraser />}
            label="Виправити початкові показання"
            disabledReason={reasons.fixInitial}
            onSelect={() => setPanel('fix')}
          />
          <MeterActionItem
            icon={<RefreshCw />}
            label="Замінити"
            disabledReason={reasons.replace}
            asChild
          >
            <Link href={`/meters/${meter.id}/replace`}>
              <RefreshCw />
              Замінити
            </Link>
          </MeterActionItem>
          <MeterActionItem
            icon={<PlugZap />}
            label="Зняти"
            disabledReason={reasons.remove}
            onSelect={() => setPanel('remove')}
          />
          <DropdownMenuSeparator />
          <MeterActionItem
            icon={<Trash2 />}
            label="Видалити"
            disabledReason={reasons.delete}
            onSelect={() => setPanel('delete')}
            destructive
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <EditMeterSheet meter={meter} open={panel === 'edit'} onOpenChange={close} />
      <FixInitialValuesSheet meter={meter} open={panel === 'fix'} onOpenChange={close} />
      <RemoveMeterSheet meter={meter} open={panel === 'remove'} onOpenChange={close} />
      <DeleteMeterDialog meter={meter} open={panel === 'delete'} onOpenChange={close} />
    </>
  );
}
