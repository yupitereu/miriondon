'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

import { Input, type InputProps } from './Input';

export interface SearchInputProps extends Omit<InputProps, 'prefix' | 'suffix' | 'type' | 'value' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  clearable?: boolean;
  clearLabel?: string;
}

const SearchInput = ({ value, defaultValue, onChange, onValueChange, onClear, clearable = true, clearLabel = '검색어 지우기', className, disabled, ...props }: SearchInputProps) => {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '');
  const currentValue = isControlled ? value : uncontrolledValue;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setUncontrolledValue(event.target.value);
    }
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  const handleClear = () => {
    if (!isControlled) {
      setUncontrolledValue('');
    }
    if (onClear) {
      onClear();
    } else {
      onValueChange?.('');
    }
  };

  const showClear = clearable && !disabled && currentValue.length > 0 && Boolean(onClear || onValueChange || !isControlled);

  return (
    <Input
      type="search"
      value={currentValue}
      onChange={handleChange}
      disabled={disabled}
      prefix={<Search className="size-4 text-muted-foreground" aria-hidden="true" />}
      suffix={
        showClear ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={clearLabel}
            className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : undefined
      }
      className={cn('[&::-webkit-search-cancel-button]:hidden', className)}
      {...props}
    />
  );
};

export { SearchInput };
