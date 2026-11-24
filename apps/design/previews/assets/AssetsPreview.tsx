'use client';

import { EmptyState, FilterChipGroup, FilterMultiSelect, SummaryHeroCard, dialog, type ProfileAvatarColor } from '@repo/ui-composition';
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
import { Calculator, ChevronDown, ChevronRight, HandCoins, Handshake, HelpCircle, Info, Landmark, Pencil, PiggyBank, Settings, SlidersHorizontal, Wallet } from 'lucide-react';
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
  INITIAL_OWNER_PROFILES,
  computeOwnerSummary,
  formatQuantityWithUnit,
  getAssetCurrentValuation,
  getAssetExpectedTotals,
  getAssetProjectedBalance,
  getTotalUncollectedReceivables,
  type AssetDetailItem,
  type AssetGroupKey,
  type AssetOwnerKey
} from '@/previews/assets/assets-model';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { DESIGN_PROFILE_NAME, updatePersonalProfile } from '@/shared/design-personal-businesses';

const GROUP_LABEL_OPTIONS = ASSET_GROUP_ORDER.map((group) => group.label);

const AssetOwnerAvatar = ({
  owner,
  profile,
  onColorChange,
  onImageChange,
  size = 'sm'
}: {
  owner: AssetOwnerKey;
  profile: { color: ProfileAvatarColor; src: string | null };
  onColorChange: (color: ProfileAvatarColor) => void;
  onImageChange: (src: string | null) => void;
  size?: 'sm' | 'md';
}) => (
  <MemberAvatar
    name={owner}
    mode="icon-interactive"
    size={size}
    colorOverride={owner === DESIGN_PROFILE_NAME ? undefined : profile.color}
    srcOverride={owner === DESIGN_PROFILE_NAME ? undefined : profile.src}
    onColorChange={owner === DESIGN_PROFILE_NAME ? (avatarColor) => updatePersonalProfile((prev) => ({ ...prev, avatarColor, avatarSrc: null })) : onColorChange}
    onImageChange={owner === DESIGN_PROFILE_NAME ? (avatarSrc) => updatePersonalProfile((prev) => ({ ...prev, avatarSrc })) : onImageChange}
  />
);

const AssetOwnerDescription = ({
  owner,
  profile,
  onColorChange,
  onImageChange,
  description,
  multiline = false,
  className
}: {
  owner: AssetOwnerKey;
  profile: { color: ProfileAvatarColor; src: string | null };
  onColorChange: (color: ProfileAvatarColor) => void;
  onImageChange: (src: string | null) => void;
  description: string;
  multiline?: boolean;
  className?: string;
}) => (
  <div className={cn('flex min-w-0 items-center gap-1.5 text-muted-foreground', className)}>
    <span className="-m-3 inline-flex shrink-0">
      <AssetOwnerAvatar owner={owner} profile={profile} onColorChange={onColorChange} onImageChange={onImageChange} size="sm" />
    </span>
    <span className={cn('min-w-0', multiline ? 'leading-snug break-keep' : 'truncate')}>{description}</span>
  </div>
);

