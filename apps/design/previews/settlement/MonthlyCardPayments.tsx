import type { PeriodMonthValue } from '@repo/ui-composition';
import { Popover, PopoverContent, PopoverTrigger, cn } from '@repo/ui-core';
import { HelpCircle } from 'lucide-react';

import type { CardBill } from '@/previews/settlement/monthly-card-data';
import { formatWon } from '@/shared/design-format';
import { addMonthsToPeriod, formatYearMonth } from '@/shared/expense-form/expense-form-model';

export const MonthlyCardPayments = ({ cardName, period, bills }: { cardName: string; period: PeriodMonthValue; bills: Partial<Record<string, CardBill>> }) => {
  const periods = [period, addMonthsToPeriod(period, 1)];

  return (
    <dl className="grid grid-cols-2 divide-x divide-border">
      {periods.map((item, index) => {
        const monthKey = formatYearMonth(item);
        const title = `${item.month}월 ${index === 0 ? '결제대금' : '결제 예정액'}`;
        const bill = bills[monthKey];

        return (
          <div key={monthKey} className="min-w-0 first:pr-2 last:pl-2 sm:first:pr-3 sm:last:pl-3">
            <dt className="text-xs text-muted-foreground break-keep">{title}</dt>
            <dd className={cn('flex min-h-11 items-center tabular-nums', index === 0 ? 'text-base font-extrabold text-foreground' : 'text-sm font-semibold')}>
              {bill ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${cardName} ${title} ${formatWon(bill.amount)}, 결제 상세`}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                    >
                      <span className="whitespace-nowrap">{formatWon(bill.amount)}</span>
                      <HelpCircle aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
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
                <span className="font-semibold text-muted-foreground">{formatWon(0)}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};
