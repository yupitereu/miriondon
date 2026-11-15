'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

import { Input, type InputProps } from './Input';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'> {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  allowNegative?: boolean;
  formatThousands?: boolean;
}

const formatNumericDisplay = (val: number | null | undefined, formatThousands: boolean): string => {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '';
  }
  const truncated = Math.trunc(val);
  return formatThousands ? truncated.toLocaleString('ko-KR') : String(truncated);
};

const parseNumericInput = (raw: string, allowNegative: boolean): { displayDigits: string; parsed: number | null } => {
  const isNegative = allowNegative && raw.trimStart().startsWith('-');
  const digits = raw.replace(/[^0-9]/g, '');

  if (!digits) {
    return {
      displayDigits: isNegative ? '-' : '',
      parsed: null
    };
  }

  const num = Number.parseInt(digits, 10);
  const signed = isNegative ? -num : num;
  return {
    displayDigits: String(signed),
    parsed: signed
  };
};

const NumberInput = ({ value, defaultValue, onValueChange, allowNegative = false, formatThousands = true, className, onBlur, ...props }: NumberInputProps) => {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<number | null>(defaultValue ?? null);
  const [pendingMinus, setPendingMinus] = React.useState(false);

  const currentNumber = isControlled ? (value ?? null) : uncontrolledValue;
  const displayValue = pendingMinus && currentNumber === null ? '-' : formatNumericDisplay(currentNumber, formatThousands);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { displayDigits, parsed } = parseNumericInput(e.target.value, allowNegative);
    setPendingMinus(displayDigits === '-');

    if (!isControlled) {
      setUncontrolledValue(parsed);
    }
    onValueChange?.(parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (pendingMinus) {
      setPendingMinus(false);
    }
    onBlur?.(e);
  };

  return (
    <Input
      type="text"
      inputMode={allowNegative ? 'text' : 'numeric'}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn('text-right tabular-nums', className)}
      {...props}
    />
  );
};

export { NumberInput };
