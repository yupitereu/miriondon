'use client';

import { Button, cn, Icon, Popover, PopoverContent, PopoverTrigger, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, useIsMobileView } from '@repo/ui-core';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

export interface PeriodMonthValue {
  year: number;
  month: number; // 1 ~ 12
}

export interface PeriodCellStatus {
  disabled?: boolean;
  badge?: string;
  tone?: 'default' | 'muted';
}

interface PeriodPickerBaseProps {
  id?: string;
  size?: 'compact' | 'default';
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
  getCellStatus?: (target: { year: number; month?: number }) => PeriodCellStatus | undefined;
  footer?: React.ReactNode;
  className?: string;
  sheetTitle?: string;
  'aria-label'?: string;
}

export interface MonthPeriodPickerProps extends PeriodPickerBaseProps {
  mode: 'month';
  value?: PeriodMonthValue;
  defaultValue?: PeriodMonthValue;
  onChange?: (value: PeriodMonthValue) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export interface YearPeriodPickerProps extends PeriodPickerBaseProps {
  mode: 'year';
  value?: number;
  defaultValue?: number;
  onChange?: (year: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export type PeriodPickerProps = MonthPeriodPickerProps | YearPeriodPickerProps;

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const YEAR_GRID_SIZE = 12;

const getCurrentMonthValue = (): PeriodMonthValue => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const stepMonth = (val: PeriodMonthValue, delta: -1 | 1): PeriodMonthValue => {
  const zeroBased = val.year * 12 + (val.month - 1) + delta;
  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1
  };
};

const formatMonthLabel = (val: PeriodMonthValue): string => {
  return `${val.year}.${String(val.month).padStart(2, '0')}`;
};

const getDecadeStart = (year: number): number => {
  return Math.floor(year / 10) * 10;
};

interface PeriodGridHeaderProps {
  label: string;
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevAriaLabel: string;
  nextAriaLabel: string;
  onPrev: () => void;
  onNext: () => void;
}

const PeriodGridHeader = ({ label, prevDisabled, nextDisabled, prevAriaLabel, nextAriaLabel, onPrev, onNext }: PeriodGridHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <Button type="button" variant="ghost" size="icon" disabled={prevDisabled} aria-label={prevAriaLabel} onClick={onPrev} className="size-8 min-h-8 min-w-8">
        <Icon icon={ChevronLeft} size="md" />
      </Button>
      <span className="text-sm font-bold text-foreground tabular-nums">{label}</span>
      <Button type="button" variant="ghost" size="icon" disabled={nextDisabled} aria-label={nextAriaLabel} onClick={onNext} className="size-8 min-h-8 min-w-8">
        <Icon icon={ChevronRight} size="md" />
      </Button>
    </div>
  );
};

interface PeriodGridCellProps {
  label: string;
  selected: boolean;
  current: boolean;
  disabled: boolean;
  status?: PeriodCellStatus;
  onSelect: () => void;
}

const PeriodGridCell = ({ label, selected, current, disabled, status, onSelect }: PeriodGridCellProps) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex min-h-control-lg flex-col items-center justify-center rounded-md border border-transparent px-2 py-1.5 text-[13px] tabular-nums transition-colors',
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

const PeriodPicker = (props: PeriodPickerProps) => {
  const { id, size = 'compact', disabled = false, minYear = 1970, maxYear = 2100, getCellStatus, footer, className, sheetTitle, 'aria-label': ariaLabel } = props;

  const isMobile = useIsMobileView();
  const now = React.useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [uncontrolledMonth, setUncontrolledMonth] = React.useState<PeriodMonthValue>(props.mode === 'month' ? (props.defaultValue ?? getCurrentMonthValue()) : getCurrentMonthValue());
  const [uncontrolledYear, setUncontrolledYear] = React.useState<number>(props.mode === 'year' ? (props.defaultValue ?? currentYear) : currentYear);

  const isControlled = props.value !== undefined;
  const activeMonthValue: PeriodMonthValue = props.mode === 'month' ? (isControlled ? props.value! : uncontrolledMonth) : getCurrentMonthValue();
  const activeYearValue: number = props.mode === 'year' ? (isControlled ? props.value! : uncontrolledYear) : activeMonthValue.year;

  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState<number>(activeYearValue);
  const [yearGridStart, setYearGridStart] = React.useState<number>(() => getDecadeStart(activeYearValue));

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled && nextOpen) {
      return;
    }
    if (nextOpen) {
      setViewYear(activeYearValue);
      setYearGridStart(getDecadeStart(activeYearValue));
    }
    setOpen(nextOpen);
  };

  const commitMonth = (next: PeriodMonthValue) => {
    if (props.mode !== 'month' || next.year < minYear || next.year > maxYear) return;
    if (!isControlled) setUncontrolledMonth(next);
    props.onChange?.(next);
    setOpen(false);
  };

  const commitYear = (nextYear: number) => {
    if (props.mode !== 'year' || nextYear < minYear || nextYear > maxYear) return;
    if (!isControlled) setUncontrolledYear(nextYear);
    props.onChange?.(nextYear);
    setOpen(false);
  };

  const stepPeriod = (delta: -1 | 1) => {
    if (disabled) return;
    if (delta === -1 && props.onPrev) {
      props.onPrev();
      return;
    }
    if (delta === 1 && props.onNext) {
      props.onNext();
      return;
    }
    if (props.mode === 'month') {
      const next = stepMonth(activeMonthValue, delta);
      if (next.year >= minYear && next.year <= maxYear) {
        if (!isControlled) setUncontrolledMonth(next);
        props.onChange?.(next);
      }
      return;
    }
    const nextYear = activeYearValue + delta;
    if (nextYear >= minYear && nextYear <= maxYear) {
      if (!isControlled) setUncontrolledYear(nextYear);
      props.onChange?.(nextYear);
    }
  };

  const prevDisabled = disabled || (props.mode === 'month' ? stepMonth(activeMonthValue, -1).year < minYear : activeYearValue - 1 < minYear);
  const nextDisabled = disabled || (props.mode === 'month' ? stepMonth(activeMonthValue, 1).year > maxYear : activeYearValue + 1 > maxYear);

  const centerText = props.mode === 'month' ? formatMonthLabel(activeMonthValue) : `${activeYearValue}년`;
  const resolvedSheetTitle = sheetTitle ?? (props.mode === 'month' ? '월 선택' : '연도 선택');

  const gridBody = (
    <div className="flex flex-col gap-3">
      {props.mode === 'month' ? (
        <>
          <PeriodGridHeader
            label={`${viewYear}년`}
            prevDisabled={viewYear - 1 < minYear}
            nextDisabled={viewYear + 1 > maxYear}
            prevAriaLabel="이전 연도"
            nextAriaLabel="다음 연도"
            onPrev={() => setViewYear((y) => Math.max(minYear, y - 1))}
            onNext={() => setViewYear((y) => Math.min(maxYear, y + 1))}
          />
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m) => {
              const status = getCellStatus?.({ year: viewYear, month: m });
              return (
                <PeriodGridCell
                  key={m}
                  label={`${m}월`}
                  selected={activeMonthValue.year === viewYear && activeMonthValue.month === m}
                  current={currentYear === viewYear && currentMonth === m}
                  disabled={Boolean(status?.disabled)}
                  status={status}
                  onSelect={() => commitMonth({ year: viewYear, month: m })}
                />
              );
            })}
          </div>
        </>
      ) : (
        <>
          <PeriodGridHeader
            label={`${yearGridStart} – ${yearGridStart + YEAR_GRID_SIZE - 1}`}
            prevDisabled={yearGridStart - YEAR_GRID_SIZE < minYear}
            nextDisabled={yearGridStart + YEAR_GRID_SIZE > maxYear}
            prevAriaLabel="이전 연대"
            nextAriaLabel="다음 연대"
            onPrev={() => setYearGridStart((s) => s - YEAR_GRID_SIZE)}
            onNext={() => setYearGridStart((s) => s + YEAR_GRID_SIZE)}
          />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: YEAR_GRID_SIZE }, (_, idx) => yearGridStart + idx).map((yr) => {
              const status = getCellStatus?.({ year: yr });
              return (
                <PeriodGridCell
                  key={yr}
                  label={String(yr)}
                  selected={activeYearValue === yr}
                  current={currentYear === yr}
                  disabled={yr < minYear || yr > maxYear || Boolean(status?.disabled)}
                  status={status}
                  onSelect={() => commitYear(yr)}
                />
              );
            })}
          </div>
        </>
      )}
      {footer ? <div className="text-xs text-muted-foreground break-keep">{footer}</div> : null}
    </div>
  );

  const centerTrigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel ?? (props.mode === 'month' ? '월 선택 열기' : '연도 선택 열기')}
      onClick={() => {
        if (isMobile) {
          handleOpenChange(!open);
        }
      }}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1 whitespace-nowrap px-2 text-sm font-bold text-foreground tabular-nums transition-colors',
        'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none'
      )}
    >
      <span>{centerText}</span>
      <Icon icon={ChevronDown} size="xs" className="text-muted-foreground" />
    </button>
  );

  return (
    <div
      id={id}
      className={cn(
        'inline-flex items-center justify-between rounded-md border border-border-strong bg-card px-1.5 text-foreground',
        size === 'compact' ? 'min-h-[34px] min-w-[144px]' : 'min-h-tab w-full',
        disabled && 'bg-muted opacity-60',
        className
      )}
    >
      <button
        type="button"
        disabled={prevDisabled}
        aria-label={props.mode === 'month' ? '이전 월' : '이전 연도'}
        onClick={() => stepPeriod(-1)}
        className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-35"
      >
        <Icon icon={ChevronLeft} size="sm" />
      </button>

      {isMobile ? (
        <>
          {centerTrigger}
          <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>{resolvedSheetTitle}</SheetTitle>
              </SheetHeader>
              <SheetBody className="items-center pt-1">
                <div className="w-full max-w-[320px]">{gridBody}</div>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>{centerTrigger}</PopoverTrigger>
          <PopoverContent align="center" className="w-[320px] p-4">
            {gridBody}
          </PopoverContent>
        </Popover>
      )}

      <button
        type="button"
        disabled={nextDisabled}
        aria-label={props.mode === 'month' ? '다음 월' : '다음 연도'}
        onClick={() => stepPeriod(1)}
        className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-35"
      >
        <Icon icon={ChevronRight} size="sm" />
      </button>
    </div>
  );
};

export { PeriodPicker };