const AssetEditIconButton = ({ assetName, onClick }: { assetName: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`${assetName} 금액 수정`}
    title="금액 수정"
    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
  >
    <Pencil className="size-3.5" />
  </button>
);

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
  const [ownerProfiles, setOwnerProfiles] = useState<Record<AssetOwnerKey, { color: ProfileAvatarColor; src: string | null }>>(INITIAL_OWNER_PROFILES);
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
                quantity: payload.quantity ?? item.marketQuote.quantity
              }
            : undefined
        };
      })
    );
  };

  const handleOpenSettingsGuide = async () => {
    await dialog.alert({
      title: '자산 · 카드 설정 안내',
      description: '새 자산·부채 등록, 표시명·구분·생활비 포함 여부 수정, 사용 중지는 가계부 설정의 자산 · 카드 탭에서 관리해요.'
    });
  };

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
      <NoticeBox variant="warning" className="items-center">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground tabular-nums break-keep">
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
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 text-muted-foreground hover:text-foreground"
            aria-label="가계부 설정에서 자산·카드 관리 안내"
            onClick={() => void handleOpenSettingsGuide()}
          >
            <Settings className="size-4" />
          </Button>
        </>
      }
      desktopActions={
        <>
          {ownerFilter(false)}
          <Button variant="outline" size="md" onClick={() => void handleOpenSettingsGuide()} className="gap-1.5">
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
                <span>예정 입출금 반영 시</span>
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
              <span className="text-hero-foreground/80 break-keep">예정 입출금 반영 시</span>
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
                <span className="text-sm font-extrabold text-positive tabular-nums">{formatWon(totalUncollected)}</span>
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

      {/* Search & Multi-Select Filters (1-line on >= 768px) */}
      <section aria-label="자산 검색 및 필터" className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
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
        <button
          type="button"
          aria-pressed={livingOnly}
          onClick={() => setLivingOnly((prev) => !prev)}
          className={cn(
            'hidden min-h-11 w-fit cursor-pointer rounded-lg border px-3 text-xs font-semibold md:ml-auto md:inline-flex md:items-center',
            livingOnly ? 'border-primary bg-primary-tint text-primary' : 'border-border-strong bg-card text-foreground hover:bg-accent/40'
          )}
        >
          생활비만 보기
        </button>
      </section>

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
                    const isQuoteAsset = Boolean(item.marketQuote);

                    return (
                      <div key={item.id} className="flex flex-col gap-2 px-3.5 py-3">
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground break-keep">{item.name}</span>
                            {item.includeInLivingBudget ? <Badge variant="wine">생활비</Badge> : null}
                            {isQuoteAsset ? <Badge variant="neutral">공통 시세</Badge> : null}
                          </div>
                          <AssetOwnerDescription
                            owner={item.owner}
                            profile={ownerProfiles[item.owner]}
                            onColorChange={(nextColor) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], color: nextColor } }))}
                            onImageChange={(nextSrc) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], src: nextSrc } }))}
                            description={item.typeLabel}
                            multiline
                            className="text-[11px]"
                          />
                          {item.counterparty ? (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <span>상대</span>
                              <MemberAvatar name={item.counterparty} size="xs" />
                            </div>
                          ) : null}
                          {item.marketQuote ? (
                            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                              {isFxAsset
                                ? `1 ${item.marketQuote.unitLabel} = ${formatWon(item.marketQuote.ratePerUnit)}`
                                : `보유 ${formatQuantityWithUnit(item.marketQuote)} · 1${item.marketQuote.unitLabel} = ${formatWon(item.marketQuote.ratePerUnit)}`}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                          <div className="flex min-w-0 items-center gap-1">
                            {isFxAsset && item.marketQuote ? (
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-sm font-bold text-foreground">{formatQuantityWithUnit(item.marketQuote)}</span>
                                <span className="text-[11px] font-medium text-muted-foreground">≈ {formatWon(currentVal)}</span>
                              </div>
                            ) : (
                              <span className={cn('text-sm font-bold', isDebtGroup ? 'text-destructive' : 'text-foreground')}>
                                {isQuoteAsset ? `≈ ${formatWon(currentVal)}` : formatWon(currentVal)}
                              </span>
                            )}
                            <AssetEditIconButton assetName={item.name} onClick={() => handleOpenEditAsset(item)} />
                          </div>
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
                                  <span className="font-semibold whitespace-nowrap text-income">{formatSignedWon(inflow)}</span>
                                </div>
                              ) : null}
                              {outflow > 0 ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-muted-foreground">출금 예정</span>
                                  <span className="font-semibold whitespace-nowrap text-expense">{formatSignedWon(-outflow)}</span>
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
                          <th className="hidden w-16 px-2 py-2 text-center font-medium whitespace-nowrap lg:table-cell">소유자</th>
                          <th className="w-[128px] px-2 py-2 text-right font-medium whitespace-nowrap lg:w-40">현재 보유금</th>
                          <th className="w-[124px] px-2 py-2 text-right font-medium whitespace-nowrap lg:w-40">입금 · 출금 예정</th>
                          <th className="w-[116px] py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap lg:w-32 lg:pr-2">예상 잔액</th>
                          <th className="hidden py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap lg:table-cell lg:w-28">최종 수정</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/80">
                        {items.map((item) => {
                          const currentVal = getAssetCurrentValuation(item);
                          const { inflow, outflow } = getAssetExpectedTotals(item);
                          const hasExpected = inflow > 0 || outflow > 0;
                          const projectedVal = getAssetProjectedBalance(item);
                          const description = item.typeLabel;

                          return (
                            <tr key={item.id} className="transition-colors hover:bg-muted/25">
                              <td className="min-w-0 py-3 pl-4 pr-2">
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="truncate font-bold text-foreground">{item.name}</span>
                                    {item.includeInLivingBudget ? <Badge variant="wine">생활비</Badge> : null}
                                  </div>
                                  <AssetOwnerDescription
                                    owner={item.owner}
                                    profile={ownerProfiles[item.owner]}
                                    onColorChange={(nextColor) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], color: nextColor } }))}
                                    onImageChange={(nextSrc) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], src: nextSrc } }))}
                                    description={description}
                                    className="text-xs lg:hidden"
                                  />
                                  <span className="hidden truncate text-xs text-muted-foreground lg:block">{description}</span>
                                </div>
                              </td>
                              <td className="hidden px-2 py-1 text-center whitespace-nowrap lg:table-cell">
                                <div className="inline-flex items-center justify-center">
                                  <AssetOwnerAvatar
                                    owner={item.owner}
                                    profile={ownerProfiles[item.owner]}
                                    onColorChange={(nextColor) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], color: nextColor } }))}
                                    onImageChange={(nextSrc) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], src: nextSrc } }))}
                                    size="md"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <span className="font-bold text-foreground">{formatWon(currentVal)}</span>
                                  <AssetEditIconButton assetName={item.name} onClick={() => handleOpenEditAsset(item)} />
                                </div>
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
                                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 pl-2 pr-4 text-right tabular-nums whitespace-nowrap lg:pr-2">
                                <span className={cn('font-bold', hasExpected ? 'text-primary' : 'text-foreground')}>{formatWon(projectedVal)}</span>
                              </td>
                              <td className="hidden py-3 pl-2 pr-4 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap lg:table-cell">{item.updatedAt}</td>
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
                          <th className="hidden w-16 px-2 py-2 text-center font-medium whitespace-nowrap lg:table-cell">소유자</th>
                          <th className="w-44 px-2 py-2 text-left font-medium whitespace-nowrap lg:w-56">{meta.key === 'savings-invest' ? '보유 · 시세 기준' : '유형 · 상대방'}</th>
                          <th className="w-40 py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap lg:w-44 lg:pr-2">{isDebtGroup ? '남은 원금' : '현재 평가액'}</th>
                          <th className="hidden py-2 pl-2 pr-4 text-right font-medium whitespace-nowrap lg:table-cell lg:w-28">최종 수정</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/80">
                        {items.map((item) => {
                          const currentVal = getAssetCurrentValuation(item);
                          const isQuoteAsset = Boolean(item.marketQuote);
                          const description = item.typeLabel;
                          return (
                            <tr key={item.id} className="transition-colors hover:bg-muted/25">
                              <td className="min-w-0 py-3 pl-4 pr-2">
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <span className="truncate font-bold text-foreground">{item.name}</span>
                                  <AssetOwnerDescription
                                    owner={item.owner}
                                    profile={ownerProfiles[item.owner]}
                                    onColorChange={(nextColor) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], color: nextColor } }))}
                                    onImageChange={(nextSrc) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], src: nextSrc } }))}
                                    description={description}
                                    className="text-xs lg:hidden"
                                  />
                                  <span className="hidden truncate text-xs text-muted-foreground lg:block">{description}</span>
                                </div>
                              </td>
                              <td className="hidden px-2 py-1 text-center whitespace-nowrap lg:table-cell">
                                <div className="inline-flex items-center justify-center">
                                  <AssetOwnerAvatar
                                    owner={item.owner}
                                    profile={ownerProfiles[item.owner]}
                                    onColorChange={(nextColor) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], color: nextColor } }))}
                                    onImageChange={(nextSrc) => setOwnerProfiles((prev) => ({ ...prev, [item.owner]: { ...prev[item.owner], src: nextSrc } }))}
                                    size="md"
                                  />
                                </div>
                              </td>
                              <td className="min-w-0 px-2 py-3 text-xs text-muted-foreground">
                                {item.marketQuote ? (
                                  <div className="flex flex-col gap-0.5 tabular-nums">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-foreground">{formatQuantityWithUnit(item.marketQuote)}</span>
                                      <Badge variant="neutral">공통 시세</Badge>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                      1{item.marketQuote.assetKind === 'fx' ? ` ${item.marketQuote.unitLabel}` : item.marketQuote.unitLabel} = {formatWon(item.marketQuote.ratePerUnit)}
                                    </span>
                                  </div>
                                ) : item.counterparty ? (
                                  <MemberAvatar name={item.counterparty} size="xs" labelClassName="font-medium text-foreground" />
                                ) : (
                                  <span>직접 입력 평가액</span>
                                )}
                              </td>
                              <td className={cn('py-3 pl-2 pr-4 text-right font-bold tabular-nums whitespace-nowrap lg:pr-2', isDebtGroup ? 'text-destructive' : 'text-foreground')}>
                                <div className="inline-flex items-center justify-end gap-1">
                                  <span>{isQuoteAsset ? `≈ ${formatWon(currentVal)}` : formatWon(currentVal)}</span>
                                  <AssetEditIconButton assetName={item.name} onClick={() => handleOpenEditAsset(item)} />
                                </div>
                              </td>
                              <td className="hidden py-3 pl-2 pr-4 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap lg:table-cell">{item.updatedAt}</td>
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
            <SheetDescription>자산 구분과 생활비 포함 여부로 자산·부채 목록을 좁혀 볼 수 있어요.</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5 py-4">
            {filterGroups.map((group) => (
              <FilterChipGroup key={group.key} label={group.label} mode="multi" options={group.options} selected={group.selected} onChange={group.onChange} />
            ))}
            <Checkbox label="생활비만 보기" checked={livingOnly} onCheckedChange={(checked) => setLivingOnly(checked === true)} />
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
