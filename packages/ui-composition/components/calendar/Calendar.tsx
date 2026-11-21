'use client';

import { buttonVariants, cn, Icon } from '@repo/ui-core';
import { format } from 'date-fns';
import { ko as dateFnsKo } from 'date-fns/locale';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ComponentProps } from 'react';
import { DayFlag, DayPicker, SelectionState, UI, type ChevronProps, type MonthCaptionProps } from 'react-day-picker';
import { ko as dayPickerKo } from 'react-day-picker/locale';

import { MONTHS, PeriodGridCell, PeriodGridHeader, YEAR_GRID_SIZE, getDecadeStart } from '../period-picker/PeriodGridParts';

const DEFAULT_MIN_YEAR = 1970;
const DEFAULT_MAX_YEAR = 2100;

type CalendarCaptionContextValue = {
  onOpenMonthView: (monthDate: Date) => void;
};

const CalendarCaptionContext = createContext<CalendarCaptionContextValue | null>(null);

const CalendarChevron = ({ orientation = 'left', className }: ChevronProps) => {
  if (orientation === 'right') {
    return <Icon icon={ChevronRight} size="md" className={className} />;
  }
  if (orientation === 'up') {
    return <Icon icon={ChevronUp} size="xs" className={cn('text-muted-foreground', className)} />;
  }
  if (orientation === 'down') {
    return <Icon icon={ChevronDown} size="xs" className={cn('text-muted-foreground', className)} />;
  }
  return <Icon icon={ChevronLeft} size="md" className={className} />;
};

const CalendarMonthCaption = ({ calendarMonth, displayIndex: _displayIndex, children, ...divProps }: MonthCaptionProps) => {
  const captionContext = useContext(CalendarCaptionContext);

  if (!captionContext) {
    return <div {...divProps}>{children}</div>;
  }

  return (
    <div {...divProps}>
      <button
        type="button"
        aria-label="월 선택으로 전환"
        onClick={() => captionContext.onOpenMonthView(calendarMonth.date)}
        className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-2.5 text-sm font-bold text-foreground tabular-nums transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {children}
      </button>
    </div>
  );
};

const toMonthIndex = (year: number, month: number): number => year * 12 + (month - 1);

