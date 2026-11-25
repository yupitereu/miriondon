'use client';

import { Button, Input, NumberInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@repo/ui-core';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

import { getIncomeLineItem, sumIncomeLines, TAX_OPTIONS, type IncomeKind, type IncomeLine } from '@/previews/income/income-model';
import { formatWon } from '@/shared/design-format';

type IncomeLineSectionKey = 'payments' | 'deductions';

type IncomeLineItemErrors = {
  name?: ReadonlySet<string>;
  amount?: ReadonlySet<string>;
  taxStatus?: ReadonlySet<string>;
};

export type IncomeLineItemsErrors = Partial<Record<IncomeLineSectionKey, IncomeLineItemErrors>>;

export const IncomeLineItemsEditor = ({
  kind,
  payments,
  deductions,
  taxRecordingEnabled,
  onLinesChange,
  expandedSections,
  onExpandedChange,
  errors,
  minPaymentRows = 0
}: {
  kind: IncomeKind;
  payments: IncomeLine[];
  deductions: IncomeLine[];
  taxRecordingEnabled: boolean;
  onLinesChange: (section: IncomeLineSectionKey, rows: IncomeLine[]) => void;
  expandedSections: Record<IncomeLineSectionKey, boolean>;
  onExpandedChange: (section: IncomeLineSectionKey, expanded: boolean) => void;
  errors?: IncomeLineItemsErrors;
  minPaymentRows?: number;
}) => {
  const sections: ReadonlyArray<{ key: IncomeLineSectionKey; label: string; rows: IncomeLine[] }> = [
    { key: 'payments', label: '지급 항목', rows: payments },
    { key: 'deductions', label: '공제 항목', rows: deductions }
  ];

  return (
    <>
      {sections.map(({ key, label, rows }) => {
        const isExpanded = expandedSections[key];
        const sectionSum = sumIncomeLines(rows);
        const isPayment = key === 'payments';
        const hasTaxColumn = isPayment && taxRecordingEnabled;

        const patchLine = (id: string, patch: Partial<IncomeLine>) =>
          onLinesChange(
            key,
            rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
          );

        return (
          <section key={key} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => onExpandedChange(key, !isExpanded)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <h3 className="text-sm font-bold text-foreground">{label}</h3>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-sm font-bold text-foreground tabular-nums">{Number.isSafeInteger(sectionSum) ? formatWon(sectionSum) : '—'}</span>
                <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
              </span>
            </button>
            {isExpanded ? (
              <div className="grid min-w-0 gap-2">
                {rows.map((row) => {
                  const item = getIncomeLineItem(kind, key, row.itemId);
                  const itemLabel = item?.label ?? row.label ?? '';
                  const isCustom = !row.itemId;
                  const fieldErrors = errors?.[key];
                  const rowClassName = isCustom
                    ? hasTaxColumn
                      ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 min-[480px]:grid-cols-[minmax(0,34%)_minmax(0,1fr)_4.25rem_1.75rem]'
                      : 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 min-[480px]:grid-cols-[minmax(0,34%)_minmax(0,1fr)_1.75rem]'
                    : hasTaxColumn
                      ? 'grid grid-cols-[minmax(0,1fr)_minmax(6rem,8rem)_2.75rem] items-center gap-1.5 min-[480px]:grid-cols-[minmax(0,34%)_minmax(0,1fr)_2.75rem]'
                      : 'grid grid-cols-[minmax(0,1fr)_minmax(6rem,8rem)] items-center gap-1.5 min-[480px]:grid-cols-[minmax(0,38%)_minmax(0,1fr)]';

                  return (
                    <div key={row.id} className={rowClassName}>
                      <div className={cn('min-w-0', isCustom && 'col-start-1 row-start-1')}>
                        {isCustom ? (
                          <Input
                            aria-label={`${label} ${itemLabel || '새 항목'} 이름`}
                            placeholder="항목명"
                            className="min-w-0"
                            invalid={Boolean(fieldErrors?.name?.has(row.id))}
                            value={row.label ?? ''}
                            onChange={(event) => patchLine(row.id, { label: event.target.value })}
                          />
                        ) : (
                          <span className="block text-xs leading-tight font-medium text-foreground break-words">{itemLabel}</span>
                        )}
                      </div>

                      <div
                        className={cn(
                          'min-w-0',
                          isCustom &&
                            (hasTaxColumn
                              ? 'col-start-1 row-start-2 min-[480px]:col-start-2 min-[480px]:row-start-1'
                              : 'col-span-2 row-start-2 min-[480px]:col-span-1 min-[480px]:col-start-2 min-[480px]:row-start-1')
                        )}
                      >
                        <NumberInput
                          aria-label={`${itemLabel || label} 금액`}
                          placeholder="금액 (원)"
                          className="w-full min-w-0 text-right tabular-nums"
                          invalid={Boolean(fieldErrors?.amount?.has(row.id))}
                          value={row.amount === '' ? null : Number(row.amount)}
                          onValueChange={(value) => patchLine(row.id, { amount: value === null ? '' : String(value) })}
                        />
                      </div>

                      {hasTaxColumn ? (
                        <div className={cn('flex min-w-0 justify-end', isCustom && 'col-start-2 row-start-2 min-[480px]:col-start-3 min-[480px]:row-start-1')}>
                          {isCustom ? (
                            <Select value={row.taxStatus ?? '과세'} onValueChange={(value) => patchLine(row.id, { taxStatus: TAX_OPTIONS.find((option) => option === value) })}>
                              <SelectTrigger aria-label={`${itemLabel || '추가 항목'} 과세 구분`} invalid={Boolean(fieldErrors?.taxStatus?.has(row.id))} className="w-[4.25rem] gap-0.5 px-1.5 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TAX_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : item?.taxStatus ? (
                            <span
                              className={cn(
                                'inline-flex h-6 w-11 items-center justify-center rounded-md px-1.5 text-[10px] font-semibold whitespace-nowrap',
                                item.taxStatus === '비과세' ? 'bg-primary-tint text-primary' : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {item.taxStatus}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {isCustom ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className={cn(
                            hasTaxColumn ? 'col-start-2 row-start-1 min-[480px]:col-start-4 min-[480px]:row-start-1' : 'col-start-2 row-start-1 min-[480px]:col-start-3 min-[480px]:row-start-1'
                          )}
                          aria-label={`${itemLabel || '추가 항목'} 삭제`}
                          disabled={isPayment && rows.length <= minPaymentRows}
                          onClick={() =>
                            onLinesChange(
                              key,
                              rows.filter((candidate) => candidate.id !== row.id)
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onLinesChange(key, [...rows, { id: crypto.randomUUID(), label: '', amount: '0', ...(isPayment ? { taxStatus: '과세' as const } : {}) }])}
                  >
                    <Plus className="size-3.5" /> {label} 추가
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </>
  );
};
