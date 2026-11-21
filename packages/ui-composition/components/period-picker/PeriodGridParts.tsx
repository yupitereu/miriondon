'use client';

import { Button, cn, Icon } from '@repo/ui-core';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PeriodCellStatus = {
  disabled?: boolean;
  badge?: string;
  tone?: 'default' | 'muted';
};

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const YEAR_GRID_SIZE = 12;

export const getDecadeStart = (year: number): number => {
  return Math.floor(year / 10) * 10;
};

export const PeriodGridHeader = ({
  label,
  onTitleClick,
  titleAriaLabel,
  prevDisabled,
  nextDisabled,
  prevAriaLabel,
  nextAriaLabel,
  onPrev,
  onNext
}: {
  label: string;
  onTitleClick?: () => void;
  titleAriaLabel?: string;
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevAriaLabel: string;
  nextAriaLabel: string;
  onPrev: () => void;
  onNext: () => void;
}) => {
  return (
    <div className="flex h-8 items-center justify-between">
      <Button type="button" variant="ghost" size="icon" disabled={prevDisabled} aria-label={prevAriaLabel} onClick={onPrev} className="size-8 min-h-8 min-w-8 cursor-pointer">
        <Icon icon={ChevronLeft} size="md" />
      </Button>
      {onTitleClick ? (
        <button
          type="button"
          aria-label={titleAriaLabel ?? `${label} 변경`}
          onClick={onTitleClick}
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-2.5 text-sm font-bold text-foreground tabular-nums transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {label}
        </button>
      ) : (
        <span className="text-sm font-bold text-foreground tabular-nums">{label}</span>
      )}
      <Button type="button" variant="ghost" size="icon" disabled={nextDisabled} aria-label={nextAriaLabel} onClick={onNext} className="size-8 min-h-8 min-w-8 cursor-pointer">
        <Icon icon={ChevronRight} size="md" />
      </Button>
    </div>
  );
};

export const PeriodGridCell = ({
  label,
  selected,
  current,
  disabled,
  status,
  onSelect
}: {
  label: string;
  selected: boolean;
  current: boolean;
  disabled: boolean;
  status?: PeriodCellStatus;
  onSelect: () => void;
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex min-h-control-lg cursor-pointer flex-col items-center justify-center rounded-md border border-transparent px-2 py-1.5 text-[13px] tabular-nums transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        !selected && !disabled && 'hover:bg-accent hover:text-accent-foreground',
        current && !selected && 'border-primary/45 font-bold text-primary',
        status?.tone === 'muted' && !selected && 'text-muted-foreground',
        selected && 'bg-primary font-bold text-primary-foreground hover:bg-primary/90',
        disabled && 'pointer-events-none opacity-40'
      )}
    >
      <span>{label}</span>
      {status?.badge ? <span className={cn('text-[10px] leading-tight', selected ? 'text-primary-foreground/85' : 'text-muted-foreground')}>{status.badge}</span> : null}
    </button>
  );
};
