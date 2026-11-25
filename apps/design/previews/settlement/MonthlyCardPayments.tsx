import type { PeriodMonthValue } from '@repo/ui-composition';
import { Popover, PopoverContent, PopoverTrigger, cn } from '@repo/ui-core';
import { HelpCircle } from 'lucide-react';

import { isBillDueDatePassed, type CardBill } from '@/previews/settlement/monthly-card-data';
import { formatWon } from '@/shared/design-format';
import { addMonthsToPeriod, formatYearMonth } from '@/shared/expense-form/expense-form-model';

export const MonthlyCardPayments = ({ cardName, period, bills }: { cardName: string; period: PeriodMonthValue; bills: Partial<Record<string, CardBill>> }) => {
  const periods = [period, addMonthsToPeriod(period, 1)];
  const currentBill = bills[formatYearMonth(period)];
  const highlightedIndex = isBillDueDatePassed(period, currentBill) ? 1 : 0;

  return (
    <dl className="grid grid-cols-2 divide-x divide-border">
      {periods.map((item, index) => {
        const monthKey = formatYearMonth(item);
        const title = `${item.month}월 결제금액`;
        const bill = bills[monthKey];
        const isHighlighted = index === highlightedIndex;

        return (
          <div key={monthKey} className="min-w-0 first:pr-2 last:pl-2 sm:first:pr-3 sm:last:pl-3">
            <dt className={cn('text-xs break-keep', isHighlighted ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {bill ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${cardName} ${title} 결제 상세`}
                      className="group relative inline-flex cursor-pointer items-center gap-1 rounded-sm text-left transition-colors before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                    >
                      <span className="whitespace-nowrap">{title}</span>
                      <HelpCircle aria-hidden="true" className={cn('size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground', !isHighlighted && 'opacity-75')} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent aria-label={`${title} 상세`} collisionPadding={8} className="px-3 py-2 text-xs">
                    <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1.5 tabular-nums">
                      <dt className="text-muted-foreground">결제일</dt>
                      <dd className="text-right font-semibold">{bill.date}</dd>
                      <dt className="text-muted-foreground">청구 대상 기간</dt>
                      <dd className="text-right font-semibold">{bill.usagePeriod}</dd>
                    </dl>
                  </PopoverContent>
                </Popover>
              ) : (
                <span className="whitespace-nowrap">{title}</span>
              )}
            </dt>
            <dd className={cn('mt-1 flex min-h-7 items-center tabular-nums', isHighlighted ? 'text-lg font-extrabold tracking-tight text-foreground' : 'text-sm font-medium text-muted-foreground')}>
              <span className="whitespace-nowrap">{formatWon(bill ? bill.amount : 0)}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
};
