'use client';

import { EmptyState, FilterChipGroup, FilterMultiSelect, SummaryHeroCard, type ProfileAvatarColor } from '@repo/ui-composition';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
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
import { Calculator, ChevronDown, ChevronRight, HandCoins, HelpCircle, Pencil, Settings, SlidersHorizontal, StickyNote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AssetBalanceEditDialog, AssetReceivablesDialog, ExpectedFlowDetailDialog, LivingBudgetDiffDialog, type AssetBalanceSavePayload } from '@/previews/assets/AssetsDialogs';
import { ASSET_GROUP_VISUALS } from '@/previews/assets/asset-group-visuals';
import {
  ASSET_GROUP_ORDER,
  ASSET_OWNER_ORDER,
  ASSET_RECEIVABLES_BY_PERSON,
  BUDGET_REMAINING_BASELINE,
  INITIAL_DETAILED_ASSETS,
  INITIAL_OWNER_PROFILES,
  computeOwnerSummary,
  formatQuantityWithUnit,
  getAssetCurrentValuation,
  getAssetExpectedTotals,
  getAssetProjectedBalance,
  getCounterpartyRoleLabel,
  getTotalUncollectedReceivables,
  type AssetDetailItem,
  type AssetGroupKey,
  type AssetOwnerKey
} from '@/previews/assets/assets-model';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { FilterResetButton } from '@/shared/FilterResetButton';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { SearchFilterToolbar } from '@/shared/SearchFilterToolbar';
import { formatSignedWon, formatWon } from '@/shared/design-format';

const GROUP_LABEL_OPTIONS = ASSET_GROUP_ORDER.map((group) => group.label);

const AssetOwnerAvatar = ({ owner, profile, size = 'sm' }: { owner: AssetOwnerKey; profile: { color: ProfileAvatarColor; src: string | null }; size?: 'sm' | 'md' }) => (
  <MemberAvatar name={owner} label={owner.replace(/\(나\)$/, '')} mode="icon-label" size={size} colorOverride={profile.color} srcOverride={profile.src} labelClassName="text-current" />
);

const AssetOwnerDescription = ({
  assetName,
  owner,
  profile,
  institution,
  typeLabel,
  memo,
  className
}: {
  assetName: string;
  owner: AssetOwnerKey;
  profile: { color: ProfileAvatarColor; src: string | null };
  institution?: string;
  typeLabel?: string;
  memo?: string;
  className?: string;
}) => (
  <div className={cn('flex min-w-0 items-center gap-1.5 text-muted-foreground', className)}>
    <span className="inline-flex shrink-0">
      <AssetOwnerAvatar owner={owner} profile={profile} size="sm" />
    </span>
    {institution ? <span className="min-w-0 truncate">· {institution}</span> : null}
    <span className="hidden shrink-0 md:inline-flex" onClick={(event) => event.stopPropagation()}>
      <AssetMemoPopover assetName={assetName} memo={memo} />
    </span>
    {typeLabel ? <span className="min-w-0 truncate md:hidden">· {typeLabel}</span> : null}
    <span className="ml-auto shrink-0 md:hidden" onClick={(event) => event.stopPropagation()}>
      <AssetMemoPopover assetName={assetName} memo={memo} compact />
    </span>
  </div>
);

