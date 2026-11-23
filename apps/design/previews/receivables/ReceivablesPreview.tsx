'use client';

import { DatePicker, EmptyState, FilterChipGroup, FilterMultiSelect, SummaryHeroCard, dialog } from '@repo/ui-composition';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  SearchInput,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  cn
} from '@repo/ui-core';
import { ArrowLeft, CalendarRange, ChevronDown, ChevronRight, Landmark, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';

import { BulkReceiveDialog, type BulkReceiveConfirmPayload } from '@/previews/receivables/ReceivablesDialogs';
import {
  INITIAL_RECEIVABLES,
  computeReceivableBalanceDeltas,
  draftToReceivableRecord,
  formatDateRangeLabel,
  formatDepositAccountsSummary,
  getReceivableTotals,
  getRecentCompletedDateRange,
  getRecordDepositAccounts,
  getRecordOriginalDate,
  isSameDateRange,
  normalizePersonDisplay,
  parseYearMonthToRange,
  toLocalDayStart,
  type ReceivableDateRange,
  type ReceivableEntry,
  type ReceivableRecord,
  type ReceivableTabKey
} from '@/previews/receivables/receivables-model';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { MemberAvatar, MemberAvatarGroup } from '@/shared/MemberAvatar';
import { INITIAL_DESIGN_ASSETS, getInitialAssetBalancesMap } from '@/shared/design-assets-store';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { ExpenseFormOverlay, createEmptyExpensePreset, type ExpenseDraft } from '@/shared/expense-form/ExpenseFormView';
import { DEFAULT_VIEWED_MONTH } from '@/shared/expense-form/expense-form-model';

const getVisibleReceivablePeople = (entries: readonly ReceivableEntry[], activeTab: ReceivableTabKey): string[] => {
  const sourceEntries = activeTab === 'waiting' ? entries.filter((entry) => Math.max(0, entry.targetAmount ?? 0) > Math.max(0, entry.receivedAmount ?? 0)) : entries;
  const targetEntries = sourceEntries.length > 0 ? sourceEntries : entries;
  return Array.from(new Set(targetEntries.map((entry) => normalizePersonDisplay(entry.person.trim() || '미지정'))));
};

const TAB_ITEMS: ReadonlyArray<{ key: ReceivableTabKey; label: string }> = [
  { key: 'waiting', label: '대기 중인 회수' },
  { key: 'completed', label: '회수 완료' }
];

const EMPTY_STATE_COPY: Record<ReceivableTabKey, { title: string; description: string }> = {
  waiting: {
    title: '대기 중인 회수 내역이 없어요',
    description: '조건을 초기화하거나 지출 상세에서 회수금을 등록해 관리해 보세요.'
  },
  completed: {
    title: '회수 완료된 내역이 없어요',
    description: '대기 중인 회수에서 전액 입금 처리한 거래가 여기에 모여요.'
  }
};

const DEFAULT_COMPLETED_DATE_RANGE: ReceivableDateRange = getRecentCompletedDateRange(DEFAULT_VIEWED_MONTH, 3);

const isWithinDateRange = (record: ReceivableRecord, range: ReceivableDateRange): boolean => {
  const startTs = range.start ? toLocalDayStart(range.start).getTime() : null;
  const endTs = range.end ? toLocalDayStart(range.end).getTime() : null;
  if (startTs === null && endTs === null) {
    return true;
  }
  const recordTs = getRecordOriginalDate(record).getTime();
  if (startTs !== null && recordTs < startTs) {
    return false;
  }
  if (endTs !== null && recordTs > endTs) {
    return false;
  }
  return true;
};

export const ReceivablesPreview = ({ initialMonth, initialTab }: { initialMonth?: string; initialTab?: ReceivableTabKey }) => {
  const router = useRouter();

  const [records, setRecords] = useState<ReceivableRecord[]>(INITIAL_RECEIVABLES);
  const [balances, setBalances] = useState<Record<string, number>>(getInitialAssetBalancesMap);
  const [activeTab, setActiveTab] = useState<ReceivableTabKey>(() => (initialTab === 'completed' ? 'completed' : 'waiting'));

  const initialRange = useMemo(() => parseYearMonthToRange(initialMonth), [initialMonth]);

  const [searchQuery, setSearchQuery] = useState('');
  const [completedDateRange, setCompletedDateRange] = useState<ReceivableDateRange>(() => (initialRange.start || initialRange.end ? initialRange : DEFAULT_COMPLETED_DATE_RANGE));
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(() => new Set());
  const [selectedDepositAccounts, setSelectedDepositAccounts] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const isCompletedTab = activeTab === 'completed';
  const startDate = completedDateRange.start;
  const endDate = completedDateRange.end;

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [bulkDialogState, setBulkDialogState] = useState<{ open: boolean; nonce: number }>({ open: false, nonce: 0 });

  const [expenseOverlayOpen, setExpenseOverlayOpen] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() => createEmptyExpensePreset(DEFAULT_VIEWED_MONTH));

  const navigateWithQuery = (pathname: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete('month');
    params.delete('tab');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const waitingRecords = useMemo(() => records.filter((record) => !getReceivableTotals(record).isCompleted), [records]);
  const completedRecords = useMemo(() => records.filter((record) => getReceivableTotals(record).isCompleted), [records]);

  const countByTab: Record<ReceivableTabKey, number> = {
    waiting: waitingRecords.length,
    completed: completedRecords.filter((record) => isWithinDateRange(record, completedDateRange)).length
  };

  const totalWaitingUncollected = useMemo(() => waitingRecords.reduce((sum, record) => sum + getReceivableTotals(record).uncollectedTotal, 0), [waitingRecords]);
  const partialSummary = useMemo(
    () =>
      waitingRecords.reduce(
        (acc, record) => {
          const totals = getReceivableTotals(record);
          if (totals.isPartiallyReceived) {
            acc.count += 1;
            acc.receivedAmount += totals.receivedTotal;
          }
          return acc;
        },
        { count: 0, receivedAmount: 0 }
      ),
    [waitingRecords]
  );

  const waitingByPerson = useMemo(() => {
    const map = new Map<string, { displayName: string; targetAmount: number; receivedAmount: number; amount: number; count: number }>();
    for (const record of waitingRecords) {
      const countedForRecord = new Set<string>();
      for (const entry of record.entries) {
        const target = Math.max(0, entry.targetAmount ?? 0);
        const received = Math.max(0, Math.min(target, entry.receivedAmount ?? 0));
        const remaining = target - received;
        if (remaining <= 0) {
          continue;
        }
        const displayName = normalizePersonDisplay(entry.person.trim() || '미지정');
        const current = map.get(displayName);
        if (current) {
          current.targetAmount += target;
          current.receivedAmount += received;
          current.amount += remaining;
          if (!countedForRecord.has(displayName)) {
            current.count += 1;
            countedForRecord.add(displayName);
          }
        } else {
          map.set(displayName, { displayName, targetAmount: target, receivedAmount: received, amount: remaining, count: 1 });
          countedForRecord.add(displayName);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [waitingRecords]);

  const tabBaseRecords = useMemo(
    () => (isCompletedTab ? completedRecords.filter((record) => isWithinDateRange(record, completedDateRange)) : waitingRecords),
    [isCompletedTab, completedRecords, completedDateRange, waitingRecords]
  );

  const personOptions = useMemo(() => Array.from(new Set(tabBaseRecords.flatMap((record) => getVisibleReceivablePeople(record.entries, activeTab)))), [tabBaseRecords, activeTab]);

  const activeSelectedPeople = useMemo(() => new Set(Array.from(selectedPeople).filter((person) => personOptions.includes(person))), [selectedPeople, personOptions]);

  const depositAccountOptions = useMemo(() => Array.from(new Set(tabBaseRecords.flatMap((record) => getRecordDepositAccounts(record.entries)))), [tabBaseRecords]);

  const activeSelectedDepositAccounts = useMemo(
    () => new Set(Array.from(selectedDepositAccounts).filter((account) => depositAccountOptions.includes(account))),
    [selectedDepositAccounts, depositAccountOptions]
  );

  const visibleRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tabBaseRecords.filter((record) => {
      const visiblePeople = getVisibleReceivablePeople(record.entries, activeTab);
      if (activeSelectedPeople.size > 0 && !visiblePeople.some((person) => activeSelectedPeople.has(person))) {
        return false;
      }
      if (activeSelectedDepositAccounts.size > 0 && !getRecordDepositAccounts(record.entries).some((account) => activeSelectedDepositAccounts.has(account))) {
        return false;
      }
      if (!q) {
        return true;
      }
      const peopleText = visiblePeople.join(' ');
      const depositText = getRecordDepositAccounts(record.entries).join(' ');
      return [record.merchant, record.memo, record.paymentMethod, record.yearMonth, peopleText, depositText].some((field) => field.toLowerCase().includes(q));
    });
  }, [tabBaseRecords, activeTab, searchQuery, activeSelectedPeople, activeSelectedDepositAccounts]);

  const visibleSummaryTotal = useMemo(
    () =>
      visibleRecords.reduce((sum, record) => {
        const totals = getReceivableTotals(record);
        return sum + (activeTab === 'waiting' ? totals.uncollectedTotal : totals.receivedTotal);
      }, 0),
    [visibleRecords, activeTab]
  );

  const selectedRecords = useMemo(() => visibleRecords.filter((record) => selectedIds.has(record.id)), [visibleRecords, selectedIds]);
  const selectedUncollectedTotal = useMemo(() => selectedRecords.reduce((sum, record) => sum + getReceivableTotals(record).uncollectedTotal, 0), [selectedRecords]);

  const hasCompletedDateRangeValue = startDate !== null || endDate !== null;
  const hasCustomCompletedDateRange = !isSameDateRange(completedDateRange, DEFAULT_COMPLETED_DATE_RANGE);
  const detailFilterCount = (isCompletedTab && hasCustomCompletedDateRange ? 1 : 0) + activeSelectedPeople.size + activeSelectedDepositAccounts.size;
  const hasActiveFilters = searchQuery.trim().length > 0 || detailFilterCount > 0;

  const renderPersonOption = (option: string): ReactNode => <MemberAvatar name={option} size="xs" />;

  const filterGroups = [
    { key: 'person', label: '회수 상대', options: personOptions, selected: activeSelectedPeople, onChange: setSelectedPeople, renderOption: renderPersonOption },
    { key: 'depositAccount', label: '입금 계좌', options: depositAccountOptions, selected: activeSelectedDepositAccounts, onChange: setSelectedDepositAccounts }
  ];

  const handleStartDateChange = (next: Date | null) => {
    setCompletedDateRange((prev) => {
      const nextEnd = next && prev.end && toLocalDayStart(next).getTime() > toLocalDayStart(prev.end).getTime() ? next : prev.end;
      return { start: next, end: nextEnd };
    });
    setSelectedIds(new Set());
  };

  const handleEndDateChange = (next: Date | null) => {
    setCompletedDateRange((prev) => {
      const nextStart = next && prev.start && toLocalDayStart(next).getTime() < toLocalDayStart(prev.start).getTime() ? next : prev.start;
      return { start: nextStart, end: next };
    });
    setSelectedIds(new Set());
  };

  const handleTabChange = (nextTab: ReceivableTabKey) => {
    setActiveTab(nextTab);
    setSelectedIds(new Set());
  };

  const handleResetDetailFilters = () => {
    if (isCompletedTab) {
      setCompletedDateRange(DEFAULT_COMPLETED_DATE_RANGE);
    }
    setSelectedPeople(new Set());
    setSelectedDepositAccounts(new Set());
    setSelectedIds(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    handleResetDetailFilters();
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(visibleRecords.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleOpenEditRecord = (record: ReceivableRecord) => {
    const [yearText, monthText] = record.yearMonth.split('.');
    const viewedYear = Number(yearText) || DEFAULT_VIEWED_MONTH.year;
    const viewedMonth = Number(monthText) || DEFAULT_VIEWED_MONTH.month;
    setExpenseDraft({
      ...structuredClone(record.draft),
      initialPaymentStatus: record.paymentStatus,
      viewedMonth: { year: viewedYear, month: viewedMonth }
    });
    setExpenseOverlayOpen(true);
  };

  const handleOpenCreateExpense = () => {
    setExpenseDraft(createEmptyExpensePreset(DEFAULT_VIEWED_MONTH));
    setExpenseOverlayOpen(true);
  };

  const handleSaveExpense = async (savedDraft: ExpenseDraft) => {
    const isEdit = savedDraft.mode === 'edit' && Boolean(savedDraft.id);
    const prevRecord = isEdit ? records.find((item) => item.id === savedDraft.id) : undefined;
    const nextRecord = draftToReceivableRecord(savedDraft, prevRecord);

    if (isEdit && prevRecord) {
      const deltas = computeReceivableBalanceDeltas(prevRecord.entries, nextRecord.entries);
      if (deltas.length > 0) {
        const summaryLines = deltas.map((delta) => {
          const asset = INITIAL_DESIGN_ASSETS.find((item) => item.id === delta.accountId);
          const current = balances[delta.accountId] ?? asset?.currentBalance ?? 0;
          const nextBalance = current + delta.amount;
          return `${asset?.name ?? '계좌'}: ${formatSignedWon(delta.amount)} (${formatWon(current)} → ${formatWon(nextBalance)})`;
        });

        const applyToBalance = await dialog.confirm({
          title: '입금 계좌 잔액에 반영할까요?',
          description: `회수한 금액이 변경되었어요.\n${summaryLines.join('\n')}`,
          confirmText: '반영',
          cancelText: '내역만 저장'
        });

        if (applyToBalance) {
          setBalances((prev) => {
            const next = { ...prev };
            for (const delta of deltas) {
              next[delta.accountId] = (next[delta.accountId] ?? 0) + delta.amount;
            }
            return next;
          });
        }
      }

      if (nextRecord.entries.length === 0) {
        setRecords((prev) => prev.filter((item) => item.id !== prevRecord.id));
      } else {
        setRecords((prev) => prev.map((item) => (item.id === prevRecord.id ? nextRecord : item)));
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(prevRecord.id);
        return next;
      });
    } else if (nextRecord.entries.length > 0) {
      setRecords((prev) => [nextRecord, ...prev]);
    }

    setExpenseOverlayOpen(false);
  };

  const handleConfirmBulkReceive = (payload: BulkReceiveConfirmPayload) => {
    const targetIdSet = new Set(payload.recordIds);
    setRecords((prev) =>
      prev.map((record) => {
        if (!targetIdSet.has(record.id)) {
          return record;
        }
        const nextEntries = record.entries.map((entry) => {
          const personKey = entry.person.trim() || '미지정';
          const target = Math.max(0, entry.targetAmount ?? 0);
          const nextDeposit = payload.depositAccountByPerson[personKey] ?? entry.depositAccount;
          const nextSource = payload.sourceAccountByPerson[personKey] ?? entry.sourceAccount;
          return {
            ...entry,
            receivedAmount: target,
            depositAccount: nextDeposit,
            sourceAccount: nextSource
          };
        });
        return {
          ...record,
          entries: nextEntries,
          draft: {
            ...record.draft,
            recoveries: nextEntries.map(({ sourceAccount: _unused, ...rest }) => rest)
          }
        };
      })
    );

    if (payload.applyToBalance && payload.balanceDeltas.length > 0) {
      setBalances((prev) => {
        const next = { ...prev };
        for (const delta of payload.balanceDeltas) {
          next[delta.accountId] = (next[delta.accountId] ?? 0) + delta.amount;
        }
        return next;
      });
    }

    setSelectedIds(new Set());
  };

  return (
    <DesignAppShell
      activeNav="expenses"
      onAddExpense={handleOpenCreateExpense}
      mobileHeaderLeft={
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="지출 내역으로 돌아가기"
            onClick={() => navigateWithQuery('/preview/expenses')}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="truncate text-base font-bold tracking-tight text-foreground">회수금 현황</h1>
        </div>
      }
      mobileHeaderRight={
        <Button type="button" variant="outline" size="sm" onClick={() => navigateWithQuery('/preview/assets')} className="shrink-0 gap-1 px-2 text-xs">
          <Landmark className="size-3.5" />
          <span>자산</span>
        </Button>
      }
      desktopHeaderLeft={
        <div className="flex items-center gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigateWithQuery('/preview/expenses')} className="gap-1 px-2 text-muted-foreground">
            <ArrowLeft className="size-4" />
            <span>지출 내역</span>
          </Button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">회수금 현황</h1>
        </div>
      }
      desktopHeaderRight={
        <Button type="button" variant="outline" size="md" onClick={() => navigateWithQuery('/preview/assets')} className="gap-1.5">
          <Landmark className="size-4" />
          <span>자산 현황 보기</span>
        </Button>
      }
    >
      {/* Top Hero Summary */}
      <SummaryHeroCard
        variant="hero-positive"
        aria-label="미회수 현황 요약"
        title="전체 미회수 금액"
        helpLabel="미회수 금액 기준 안내"
        helpText="전체 기간의 미회수 금액 합계예요. 회수금은 수입에 중복 집계되지 않아요."
        value={formatWon(totalWaitingUncollected)}
        items={[
          { label: '회수 대기', value: `${waitingRecords.length}건` },
          { label: '부분 회수', value: `${partialSummary.count}건` },
          { label: '부분 회수 완료', value: formatWon(partialSummary.receivedAmount) }
        ]}
      />

      {waitingByPerson.length > 0 ? (
        <Card padding="none" className="gap-0 overflow-hidden" aria-label="상대별 미회수 현황">
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/35 md:px-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span>상대별 미회수 현황</span>
                <Badge variant="count" className="tabular-nums">
                  {waitingByPerson.length}명
                </Badge>
              </span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="border-t border-border">
              {/* Mobile Compact List (< 768px) */}
              <ul className="divide-y divide-border md:hidden">
                {waitingByPerson.map((item) => (
                  <li key={item.displayName} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <MemberAvatar name={item.displayName} size="sm" labelClassName="text-xs font-bold text-foreground" />
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{item.count}건</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 tabular-nums">
                      <span className="text-xs font-extrabold text-positive">{formatWon(item.amount)}</span>
                      {item.receivedAmount > 0 ? <span className="text-[11px] text-muted-foreground">완료 {formatWon(item.receivedAmount)}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tablet / PC Table (>= 768px) */}
              <table className="hidden w-full table-fixed border-collapse text-sm md:table">
                <thead className="bg-background text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium">
                      회수 상대
                    </th>
                    <th scope="col" className="w-24 px-2 py-2.5 text-center font-medium whitespace-nowrap">
                      대기 건수
                    </th>
                    <th scope="col" className="w-28 px-2 py-2.5 text-right font-medium whitespace-nowrap lg:w-32">
                      총액
                    </th>
                    <th scope="col" className="w-28 px-2 py-2.5 text-right font-medium whitespace-nowrap lg:w-32">
                      회수액
                    </th>
                    <th scope="col" className="w-28 py-2.5 pr-4 pl-2 text-right font-medium whitespace-nowrap lg:w-36">
                      미회수액
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {waitingByPerson.map((item) => (
                    <tr key={item.displayName}>
                      <td className="px-4 py-2.5">
                        <MemberAvatar name={item.displayName} size="sm" labelClassName="text-xs font-bold text-foreground" />
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">{item.count}건</td>
                      <td className="px-2 py-2.5 text-right text-xs font-medium text-foreground tabular-nums whitespace-nowrap">{formatWon(item.targetAmount)}</td>
                      <td className="px-2 py-2.5 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">{formatWon(item.receivedAmount)}</td>
                      <td className="py-2.5 pr-4 pl-2 text-right text-xs font-extrabold text-positive tabular-nums whitespace-nowrap">{formatWon(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      ) : null}

      {/* Status Tabs + Search & Original-Month Filters */}
      <section aria-label="회수 상태 및 상세 검색" className="flex flex-col gap-2.5">
        <div role="tablist" aria-label="회수 상태 탭" className="grid grid-cols-2 rounded-xl bg-muted p-1">
          {TAB_ITEMS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'flex min-h-control-md cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors md:text-sm',
                  active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold tabular-nums',
                    active ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-muted-foreground'
                  )}
                >
                  {countByTab[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 lg:contents">
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:w-52 lg:max-w-52 lg:flex-none">
              <SearchInput size="md" value={searchQuery} onValueChange={setSearchQuery} placeholder="내역 검색" aria-label="내역 검색" wrapperClassName="min-w-0 flex-1" />

              <button
                type="button"
                aria-label={detailFilterCount > 0 ? `상세 검색 ${detailFilterCount}개 선택됨` : '상세 검색'}
                onClick={() => setMobileFilterOpen(true)}
                className={cn(
                  'inline-flex min-h-control-md shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors md:hidden',
                  detailFilterCount > 0 ? 'border-primary bg-primary-tint font-bold text-primary' : 'border-border-strong bg-card font-semibold text-foreground hover:bg-accent/40'
                )}
              >
                <SlidersHorizontal className="size-4 shrink-0" />
                <span className="hidden min-[360px]:inline">상세 검색</span>
                {detailFilterCount > 0 ? (
                  <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground tabular-nums">
                    {detailFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="hidden md:flex md:shrink-0 md:items-center md:gap-1.5 lg:order-3 lg:gap-2">
              {filterGroups.map((group) => (
                <FilterMultiSelect
                  key={group.key}
                  label={group.label}
                  options={group.options}
                  selected={group.selected}
                  renderOption={group.renderOption}
                  onChange={(next) => {
                    group.onChange(next);
                    setSelectedIds(new Set());
                  }}
                />
              ))}

              {hasActiveFilters ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="shrink-0 px-2 text-muted-foreground">
                  필터 초기화
                </Button>
              ) : null}
            </div>
          </div>

          {isCompletedTab ? (
            <div className="hidden md:flex md:items-center md:gap-1.5 lg:order-2 lg:shrink-0">
              <span className="shrink-0 text-xs font-medium text-muted-foreground lg:hidden">거래 기간</span>
              <div className="min-w-0 flex-1 lg:w-[168px] lg:flex-none">
                <DatePicker
                  value={startDate}
                  onChange={handleStartDateChange}
                  maxDate={endDate ?? undefined}
                  presets={[]}
                  clearable
                  placeholder="시작일"
                  aria-label="거래 시작일"
                  sheetTitle="거래 시작일 선택"
                  className="h-control-md min-h-control-md py-1.5 text-xs"
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">~</span>
              <div className="min-w-0 flex-1 lg:w-[168px] lg:flex-none">
                <DatePicker
                  value={endDate}
                  onChange={handleEndDateChange}
                  minDate={startDate ?? undefined}
                  presets={['today']}
                  clearable
                  placeholder="종료일"
                  aria-label="거래 종료일"
                  sheetTitle="거래 종료일 선택"
                  className="h-control-md min-h-control-md py-1.5 text-xs"
                />
              </div>
            </div>
          ) : null}
        </div>

        {isCompletedTab && hasCompletedDateRangeValue ? (
          <div className="flex items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-card px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent/40"
            >
              <CalendarRange className="size-3.5 shrink-0 text-primary" />
              <span className="truncate tabular-nums">거래 기간 · {formatDateRangeLabel(completedDateRange)}</span>
              {!hasCustomCompletedDateRange ? <span className="shrink-0 text-[10px] font-medium text-muted-foreground">(최근 3개월)</span> : null}
            </button>
          </div>
        ) : null}
      </section>

      {/* Receivables List / Table Card */}
      <Card padding="none" className="gap-0 overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5 md:px-4 md:py-3">
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-sm font-bold text-foreground md:text-base">{activeTab === 'waiting' ? '회수 대기 내역' : '회수 완료 내역'}</CardTitle>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {visibleRecords.length}건 · {activeTab === 'waiting' ? '미회수' : '회수 완료'} {formatWon(visibleSummaryTotal)}
            </span>
          </div>
          <span className="hidden text-[11px] text-muted-foreground lg:inline">거래를 클릭하면 지출 상세에서 부분 입금 · 상대 정정을 할 수 있어요</span>
        </CardHeader>

        {visibleRecords.length === 0 ? (
          <CardContent className="p-0">
            <EmptyState
              title={EMPTY_STATE_COPY[activeTab].title}
              description={EMPTY_STATE_COPY[activeTab].description}
              actions={
                hasActiveFilters ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                    필터 초기화
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        ) : (
          <>
            {/* Mobile Select-All Bar (waiting tab only) */}
            {activeTab === 'waiting' ? (
              <div className="flex items-center justify-between border-b border-border bg-muted/25 px-3.5 py-2 text-xs md:hidden">
                <label htmlFor="receivable-mobile-select-all" className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                  <Checkbox
                    id="receivable-mobile-select-all"
                    checked={visibleRecords.length > 0 && selectedRecords.length === visibleRecords.length}
                    onCheckedChange={(checked) => handleToggleSelectAllVisible(checked === true)}
                  />
                  <span>전체 선택</span>
                </label>
                {selectedRecords.length > 0 ? (
                  <button type="button" onClick={() => setSelectedIds(new Set())} className="cursor-pointer font-semibold text-primary hover:underline">
                    선택 해제
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Mobile Stacked List (< 768px) */}
            <div className="divide-y divide-border md:hidden">
              {visibleRecords.map((record) => {
                const totals = getReceivableTotals(record);
                const checked = selectedIds.has(record.id);
                const peopleNames = getVisibleReceivablePeople(record.entries, activeTab);

                return (
                  <div key={record.id} className={cn('flex items-center gap-2 px-3 py-3 transition-colors', activeTab === 'waiting' && checked ? 'bg-primary-tint/45' : 'hover:bg-muted/35')}>
                    {activeTab === 'waiting' ? (
                      <div className="shrink-0">
                        <Checkbox checked={checked} aria-label={`${record.merchant} 선택`} onCheckedChange={() => handleToggleItem(record.id)} />
                      </div>
                    ) : null}

                    <button type="button" onClick={() => handleOpenEditRecord(record)} className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-bold text-foreground">{record.merchant}</span>
                        <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                          {record.dateLabel} · {record.memo || record.categoryLabel}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn('text-sm font-extrabold tabular-nums', activeTab === 'waiting' ? 'text-positive' : 'text-foreground')}>
                            {formatWon(activeTab === 'waiting' ? totals.uncollectedTotal : totals.receivedTotal)}
                          </span>
                          <MemberAvatarGroup names={peopleNames} size="xs" className="justify-end" />
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Tablet/PC Table (>= 768px) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                    {activeTab === 'waiting' ? (
                      <th className="w-12 py-0 pl-1 pr-0 text-left">
                        <Checkbox
                          aria-label="전체 선택"
                          checked={visibleRecords.length > 0 && selectedRecords.length === visibleRecords.length}
                          disabled={visibleRecords.length === 0}
                          onCheckedChange={(checked) => handleToggleSelectAllVisible(checked === true)}
                        />
                      </th>
                    ) : null}
                    <th className="w-16 px-2 py-3 text-center font-medium whitespace-nowrap">거래일</th>
                    <th className="px-3 py-3 text-left font-medium">내역</th>
                    <th className="w-24 px-2 py-3 text-center font-medium whitespace-nowrap lg:w-28">회수 상대</th>
                    <th className="hidden px-2 py-3 text-left font-medium whitespace-nowrap lg:table-cell lg:w-40">입금 계좌</th>
                    <th className="w-32 px-2 py-3 text-right font-medium whitespace-nowrap lg:w-36">총액 · 회수액</th>
                    <th className="w-28 py-3 pl-2 pr-4 text-right font-medium whitespace-nowrap lg:w-32">{activeTab === 'waiting' ? '미회수액' : '회수액'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleRecords.map((record) => {
                    const totals = getReceivableTotals(record);
                    const checked = selectedIds.has(record.id);
                    const peopleNames = getVisibleReceivablePeople(record.entries, activeTab);
                    const depositSummary = formatDepositAccountsSummary(record.entries);

                    return (
                      <tr
                        key={record.id}
                        onClick={() => handleOpenEditRecord(record)}
                        className={cn('cursor-pointer transition-colors', activeTab === 'waiting' && checked ? 'bg-primary-tint/45' : 'hover:bg-muted/35')}
                      >
                        {activeTab === 'waiting' ? (
                          <td className="py-1 pl-1 pr-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={checked} aria-label={`${record.merchant} 선택`} onCheckedChange={() => handleToggleItem(record.id)} />
                          </td>
                        ) : null}
                        <td className="px-2 py-3 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">{record.dateLabel}</td>
                        <td className="min-w-0 px-3 py-3">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <span className="truncate font-bold text-foreground">{record.merchant}</span>
                              {totals.isPartiallyReceived ? <Badge variant="warning">부분 회수</Badge> : null}
                            </div>
                            <span className="truncate text-xs text-muted-foreground">
                              <span className="lg:hidden">{depositSummary} · </span>
                              {record.memo || record.categoryLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          <MemberAvatarGroup names={peopleNames} size="sm" className="justify-center" />
                        </td>
                        <td className="hidden truncate px-2 py-3 text-xs text-muted-foreground whitespace-nowrap lg:table-cell">{depositSummary}</td>
                        <td className="px-2 py-3 text-right text-xs tabular-nums whitespace-nowrap">
                          <span className="block font-semibold text-foreground">{formatWon(totals.targetTotal)}</span>
                          <span className="block text-[11px] text-muted-foreground">회수 {formatWon(totals.receivedTotal)}</span>
                        </td>
                        <td className={cn('py-3 pl-2 pr-4 text-right font-extrabold tabular-nums whitespace-nowrap', activeTab === 'waiting' ? 'text-positive' : 'text-foreground')}>
                          {formatWon(activeTab === 'waiting' ? totals.uncollectedTotal : totals.receivedTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Bottom Action Bar (waiting tab) or Helper Footer (completed tab) */}
        {visibleRecords.length > 0 && activeTab === 'waiting' ? (
          <div className="flex flex-col gap-2.5 border-t border-border bg-muted/40 p-3.5 md:flex-row md:items-center md:justify-between">
            {selectedRecords.length === 0 ? (
              <p className="text-xs font-medium text-muted-foreground break-keep">
                거래를 선택하면 미회수 금액 전액을 한 번에 회수 완료 처리할 수 있어요. 일부만 받은 건은 거래를 클릭해 입력해 주세요.
              </p>
            ) : (
              <>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 md:justify-start">
                    <span className="text-xs font-extrabold text-foreground tabular-nums md:text-sm">
                      {selectedRecords.length}건 선택 · 미회수 {formatWon(selectedUncollectedTotal)}
                    </span>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground md:hidden">
                      해제
                    </button>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground break-keep">상대별 입금 계좌와 실제 계좌 잔액 반영 여부를 다음 창에서 확인해요.</p>
                </div>

                <div className="flex items-center gap-2 md:shrink-0">
                  <Button type="button" variant="outline" size="md" onClick={() => setSelectedIds(new Set())} className="hidden md:inline-flex">
                    선택 해제
                  </Button>
                  <Button type="button" variant="primary" size="md" onClick={() => setBulkDialogState((prev) => ({ open: true, nonce: prev.nonce + 1 }))} className="w-full md:w-auto">
                    회수 완료
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {visibleRecords.length > 0 && activeTab === 'completed' ? (
          <div className="border-t border-border bg-muted/25 px-3.5 py-2.5 text-xs text-muted-foreground md:px-4">
            거래를 클릭하면 지출 상세에서 상대별 회수한 금액과 입금 계좌 기록을 확인·정정할 수 있어요.
          </div>
        ) : null}
      </Card>

      {/* Mobile Detail Filter Sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>상세 검색</SheetTitle>
            <SheetDescription>
              {isCompletedTab ? '거래 기간, 상대방, 입금 계좌로 회수 완료 내역을 좁혀 볼 수 있어요.' : '상대방과 입금 계좌로 대기 중인 회수 내역을 좁혀 볼 수 있어요.'}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5 py-4">
            {isCompletedTab ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">거래 기간</span>
                  <span className="text-[11px] text-muted-foreground">기본 최근 3개월 · 지우면 전체 조회</span>
                </div>
                <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                  <DatePicker
                    value={startDate}
                    onChange={handleStartDateChange}
                    maxDate={endDate ?? undefined}
                    presets={[]}
                    clearable
                    placeholder="시작일"
                    aria-label="거래 시작일"
                    sheetTitle="거래 시작일 선택"
                    className="h-control-md min-h-control-md text-xs"
                  />
                  <DatePicker
                    value={endDate}
                    onChange={handleEndDateChange}
                    minDate={startDate ?? undefined}
                    presets={['today']}
                    clearable
                    placeholder="종료일"
                    aria-label="거래 종료일"
                    sheetTitle="거래 종료일 선택"
                    className="h-control-md min-h-control-md text-xs"
                  />
                </div>
              </div>
            ) : null}

            {filterGroups.map((group) => (
              <FilterChipGroup
                key={group.key}
                label={group.label}
                mode="multi"
                options={group.options}
                selected={group.selected}
                renderOption={group.renderOption}
                onChange={(next) => {
                  group.onChange(next);
                  setSelectedIds(new Set());
                }}
              />
            ))}
          </SheetBody>
          <SheetFooter className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="lg" onClick={handleResetDetailFilters}>
              초기화
            </Button>
            <Button type="button" variant="primary" size="lg" onClick={() => setMobileFilterOpen(false)}>
              적용
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk Receive Confirmation Modal */}
      <BulkReceiveDialog
        key={bulkDialogState.nonce}
        open={bulkDialogState.open}
        onOpenChange={(open) => setBulkDialogState((prev) => ({ ...prev, open }))}
        records={selectedRecords}
        balances={balances}
        onConfirm={handleConfirmBulkReceive}
      />

      {/* Expense Detail Edit Overlay (Partial payment & Recovery corrections) */}
      <ExpenseFormOverlay open={expenseOverlayOpen} onOpenChange={setExpenseOverlayOpen} draft={expenseDraft} onDraftChange={setExpenseDraft} onSave={handleSaveExpense} />
    </DesignAppShell>
  );
};
