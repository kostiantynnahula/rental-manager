'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useResetAfterSave } from '@/hooks/use-reset-after-save';
import { applyApiError } from '@/lib/api/api-error';
import { ApiError } from '@/lib/api/errors';
import {
  useIssuedStatement,
  useIssueStatement,
  type ManualAmounts,
  type StatementPreview,
} from '@/lib/api/queries/statements';
import { isStatementTotalChanged } from '@/lib/statements';

interface IssueStatementPanelProps {
  apartmentId: string;
  period: string;
  preview: StatementPreview;
  // The amounts `preview` was calculated with: sent again, so the API recomputes the same total.
  manualAmounts: ManualAmounts;
  // Amounts typed but the preview for them isn't back yet: its total would be stale.
  recalculating: boolean;
  // A manual amount field holds something that isn't an amount.
  amountsInvalid: boolean;
}

// The parent keys this by month + warnings: new warnings reset the acknowledgement.
export function IssueStatementPanel({
  apartmentId,
  period,
  preview,
  manualAmounts,
  recalculating,
  amountsInvalid,
}: IssueStatementPanelProps) {
  const router = useRouter();
  const issue = useIssueStatement();
  const issued = useIssuedStatement(apartmentId, period);
  const [acknowledged, setAcknowledged] = useState(false);
  // The page stays mounted (hidden) after navigating away: start fresh next time.
  const markSaved = useResetAfterSave(() => {
    setAcknowledged(false);
    issue.reset();
  });

  const hasWarnings = preview.warnings.length > 0;
  const nothingToBill = preview.lines.length === 0;
  const busy = issue.isPending || issue.isSuccess;
  const disabled =
    busy ||
    recalculating ||
    amountsInvalid ||
    nothingToBill ||
    issued.isPending ||
    Boolean(issued.data) ||
    (hasWarnings && !acknowledged);

  async function submit() {
    try {
      const statement = await issue.mutateAsync({
        apartmentId,
        body: {
          period,
          ...(Object.keys(manualAmounts).length > 0 && { manualAmounts }),
          expectedTotal: preview.total,
          acknowledgeWarnings: hasWarnings ? true : undefined,
        },
      });
      markSaved();
      toast.success('Рахунок виставлено');
      router.push(`/statements/${statement.id}`);
    } catch (error) {
      await showIssueError(error);
    }
  }

  async function showIssueError(error: unknown) {
    if (isStatementTotalChanged(error)) {
      toast.warning('Дані змінились — перевірте суму');
    } else if (error instanceof ApiError && error.status === 409) {
      const { data: existing } = await issued.refetch();
      toast.error('Рахунок за цей місяць уже виставлено', {
        action: existing
          ? { label: 'Відкрити', onClick: () => router.push(`/statements/${existing.id}`) }
          : undefined,
      });
    } else if (error instanceof ApiError && error.status === 422) {
      toast.warning('З’явились нові попередження — перевірте рахунок');
    } else {
      applyApiError(error);
    }
  }

  return (
    <div className="space-y-3">
      {hasWarnings && !nothingToBill && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={busy}
            className="size-5 shrink-0 accent-primary"
          />
          Розумію, рядки з попередженнями не включено
        </label>
      )}
      {amountsInvalid && (
        <p className="text-sm text-destructive">Виправте суму вище, щоб виставити рахунок.</p>
      )}
      {nothingToBill && (
        <p className="text-sm text-muted-foreground">
          {preview.warnings.some((w) => w.code === 'MISSING_MANUAL_AMOUNT')
            ? 'Немає що виставляти: введіть суму вище.'
            : 'Немає що виставляти: за цей місяць немає оренди, показань і платежів.'}
        </p>
      )}
      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={disabled}
        onClick={() => void submit()}
      >
        {busy ? 'Виставлення…' : recalculating ? 'Перераховуємо…' : 'Виставити'}
      </Button>
    </div>
  );
}