const AssetMemoPopover = ({ assetName, memo, compact = false }: { assetName: string; memo?: string; compact?: boolean }) => {
  if (!memo) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${assetName} 메모 보기`}
          title="메모 보기"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-amber-600 transition-colors before:absolute before:content-[''] hover:bg-muted/60 dark:text-amber-700",
            compact ? '-ml-1 size-5 before:-inset-3' : '-ml-1 h-6 w-5 before:-inset-2'
          )}
        >
          <StickyNote aria-hidden="true" strokeWidth={1.9} className={cn(compact ? 'size-3.5' : 'size-4', '[&>path:first-child]:fill-yellow-300 [&>path:last-child]:fill-yellow-100')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={8} className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
        <p>{memo}</p>
      </PopoverContent>
    </Popover>
  );
};

export const AssetsPreview = () => {
  const router = useRouter();

  const [assets, setAssets] = useState<AssetDetailItem[]>(INITIAL_DETAILED_ASSETS);
  const ownerProfiles = INITIAL_OWNER_PROFILES;
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

  const navigateWithQuery = (path: string) => {
    const query = new URLSearchParams(window.location.search).toString();
    router.push(query ? `${path}?${query}` : path);
  };

  const summaryAssets = useMemo(() => assets.filter((item) => selectedOwners.size === 0 || selectedOwners.has(item.owner)), [assets, selectedOwners]);
  const summaryOwnerLabel = selectedOwners.size === 0 ? '전체' : ASSET_OWNER_ORDER.filter((owner) => selectedOwners.has(owner)).join(' · ');
  const overallSummary = useMemo(() => computeOwnerSummary(summaryAssets), [summaryAssets]);
  const overallExpectedNet = useMemo(
    () =>
      summaryAssets.reduce((sum, item) => {
        if (item.group === 'debt') {
          return sum;
        }
        const { inflow, outflow } = getAssetExpectedTotals(item);
        return sum + inflow - outflow;
      }, 0),
    [summaryAssets]
  );
  const overallProjectedNetWorth = overallSummary.netWorth + overallExpectedNet;

  // Living budget reconciliation (living-included cash & accounts)
  const livingAssets = useMemo(() => assets.filter((item) => item.includeInLivingBudget), [assets]);
  const livingProjectedTotal = useMemo(() => livingAssets.reduce((sum, item) => sum + getAssetProjectedBalance(item), 0), [livingAssets]);
  const livingBudgetDiff = livingProjectedTotal - BUDGET_REMAINING_BASELINE;

  const totalUncollected = useMemo(() => getTotalUncollectedReceivables(), []);

  const assetGroupBreakdowns = useMemo(() => {
    return ASSET_GROUP_ORDER.filter((meta) => meta.key !== 'debt').map((meta) => {
      const groupItems = summaryAssets.filter((item) => item.group === meta.key);
      const total = groupItems.reduce((sum, item) => sum + getAssetCurrentValuation(item), 0);
      return {
        meta,
        total
      };
    });
  }, [summaryAssets]);

  const debtTypeBreakdowns = useMemo(() => {
    const map = new Map<string, { typeLabel: string; count: number; total: number }>();
    for (const item of summaryAssets) {
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
  }, [summaryAssets]);

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

  const groupedAssets = useMemo(
    () => ASSET_GROUP_ORDER.map((meta) => ({ meta, items: filteredAssets.filter((item) => item.group === meta.key) })).filter(({ items }) => items.length > 0),
    [filteredAssets]
  );

  const detailFilterCount = selectedGroups.size + (livingOnly ? 1 : 0);
  const hasActiveFilters = searchQuery.trim().length > 0 || detailFilterCount > 0;

  const filterGroups = [{ key: 'group', label: '자산 구분', options: GROUP_LABEL_OPTIONS, selected: selectedGroups, onChange: setSelectedGroups }];

  const editingAsset = useMemo(() => assets.find((item) => item.id === editingAssetState.assetId) ?? null, [assets, editingAssetState.assetId]);
  const flowDetailAsset = useMemo(() => (flowDetailAssetId ? (assets.find((item) => item.id === flowDetailAssetId) ?? null) : null), [assets, flowDetailAssetId]);

  const handleResetDetailFilters = () => {
    setSelectedGroups(new Set());
    setLivingOnly(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
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
                quantity: payload.quantity ?? item.marketQuote.quantity,
                unitLabel: payload.unitLabel ?? item.marketQuote.unitLabel,
                ratePerUnit: payload.ratePerUnit ?? item.marketQuote.ratePerUnit
              }
            : undefined
        };
      })
    );
  };

  const handleOpenAssetSettings = () => navigateWithQuery('/preview/settings/assets');

  const ownerFilter = (mobile: boolean) => (
    <FilterMultiSelect
      label="구성원"
      options={ASSET_OWNER_ORDER}
      selected={selectedOwners}
      onChange={setSelectedOwners}
      renderOption={(option) => <MemberAvatar name={option} size="xs" />}
      align="end"
      variant={mobile ? 'ghost' : 'outlined'}
      className={mobile ? 'min-h-11' : undefined}
    />
  );

  const topNotice =
    livingBudgetDiff !== 0 ? (
      <NoticeBox variant="warning">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs leading-5 font-medium text-foreground tabular-nums break-keep">
            생활비 계좌·현금 예상 잔액이 11월 예산상 남은 생활비보다{' '}
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
    ) : null;

  return (
    <DesignAppShell
      activeNav="assets"
      title="자산 현황"
      topNotice={topNotice}
      mobileActions={
        <>
          {ownerFilter(true)}
          <Button variant="ghost" size="icon" className="-mr-2 text-muted-foreground hover:text-foreground" aria-label="자산·카드 설정" onClick={handleOpenAssetSettings}>
            <Settings className="size-4" />
          </Button>
        </>
      }
      desktopActions={
        <>
          {ownerFilter(false)}
          <Button variant="outline" size="md" onClick={handleOpenAssetSettings} className="gap-1.5">
            <Settings className="size-4" />
            <span>자산·카드 설정</span>
          </Button>
        </>
      }
    >
      <section aria-label={`${summaryOwnerLabel} 자산 요약`} className="md:hidden">
        <SummaryHeroCard
          variant="hero"
          title={`${summaryOwnerLabel} 순자산`}
          titleAs="span"
          helpLabel="순자산 계산 기준 안내"
          helpText="순자산은 총자산에서 총부채를 뺀 금액이며, 현재 보유금과 평가액을 기준으로 해요."
          value={formatWon(overallSummary.netWorth)}
          subContent={
            overallExpectedNet !== 0 ? (
              <div className="flex items-center justify-between gap-2 text-xs text-hero-foreground/80">
                <span>예상 잔액 기준</span>
                <span className="font-semibold whitespace-nowrap text-hero-foreground">{formatWon(overallProjectedNetWorth)}</span>
              </div>
            ) : null
          }
        >
          <div className="border-t border-hero-foreground/20">
            <details className="group border-b border-hero-foreground/20">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">총자산</span>
                <strong className="ml-auto whitespace-nowrap text-hero-foreground">{formatWon(overallSummary.totalAssets)}</strong>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-hero-foreground/80 group-open:rotate-180" />
              </summary>
              <div className="space-y-2 pb-3 text-xs text-hero-foreground/80">
                {assetGroupBreakdowns.map(({ meta, total }) => (
                  <div key={meta.key} className="flex justify-between gap-2">
                    <span>{meta.label}</span>
                    <span className="font-semibold whitespace-nowrap text-hero-foreground">{formatWon(total)}</span>
                  </div>
                ))}
              </div>
            </details>
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">총부채</span>
                <strong className="ml-auto whitespace-nowrap text-hero-foreground">{formatWon(overallSummary.totalDebt)}</strong>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-hero-foreground/80 group-open:rotate-180" />
              </summary>
              <div className="space-y-2 pb-3 text-xs text-hero-foreground/80">
                {debtTypeBreakdowns.length ? (
                  debtTypeBreakdowns.map((entry) => (
                    <div key={entry.typeLabel} className="flex justify-between gap-2">
                      <span>{entry.typeLabel}</span>
                      <span className="font-semibold whitespace-nowrap text-hero-foreground">{formatWon(entry.total)}</span>
                    </div>
                  ))
                ) : (
                  <span>등록된 부채 없음</span>
                )}
              </div>
            </details>
          </div>
        </SummaryHeroCard>
      </section>

      {/* Top 3-Card Net Worth KPI (전체 구성원 기준 · ASSET-03) */}
      <section aria-label={`${summaryOwnerLabel} 자산 요약`} className="hidden gap-3 md:grid md:grid-cols-3">
        <Card className="flex flex-col gap-3 border-primary/25 bg-primary-tint/50 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">{summaryOwnerLabel} 총자산</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="총자산 계산 기준 안내"
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
            <span className="text-xl font-extrabold tracking-tight text-primary tabular-nums lg:text-2xl">{formatWon(overallSummary.totalAssets)}</span>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-primary/15 pt-2.5 text-xs tabular-nums md:text-[11px] lg:text-xs">
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
              <span className="text-xs font-semibold text-muted-foreground">{summaryOwnerLabel} 총부채</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="총부채 계산 기준 안내"
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
                  <span className="text-muted-foreground break-keep">{entry.typeLabel}</span>
                  <span className="font-bold whitespace-nowrap text-destructive">{formatWon(entry.total)}</span>
                </div>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">등록된 부채 없음</span>
            )}
          </div>
        </Card>

        <Card variant="hero" className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-hero-foreground/80">{summaryOwnerLabel} 순자산</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="순자산 계산 기준 안내"
                    className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-hero-foreground/80 transition-colors hover:bg-hero-foreground/15 hover:text-hero-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hero-foreground"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                  <strong className="font-bold">순자산 = 총자산 − 총부채</strong>이며, 직접 입력한 현재 잔액·평가액(외화·금 참고 환산 포함)만 합산해요.
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-hero-foreground tabular-nums lg:text-2xl">{formatWon(overallSummary.netWorth)}</span>
          </div>

          {overallExpectedNet !== 0 ? (
            <div className="flex items-center justify-between gap-2 border-t border-hero-foreground/20 pt-2.5 text-xs tabular-nums md:text-[11px] lg:text-xs">
              <span className="text-hero-foreground/80 break-keep">예상 잔액 기준</span>
              <span className="font-bold whitespace-nowrap text-hero-foreground">{formatWon(overallProjectedNetWorth)}</span>
            </div>
          ) : null}
        </Card>
      </section>

      {totalUncollected > 0 ? (
        <section aria-label="미회수 현황">
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
                <span className="text-xs font-bold text-foreground">미회수 금액</span>
                <span className="text-[13px] font-extrabold text-positive tabular-nums min-[360px]:text-sm">{formatWon(totalUncollected)}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">상대 {ASSET_RECEIVABLES_BY_PERSON.length}명</span>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-positive">
              <span className="hidden min-[360px]:inline">상대별 보기</span>
              <ChevronRight className="size-4" />
            </span>
          </button>
        </section>
      ) : null}

      {totalUncollected > 0 ? <hr className="border-0 border-t border-border" /> : null}

      <SearchFilterToolbar
        ariaLabel="자산 검색 및 필터"
        search={<SearchInput size="md" value={searchQuery} onValueChange={setSearchQuery} placeholder="내역 검색" aria-label="자산 검색" wrapperClassName="min-w-0 flex-1" />}
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
              <FilterMultiSelect key={group.key} label={group.label} options={group.options} selected={group.selected} onChange={group.onChange} />
            ))}
            <Checkbox checked={livingOnly} onCheckedChange={(checked) => setLivingOnly(checked === true)} label="생활비만 보기" wrapperClassName="min-h-control-md px-1 whitespace-nowrap" />
            {hasActiveFilters ? <FilterResetButton onClick={handleResetFilters} /> : null}
          </>
        }
      />

      {/* 자산 유형별 내역 */}
      {groupedAssets.length === 0 ? (
        <Card padding="none">
          <CardContent className="p-0">
            <EmptyState
              title="조건에 맞는 자산·부채 항목이 없어요"
              description="검색어나 자산 구분 필터를 초기화해 전체 현황을 확인해 보세요."
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
          {groupedAssets.map(({ meta, items }) => {
            const visual = ASSET_GROUP_VISUALS[meta.key];
            const GroupIcon = visual.icon;
            const isLiquid = meta.key === 'cash-liquid';
            const isDebtGroup = meta.key === 'debt';
            const groupCurrentTotal = items.reduce((sum, item) => sum + getAssetCurrentValuation(item), 0);
            const groupHasExpected = isLiquid && items.some((item) => (item.expectedFlows?.length ?? 0) > 0);
            const groupProjectedTotal = isLiquid ? items.reduce((sum, item) => sum + getAssetProjectedBalance(item), 0) : groupCurrentTotal;

            return (
              <section key={meta.key} aria-label={meta.label} className="flex flex-col overflow-hidden rounded-xl border border-border-strong/75 bg-card">
                {/* Category header with the current total beside its name */}
                <div className={cn('flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5 md:px-4', visual.headerBgClass)}>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-lg', visual.iconBoxClass)}>
                      <GroupIcon className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 md:gap-1.5">
                      <h3 className="text-[13px] font-extrabold tracking-tight break-keep text-foreground min-[360px]:text-sm min-[360px]:whitespace-nowrap sm:text-base">{meta.label}</h3>
                      <Badge variant="count" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums sm:px-2 sm:py-0.5 sm:text-xs">
                        {items.length}건
                      </Badge>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1 tabular-nums">
                    <span className={cn('text-[13px] font-extrabold tracking-tight min-[360px]:text-sm sm:text-lg', visual.totalTextClass)}>{formatWon(groupCurrentTotal)}</span>
                    {groupHasExpected ? <span className="text-right text-[11px] font-bold text-primary min-[360px]:text-xs sm:text-sm">예상 잔액 {formatWon(groupProjectedTotal)}</span> : null}
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
                    const isQuoteAsset = Boolean(item.marketQuote);
                    const editActionLabel = isLiquid || meta.key === 'savings-invest' ? '보유량 수정' : isDebtGroup ? '남은 원금 수정' : '평가액 수정';

                    return (
                      <div key={item.id} className="flex flex-col gap-0.5 px-3.5 py-3">
                        <div className="flex min-w-0 items-center justify-between gap-2 text-left">
                          <div className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1 min-[360px]:gap-1.5">
                              <span className="truncate text-[13px] font-bold text-foreground min-[360px]:text-sm">{item.name}</span>
                              {item.includeInLivingBudget ? (
                                <Badge variant="wine" className="max-[359px]:px-1.5 max-[359px]:py-0 max-[359px]:text-[10px]">
                                  생활비
                                </Badge>
                              ) : null}
                            </span>
                          </div>
                          <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
                            <span className={cn('text-[13px] font-bold min-[360px]:text-sm', isDebtGroup && !isQuoteAsset ? 'text-destructive' : 'text-foreground')}>
                              {isQuoteAsset && item.marketQuote ? formatQuantityWithUnit(item.marketQuote) : formatWon(currentVal)}
                            </span>
                            <button
                              type="button"
                              aria-label={`${item.name} ${editActionLabel}`}
                              title={editActionLabel}
                              onClick={() => handleOpenEditAsset(item)}
                              className="relative -mr-1 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors before:absolute before:-inset-3 before:content-[''] hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              <Pencil aria-hidden="true" className="size-3" />
                            </button>
                          </span>
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <div className="min-w-0">
                              <AssetOwnerDescription
                                assetName={item.name}
                                owner={item.owner}
                                profile={ownerProfiles[item.owner]}
                                institution={item.institution || item.counterparty}
                                typeLabel={item.typeLabel}
                                memo={item.memo}
                                className="text-[10px] min-[360px]:text-[11px]"
                              />
                            </div>
                            {isQuoteAsset ? <span className="shrink-0 whitespace-nowrap text-xs font-bold text-primary tabular-nums min-[360px]:text-sm">≈ {formatWon(currentVal)}</span> : null}
                          </div>
                          {item.marketQuote ? (
                            <span className="self-end text-right text-[10px] font-medium text-muted-foreground tabular-nums min-[360px]:text-[11px]">
                              {isFxAsset
                                ? `시세 1 ${item.marketQuote.unitLabel} = ${formatWon(item.marketQuote.ratePerUnit)}`
                                : `시세 1${item.marketQuote.unitLabel} = ${formatWon(item.marketQuote.ratePerUnit)}`}
                            </span>
                          ) : null}
                        </div>

                        {hasExpected ? (
                          <button
                            type="button"
                            onClick={() => setFlowDetailAssetId(item.id)}
                            className="flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-border bg-muted/35 px-3 py-2 text-left text-[11px] tabular-nums transition-colors hover:border-primary/40 hover:bg-primary-tint/30 min-[360px]:py-2.5 min-[360px]:text-xs"
                          >
                            <div className="flex flex-col gap-1">
                              {inflow > 0 ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground min-[360px]:text-[11px]">입금 예정</span>
                                  <span className="font-semibold whitespace-nowrap text-income">{formatSignedWon(inflow)}</span>
                                </div>
                              ) : null}
                              {outflow > 0 ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground min-[360px]:text-[11px]">출금 예정</span>
                                  <span className="font-semibold whitespace-nowrap text-expense">{formatSignedWon(-outflow)}</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-1.5">
                              <span className="text-[10px] font-bold text-primary min-[360px]:text-[11px]">예상 잔액</span>
                              <span className="inline-flex items-center gap-0.5 font-extrabold whitespace-nowrap text-primary">
                                <span>{formatWon(projectedVal)}</span>
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
                          <th className="py-2 pl-4 pr-2 text-left font-medium">자산 항목</th>
                          <th className="w-24 px-2 py-2 text-left font-medium whitespace-nowrap">유형</th>
                          <th className="w-[136px] px-2 py-2 text-right font-medium whitespace-nowrap lg:w-[152px]">보유량</th>
                          <th className="w-[108px] px-2 py-2 text-right font-medium whitespace-nowrap lg:w-32">입출금 예정</th>
                          <th className="w-[104px] py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap lg:w-32">예상 잔액(평가액)</th>
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
                                    <span className="truncate text-left font-bold text-foreground">{item.name}</span>
                                    {item.includeInLivingBudget ? <Badge variant="wine">생활비</Badge> : null}
                                  </div>
                                  <AssetOwnerDescription
                                    assetName={item.name}
                                    owner={item.owner}
                                    profile={ownerProfiles[item.owner]}
                                    institution={item.institution}
                                    typeLabel={item.typeLabel}
                                    memo={item.memo}
                                    className="text-xs"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-3 text-xs text-muted-foreground break-keep">{item.typeLabel}</td>
                              <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap">
                                <span className="inline-flex items-center justify-end gap-1">
                                  <span className="font-bold text-foreground">
                                    {item.typeLabel === '현금' && item.marketQuote?.assetKind === 'fx' ? formatQuantityWithUnit(item.marketQuote) : formatWon(currentVal)}
                                  </span>
                                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`${item.name} 보유량 수정`} title="보유량 수정" onClick={() => handleOpenEditAsset(item)}>
                                    <Pencil aria-hidden="true" className="size-3.5" />
                                  </Button>
                                </span>
                              </td>
                              <td className="px-2 py-3 text-right text-xs tabular-nums whitespace-nowrap">
                                {hasExpected ? (
                                  <button
                                    type="button"
                                    onClick={() => setFlowDetailAssetId(item.id)}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/70 bg-muted/35 px-2 py-1 transition-colors hover:border-primary/40 hover:bg-primary-tint/50"
                                  >
                                    <span className="flex flex-col items-end gap-0.5">
                                      {inflow > 0 ? <span className="font-semibold text-income">{formatSignedWon(inflow)}</span> : null}
                                      {outflow > 0 ? <span className="font-semibold text-expense">{formatSignedWon(-outflow)}</span> : null}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 pl-2 pr-4 text-right tabular-nums whitespace-nowrap">
                                <span className="flex flex-col items-end gap-0.5">
                                  <span className={cn('font-bold', hasExpected || item.marketQuote ? 'text-primary' : 'text-foreground')}>
                                    {item.marketQuote ? '≈ ' : ''}
                                    {formatWon(projectedVal)}
                                  </span>
                                  {item.typeLabel === '현금' && item.marketQuote?.assetKind === 'fx' ? (
                                    <span className="text-[10px] font-normal text-muted-foreground">
                                      1 {item.marketQuote.unitLabel} = {formatWon(item.marketQuote.ratePerUnit)}
                                    </span>
                                  ) : null}
                                </span>
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
                          <th className="w-24 px-2 py-2 text-left font-medium whitespace-nowrap">유형</th>
                          {meta.key === 'savings-invest' ? (
                            <>
                              <th className="w-32 px-2 py-2 text-right font-medium whitespace-nowrap">보유량</th>
                              <th className="w-[128px] py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap">평가액</th>
                            </>
                          ) : (
                            <>
                              <th className="w-28 px-2 py-2 text-left font-medium whitespace-nowrap">{getCounterpartyRoleLabel(meta.key)}</th>
                              <th className="w-40 py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap">{isDebtGroup ? '남은 원금' : '평가액'}</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/80">
                        {items.map((item) => {
                          const currentVal = getAssetCurrentValuation(item);
                          return (
                            <tr key={item.id} className="transition-colors hover:bg-muted/25">
                              <td className="min-w-0 py-3 pl-4 pr-2">
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <span className="truncate text-left font-bold text-foreground">{item.name}</span>
                                  </div>
                                  <AssetOwnerDescription
                                    assetName={item.name}
                                    owner={item.owner}
                                    profile={ownerProfiles[item.owner]}
                                    institution={item.institution}
                                    typeLabel={item.typeLabel}
                                    memo={item.memo}
                                    className="text-xs"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-3 text-xs text-muted-foreground break-keep">{item.typeLabel}</td>
                              {meta.key === 'savings-invest' ? (
                                <>
                                  <td className="px-2 py-3 text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                                      {item.marketQuote ? formatQuantityWithUnit(item.marketQuote) : formatWon(currentVal)}
                                      <Button type="button" variant="ghost" size="icon-xs" aria-label={`${item.name} 보유량 수정`} title="보유량 수정" onClick={() => handleOpenEditAsset(item)}>
                                        <Pencil aria-hidden="true" className="size-3.5" />
                                      </Button>
                                    </span>
                                  </td>
                                  <td className={cn('py-3 pl-2 pr-4 text-right text-sm tabular-nums whitespace-nowrap', item.marketQuote ? 'text-primary' : 'text-foreground')}>
                                    <span className="flex flex-col items-end gap-0.5">
                                      <span className="font-bold">
                                        {item.marketQuote ? '≈ ' : ''}
                                        {formatWon(currentVal)}
                                      </span>
                                      {item.marketQuote ? (
                                        <span className="text-[10px] font-normal text-muted-foreground">
                                          {item.marketQuote.assetKind === 'fx' ? `1 ${item.marketQuote.unitLabel}` : `1${item.marketQuote.unitLabel}`} = {formatWon(item.marketQuote.ratePerUnit)}
                                        </span>
                                      ) : null}
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="min-w-0 px-2 py-3 text-xs text-muted-foreground">
                                    {item.counterparty ? <span className="font-medium text-foreground break-keep">{item.counterparty}</span> : null}
                                  </td>
                                  <td className={cn('py-3 pl-2 pr-4 text-right text-sm font-bold tabular-nums whitespace-nowrap', isDebtGroup ? 'text-destructive' : 'text-foreground')}>
                                    <span className="inline-flex items-center gap-1">
                                      {formatWon(currentVal)}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`${item.name} ${isDebtGroup ? '남은 원금' : '평가액'} 수정`}
                                        title={isDebtGroup ? '남은 원금 수정' : '평가액 수정'}
                                        onClick={() => handleOpenEditAsset(item)}
                                      >
                                        <Pencil aria-hidden="true" className="size-3.5" />
                                      </Button>
                                    </span>
                                  </td>
                                </>
                              )}
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
      )}

      {/* Mobile Detail Filter Sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>상세 검색</SheetTitle>
            <SheetDescription>자산 구분과 생활비 포함 여부로 자산·부채 목록을 좁혀 볼 수 있어요.</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5 py-4">
            {filterGroups.map((group) => (
              <FilterChipGroup key={group.key} label={group.label} mode="multi" options={group.options} selected={group.selected} onChange={group.onChange} />
            ))}
            <Checkbox checked={livingOnly} onCheckedChange={(checked) => setLivingOnly(checked === true)} label="생활비만 보기" />
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

      <LivingBudgetDiffDialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen} livingAssets={livingAssets} />

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
    </DesignAppShell>
  );
};
