import type { PeriodMonthValue } from '@repo/ui-composition';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@repo/ui-core';
import { AlertTriangle, ChevronDown } from 'lucide-react';

import { isBillDueDatePassed, type MonthlyCard } from '@/previews/settlement/monthly-card-data';
import { INITIAL_DESIGN_ASSETS } from '@/shared/design-assets-store';
import { formatWon } from '@/shared/design-format';
import { addMonthsToPeriod, formatYearMonth } from '@/shared/expense-form/expense-form-model';

type CardPayment = { id: string; name: string; amount: number; date: string };

export const MonthlyCardAccountPayments = ({ cards, period, selectedOwners }: { cards: MonthlyCard[]; period: PeriodMonthValue; selectedOwners: ReadonlySet<string> | null }) => {
  const nextPeriod = addMonthsToPeriod(period, 1);
  const currentMonthKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(new Date()).replace('-', '.');
  const isCurrentMonth = formatYearMonth(period) === currentMonthKey;
  const periods = [
    { key: 'current', month: period },
    { key: 'next', month: nextPeriod }
  ] as const;
  const accounts = new Map<string, Record<'current' | 'next', CardPayment[]>>();

  for (const card of cards) {
    const account = INITIAL_DESIGN_ASSETS.find((asset) => asset.id === card.paymentAccountId);
    if (selectedOwners && (!account || !selectedOwners.has(account.owner))) continue;
    periods.forEach(({ key, month }) => {
      const bill = card.bills[formatYearMonth(month)];
      if (!bill || bill.amount <= 0 || (key === 'current' && isBillDueDatePassed(month, bill))) return;
      const entries = accounts.get(card.paymentAccountId) ?? { current: [], next: [] };
      entries[key].push({ id: card.id, name: card.name, amount: bill.amount, date: bill.date });
      accounts.set(card.paymentAccountId, entries);
    });
  }

  if (accounts.size === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>계좌별 카드 납부 예정 금액</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border border-y border-border">
          {[...accounts].map(([accountId, monthlyEntries]) => {
            const account = INITIAL_DESIGN_ASSETS.find((asset) => asset.id === accountId);
            const currentTotal = monthlyEntries.current.reduce((total, entry) => total + entry.amount, 0);
            const shortfall = account && isCurrentMonth ? Math.max(0, currentTotal - account.currentBalance) : 0;
            return (
              <details key={accountId} className="group/account">
                <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-bold break-keep">{account?.name ?? '결제 계좌 미지정'}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">현재 잔액 {account ? formatWon(account.currentBalance) : '미확인'}</span>
                  </span>
                  <span className="col-span-2 row-start-2 flex flex-col gap-1 text-right tabular-nums sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex-row sm:gap-5">
                    {periods.map(({ key, month }) => (
                      <span key={formatYearMonth(month)} className="flex items-baseline justify-between gap-1.5 sm:justify-end">
                        <span className="text-xs text-muted-foreground">
                          {month.month}월 {key === 'current' ? '남은 납부액' : '납부 예정액'}
                        </span>
                        <span className={cn(key === (currentTotal > 0 ? 'current' : 'next') ? 'text-base font-extrabold text-primary' : 'text-sm font-semibold text-muted-foreground')}>
                          {formatWon(monthlyEntries[key].reduce((total, entry) => total + entry.amount, 0))}
                        </span>
                      </span>
                    ))}
                  </span>
                  <ChevronDown aria-hidden="true" className="col-start-2 row-start-1 size-4 text-muted-foreground group-open/account:rotate-180 sm:col-start-3" />
                  {shortfall > 0 ? (
                    <span className="col-span-2 inline-flex items-start gap-1.5 text-xs font-semibold text-destructive sm:col-span-3">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                      <span>납부액이 잔액보다 {formatWon(shortfall)} 많아요.</span>
                    </span>
                  ) : null}
                </summary>
                <div className="space-y-3 border-t border-border py-3">
                  {periods.map(({ key, month }) =>
                    monthlyEntries[key].length ? (
                      <section key={formatYearMonth(month)} aria-label={`${month.month}월 카드 결제 내역`}>
                        <h4 className="mb-1 text-xs font-semibold text-muted-foreground">{month.month}월</h4>
                        <ul className="space-y-1.5">
                          {monthlyEntries[key].map((entry) => (
                            <li key={entry.id} className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="min-w-0 break-keep">
                                {entry.name} <span className="text-xs text-muted-foreground">{entry.date}</span>
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums">{formatWon(entry.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
