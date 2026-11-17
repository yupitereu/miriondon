'use client';

import { Button, cn, Icon, Popover, PopoverContent, PopoverTrigger, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, useIsMobileView } from '@repo/ui-core';
import { format, isAfter, isBefore, isSameDay, startOfDay, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import * as React from 'react';
import type { Matcher } from 'react-day-picker';

import { Calendar } from '../calendar/Calendar';

export type DatePreset = 'today' | 'yesterday';

export interface DatePickerProps {
  id?: string;
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
  presets?: DatePreset[];
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Matcher | Matcher[];
  error?: string;
  clearable?: boolean;
  className?: string;
  sheetTitle?: string;
  'aria-label'?: string;
}

const PRESET_LABEL: Record<DatePreset, string> = {
  today: '오늘',
  yesterday: '어제'
};

const getPresetDate = (preset: DatePreset): Date => {
  const today = startOfDay(new Date());
  return preset === 'yesterday' ? subDays(today, 1) : today;
};

const isDateDisabled = (date: Date, minDate?: Date, maxDate?: Date): boolean => {
  const day = startOfDay(date);
  if (minDate && isBefore(day, startOfDay(minDate))) {
    return true;
  }
  if (maxDate && isAfter(day, startOfDay(maxDate))) {
    return true;
  }
  return false;
};

const buildDisabledMatchers = (minDate?: Date, maxDate?: Date, disabledDates?: Matcher | Matcher[]): Matcher[] | undefined => {
  const matchers: Matcher[] = [];
  if (minDate) {
    matchers.push({ before: startOfDay(minDate) });
  }
  if (maxDate) {
    matchers.push({ after: startOfDay(maxDate) });
  }
  if (disabledDates) {
    if (Array.isArray(disabledDates)) {
      matchers.push(...disabledDates);
    } else {
      matchers.push(disabledDates);
    }
  }
  return matchers.length > 0 ? matchers : undefined;
};

const DatePicker = ({
  id,
  value,
  defaultValue = null,
  onChange,
  presets = ['today', 'yesterday'],
  placeholder = '날짜를 선택해 주세요',
  disabled = false,
  minDate,
  maxDate,
  disabledDates,
  error,
  clearable = false,
  className,
  sheetTitle = '날짜 선택',
  'aria-label': ariaLabel
}: DatePickerProps) => {
  const generatedId = React.useId();
  const triggerId = id ?? generatedId;
  const errorId = `${triggerId}-error`;
  const isMobile = useIsMobileView();

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<Date | null>(defaultValue);
  const selectedDate = isControlled ? (value ?? null) : uncontrolledValue;

  const [open, setOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => selectedDate ?? new Date());

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled && nextOpen) {
      return;
    }
    if (nextOpen) {
      setDisplayMonth(selectedDate ?? new Date());
    }
    setOpen(nextOpen);
  };

  const commitDate = (nextDate: Date | null) => {
    if (!isControlled) {
      setUncontrolledValue(nextDate);
    }
    onChange?.(nextDate);
    if (nextDate) {
      setDisplayMonth(nextDate);
    }
    setOpen(false);
  };

  const disabledMatchers = buildDisabledMatchers(minDate, maxDate, disabledDates);
  const formattedLabel = selectedDate ? format(selectedDate, 'yyyy.MM.dd (eee)', { locale: ko }) : placeholder;
  const showClear = clearable && Boolean(selectedDate) && !disabled;

  const pickerBody = (
    <div className="flex flex-col gap-2.5">
      {presets.length > 0 ? (
        <div className="flex items-center gap-1.5">
          {presets.map((preset) => {
            const presetDate = getPresetDate(preset);
            const active = selectedDate ? isSameDay(selectedDate, presetDate) : false;
            const presetDisabled = isDateDisabled(presetDate, minDate, maxDate);
            return (
              <Button key={preset} type="button" variant={active ? 'secondary' : 'outline'} size="sm" disabled={presetDisabled} onClick={() => commitDate(presetDate)}>
                {PRESET_LABEL[preset]}
              </Button>
            );
          })}
        </div>
      ) : null}
      <Calendar mode="single" selected={selectedDate ?? undefined} onSelect={(date) => commitDate(date ?? null)} month={displayMonth} onMonthChange={setDisplayMonth} disabled={disabledMatchers} />
    </div>
  );

  const triggerButton = (
    <button
      id={triggerId}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      onClick={() => {
        if (isMobile) {
          handleOpenChange(!open);
        }
      }}
      className={cn(
        'flex min-h-control-lg w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-card py-2.5 pl-3 text-left text-sm transition-colors',
        showClear ? 'pr-16' : 'pr-3',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
        error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25',
        className
      )}
    >
      <span className={cn('min-w-0 flex-1 truncate tabular-nums', selectedDate ? 'text-foreground' : 'text-muted-foreground')}>{formattedLabel}</span>
      {!showClear ? <Icon icon={CalendarIcon} size="md" className="shrink-0 text-muted-foreground" /> : null}
    </button>
  );

  const triggerWithActions = (
    <div className="relative w-full">
      {isMobile ? (
        triggerButton
      ) : (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent align="start" className="w-[320px] p-4">
            {pickerBody}
          </PopoverContent>
        </Popover>
      )}
      {showClear ? (
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1.5">
          <button
            type="button"
            aria-label="날짜 지우기"
            onClick={() => commitDate(null)}
            className="pointer-events-auto inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <Icon icon={X} size="xs" />
          </button>
          <Icon icon={CalendarIcon} size="md" className="text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-1">
      {triggerWithActions}
      {isMobile ? (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{sheetTitle}</SheetTitle>
            </SheetHeader>
            <SheetBody className="items-center pt-1">
              <div className="w-full max-w-[320px]">{pickerBody}</div>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[11px] leading-snug text-destructive break-keep">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export { DatePicker };
