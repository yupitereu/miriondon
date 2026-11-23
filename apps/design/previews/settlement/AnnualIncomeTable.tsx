'use client';

import { ChevronDown } from 'lucide-react';
import { Fragment, useState, type CSSProperties } from 'react';

import { annualIncomeNet, type AnnualIncome } from '@/previews/settlement/annual-settlement-data';
import { formatWon } from '@/shared/design-format';

const months = Array.from({ length: 12 }, (_, index) => index + 1);
const amount = (records: AnnualIncome[]) => (records.length ? records.reduce((sum, record) => sum + annualIncomeNet(record), 0) : null);
const cell = (value: number | null) => (value === null ? '—' : formatWon(value).replace(/원$/, ''));
type Selection = { month: number | null; kind: string };

export const IncomeDetails = ({ records }: { records: AnnualIncome[] }) => (
  <div className="grid gap-4 text-left text-sm tabular-nums sm:grid-cols-2 md:text-xs">
    {(['payments', 'deductions'] as const).map((field) => {
      const sums = new Map<string, number>();
      records.forEach((record) => record[field].forEach((entry) => sums.set(entry.name, (sums.get(entry.name) ?? 0) + entry.amount)));
      const total = sums.size ? [...sums.values()].reduce((sum, value) => sum + value, 0) : null;
      return (
        <div key={field}>
          <div className="mb-2 flex justify-between gap-3 border-b border-border pb-2 font-semibold">
            <span>{field === 'payments' ? '지급' : '공제'}</span>
            <span>{cell(total)}</span>
          </div>
          {sums.size ? (
            <dl className="space-y-2">
              {[...sums].map(([name, value]) => (
                <div key={name} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{name}</dt>
                  <dd>{cell(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
      );
    })}
  </div>
);

export const AnnualIncomeTable = ({ records, availableKinds }: { records: AnnualIncome[]; availableKinds: string[] }) => {
  const kinds = [...new Set(['근로소득', '사업소득', ...availableKinds])].filter((kind) => records.some((record) => record.kind === kind));
  const [selection, setSelection] = useState<Selection | null>(null);
  const isSelected = (month: number | null, kind: string) => selection?.month === month && selection.kind === kind;
  const toggle = (month: number | null, kind: string) => setSelection((current) => (current?.month === month && current.kind === kind ? null : { month, kind }));
  const monthRecords = (month: number | null) => records.filter((record) => month === null || record.month === month);
  const selectedRecords = () => (selection ? monthRecords(selection.month).filter((record) => record.kind === selection.kind) : []);
  const detailId = (prefix: string, month: number | null) => `${prefix}-income-detail-${month ?? 'annual'}`;
  const incomeButton = (month: number | null, kind: string, prefix: string) => {
    const value = amount(monthRecords(month).filter((record) => record.kind === kind));
    if (value === null) return <span>—</span>;
    return (
      <button
        type="button"
        className="inline-flex min-h-control-lg items-center justify-center gap-1 text-income"
        aria-label={`${month === null ? '연간' : `${month}월`} ${kind} ${formatWon(value)} 지급·공제 상세`}
        aria-expanded={isSelected(month, kind)}
        aria-controls={isSelected(month, kind) ? detailId(prefix, month) : undefined}
        onClick={() => toggle(month, kind)}
      >
        {cell(value)}
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 ${isSelected(month, kind) ? 'rotate-180' : ''}`} />
      </button>
    );
  };
  const detailRow = (month: number | null) =>
    selection?.month === month && selectedRecords().length ? (
      <tr className="border-b border-border bg-background">
        <td colSpan={kinds.length + 2} className="p-0">
          <div id={detailId('desktop', month)} className="sticky left-0 w-[min(100vw,580px)] max-w-full px-4 py-4">
            <p className="mb-3 text-left text-xs font-semibold">{selection.kind} 상세내역</p>
            <IncomeDetails records={selectedRecords()} />
          </div>
        </td>
      </tr>
    ) : null;
  return (
    <div className="min-w-0">
      <div className="divide-y divide-border rounded-md border border-border md:hidden">
        <div className="flex items-center justify-between bg-background py-2 pr-10 pl-3 text-xs text-muted-foreground">
          <span>월 (원)</span>
          <span>실수령액</span>
        </div>
        {[...months, null].map((month) => {
          const items = monthRecords(month);
          const total = amount(items);
          if (total === null) {
            return (
              <div key={month ?? 'annual'} className="flex min-h-control-lg items-center justify-between px-3 py-3 text-sm">
                <span className="font-semibold">{month === null ? '연간 합계' : `${month}월`}</span>
                <span className="mr-7 tabular-nums">—</span>
              </div>
            );
          }
          return (
            <details key={month ?? 'annual'} className="group/income-month">
              <summary className="flex min-h-control-lg cursor-pointer list-none items-center gap-3 px-3 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">{month === null ? '연간 합계' : `${month}월`}</span>
                <span className="ml-auto font-semibold text-income tabular-nums">{cell(total)}</span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open/income-month:rotate-180" />
              </summary>
              <div className="space-y-1 border-t border-border bg-background px-3 py-2">
                {kinds
                  .filter((kind) => items.some((record) => record.kind === kind))
                  .map((kind) => (
                    <div key={kind}>
                      <div className="flex min-h-control-lg items-center justify-between gap-3 text-sm">
                        <span>{kind}</span>
                        <span className="tabular-nums">{incomeButton(month, kind, 'mobile')}</span>
                      </div>
                      {isSelected(month, kind) ? (
                        <div id={detailId('mobile', month)} className="rounded-md border border-border bg-card p-3">
                          <IncomeDetails records={selectedRecords()} />
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            </details>
          );
        })}
      </div>
      <div className="hidden max-w-full overflow-x-auto rounded-md border border-border md:block" role="region" tabIndex={0} aria-label="월별 수입 종류 표, 좌우로 이동 가능">
        <table
          className="w-[var(--desktop-width)] min-w-full table-fixed border-collapse text-center text-sm tabular-nums"
          style={{ '--desktop-width': `${72 + (kinds.length + 1) * 148}px` } as CSSProperties}
        >
          <colgroup>
            <col className="w-[72px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-background text-xs text-muted-foreground">
              <th scope="col" className="sticky left-0 z-10 bg-background px-2 py-3">
                월 (원)
              </th>
              {kinds.map((kind) => (
                <th key={kind} scope="col" className="px-2 py-3">
                  {kind}
                </th>
              ))}
              <th scope="col" className="px-2 py-3 whitespace-nowrap">
                실수령액
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => {
              const items = monthRecords(month);
              return (
                <Fragment key={month}>
                  <tr className="border-b border-border">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-2 py-3 whitespace-nowrap">
                      {month}월
                    </th>
                    {kinds.map((kind) => (
                      <td key={kind} className="px-2 py-1 whitespace-nowrap">
                        {incomeButton(month, kind, 'desktop')}
                      </td>
                    ))}
                    <td className="px-2 py-3 font-bold whitespace-nowrap text-income">{cell(amount(items))}</td>
                  </tr>
                  {detailRow(month)}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-background font-bold">
              <th scope="row" className="sticky left-0 z-10 bg-background px-2 py-3 whitespace-nowrap">
                연간 합계
              </th>
              {kinds.map((kind) => (
                <td key={kind} className="px-2 py-1 whitespace-nowrap">
                  {incomeButton(null, kind, 'desktop')}
                </td>
              ))}
              <td className="px-2 py-3 whitespace-nowrap text-income">{cell(amount(records))}</td>
            </tr>
            {detailRow(null)}
          </tfoot>
        </table>
      </div>
    </div>
  );
};
