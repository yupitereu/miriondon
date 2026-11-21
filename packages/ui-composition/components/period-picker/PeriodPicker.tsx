'use client';

import { cn, Icon, Popover, PopoverContent, PopoverTrigger, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, useIsMobileView } from '@repo/ui-core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { MONTHS, PeriodGridCell, PeriodGridHeader, YEAR_GRID_SIZE, getDecadeStart, type PeriodCellStatus } from './PeriodGridParts';

export type { PeriodCellStatus };

export type PeriodMonthValue = {
  year: number;
  month: number; // 1 ~ 12
};

type PeriodPickerBaseProps = {
  id?: string;
  size?: 'compact' | 'default';
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
  getCellStatus?: (target: { year: number; month?: number }) => PeriodCellStatus | undefined;
  footer?: ReactNode;
  className?: string;
  sheetTitle?: string;
  'aria-label'?: string;
};

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

const PeriodPicker = (
  props:
    | (PeriodPickerBaseProps & {
        mode: 'month';
        value?: PeriodMonthValue;
        defaultValue?: PeriodMonthValue;
        onChange?: (value: PeriodMonthValue) => void;
        onPrev?: () => void;
        onNext?: () => void;
      })
    | (PeriodPickerBaseProps & {
        mode: 'year';
        value?: number;
        defaultValue?: number;
        onChange?: (year: number) => void;
        onPrev?: () => void;
        onNext?: () => void;
      })
) => {
  const { id, size = 'compact', disabled = false, minYear = 1970, maxYear = 2100, getCellStatus, footer, className, sheetTitle, 'aria-label': ariaLabel } = props;

  const isMobile = useIsMobileView();
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [uncontrolledMonth, setUncontrolledMonth] = useState<PeriodMonthValue>(props.mode === 'month' ? (props.defaultValue ?? getCurrentMonthValue()) : getCurrentMonthValue());
  const [uncontrolledYear, setUncontrolledYear] = useState<number>(props.mode === 'year' ? (props.defaultValue ?? currentYear) : currentYear);

  const isControlled = props.value !== undefined;
  const activeMonthValue: PeriodMonthValue = props.mode === 'month' ? (props.value ?? uncontrolledMonth) : getCurrentMonthValue();
  const activeYearValue: number = props.mode === 'year' ? (props.value ?? uncontrolledYear) : activeMonthValue.year;

  const [open, setOpen] = useState(false);
  const [panelView, setPanelView] = useState<'month' | 'year'>(props.mode);
  const [viewYear, setViewYear] = useState<number>(activeYearValue);
  const [yearGridStart, setYearGridStart] = useState<number>(() => getDecadeStart(activeYearValue));

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled && nextOpen) {
      return;
    }
    if (nextOpen) {
      setPanelView(props.mode);
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
    if (nextYear < minYear || nextYear > maxYear) return;
    if (props.mode === 'month') {
      setViewYear(nextYear);
      setPanelView('month');
      return;
    }
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
  const effectiveView: 'month' | 'year' = props.mode === 'year' ? 'year' : panelView;
  const resolvedSheetTitle = sheetTitle ?? (effectiveView === 'month' ? '월 선택' : '연도 선택');

  const gridBody = (
    <div className="flex flex-col gap-3">
      {effectiveView === 'month' ? (
        <>
          <PeriodGridHeader
            label={`${viewYear}년`}
            onTitleClick={() => {
              setYearGridStart(getDecadeStart(viewYear));
              setPanelView('year');
            }}
            titleAriaLabel="연도 선택으로 전환"
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
              const status = props.mode === 'year' ? getCellStatus?.({ year: yr }) : undefined;
              const isSelectedYear = props.mode === 'year' ? activeYearValue === yr : viewYear === yr;
              return (
                <PeriodGridCell
                  key={yr}
                  label={String(yr)}
                  selected={isSelectedYear}
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
        'inline-flex flex-1 cursor-pointer items-center justify-center whitespace-nowrap px-2 text-sm font-bold text-foreground tabular-nums transition-colors',
        'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none'
      )}
    >
      <span>{centerText}</span>
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
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-35"
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
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-35"
      >
        <Icon icon={ChevronRight} size="sm" />
      </button>
    </div>
  );
};

export { PeriodPicker };
