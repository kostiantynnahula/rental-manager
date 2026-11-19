'use client';

import type { ConditionPhotoEvent } from '@/lib/api/queries/condition-photos';
import { cn } from '@/lib/utils';
import { EVENT_LABELS, EVENT_OPTIONS } from './constants/events';

interface EventChoiceProps {
  value: ConditionPhotoEvent;
  onChange: (value: ConditionPhotoEvent) => void;
  labelId: string;
}

// Three options → a segmented control (one tap) rather than a select. Toggle buttons (aria-pressed), like the
// photo filter: a radiogroup role would also promise roving focus and arrow keys.
export function EventChoice({ value, onChange, labelId }: EventChoiceProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="grid grid-cols-3 rounded-lg bg-muted p-1"
    >
      {EVENT_OPTIONS.map((event) => (
        <button
          key={event}
          type="button"
          aria-pressed={value === event}
          onClick={() => onChange(event)}
          className={cn(
            'h-10 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors md:h-8',
            value === event && 'bg-background text-foreground shadow-sm',
          )}
        >
          {EVENT_LABELS[event]}
        </button>
      ))}
    </div>
  );
}
