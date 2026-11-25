'use client';

import { EmptyState, FilterChipGroup, FilterMultiSelect, SummaryHeroCard, dialog } from '@repo/ui-composition';
import { Badge, Button, Card, Checkbox, SearchInput, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, cn } from '@repo/ui-core';
import { ChevronDown, Landmark, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';

import { BulkReceiveDialog, type BulkReceiveConfirmPayload } from '@/previews/receivables/ReceivablesDialogs';
import {
  INITIAL_RECEIVABLES,
  computeReceivableBalanceDeltas,
  draftToReceivableRecord,
  formatDepositAccountsSummary,
  getReceivableTotals,
  getRecentCompletedDateRange,
  getRecordDepositAccounts,
  getRecordOriginalDate,
  normalizePersonDisplay,
  toLocalDayStart,
  type ReceivableDateRange,
  type ReceivableEntry,
  type ReceivableRecord,
  type ReceivableTabKey
} from '@/previews/receivables/receivables-model';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { FilterResetButton } from '@/shared/FilterResetButton';
import { MemberAvatar, MemberAvatarGroup } from '@/shared/MemberAvatar';
import { SearchFilterToolbar } from '@/shared/SearchFilterToolbar';
import { TransactionListHeader, TransactionMobileRow } from '@/shared/TransactionListLayout';
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

const RECENT_COMPLETED_DATE_RANGE: ReceivableDateRange = getRecentCompletedDateRange(DEFAULT_VIEWED_MONTH, 3);

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

export const ReceivablesPreview = ({ initialTab }: { initialTab?: ReceivableTabKey } = {}) => {
  const router = useRouter();

  const [records, setRecords] = useState<ReceivableRecord[]>(INITIAL_RECEIVABLES);
  const [balances, setBalances] = useState<Record<string, number>>(getInitialAssetBalancesMap);
  const [activeTab, setActiveTab] = useState<ReceivableTabKey>(() => (initialTab === 'completed' ? 'completed' : 'waiting'));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(() => new Set());
  const [selectedDepositAccounts, setSelectedDepositAccounts] = useState<Set<string>>(() => new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());

  const isCompletedTab = activeTab === 'completed';

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [summaryOpenByTab, setSummaryOpenByTab] = useState<Record<ReceivableTabKey, boolean>>({ waiting: true, completed: false });
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

  const recentCompletedRecords = useMemo(() => completedRecords.filter((record) => isWithinDateRange(record, RECENT_COMPLETED_DATE_RANGE)), [completedRecords]);

  const countByTab: Record<ReceivableTabKey, number> = {
    waiting: waitingRecords.length,
    completed: recentCompletedRecords.length
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

  const tabBaseRecords = useMemo(() => (isCompletedTab ? recentCompletedRecords : waitingRecords), [isCompletedTab, recentCompletedRecords, waitingRecords]);

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

  const selectedRecords = useMemo(() => visibleRecords.filter((record) => !excludedIds.has(record.id)), [visibleRecords, excludedIds]);

  const summarySourceRecords = isCompletedTab ? visibleRecords : selectedRecords;
  const personSummary = useMemo(() => {
    const map = new Map<string, { displayName: string; targetAmount: number; receivedAmount: number; amount: number; count: number }>();
    for (const record of summarySourceRecords) {
      const countedForRecord = new Set<string>();
      for (const entry of record.entries) {
        const target = Math.max(0, entry.targetAmount ?? 0);
        const received = Math.max(0, Math.min(target, entry.receivedAmount ?? 0));
        const remaining = target - received;
        const matchValue = isCompletedTab ? received : remaining;
        if (matchValue <= 0) {
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
    return Array.from(map.values()).sort((a, b) => (isCompletedTab ? b.receivedAmount - a.receivedAmount : b.amount - a.amount));
  }, [summarySourceRecords, isCompletedTab]);

  const personSummaryTitle = isCompletedTab ? '상대별 회수 완료 현황' : '상대별 미회수 현황';
  const personSummaryTotal = useMemo(() => personSummary.reduce((sum, item) => sum + (isCompletedTab ? item.receivedAmount : item.amount), 0), [personSummary, isCompletedTab]);
  const isSummaryOpen = summaryOpenByTab[activeTab];

  const detailFilterCount = activeSelectedPeople.size + activeSelectedDepositAccounts.size;
  const hasActiveFilters = searchQuery.trim().length > 0 || detailFilterCount > 0;

  const renderPersonOption = (option: string): ReactNode => <MemberAvatar name={option} size="xs" />;

  const filterGroups = [
    { key: 'person', label: '회수 상대', options: personOptions, selected: activeSelectedPeople, onChange: setSelectedPeople, renderOption: renderPersonOption },
    { key: 'depositAccount', label: '입금 계좌', options: depositAccountOptions, selected: activeSelectedDepositAccounts, onChange: setSelectedDepositAccounts }
  ];

  const handleTabChange = (nextTab: ReceivableTabKey) => {
    setActiveTab(nextTab);
    setExcludedIds(new Set());
  };

  const handleResetDetailFilters = () => {
    setSelectedPeople(new Set());
    setSelectedDepositAccounts(new Set());
    setExcludedIds(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    handleResetDetailFilters();
  };

  const handleToggleItem = (id: string) => {
    setExcludedIds((prev) => {
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
      setExcludedIds(new Set());
      return;
    }
    setExcludedIds(new Set(visibleRecords.map((item) => item.id)));
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
      setExcludedIds((prev) => {
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

    setExcludedIds(new Set());
  };

  return (
    <DesignAppShell
      activeNav="expenses"
      title="회수금 현황"
      back={{ label: '지출 내역', ariaLabel: '지출 내역으로 돌아가기', onClick: () => navigateWithQuery('/preview/expenses') }}
      onAddExpense={handleOpenCreateExpense}
      mobileActions={
        <Button type="button" variant="ghost" size="sm" onClick={() => navigateWithQuery('/preview/assets')} className="-mr-2 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
          <Landmark className="size-3.5" />
          <span>자산</span>
        </Button>
      }
      desktopActions={
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

      {/* Status Tabs */}
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

      {/* Active Tab Person Summary / Statistics */}
      {activeTab === 'waiting' || visibleRecords.length > 0 ? (
        <Card padding="none" className="gap-0 overflow-hidden" aria-label={personSummaryTitle}>
          <div className="flex min-h-11 items-center justify-between gap-2 transition-colors hover:bg-muted/35">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 py-2.5 pl-3.5 md:pl-4">
              <button
                type="button"
                aria-expanded={isSummaryOpen}
                onClick={() => setSummaryOpenByTab((prev) => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                className="flex min-w-0 cursor-pointer items-center text-left text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <span className="break-keep">{personSummaryTitle}</span>
              </button>
              {activeTab === 'waiting' && selectedRecords.length > 0 && selectedRecords.length < visibleRecords.length ? (
                <Badge variant="wine" className="tabular-nums">
                  선택 {selectedRecords.length}건 기준
                </Badge>
              ) : null}
            </div>

            <button
              type="button"
              aria-expanded={isSummaryOpen}
              aria-label={`${personSummaryTitle} ${isSummaryOpen ? '접기' : '펼치기'}`}
              onClick={() => setSummaryOpenByTab((prev) => ({ ...prev, [activeTab]: !prev[activeTab] }))}
              className={cn(
                'flex min-h-11 flex-1 cursor-pointer items-center justify-end gap-1.5 py-2.5 pr-3.5 pl-2 text-xs font-extrabold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:pr-4 md:text-sm',
                isCompletedTab ? 'text-foreground' : 'text-positive'
              )}
            >
              <span>{formatWon(personSummaryTotal)}</span>
              <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isSummaryOpen && 'rotate-180')} />
            </button>
          </div>

          {isSummaryOpen ? (
            <div className="border-t border-border">
              {personSummary.length === 0 ? (
                <p className="px-4 py-5 text-center text-xs text-muted-foreground">선택된 내역 없음</p>
              ) : activeTab === 'waiting' ? (
                <>
                  {/* Mobile Compact List (< 768px) */}
                  <ul className="divide-y divide-border md:hidden">
                    {personSummary.map((item) => (
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
                    <thead className="bg-muted/45 text-xs text-muted-foreground">
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
                      {personSummary.map((item) => (
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
                </>
              ) : (
                <>
                  {/* Mobile Compact List (< 768px) */}
                  <ul className="divide-y divide-border md:hidden">
                    {personSummary.map((item) => (
                      <li key={item.displayName} className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs tabular-nums">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <MemberAvatar name={item.displayName} size="sm" labelClassName="text-xs font-bold text-foreground" />
                          <span className="shrink-0 text-[11px] text-muted-foreground">{item.count}건</span>
                        </div>
                        <span className="shrink-0 font-extrabold text-foreground">{formatWon(item.receivedAmount)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Tablet / PC Table (>= 768px) */}
                  <table className="hidden w-full border-collapse text-xs md:table lg:text-sm">
                    <thead className="bg-muted/45 text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">
                          회수 상대
                        </th>
                        <th scope="col" className="w-24 px-3 py-2.5 text-center font-medium whitespace-nowrap">
                          건수
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                          회수 완료 금액
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border tabular-nums">
                      {personSummary.map((item) => (
                        <tr key={item.displayName}>
                          <td className="px-4 py-2.5">
                            <MemberAvatar name={item.displayName} size="sm" labelClassName="text-xs font-bold text-foreground" />
                          </td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap">{item.count}건</td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-foreground whitespace-nowrap">{formatWon(item.receivedAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Search & Filters */}
      <SearchFilterToolbar
        ariaLabel="회수 내역 검색 및 상세 필터"
        search={<SearchInput size="md" value={searchQuery} onValueChange={setSearchQuery} placeholder="내역 검색" aria-label="내역 검색" wrapperClassName="min-w-0 flex-1" />}
        mobileAction={
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
              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground tabular-nums">{detailFilterCount}</span>
            ) : null}
          </button>
        }
        filters={
          <>
            {filterGroups.map((group) => (
              <FilterMultiSelect
                key={group.key}
                label={group.label}
                options={group.options}
                selected={group.selected}
                renderOption={group.renderOption}
                onChange={(next) => {
                  group.onChange(next);
                  setExcludedIds(new Set());
                }}
              />
            ))}
            {hasActiveFilters ? <FilterResetButton onClick={handleResetFilters} /> : null}
          </>
        }
      />

      {/* Receivables List / Table Card */}
      <Card padding="none" className="gap-0 overflow-hidden">
        <TransactionListHeader
          title={activeTab === 'waiting' ? '회수 대기 내역' : '회수 완료 내역'}
          count={visibleRecords.length}
          trailing={isCompletedTab ? <span className="text-xs font-medium text-muted-foreground">최근 3개월</span> : undefined}
          mobileLeading={
            activeTab === 'waiting' && visibleRecords.length > 0 ? (
              <Checkbox
                id="receivable-mobile-select-all"
                aria-label="전체 선택"
                checked={visibleRecords.length > 0 && selectedRecords.length === visibleRecords.length}
                onCheckedChange={(checked) => handleToggleSelectAllVisible(checked === true)}
              />
            ) : undefined
          }
        />

        {visibleRecords.length === 0 ? (
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
            className="p-6 md:py-10"
          />
        ) : (
          <>
            {/* Mobile Stacked List (< 768px) */}
            <div className="divide-y divide-border md:hidden">
              {visibleRecords.map((record) => {
                const totals = getReceivableTotals(record);
                const checked = !excludedIds.has(record.id);
                const peopleNames = getVisibleReceivablePeople(record.entries, activeTab);
                const depositSummary = formatDepositAccountsSummary(record.entries);

                return (
                  <TransactionMobileRow
                    key={record.id}
                    onClick={() => handleOpenEditRecord(record)}
                    leading={activeTab === 'waiting' ? <Checkbox checked={checked} aria-label={`${record.merchant} 선택`} onCheckedChange={() => handleToggleItem(record.id)} /> : undefined}
                    date={<span className="text-xs font-medium text-muted-foreground tabular-nums">{record.dateLabel}</span>}
                    category={<Badge variant="neutral">{record.categoryLabel}</Badge>}
                    content={
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="truncate text-sm font-bold text-foreground">{record.merchant}</span>
                        {record.memo ? <span className="truncate text-xs text-muted-foreground">{record.memo}</span> : null}
                      </div>
                    }
                    amount={
                      <span className={cn('shrink-0 text-sm font-extrabold tabular-nums', activeTab === 'waiting' ? 'text-positive' : 'text-foreground')}>
                        {formatWon(activeTab === 'waiting' ? totals.uncollectedTotal : totals.receivedTotal)}
                      </span>
                    }
                    metadata={
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <MemberAvatarGroup names={peopleNames} size="xs" className="shrink-0" />
                        <span className="truncate">{depositSummary}</span>
                      </div>
                    }
                  />
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
                    const checked = !excludedIds.has(record.id);
                    const peopleNames = getVisibleReceivablePeople(record.entries, activeTab);
                    const depositSummary = formatDepositAccountsSummary(record.entries);

                    return (
                      <tr key={record.id} onClick={() => handleOpenEditRecord(record)} className="cursor-pointer transition-colors hover:bg-muted/35">
                        {activeTab === 'waiting' ? (
                          <td className="py-1 pl-1 pr-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={checked} aria-label={`${record.merchant} 선택`} onCheckedChange={() => handleToggleItem(record.id)} />
                          </td>
                        ) : null}
                        <td className="px-2 py-3.5 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">{record.dateLabel}</td>
                        <td className="min-w-0 px-3 py-3.5">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-bold text-foreground">{record.merchant}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              <span className="lg:hidden">{depositSummary} · </span>
                              {record.memo || record.categoryLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3.5 text-center whitespace-nowrap">
                          <MemberAvatarGroup names={peopleNames} size="sm" className="justify-center" />
                        </td>
                        <td className="hidden truncate px-2 py-3.5 text-xs text-muted-foreground whitespace-nowrap lg:table-cell">{depositSummary}</td>
                        <td className="px-2 py-3.5 text-right text-xs tabular-nums whitespace-nowrap">
                          <span className="block font-semibold text-foreground">{formatWon(totals.targetTotal)}</span>
                          <span className="block text-[11px] text-muted-foreground">회수 {formatWon(totals.receivedTotal)}</span>
                        </td>
                        <td className={cn('py-3.5 pl-2 pr-4 text-right font-extrabold tabular-nums whitespace-nowrap', activeTab === 'waiting' ? 'text-positive' : 'text-foreground')}>
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

        {/* Bottom Selection Action Bar */}
        {visibleRecords.length > 0 && activeTab === 'waiting' ? (
          <div className="flex flex-col gap-2.5 border-t border-border bg-muted/40 p-3.5 md:flex-row md:items-center md:justify-end">
            <div className="flex md:shrink-0 md:items-center">
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={selectedRecords.length === 0}
                onClick={() => setBulkDialogState((prev) => ({ open: true, nonce: prev.nonce + 1 }))}
                className="w-full md:w-auto"
              >
                회수 완료
              </Button>
            </div>
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
              {isCompletedTab ? '최근 3개월 회수 완료 내역을 상대방과 입금 계좌로 좁혀 볼 수 있어요.' : '상대방과 입금 계좌로 대기 중인 회수 내역을 좁혀 볼 수 있어요.'}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5 py-4">
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
                  setExcludedIds(new Set());
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
