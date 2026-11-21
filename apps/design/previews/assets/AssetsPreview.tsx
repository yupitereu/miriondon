'use client';

import { EmptyState, FilterChipGroup, FilterMultiSelect, dialog } from '@repo/ui-composition';
import {
  Badge,
  Button,
  Card,
  CardContent,
  NoticeBox,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { Calculator, ChevronRight, HandCoins, Handshake, HelpCircle, Info, Landmark, Pencil, PiggyBank, Settings, SlidersHorizontal, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ComponentType } from 'react';

import { AssetBalanceEditDialog, AssetReceivablesDialog, ExpectedFlowDetailDialog, LivingBudgetDiffDialog, type AssetBalanceSavePayload } from '@/previews/assets/AssetsDialogs';
import {
  ASSET_GROUP_ORDER,
  ASSET_OWNER_ORDER,
  ASSET_RECEIVABLES_BY_PERSON,
  ASSET_REFERENCE_RATES_NOTICE,
  BUDGET_REMAINING_BASELINE,
  INITIAL_DETAILED_ASSETS,
  computeOwnerSummary,
  formatQuantityWithUnit,
  getAssetCurrentValuation,
  getAssetExpectedTotals,
  getAssetProjectedBalance,
  getTotalUncollectedReceivables,
  type AssetDetailItem,
  type AssetGroupKey
} from '@/previews/assets/assets-model';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { ExpenseFormOverlay, computeExpensePreview, createEmptyExpensePreset, type ExpenseDraft } from '@/shared/expense-form/ExpenseFormView';

const GROUP_LABEL_OPTIONS = ASSET_GROUP_ORDER.map((group) => group.label);

const ASSET_GROUP_VISUALS: Record<
  AssetGroupKey,
  {
    icon: ComponentType<{ className?: string }>;
    iconBoxClass: string;
    headerBgClass: string;
    totalTextClass: string;
  }
> = {
  'cash-liquid': {
    icon: Wallet,
    iconBoxClass: 'bg-primary-tint text-primary',
    headerBgClass: 'bg-primary-tint/35',
    totalTextClass: 'text-foreground'
  },
  'savings-invest': {
    icon: PiggyBank,
    iconBoxClass: 'bg-positive-tint text-positive',
    headerBgClass: 'bg-positive-tint/35',
    totalTextClass: 'text-foreground'
  },
  'loan-deposit': {
    icon: Handshake,
    iconBoxClass: 'bg-warning-tint text-warning',
    headerBgClass: 'bg-warning-tint/35',
    totalTextClass: 'text-foreground'
  },
  debt: {
    icon: Landmark,
    iconBoxClass: 'bg-destructive-tint text-destructive',
    headerBgClass: 'bg-destructive-tint/40',
    totalTextClass: 'text-destructive'
  }
};

export const AssetsPreview = () => {
  const router = useRouter();

  const [assets, setAssets] = useState<AssetDetailItem[]>(INITIAL_DETAILED_ASSETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(() => new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(() => new Set());
  const [livingOnly, setLivingOnly] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [editingAssetState, setEditingAssetState] = useState<{ open: boolean; assetId: string; nonce: number }>({
    open: false,
    assetId: '',
    nonce: 0
  });
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [receivablesDialogOpen, setReceivablesDialogOpen] = useState(false);
  const [flowDetailAssetId, setFlowDetailAssetId] = useState<string | null>(null);

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(createEmptyExpensePreset);

  const navigateWithQuery = (path: string) => {
    const query = new URLSearchParams(window.location.search).toString();
    router.push(query ? `${path}?${query}` : path);
  };

  // Global summary (all members, per ASSET-03)
  const overallSummary = useMemo(() => computeOwnerSummary(assets), [assets]);
  const overallExpectedNet = useMemo(
    () =>
      assets.reduce((sum, item) => {
        if (item.group === 'debt') {
          return sum;
        }
        const { inflow, outflow } = getAssetExpectedTotals(item);
        return sum + inflow - outflow;
      }, 0),
    [assets]
  );
  const overallProjectedNetWorth = overallSummary.netWorth + overallExpectedNet;

  // Living budget reconciliation (living-included cash & accounts)
  const livingAssets = useMemo(() => assets.filter((item) => item.includeInLivingBudget), [assets]);
  const livingActualTotal = useMemo(() => livingAssets.reduce((sum, item) => sum + getAssetCurrentValuation(item), 0), [livingAssets]);
  const livingProjectedTotal = useMemo(() => livingAssets.reduce((sum, item) => sum + getAssetProjectedBalance(item), 0), [livingAssets]);
  const livingBudgetDiff = livingProjectedTotal - BUDGET_REMAINING_BASELINE;

  const totalUncollected = useMemo(() => getTotalUncollectedReceivables(), []);

  const assetGroupBreakdowns = useMemo(() => {
    return ASSET_GROUP_ORDER.filter((meta) => meta.key !== 'debt').map((meta) => {
      const groupItems = assets.filter((item) => item.group === meta.key);
      const total = groupItems.reduce((sum, item) => sum + getAssetCurrentValuation(item), 0);
      return {
        meta,
        total
      };
    });
  }, [assets]);

  const debtTypeBreakdowns = useMemo(() => {
    const map = new Map<string, { typeLabel: string; count: number; total: number }>();
    for (const item of assets) {
      if (item.group !== 'debt') {
        continue;
      }
      const val = getAssetCurrentValuation(item);
      const existing = map.get(item.typeLabel);
      if (existing) {
        existing.count += 1;
        existing.total += val;
      } else {
        map.set(item.typeLabel, { typeLabel: item.typeLabel, count: 1, total: val });
      }
    }
    return Array.from(map.values());
  }, [assets]);

  const groupLabelByKey = useMemo(() => {
    const map = new Map<AssetGroupKey, string>();
    for (const group of ASSET_GROUP_ORDER) {
      map.set(group.key, group.label);
    }
    return map;
  }, []);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assets.filter((item) => {
      if (livingOnly && !item.includeInLivingBudget) {
        return false;
      }
      if (selectedOwners.size > 0 && !selectedOwners.has(item.owner)) {
        return false;
      }
      const groupLabel = groupLabelByKey.get(item.group) ?? '';
      if (selectedGroups.size > 0 && !selectedGroups.has(groupLabel)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return [item.name, item.institution ?? '', item.typeLabel, item.owner, item.counterparty ?? '', groupLabel].some((field) => field.toLowerCase().includes(q));
    });
  }, [assets, livingOnly, searchQuery, selectedOwners, selectedGroups, groupLabelByKey]);

  const groupedByOwner = useMemo(() => {
    return ASSET_OWNER_ORDER.map((owner) => {
      const ownerAllItems = assets.filter((item) => item.owner === owner);
      const ownerFilteredItems = filteredAssets.filter((item) => item.owner === owner);
      const groups = ASSET_GROUP_ORDER.map((groupMeta) => ({
        meta: groupMeta,
        items: ownerFilteredItems.filter((item) => item.group === groupMeta.key)
      })).filter((entry) => entry.items.length > 0);

      return {
        owner,
        summary: computeOwnerSummary(ownerAllItems),
        visibleCount: ownerFilteredItems.length,
        groups
      };
    }).filter((section) => section.groups.length > 0);
  }, [assets, filteredAssets]);

  const detailFilterCount = selectedOwners.size + selectedGroups.size;
  const hasActiveFilters = searchQuery.trim().length > 0 || detailFilterCount > 0 || livingOnly;

  const filterGroups = [
    { key: 'owner', label: '소유자', options: ASSET_OWNER_ORDER, selected: selectedOwners, onChange: setSelectedOwners },
    { key: 'group', label: '자산 구분', options: GROUP_LABEL_OPTIONS, selected: selectedGroups, onChange: setSelectedGroups }
  ];

  const editingAsset = useMemo(() => assets.find((item) => item.id === editingAssetState.assetId) ?? null, [assets, editingAssetState.assetId]);
  const flowDetailAsset = useMemo(() => (flowDetailAssetId ? (assets.find((item) => item.id === flowDetailAssetId) ?? null) : null), [assets, flowDetailAssetId]);

  const handleResetDetailFilters = () => {
    setSelectedOwners(new Set());
    setSelectedGroups(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setLivingOnly(false);
    handleResetDetailFilters();
  };

  const handleOpenEditAsset = (asset: AssetDetailItem) => {
    setEditingAssetState((prev) => ({ open: true, assetId: asset.id, nonce: prev.nonce + 1 }));
  };

  const handleSaveAssetBalance = (payload: AssetBalanceSavePayload) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id !== payload.assetId) {
          return item;
        }
        return {
          ...item,
          currentBalance: payload.currentBalance,
          updatedAt: '방금 수정',
          marketQuote: item.marketQuote
            ? {
                ...item.marketQuote,
                valuationMode: payload.valuationMode ?? item.marketQuote.valuationMode,
                quantity: payload.quantity ?? item.marketQuote.quantity
              }
            : undefined
        };
      })
    );
  };

  const handleOpenExpenseForm = () => {
    setExpenseDraft(createEmptyExpensePreset());
    setExpenseSheetOpen(true);
  };

  const handleSaveExpense = async (savedDraft: ExpenseDraft) => {
    const preview = computeExpensePreview(savedDraft);
    setExpenseSheetOpen(false);
    await dialog.alert({
      title: '지출 저장 미리보기',
      description: `${savedDraft.merchant || '사용처 미입력'} · 실결제 ${formatWon(preview.actualPaid)} (생활비 반영 ${formatWon(preview.livingBudgetExpense)})`
    });
  };

  const handleOpenSettingsGuide = async () => {
    await dialog.alert({
      title: '자산 · 카드 설정 안내',
      description: '새 자산·부채 등록, 표시명·구분·생활비 포함 여부 수정, 사용 중지는 가계부 설정의 자산 · 카드 탭에서 관리해요.'
    });
  };

  return (
    <DesignAppShell
      activeNav="assets"
      onAddExpense={handleOpenExpenseForm}
      mobileHeaderLeft={<h1 className="truncate text-base font-bold tracking-tight text-foreground">자산 현황</h1>}
      mobileHeaderRight={
        <Button variant="outline" size="icon" aria-label="가계부 설정에서 자산·카드 관리 안내" onClick={() => void handleOpenSettingsGuide()}>
          <Settings className="size-4" />
        </Button>
      }
      desktopHeaderLeft={<h1 className="text-lg font-bold tracking-tight text-foreground">자산 현황</h1>}
      desktopHeaderRight={
        <Button variant="outline" size="md" onClick={() => void handleOpenSettingsGuide()} className="gap-1.5">
          <Settings className="size-4" />
          <span>자산·카드 설정</span>
        </Button>
      }
    >
      {/* Top Page-level Living Budget Reconciliation Notice (directly below header) */}
      {livingBudgetDiff !== 0 ? (
        <NoticeBox variant="warning" className="items-center">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground tabular-nums break-keep">
              생활비 포함 계좌·현금의 예상 잔액이 11월 남은 생활비보다{' '}
              <strong className="font-bold text-warning">
                {formatWon(Math.abs(livingBudgetDiff))} {livingBudgetDiff > 0 ? '더 많아요' : '더 적어요'}
              </strong>
              .
            </span>
            <button
              type="button"
              onClick={() => setDiffDialogOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-bold text-warning underline-offset-2 hover:underline"
            >
              <Calculator className="size-3.5" />
              <span>계산 내역 보기</span>
            </button>
          </div>
        </NoticeBox>
      ) : null}

      {/* Top 3-Card Net Worth KPI (전체 구성원 기준 · ASSET-03) */}
      <section aria-label="전체 구성원 자산 요약" className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-3">
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">전체 총자산</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="전체 총자산 계산 기준 안내"
                    className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                  부채를 제외한 수동 보유금과 평가액(외화·금 참고 환산 포함) 합계예요.
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums lg:text-2xl">{formatWon(overallSummary.totalAssets)}</span>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border/70 pt-2.5 text-xs tabular-nums md:text-[11px] lg:text-xs">
            {assetGroupBreakdowns.map(({ meta, total }) => (
              <div key={meta.key} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground break-keep">{meta.label}</span>
                <span className="font-bold whitespace-nowrap text-foreground">{formatWon(total)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">전체 총부채</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="전체 총부채 계산 기준 안내"
                    className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                  대출 남은 원금과 차입금·임대 보증금 등 부채 항목 합계예요.
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-destructive tabular-nums lg:text-2xl">{formatWon(overallSummary.totalDebt)}</span>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border/70 pt-2.5 text-xs tabular-nums md:text-[11px] lg:text-xs">
            {debtTypeBreakdowns.length > 0 ? (
              debtTypeBreakdowns.map((entry) => (
                <div key={entry.typeLabel} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground break-keep">
                    {entry.typeLabel} <span className="text-[11px]">({entry.count}건)</span>
                  </span>
                  <span className="font-bold whitespace-nowrap text-destructive">{formatWon(entry.total)}</span>
                </div>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">등록된 부채 없음</span>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 border-primary/25 bg-primary-tint/50 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">전체 순자산</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="순자산 계산 기준 안내"
                    className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                  <strong className="font-bold">순자산 = 총자산 − 총부채</strong>이며, 직접 입력한 현재 잔액·평가액(외화·금 참고 환산 포함)만 합산해요.
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-primary tabular-nums lg:text-2xl">{formatWon(overallSummary.netWorth)}</span>
          </div>

          {overallExpectedNet !== 0 ? (
            <div className="flex items-center justify-between gap-2 border-t border-primary/15 pt-2.5 text-xs tabular-nums md:text-[11px] lg:text-xs">
              <span className="text-muted-foreground break-keep">예정 입출금 반영 시</span>
              <span className="font-bold whitespace-nowrap text-primary">{formatWon(overallProjectedNetWorth)}</span>
            </div>
          ) : null}
        </Card>
      </section>

      {/* Living Budget Accounts Summary & Uncollected Receivables Strip */}
      <section aria-label="생활비 자금 및 미회수 현황" className={cn('grid grid-cols-1 gap-2', totalUncollected > 0 ? 'lg:grid-cols-2' : '')}>
        <button
          type="button"
          aria-pressed={livingOnly}
          onClick={() => setLivingOnly((prev) => !prev)}
          className={cn(
            'group flex min-h-control-md w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
            livingOnly ? 'border-primary bg-primary-tint/40' : 'border-border-strong bg-card hover:border-primary/45 hover:bg-primary-tint/20'
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
              <Wallet className="size-4" />
            </span>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-foreground">생활비 계좌 · 현금</span>
              <span className="text-sm font-extrabold text-foreground tabular-nums">{formatWon(livingActualTotal)}</span>
              <span className="text-[11px] font-semibold text-primary tabular-nums">예상 {formatWon(livingProjectedTotal)}</span>
            </div>
          </div>
          {livingOnly ? (
            <Badge variant="wine" className="shrink-0">
              생활비만 보기
            </Badge>
          ) : (
            <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-primary min-[360px]:inline">생활비만 보기</span>
          )}
        </button>

        {totalUncollected > 0 ? (
          <button
            type="button"
            onClick={() => setReceivablesDialogOpen(true)}
            className="group flex min-h-control-md w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border-strong bg-card px-3.5 py-2.5 text-left transition-colors hover:border-positive/50 hover:bg-positive-tint/25"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-positive-tint text-positive">
                <HandCoins className="size-4" />
              </span>
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs font-bold text-foreground">전체 기간 미회수 금액</span>
                <span className="text-sm font-extrabold text-positive tabular-nums">{formatWon(totalUncollected)}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">상대 {ASSET_RECEIVABLES_BY_PERSON.length}명</span>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-positive">
              <span className="hidden min-[360px]:inline">상대별 보기</span>
              <ChevronRight className="size-4" />
            </span>
          </button>
        ) : null}
      </section>

      {/* Search & Multi-Select Filters (1-line on >= 768px) */}
      <section aria-label="자산 검색 및 필터" className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex items-center gap-2 md:min-w-40 md:max-w-56 md:flex-1 lg:w-64 lg:max-w-64 lg:flex-none">
          <SearchInput size="md" value={searchQuery} onValueChange={setSearchQuery} placeholder="내역 검색" aria-label="자산 검색" wrapperClassName="min-w-0 flex-1" />

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
        </div>

        <div className="hidden md:flex md:shrink-0 md:items-center md:gap-1.5 lg:gap-2">
          {filterGroups.map((group) => (
            <FilterMultiSelect key={group.key} label={group.label} options={group.options} selected={group.selected} onChange={group.onChange} />
          ))}

          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="shrink-0 px-2 text-muted-foreground">
              필터 초기화
            </Button>
          ) : null}
        </div>
      </section>

      {/* Member -> 4-Category Grouped Asset Details (ASSET-03) */}
      {groupedByOwner.length === 0 ? (
        <Card padding="none">
          <CardContent className="p-0">
            <EmptyState
              title="조건에 맞는 자산·부채 항목이 없어요"
              description="검색어나 소유자·자산 구분 필터를 초기화해 전체 현황을 확인해 보세요."
              actions={
                hasActiveFilters ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                    필터 초기화
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedByOwner.map((ownerSection) => (
            <Card key={ownerSection.owner} padding="none" className="gap-0 overflow-hidden border-border-strong/80">
              {/* Member Header + Per-Owner Summary */}
              <div className="flex flex-col gap-3 border-b border-border-strong/70 bg-muted/55 px-3.5 py-3.5 md:flex-row md:items-center md:justify-between md:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                    {ownerSection.owner.slice(0, 1)}
                  </span>
                  <h2 className="text-base font-extrabold tracking-tight text-foreground">{ownerSection.owner}</h2>
                  <Badge variant="count" className="tabular-nums">
                    {ownerSection.visibleCount}개
                  </Badge>
                </div>

                <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs tabular-nums min-[375px]:grid min-[375px]:grid-cols-3 min-[375px]:gap-2 md:flex md:flex-row md:items-center md:gap-5 md:border-0 md:bg-transparent md:p-0">
                  <div className="flex items-baseline justify-between gap-1.5 min-[375px]:flex-col min-[375px]:gap-0.5 md:flex-row md:gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground md:text-xs">총자산</span>
                    <span className="text-xs font-extrabold whitespace-nowrap text-foreground md:text-sm">{formatWon(ownerSection.summary.totalAssets)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-1.5 min-[375px]:flex-col min-[375px]:gap-0.5 md:flex-row md:gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground md:text-xs">총부채</span>
                    <span className={cn('text-xs font-extrabold whitespace-nowrap md:text-sm', ownerSection.summary.totalDebt > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                      {formatWon(ownerSection.summary.totalDebt)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-1.5 min-[375px]:flex-col min-[375px]:gap-0.5 md:flex-row md:gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground md:text-xs">순자산</span>
                    <span className="text-xs font-extrabold whitespace-nowrap text-primary md:text-base">{formatWon(ownerSection.summary.netWorth)}</span>
                  </div>
                </div>
              </div>

              {/* Category Sub-sections as Distinct Nested Cards inside each Member */}
              <div className="flex flex-col gap-3.5 bg-muted/20 p-3 md:gap-4 md:p-4">
                {ownerSection.groups.map(({ meta, items }) => {
                  const visual = ASSET_GROUP_VISUALS[meta.key];
                  const GroupIcon = visual.icon;
                  const isLiquid = meta.key === 'cash-liquid';
                  const isDebtGroup = meta.key === 'debt';
                  const groupCurrentTotal = items.reduce((sum, item) => sum + getAssetCurrentValuation(item), 0);
                  const groupHasExpected = isLiquid && items.some((item) => (item.expectedFlows?.length ?? 0) > 0);
                  const groupProjectedTotal = isLiquid ? items.reduce((sum, item) => sum + getAssetProjectedBalance(item), 0) : groupCurrentTotal;

                  return (
                    <section key={meta.key} aria-label={`${ownerSection.owner} ${meta.label}`} className="flex flex-col overflow-hidden rounded-xl border border-border-strong/75 bg-card">
                      {/* Prominent Category Header with Large Subtotal */}
                      <div className={cn('flex flex-col gap-2 border-b border-border px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between md:px-4', visual.headerBgClass)}>
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-lg', visual.iconBoxClass)}>
                            <GroupIcon className="size-4" />
                          </span>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-extrabold tracking-tight text-foreground">{meta.label}</h3>
                            <Badge variant="count" className="tabular-nums">
                              {items.length}건
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums sm:justify-end sm:gap-2.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground">소계</span>
                            <span className={cn('text-base font-extrabold tracking-tight', visual.totalTextClass)}>{formatWon(groupCurrentTotal)}</span>
                          </div>
                          {groupHasExpected ? (
                            <span className="inline-flex items-center rounded-md bg-primary-tint px-2 py-0.5 text-xs font-bold text-primary">예상 잔액 {formatWon(groupProjectedTotal)}</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Mobile Stacked Rows (< 768px) */}
                      <div className="divide-y divide-border/80 md:hidden">
                        {items.map((item) => {
                          const currentVal = getAssetCurrentValuation(item);
                          const { inflow, outflow } = getAssetExpectedTotals(item);
                          const hasExpected = isLiquid && (inflow > 0 || outflow > 0);
                          const projectedVal = getAssetProjectedBalance(item);
                          const isFxAsset = item.marketQuote?.assetKind === 'fx';
                          const isRefRate = item.marketQuote?.valuationMode === 'reference-rate';

                          return (
                            <div key={item.id} className="flex flex-col gap-2 px-3.5 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex flex-col gap-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-sm font-bold text-foreground break-keep">{item.name}</span>
                                    {item.includeInLivingBudget ? <Badge variant="wine">생활비</Badge> : null}
                                    {item.marketQuote ? <Badge variant={isRefRate ? 'neutral' : 'positive'}>{isRefRate ? '공통 시세' : '직접 입력'}</Badge> : null}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground break-keep">
                                    {[item.institution, item.typeLabel, item.counterparty ? `상대 ${item.counterparty}` : null].filter(Boolean).join(' · ')}
                                  </span>
                                  {item.marketQuote ? (
                                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                                      {isFxAsset
                                        ? `1 ${item.marketQuote.unitLabel} = ${formatWon(item.marketQuote.ratePerUnit)}`
                                        : `보유 ${formatQuantityWithUnit(item.marketQuote)} · 1${item.marketQuote.unitLabel} = ${formatWon(item.marketQuote.ratePerUnit)}`}
                                    </span>
                                  ) : null}
                                </div>

                                <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEditAsset(item)} className="shrink-0 gap-1 px-2 text-xs">
                                  <Pencil className="size-3" />
                                  <span>수정</span>
                                </Button>
                              </div>

                              <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                                {isFxAsset && item.marketQuote ? (
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span className="text-sm font-bold text-foreground">{formatQuantityWithUnit(item.marketQuote)}</span>
                                    <span className="text-[11px] font-medium text-muted-foreground">{isRefRate ? `≈ ${formatWon(currentVal)}` : `${formatWon(currentVal)} (직접 입력)`}</span>
                                  </div>
                                ) : (
                                  <span className={cn('text-sm font-bold', isDebtGroup ? 'text-destructive' : 'text-foreground')}>
                                    {isRefRate ? `≈ ${formatWon(currentVal)}` : formatWon(currentVal)}
                                  </span>
                                )}
                                <span className="shrink-0 text-[11px] text-muted-foreground">{item.updatedAt}</span>
                              </div>

                              {hasExpected ? (
                                <button
                                  type="button"
                                  onClick={() => setFlowDetailAssetId(item.id)}
                                  className="flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-left text-xs tabular-nums transition-colors hover:border-primary/40 hover:bg-primary-tint/30"
                                >
                                  <div className="flex flex-col gap-1">
                                    {inflow > 0 ? (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-muted-foreground">입금 예정</span>
                                        <span className="font-semibold whitespace-nowrap text-positive">{formatSignedWon(inflow)}</span>
                                      </div>
                                    ) : null}
                                    {outflow > 0 ? (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-muted-foreground">출금 예정</span>
                                        <span className="font-semibold whitespace-nowrap text-destructive">{formatSignedWon(-outflow)}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-1.5">
                                    <span className="text-[11px] font-bold text-primary">예상 잔액</span>
                                    <span className="inline-flex items-center gap-0.5 font-extrabold whitespace-nowrap text-primary">
                                      <span>{formatWon(projectedVal)}</span>
                                      <ChevronRight className="size-3.5 shrink-0" />
                                    </span>
                                  </div>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tablet / PC Table (>= 768px) */}
                      <div className="hidden overflow-x-auto md:block">
                        {isLiquid ? (
                          <table className="w-full table-fixed border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-border/80 bg-card text-[11px] font-medium text-muted-foreground">
                                <th className="py-2 pl-4 pr-2 text-left font-medium">계좌 · 현금</th>
                                <th className="w-[108px] px-2 py-2 text-right font-medium whitespace-nowrap lg:w-32">현재 보유금</th>
                                <th className="w-[124px] px-2 py-2 text-right font-medium whitespace-nowrap lg:w-40">입금 · 출금 예정</th>
                                <th className="w-[108px] px-2 py-2 text-right font-medium whitespace-nowrap lg:w-32">예상 잔액</th>
                                <th className="hidden px-2 py-2 text-right font-medium whitespace-nowrap lg:table-cell lg:w-28">최종 수정</th>
                                <th className="w-[72px] py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap lg:w-20">관리</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/80">
                              {items.map((item) => {
                                const currentVal = getAssetCurrentValuation(item);
                                const { inflow, outflow } = getAssetExpectedTotals(item);
                                const hasExpected = inflow > 0 || outflow > 0;
                                const projectedVal = getAssetProjectedBalance(item);

                                return (
                                  <tr key={item.id} className="transition-colors hover:bg-muted/25">
                                    <td className="min-w-0 py-3 pl-4 pr-2">
                                      <div className="flex min-w-0 flex-col gap-0.5">
                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                          <span className="truncate font-bold text-foreground">{item.name}</span>
                                          {item.includeInLivingBudget ? <Badge variant="wine">생활비</Badge> : null}
                                        </div>
                                        <span className="truncate text-xs text-muted-foreground">{[item.institution, item.typeLabel].filter(Boolean).join(' · ')}</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap">
                                      <span className="font-bold text-foreground">{formatWon(currentVal)}</span>
                                    </td>
                                    <td className="px-2 py-3 text-right text-xs tabular-nums whitespace-nowrap">
                                      {hasExpected ? (
                                        <button
                                          type="button"
                                          onClick={() => setFlowDetailAssetId(item.id)}
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/70 bg-muted/35 px-2 py-1 transition-colors hover:border-primary/40 hover:bg-primary-tint/50"
                                        >
                                          <span className="flex flex-col items-end gap-0.5">
                                            {inflow > 0 ? <span className="font-semibold text-positive">{formatSignedWon(inflow)}</span> : null}
                                            {outflow > 0 ? <span className="font-semibold text-destructive">{formatSignedWon(-outflow)}</span> : null}
                                          </span>
                                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                                        </button>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap">
                                      <span className={cn('font-bold', hasExpected ? 'text-primary' : 'text-foreground')}>{formatWon(projectedVal)}</span>
                                    </td>
                                    <td className="hidden px-2 py-3 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap lg:table-cell">{item.updatedAt}</td>
                                    <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                                      <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEditAsset(item)}>
                                        수정
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <table className="w-full table-fixed border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-border/80 bg-card text-[11px] font-medium text-muted-foreground">
                                <th className="py-2 pl-4 pr-2 text-left font-medium">{isDebtGroup ? '부채 항목' : '자산 항목'}</th>
                                <th className="w-44 px-2 py-2 text-left font-medium whitespace-nowrap lg:w-56">{meta.key === 'savings-invest' ? '보유 · 시세 기준' : '유형 · 상대방'}</th>
                                <th className="w-32 px-2 py-2 text-right font-medium whitespace-nowrap lg:w-36">{isDebtGroup ? '남은 원금' : '현재 평가액'}</th>
                                <th className="hidden px-2 py-2 text-right font-medium whitespace-nowrap lg:table-cell lg:w-28">최종 수정</th>
                                <th className="w-20 py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap">관리</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/80">
                              {items.map((item) => {
                                const currentVal = getAssetCurrentValuation(item);
                                const isRefRate = item.marketQuote?.valuationMode === 'reference-rate';
                                return (
                                  <tr key={item.id} className="transition-colors hover:bg-muted/25">
                                    <td className="min-w-0 py-3 pl-4 pr-2">
                                      <div className="flex min-w-0 flex-col gap-0.5">
                                        <span className="truncate font-bold text-foreground">{item.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{[item.institution, item.typeLabel].filter(Boolean).join(' · ')}</span>
                                      </div>
                                    </td>
                                    <td className="min-w-0 px-2 py-3 text-xs text-muted-foreground">
                                      {item.marketQuote ? (
                                        <div className="flex flex-col gap-0.5 tabular-nums">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-semibold text-foreground">{formatQuantityWithUnit(item.marketQuote)}</span>
                                            <Badge variant={isRefRate ? 'neutral' : 'positive'}>{isRefRate ? '공통 시세' : '직접 입력'}</Badge>
                                          </div>
                                          <span className="text-[11px] text-muted-foreground">
                                            1{item.marketQuote.assetKind === 'fx' ? ` ${item.marketQuote.unitLabel}` : item.marketQuote.unitLabel} = {formatWon(item.marketQuote.ratePerUnit)}
                                          </span>
                                        </div>
                                      ) : item.counterparty ? (
                                        <span className="truncate font-medium text-foreground">{item.counterparty}</span>
                                      ) : (
                                        <span>직접 입력 평가액</span>
                                      )}
                                    </td>
                                    <td className={cn('px-2 py-3 text-right font-bold tabular-nums whitespace-nowrap', isDebtGroup ? 'text-destructive' : 'text-foreground')}>
                                      {isRefRate ? `≈ ${formatWon(currentVal)}` : formatWon(currentVal)}
                                    </td>
                                    <td className="hidden px-2 py-3 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap lg:table-cell">{item.updatedAt}</td>
                                    <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                                      <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEditAsset(item)}>
                                        수정
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reference Rates & Policy Meta Footer */}
      <div className="flex flex-col gap-1 px-0.5 text-xs text-muted-foreground">
        <div className="flex items-start gap-1.5">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-keep tabular-nums">{ASSET_REFERENCE_RATES_NOTICE}</span>
        </div>
        <p className="pl-5 text-[11px] break-keep">
          자산 등록·속성 변경·사용 중지는 가계부 설정에서 관리하며, 잔액 수정은 새 수입·지출을 만들지 않아요. 서로 다른 시각에 입력한 금액은 실시간 은행 잔액과 다를 수 있어요.
        </p>
      </div>

      {/* Mobile Detail Filter Sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>상세 검색</SheetTitle>
            <SheetDescription>소유자와 자산 구분으로 자산·부채 목록을 좁혀 볼 수 있어요.</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5 py-4">
            {filterGroups.map((group) => (
              <FilterChipGroup key={group.key} label={group.label} mode="multi" options={group.options} selected={group.selected} onChange={group.onChange} />
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

      {/* Dialogs */}
      {editingAsset ? (
        <AssetBalanceEditDialog
          key={`${editingAsset.id}-${editingAssetState.nonce}`}
          open={editingAssetState.open}
          onOpenChange={(open) => setEditingAssetState((prev) => ({ ...prev, open }))}
          asset={editingAsset}
          onSave={handleSaveAssetBalance}
        />
      ) : null}

      <LivingBudgetDiffDialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen} livingAssets={livingAssets} onNavigate={navigateWithQuery} />

      <AssetReceivablesDialog open={receivablesDialogOpen} onOpenChange={setReceivablesDialogOpen} onGoReceivables={() => navigateWithQuery('/preview/receivables')} />

      {flowDetailAsset ? (
        <ExpectedFlowDetailDialog
          open={Boolean(flowDetailAsset)}
          onOpenChange={(open) => {
            if (!open) {
              setFlowDetailAssetId(null);
            }
          }}
          asset={flowDetailAsset}
          onNavigate={navigateWithQuery}
        />
      ) : null}

      <ExpenseFormOverlay open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen} draft={expenseDraft} onDraftChange={setExpenseDraft} onSave={(saved) => void handleSaveExpense(saved)} />
    </DesignAppShell>
  );
};
