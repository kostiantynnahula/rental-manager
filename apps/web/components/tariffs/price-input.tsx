'use client';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { formatPrice, normalizePrice } from '@/lib/tariff-prices';

interface PriceInputProps extends Omit<React.ComponentProps<typeof InputGroupInput>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  unit: string;
}

// A decimal price ("4,32") with its unit; on blur a valid value is shown in the uk format ("4.3" → "4,30").
export function PriceInput({ value, onChange, onBlur, unit, ...props }: PriceInputProps) {
  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const normalized = normalizePrice(value);
          if (normalized) onChange(formatPrice(normalized));
          onBlur?.(e);
        }}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
