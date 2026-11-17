'use client';

import { buttonVariants, cn, Icon } from '@repo/ui-core';
import { format } from 'date-fns';
import { ko as dateFnsKo } from 'date-fns/locale';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { DayFlag, DayPicker, SelectionState, UI, type ChevronProps } from 'react-day-picker';
import { ko as dayPickerKo } from 'react-day-picker/locale';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const CalendarChevron = ({ orientation = 'left', className }: ChevronProps) => {
  if (orientation === 'right') {
    return <Icon icon={ChevronRight} size="md" className={className} />;
  }
  if (orientation === 'up') {
    return <Icon icon={ChevronUp} size="md" className={className} />;
  }
  if (orientation === 'down') {
    return <Icon icon={ChevronDown} size="md" className={className} />;
  }
  return <Icon icon={ChevronLeft} size="md" className={className} />;
};

const Calendar = ({ className, classNames, showOutsideDays = true, locale = dayPickerKo, formatters, components, ...props }: CalendarProps) => {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      formatters={{
        formatCaption: (month) => format(month, 'yyyy년 M월', { locale: dateFnsKo }),
        ...formatters
      }}
      className={cn('w-full select-none', className)}
      classNames={{
        [UI.Root]: 'w-full',
        [UI.Months]: 'relative flex flex-col gap-3',
        [UI.Month]: 'flex flex-col gap-2',
        [UI.MonthCaption]: 'relative flex h-8 items-center justify-center',
        [UI.CaptionLabel]: 'text-sm font-bold text-foreground tabular-nums',
        [UI.Nav]: 'pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-between',
        [UI.PreviousMonthButton]: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'pointer-events-auto size-8 min-h-8 min-w-8 rounded-md p-0 text-muted-foreground hover:text-foreground'),
        [UI.NextMonthButton]: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'pointer-events-auto size-8 min-h-8 min-w-8 rounded-md p-0 text-muted-foreground hover:text-foreground'),
        [UI.MonthGrid]: 'w-full border-collapse',
        [UI.Weekdays]: 'mb-1 grid grid-cols-7 gap-1',
        [UI.Weekday]: 'flex h-7 items-center justify-center text-[11px] font-semibold text-muted-foreground',
        [UI.Weeks]: 'flex flex-col gap-1',
        [UI.Week]: 'grid grid-cols-7 gap-1',
        [UI.Day]: 'flex items-center justify-center p-0',
        [UI.DayButton]:
          'flex size-calendar-cell items-center justify-center rounded-full text-[13px] font-medium tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        [DayFlag.today]: '[&>button]:border [&>button]:border-primary/45 [&>button]:font-bold [&>button]:text-primary',
        [SelectionState.selected]:
          '[&>button]:border-transparent [&>button]:bg-primary [&>button]:font-bold [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90 [&>button]:hover:text-primary-foreground',
        [DayFlag.outside]: '[&>button]:text-muted-foreground [&>button]:opacity-45',
        [DayFlag.disabled]: '[&>button]:pointer-events-none [&>button]:text-muted-foreground [&>button]:opacity-35',
        ...classNames
      }}
      components={{
        Chevron: CalendarChevron,
        ...components
      }}
      {...props}
    />
  );
};

export { Calendar };