const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  locale = dayPickerKo,
  month,
  defaultMonth,
  onMonthChange,
  startMonth,
  endMonth,
  formatters,
  components,
  ...props
}: ComponentProps<typeof DayPicker>) => {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const isControlledMonth = month !== undefined;
  const [uncontrolledMonth, setUncontrolledMonth] = useState<Date>(() => defaultMonth ?? new Date());
  const activeMonth = isControlledMonth ? month : uncontrolledMonth;

  const [view, setView] = useState<'day' | 'month' | 'year'>('day');
  const [viewYear, setViewYear] = useState<number>(() => activeMonth.getFullYear());
  const [yearGridStart, setYearGridStart] = useState<number>(() => getDecadeStart(activeMonth.getFullYear()));

  const minYear = startMonth ? startMonth.getFullYear() : DEFAULT_MIN_YEAR;
  const maxYear = endMonth ? endMonth.getFullYear() : DEFAULT_MAX_YEAR;
  const minMonthIdx = startMonth ? toMonthIndex(startMonth.getFullYear(), startMonth.getMonth() + 1) : toMonthIndex(DEFAULT_MIN_YEAR, 1);
  const maxMonthIdx = endMonth ? toMonthIndex(endMonth.getFullYear(), endMonth.getMonth() + 1) : toMonthIndex(DEFAULT_MAX_YEAR, 12);

  const commitMonth = useCallback(
    (nextMonth: Date) => {
      if (!isControlledMonth) {
        setUncontrolledMonth(nextMonth);
      }
      onMonthChange?.(nextMonth);
    },
    [isControlledMonth, onMonthChange]
  );

  const captionContextValue = useMemo<CalendarCaptionContextValue>(
    () => ({
      onOpenMonthView: (monthDate: Date) => {
        setViewYear(monthDate.getFullYear());
        setYearGridStart(getDecadeStart(monthDate.getFullYear()));
        setView('month');
      }
    }),
    []
  );

  if (view === 'month') {
    return (
      <div className={cn('flex w-full select-none flex-col gap-3', className)}>
        <PeriodGridHeader
          label={`${viewYear}년`}
          onTitleClick={() => {
            setYearGridStart(getDecadeStart(viewYear));
            setView('year');
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
            const idx = toMonthIndex(viewYear, m);
            const isDisabled = idx < minMonthIdx || idx > maxMonthIdx;
            const isSelected = activeMonth.getFullYear() === viewYear && activeMonth.getMonth() + 1 === m;
            return (
              <PeriodGridCell
                key={m}
                label={`${m}월`}
                selected={isSelected}
                current={currentYear === viewYear && currentMonth === m}
                disabled={isDisabled}
                onSelect={() => {
                  commitMonth(new Date(viewYear, m - 1, 1));
                  setView('day');
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (view === 'year') {
    return (
      <div className={cn('flex w-full select-none flex-col gap-3', className)}>
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
          {Array.from({ length: YEAR_GRID_SIZE }, (_, idx) => yearGridStart + idx).map((yr) => (
            <PeriodGridCell
              key={yr}
              label={String(yr)}
              selected={viewYear === yr}
              current={currentYear === yr}
              disabled={yr < minYear || yr > maxYear}
              onSelect={() => {
                setViewYear(yr);
                setView('month');
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <CalendarCaptionContext value={captionContextValue}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        locale={locale}
        month={activeMonth}
        onMonthChange={commitMonth}
        startMonth={startMonth}
        endMonth={endMonth}
        formatters={{
          formatCaption: (m) => format(m, 'yyyy년 M월', { locale: dateFnsKo }),
          ...formatters
        }}
        className={cn('w-full select-none', className)}
        classNames={{
          [UI.Root]: 'w-full',
          [UI.Months]: 'relative flex flex-col gap-3',
          [UI.Month]: 'flex flex-col gap-2',
          [UI.MonthCaption]: 'relative flex h-8 items-center justify-center px-9',
          [UI.CaptionLabel]: 'text-sm font-bold text-inherit tabular-nums',
          [UI.Nav]: 'pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between',
          [UI.PreviousMonthButton]: cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'pointer-events-auto size-8 min-h-8 min-w-8 cursor-pointer rounded-md p-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-35 aria-disabled:pointer-events-none aria-disabled:opacity-35'
          ),
          [UI.NextMonthButton]: cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'pointer-events-auto size-8 min-h-8 min-w-8 cursor-pointer rounded-md p-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-35 aria-disabled:pointer-events-none aria-disabled:opacity-35'
          ),
          [UI.MonthGrid]: 'w-full border-collapse',
          [UI.Weekdays]: 'mb-1 grid grid-cols-7 gap-1',
          [UI.Weekday]: 'flex h-7 items-center justify-center text-[11px] font-semibold text-muted-foreground',
          [UI.Weeks]: 'flex flex-col gap-1',
          [UI.Week]: 'grid grid-cols-7 gap-1',
          [UI.Day]: 'flex items-center justify-center p-0',
          [UI.DayButton]:
            'flex size-calendar-cell cursor-pointer items-center justify-center rounded-full text-[13px] font-medium tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          [DayFlag.today]: '[&>button]:border [&>button]:border-primary/45 [&>button]:font-bold [&>button]:text-primary',
          [SelectionState.selected]:
            '[&>button]:border-transparent [&>button]:bg-primary [&>button]:font-bold [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90 [&>button]:hover:text-primary-foreground',
          [DayFlag.outside]: '[&>button]:text-muted-foreground [&>button]:opacity-45',
          [DayFlag.disabled]: '[&>button]:pointer-events-none [&>button]:text-muted-foreground [&>button]:opacity-35',
          ...classNames
        }}
        components={{
          Chevron: CalendarChevron,
          MonthCaption: CalendarMonthCaption,
          ...components
        }}
        {...props}
      />
    </CalendarCaptionContext>
  );
};

export { Calendar };
