'use client';

import {
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  dialog
} from '@repo/ui-composition';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  NoticeBox,
  NumberInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  useIsMobileView
} from '@repo/ui-core';
import { ChevronRight, CircleHelp, CreditCard, Landmark, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';

import { ASSET_GROUP_VISUALS } from '@/previews/assets/asset-group-visuals';
import { ASSET_GROUP_ORDER, getCounterpartyRoleLabel, type AssetGroupKey } from '@/previews/assets/assets-model';
import { SettingsCardRegistrationOverlay } from '@/previews/settings/SettingsCardRegistrationOverlay';
import {
  ASSET_SUBTYPE_OPTIONS,
  CASH_CURRENCY_OPTIONS,
  FX_CURRENCY_OPTIONS,
  GOLD_UNIT_OPTIONS,
  formatConditionSummary,
  getAssetGroupLabel,
  getConditionSourceBadge,
  getReferenceRateForUnit,
  type CardRuleDiscount,
  type CardRuleInstallment,
  type CardRulePeriod,
  type FixedExpenseRuleRecord,
  type FixedIncomeRuleRecord,
  type LedgerAssetRecord,
  type LedgerCardRecord
} from '@/previews/settings/settings-model';
import { MarketQuoteValuationFields, calculateQuoteValuation } from '@/shared/MarketQuoteValuationFields';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatWon } from '@/shared/design-format';
import { showValidationAlert } from '@/shared/design-validation';

const sectionClass = 'rounded-xl border border-border bg-card p-4 sm:p-5';

type AssetFormState = {
  id: string | null;
  name: string;
  institution: string;
  group: AssetGroupKey;
  typeLabel: string;
  owner: string;
  includeInLivingBudget: boolean;
  counterparty: string;
  memo: string;
  currentBalance: number | null;
  unitLabel: string;
  quantityText: string;
  inactive: boolean;
};

type CardEditFormState = {
  id: string;
  label: string;
  last4: string;
  paymentAccountId: string;
  transferSourceAccountId: string;
  dueDay: string;
  useDeferredTransit: boolean;
  transitAccountId: string;
  transitDay: string;
};

type CardConditionFormState = {
  id: string;
  period: CardRulePeriod;
  discountRule: CardRuleDiscount;
  installmentRule: CardRuleInstallment;
};

export const SettingsAssetsTab = ({
  owners,
  assets,
  onAssetsChange,
  cards,
  onCardsChange,
  fixedIncomes,
  fixedExpenses
}: {
  owners: readonly string[];
  assets: readonly LedgerAssetRecord[];
  onAssetsChange: (updater: (prev: LedgerAssetRecord[]) => LedgerAssetRecord[]) => void;
  cards: readonly LedgerCardRecord[];
  onCardsChange: (updater: (prev: LedgerCardRecord[]) => LedgerCardRecord[]) => void;
  fixedIncomes: readonly FixedIncomeRuleRecord[];
  fixedExpenses: readonly FixedExpenseRuleRecord[];
}) => {
  const isMobile = useIsMobileView();
  const [assetForm, setAssetForm] = useState<AssetFormState | null>(null);
  const [assetInvalid, setAssetInvalid] = useState<Set<string>>(() => new Set());
  const [cardRegOpen, setCardRegOpen] = useState(false);
  const [cardEditForm, setCardEditForm] = useState<CardEditFormState | null>(null);
  const [cardEditInvalid, setCardEditInvalid] = useState<Set<string>>(() => new Set());
  const [conditionCardId, setConditionCardId] = useState<string | null>(null);
  const [conditionDraft, setConditionDraft] = useState<CardConditionFormState | null>(null);

  const findAssetName = (assetId: string) => assets.find((item) => item.id === assetId)?.name ?? '계좌 확인 필요';
  const activeLiquidAccounts = assets.filter((item) => !item.inactive && item.group === 'cash-liquid' && item.typeLabel !== '현금');

  const clearAssetInvalid = (key: string) => {
    setAssetInvalid((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const clearCardEditInvalid = (key: string) => {
    setCardEditInvalid((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const openCreateAsset = () => {
    setAssetInvalid(new Set());
    setAssetForm({
      id: null,
      name: '',
      institution: '',
      group: 'cash-liquid',
      typeLabel: ASSET_SUBTYPE_OPTIONS['cash-liquid'][0] ?? '일반계좌',
      owner: owners[0] ?? '민지(나)',
      includeInLivingBudget: true,
      counterparty: '',
      memo: '',
      currentBalance: 0,
      unitLabel: 'KRW',
      quantityText: '',
      inactive: false
    });
  };

  const openEditAsset = (asset: LedgerAssetRecord) => {
    setAssetInvalid(new Set());
    setAssetForm({
      id: asset.id,
      name: asset.name,
      institution: asset.institution,
      group: asset.group,
      typeLabel: asset.typeLabel,
      owner: asset.owner,
      includeInLivingBudget: asset.includeInLivingBudget,
      counterparty: asset.counterparty ?? '',
      memo: asset.memo ?? '',
      currentBalance: asset.currentBalance,
      unitLabel: asset.marketQuote?.unitLabel ?? asset.currency ?? (asset.typeLabel.startsWith('금 ') ? '돈' : asset.typeLabel === '현금' ? 'KRW' : 'USD'),
      quantityText: asset.marketQuote ? String(asset.marketQuote.quantity) : '',
      inactive: asset.inactive
    });
  };

  const handleSaveAsset = () => {
    if (!assetForm) return;
    const errors: string[] = [];
    const nextInvalid = new Set<string>();
    const trimmedName = assetForm.name.trim();
    const isCash = assetForm.typeLabel === '현금';
    const isFx = assetForm.typeLabel === '외화 계좌' || (isCash && assetForm.unitLabel !== 'KRW');
    const isGold = assetForm.typeLabel === '금 통장' || assetForm.typeLabel === '금 실물';
    const isQuoteAsset = isFx || isGold;
    const existingAsset = assetForm.id ? assets.find((item) => item.id === assetForm.id) : undefined;
    const needsQuoteQuantity = isQuoteAsset && (!assetForm.id || !existingAsset?.marketQuote);
    const quoteKind = isFx ? 'fx' : 'gold';
    const ratePerUnit = getReferenceRateForUnit(quoteKind, assetForm.unitLabel);
    const quoteValuation = calculateQuoteValuation(assetForm.quantityText, ratePerUnit);

    if (!trimmedName) {
      nextInvalid.add('name');
      errors.push('자산명을 입력해 주세요.');
    }
    if (needsQuoteQuantity) {
      if (!quoteValuation.isValid || quoteValuation.computedKrw === null) {
        nextInvalid.add('quantity');
        errors.push(`보유량(${assetForm.unitLabel})을 0 이상 숫자로 입력해 주세요.`);
      }
    } else if (!assetForm.id && (assetForm.currentBalance == null || !Number.isSafeInteger(assetForm.currentBalance) || assetForm.currentBalance < 0)) {
      nextInvalid.add('balance');
      errors.push('초기 금액은 0원 이상의 정수로 입력해 주세요.');
    }

    if (errors.length > 0) {
      setAssetInvalid(nextInvalid);
      void showValidationAlert(errors);
      return;
    }

    const isCounterpartyGroup = assetForm.group === 'loan-deposit' || assetForm.group === 'debt';
    const showInstitution = !isCounterpartyGroup && !isCash && assetForm.typeLabel !== '금 실물' && assetForm.typeLabel !== '부동산';

    if (assetForm.id) {
      onAssetsChange((prev) =>
        prev.map((item) => {
          if (item.id !== assetForm.id) return item;
          const nextQuote = isQuoteAsset
            ? {
                assetKind: quoteKind as 'fx' | 'gold',
                unitLabel: assetForm.unitLabel,
                quantity: item.marketQuote?.quantity ?? quoteValuation.quantity,
                ratePerUnit,
                rateSource: isFx ? '공통 환율 참고 시세' : '공통 금 참고 시세',
                rateUpdatedAt: item.marketQuote?.rateUpdatedAt ?? '11.04 09:00',
                valuationMode: 'reference-rate' as const
              }
            : undefined;
          return {
            ...item,
            name: trimmedName,
            institution: showInstitution ? assetForm.institution.trim() : '',
            group: assetForm.group,
            typeLabel: assetForm.typeLabel,
            currency: isCash ? assetForm.unitLabel : undefined,
            includeInLivingBudget: assetForm.group === 'cash-liquid' ? assetForm.includeInLivingBudget : false,
            counterparty: isCounterpartyGroup ? assetForm.counterparty.trim() || undefined : undefined,
            memo: assetForm.memo.trim() || undefined,
            currentBalance: isQuoteAsset ? (quoteValuation.computedKrw ?? item.currentBalance) : item.currentBalance,
            marketQuote: nextQuote
          };
        })
      );
    } else {
      const computedBalance = isQuoteAsset ? (quoteValuation.computedKrw ?? 0) : (assetForm.currentBalance ?? 0);
      const nextQuote = isQuoteAsset
        ? {
            assetKind: quoteKind as 'fx' | 'gold',
            unitLabel: assetForm.unitLabel,
            quantity: quoteValuation.quantity,
            ratePerUnit,
            rateSource: isFx ? '공통 환율 참고 시세' : '공통 금 참고 시세',
            rateUpdatedAt: '11.04 09:00',
            valuationMode: 'reference-rate' as const
          }
        : undefined;
      onAssetsChange((prev) => [
        ...prev,
        {
          id: `asset-${Date.now()}`,
          name: trimmedName,
          institution: showInstitution ? assetForm.institution.trim() : '',
          group: assetForm.group,
          typeLabel: assetForm.typeLabel,
          currency: isCash ? assetForm.unitLabel : undefined,
          owner: assetForm.owner,
          includeInLivingBudget: assetForm.group === 'cash-liquid' ? assetForm.includeInLivingBudget : false,
          currentBalance: computedBalance,
          counterparty: isCounterpartyGroup ? assetForm.counterparty.trim() || undefined : undefined,
          memo: assetForm.memo.trim() || undefined,
          marketQuote: nextQuote,
          inactive: false,
          updatedAt: '11.24 13:20'
        }
      ]);
    }
    setAssetForm(null);
  };

  const handleToggleAssetStatus = async () => {
    if (!assetForm?.id) return;
    const target = assets.find((item) => item.id === assetForm.id);
    if (!target) return;

    if (target.inactive) {
      const ok = await dialog.confirm({
        title: `${target.name}을 다시 사용할까요?`,
        description: '새 거래·고정 거래 계좌 목록에서 다시 선택할 수 있어요.',
        confirmText: '재사용'
      });
      if (!ok) return;
      onAssetsChange((prev) => prev.map((item) => (item.id === target.id ? { ...item, inactive: false } : item)));
      setAssetForm(null);
      return;
    }

    const blockReasons: string[] = [];
    if (target.currentBalance !== 0) {
      blockReasons.push(`잔액 또는 보유량이 0원이 아니에요 (현재 ${formatWon(target.currentBalance)}). 자산 현황에서 잔액을 먼저 0원으로 정리해 주세요.`);
    }

    const connectedCards = cards.filter(
      (card) => card.paymentAccountId === target.id || card.transferSourceAccountId === target.id || (card.useDeferredTransit && card.transitAccountId === target.id)
    );
    if (connectedCards.length > 0) {
      blockReasons.push(`카드(${connectedCards.map((c) => c.label).join(', ')})의 결제 계좌 또는 송금 계좌로 연결되어 있어요. 카드 연결 계좌를 먼저 변경해 주세요.`);
    }

    const connectedFixedIncomes = fixedIncomes.filter((rule) => rule.accountId === target.id);
    if (connectedFixedIncomes.length > 0) {
      blockReasons.push(`고정 수입(${connectedFixedIncomes.map((r) => r.title).join(', ')})의 입금 계좌로 연결되어 있어요.`);
    }

    const connectedFixedExpenses = fixedExpenses.filter((rule) => rule.paymentMethodType === 'account' && rule.paymentTargetId === target.id);
    if (connectedFixedExpenses.length > 0) {
      blockReasons.push(`고정 지출(${connectedFixedExpenses.map((r) => r.title).join(', ')})의 결제 수단으로 연결되어 있어요.`);
    }

    if (blockReasons.length > 0) {
      void showValidationAlert(blockReasons, '사용 중지할 수 없어요');
      return;
    }

    const confirmed = await dialog.confirm({
      title: `${target.name} 사용을 중지할까요?`,
      description: '새 거래 선택에서는 제외되지만 과거 거래와 자산 기록은 그대로 유지돼요.',
      confirmText: '중지',
      variant: 'destructive'
    });
    if (!confirmed) return;

    onAssetsChange((prev) => prev.map((item) => (item.id === target.id ? { ...item, inactive: true } : item)));
    setAssetForm(null);
  };

  const openCardEdit = (card: LedgerCardRecord) => {
    setCardEditInvalid(new Set());
    setCardEditForm({
      id: card.id,
      label: card.label,
      last4: card.last4,
      paymentAccountId: card.paymentAccountId,
      transferSourceAccountId: card.transferSourceAccountId,
      dueDay: card.dueDay,
      useDeferredTransit: card.useDeferredTransit,
      transitAccountId: card.transitAccountId || card.paymentAccountId,
      transitDay: card.transitDay || '10'
    });
  };

  const handleSaveCardEdit = () => {
    if (!cardEditForm) return;
    const editingCard = cards.find((item) => item.id === cardEditForm.id);
    if (!editingCard) return;

    const errors: string[] = [];
    const nextInvalid = new Set<string>();
    const trimmedLabel = cardEditForm.label.trim();
    const trimmedLast4 = cardEditForm.last4.trim();

    if (!trimmedLabel) {
      nextInvalid.add('label');
      errors.push('카드 표시명을 입력해 주세요.');
    }
    if (!/^[0-9]{4}$/.test(trimmedLast4)) {
      nextInvalid.add('last4');
      errors.push('카드번호 마지막 4자리를 숫자 4자리로 입력해 주세요.');
    }
    if (!cardEditForm.paymentAccountId) {
      nextInvalid.add('paymentAccountId');
      errors.push(editingCard.kind === 'credit' ? '결제 계좌를 선택해 주세요.' : '출금 계좌를 선택해 주세요.');
    }
    if (editingCard.kind === 'credit') {
      if (!cardEditForm.transferSourceAccountId) {
        nextInvalid.add('transferSourceAccountId');
        errors.push('송금 계좌를 선택해 주세요.');
      }
      if (!cardEditForm.dueDay) {
        nextInvalid.add('dueDay');
        errors.push('결제일을 선택해 주세요.');
      }
    }
    if (cardEditForm.useDeferredTransit && (!cardEditForm.transitAccountId || !cardEditForm.transitDay)) {
      if (!cardEditForm.transitAccountId) nextInvalid.add('transitAccountId');
      if (!cardEditForm.transitDay) nextInvalid.add('transitDay');
      errors.push('후불교통 출금 계좌와 출금일을 선택해 주세요.');
    }

    if (errors.length > 0) {
      setCardEditInvalid(nextInvalid);
      void showValidationAlert(errors);
      return;
    }

    onCardsChange((prev) =>
      prev.map((item) =>
        item.id === cardEditForm.id
          ? {
              ...item,
              label: trimmedLabel,
              last4: trimmedLast4,
              paymentAccountId: cardEditForm.paymentAccountId,
              transferSourceAccountId: item.kind === 'credit' ? cardEditForm.transferSourceAccountId : cardEditForm.paymentAccountId,
              dueDay: item.kind === 'credit' ? cardEditForm.dueDay : '',
              useDeferredTransit: cardEditForm.useDeferredTransit,
              transitAccountId: cardEditForm.useDeferredTransit ? cardEditForm.transitAccountId : '',
              transitDay: cardEditForm.useDeferredTransit ? cardEditForm.transitDay : ''
            }
          : item
      )
    );
    setCardEditForm(null);
  };

  const handleToggleCardStatus = async (card: LedgerCardRecord) => {
    const confirmed = await dialog.confirm({
      title: card.inactive ? `${card.label} 카드를 다시 사용할까요?` : `${card.label} 사용을 중지할까요?`,
      description: card.inactive ? '지출·고정 지출의 결제 수단 목록에서 다시 선택할 수 있어요.' : '새 지출에서 선택할 수 없지만 기존 거래·예정 지출·실적 기록은 그대로 남아요.',
      confirmText: card.inactive ? '재사용' : '중지',
      variant: card.inactive ? 'default' : 'destructive'
    });
    if (!confirmed) return;
    onCardsChange((prev) => prev.map((item) => (item.id === card.id ? { ...item, inactive: !item.inactive } : item)));
  };

  const openConditionsModal = (card: LedgerCardRecord) => {
    setConditionCardId(card.id);
    setConditionDraft({
      id: card.id,
      period: card.period,
      discountRule: card.discountRule,
      installmentRule: card.installmentRule ?? '첫 달 전체 승인금액'
    });
  };

  const handleSaveConditions = () => {
    if (!conditionDraft) return;
    onCardsChange((prev) =>
      prev.map((item) =>
        item.id === conditionDraft.id
          ? {
              ...item,
              period: conditionDraft.period,
              discountRule: conditionDraft.discountRule,
              installmentRule: item.kind === 'credit' ? conditionDraft.installmentRule : undefined,
              conditionSource: 'personal'
            }
          : item
      )
    );
    setConditionCardId(null);
    setConditionDraft(null);
  };

  const editingCardTarget = cardEditForm ? (cards.find((item) => item.id === cardEditForm.id) ?? null) : null;
  const inspectingCard = conditionCardId ? (cards.find((item) => item.id === conditionCardId) ?? null) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* 자산 섹션 */}
      <section className={sectionClass} aria-label="자산 목록 관리">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Landmark aria-hidden="true" className="size-4 text-primary" />
            <h2 className="text-base font-bold">자산</h2>
            <Badge variant="count" className="tabular-nums">
              {assets.length}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="자산 등록 및 관리 안내"
                  className="-my-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CircleHelp aria-hidden="true" className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                자산 구분과 유형에 맞는 현금·계좌·저축·투자 자산을 등록해요. 단순 잔액 변경은 자산 현황에서 관리해요.
              </PopoverContent>
            </Popover>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={openCreateAsset}>
            <Plus className="size-4" /> 자산 등록
          </Button>
        </div>

        <div className="flex flex-col">
          {owners.map((ownerName, index) => {
            const ownedAssets = assets.filter((item) => item.owner === ownerName);
            const activeGroups = ASSET_GROUP_ORDER.map((meta) => ({
              meta,
              items: ownedAssets.filter((item) => item.group === meta.key)
            })).filter(({ items }) => items.length > 0);

            return (
              <Fragment key={ownerName}>
                {index > 0 ? <div aria-hidden="true" className="mx-2 my-5 h-px bg-border-strong" /> : null}
                <div className="flex flex-col gap-4 rounded-xl border border-border-strong/70 bg-muted/20 p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={ownerName} size="sm" mode="icon-hover" />
                    <h3 className="text-sm font-bold text-foreground">{ownerName}</h3>
                    <Badge variant="neutral" className="tabular-nums">
                      {ownedAssets.length}건
                    </Badge>
                  </div>

                  {activeGroups.length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">등록된 자산이 없어요.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeGroups.map(({ meta, items }) => {
                        const visual = ASSET_GROUP_VISUALS[meta.key];
                        const GroupIcon = visual.icon;

                        return (
                          <div key={meta.key} className="overflow-hidden rounded-lg border border-border bg-card">
                            <div className={cn('flex items-center justify-between gap-2 border-b border-border px-3 py-2', visual.headerBgClass)}>
                              <div className="flex items-center gap-2">
                                <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-lg', visual.iconBoxClass)}>
                                  <GroupIcon aria-hidden="true" className="size-4" />
                                </span>
                                <span className="text-xs font-bold text-foreground">{meta.label}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground tabular-nums">{items.length}건</span>
                            </div>

                            {/* 모바일 행 리스트 */}
                            <div className="divide-y divide-border md:hidden">
                              {items.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => openEditAsset(item)}
                                  aria-label={`${item.name} 관리`}
                                  className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/35 focus-visible:outline-2 focus-visible:outline-primary"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <strong className={cn('text-sm font-bold break-keep', item.inactive && 'text-muted-foreground line-through')}>{item.name}</strong>
                                      {item.includeInLivingBudget ? <Badge variant="wine">생활비</Badge> : null}
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {[item.typeLabel, item.marketQuote?.unitLabel ?? item.currency, item.counterparty].filter(Boolean).join(' · ')}
                                    </p>
                                    {item.memo ? <p className="mt-0.5 text-xs text-muted-foreground/85 break-keep">{item.memo}</p> : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <Badge variant={item.inactive ? 'neutral' : 'positive'}>{item.inactive ? '사용 중지' : '사용 중'}</Badge>
                                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                                  </div>
                                </button>
                              ))}
                            </div>

                            {/* 태블릿/PC 정렬 테이블 */}
                            <table className="hidden w-full table-fixed border-collapse text-sm md:table">
                              <thead className="bg-background text-xs text-muted-foreground">
                                <tr className="border-b border-border">
                                  <th scope="col" className="px-3 py-2 text-left font-medium">
                                    자산
                                  </th>
                                  <th scope="col" className="w-36 px-2 py-2 text-left font-medium lg:w-44">
                                    유형
                                  </th>
                                  <th scope="col" className="w-22 px-2 py-2 text-center font-medium lg:w-24">
                                    상태
                                  </th>
                                  <th scope="col" className="w-18 px-3 py-2 text-right font-medium lg:w-20">
                                    관리
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {items.map((item) => (
                                  <tr key={item.id} className="hover:bg-muted/25">
                                    <td className="px-3 py-2.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={cn('min-w-0 truncate font-semibold text-foreground', item.inactive && 'text-muted-foreground line-through')}>{item.name}</span>
                                        {item.includeInLivingBudget ? (
                                          <Badge variant="wine" className="shrink-0">
                                            생활비
                                          </Badge>
                                        ) : null}
                                      </div>
                                      {item.counterparty || item.memo ? (
                                        <p className="truncate text-xs text-muted-foreground">
                                          {[item.counterparty ? `${getCounterpartyRoleLabel(item.group)}: ${item.counterparty}` : null, item.memo].filter(Boolean).join(' · ')}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="truncate px-2 py-2.5 text-xs text-muted-foreground">{[item.typeLabel, item.marketQuote?.unitLabel ?? item.currency].filter(Boolean).join(' · ')}</td>
                                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                                      <Badge variant={item.inactive ? 'neutral' : 'positive'}>{item.inactive ? '사용 중지' : '사용 중'}</Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      <Button type="button" size="sm" variant="outline" onClick={() => openEditAsset(item)}>
                                        수정
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </section>

      {/* 카드 섹션 */}
      <section className={sectionClass} aria-label="카드 목록 관리">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CreditCard aria-hidden="true" className="size-4 text-primary" />
            <h2 className="text-base font-bold">카드</h2>
            <Badge variant="count" className="tabular-nums">
              {cards.length}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="카드 관리 안내"
                  className="-my-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CircleHelp aria-hidden="true" className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                여기에서는 카드 표시명, 마지막 4자리, 결제·송금 계좌와 개인 조건을 관리해요. 월별 이용 실적과 단계별 달성 현황은 결산에서 확인할 수 있어요.
              </PopoverContent>
            </Popover>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={() => setCardRegOpen(true)}>
            <Plus className="size-4" /> 카드 등록
          </Button>
        </div>

        <div className="flex flex-col">
          {owners.map((ownerName, index) => {
            const ownedCards = cards.filter((card) => card.owner === ownerName);
            return (
              <Fragment key={ownerName}>
                {index > 0 ? <div aria-hidden="true" className="mx-2 my-5 h-px bg-border-strong" /> : null}
                <div className="flex flex-col gap-4 rounded-xl border border-border-strong/70 bg-muted/20 p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={ownerName} size="sm" mode="icon-hover" />
                    <h3 className="text-sm font-bold text-foreground">{ownerName}</h3>
                    <Badge variant="neutral" className="tabular-nums">
                      {ownedCards.length}장
                    </Badge>
                  </div>

                  {ownedCards.length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">등록된 카드가 없어요.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {ownedCards.map((card) => {
                        const sourceBadge = getConditionSourceBadge(card.conditionSource);
                        return (
                          <article key={card.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border-strong bg-card p-3.5">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <strong className={cn('text-sm font-bold text-foreground break-keep', card.inactive && 'text-muted-foreground line-through')}>
                                      {card.label} · <span className="tabular-nums">{card.last4}</span>
                                    </strong>
                                  </div>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {card.issuer} · {card.kind === 'credit' ? '신용카드' : '체크카드'}
                                  </p>
                                </div>
                                <Badge variant={card.inactive ? 'neutral' : 'positive'} className="shrink-0">
                                  {card.inactive ? '사용 중지' : '사용 중'}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant={sourceBadge.variant}>{sourceBadge.label}</Badge>
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  단계 {card.tiers.length}개 · 확인 {card.verifiedAt}
                                </span>
                              </div>

                              <dl className="grid grid-cols-1 gap-1 rounded-lg bg-muted/35 px-2.5 py-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <dt className="text-muted-foreground">{card.kind === 'credit' ? '결제 계좌' : '출금 계좌'}</dt>
                                  <dd className="truncate font-medium text-foreground">{findAssetName(card.paymentAccountId)}</dd>
                                </div>
                                {card.kind === 'credit' ? (
                                  <>
                                    <div className="flex items-center justify-between gap-2">
                                      <dt className="text-muted-foreground">송금 계좌</dt>
                                      <dd className="truncate font-medium text-foreground">{findAssetName(card.transferSourceAccountId)}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <dt className="text-muted-foreground">결제일</dt>
                                      <dd className="font-medium text-foreground tabular-nums">매월 {card.dueDay}일</dd>
                                    </div>
                                  </>
                                ) : null}
                                {card.useDeferredTransit ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <dt className="text-muted-foreground">후불교통</dt>
                                    <dd className="truncate font-medium text-foreground tabular-nums">
                                      {findAssetName(card.transitAccountId)} · 매월 {card.transitDay}일
                                    </dd>
                                  </div>
                                ) : null}
                              </dl>

                              <p className="text-[11px] text-muted-foreground break-keep">{formatConditionSummary(card)}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2.5">
                              <Button type="button" size="sm" variant="outline" onClick={() => openCardEdit(card)}>
                                수정
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => openConditionsModal(card)}>
                                조건 확인
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={cn('ml-auto', card.inactive ? 'text-primary' : 'text-destructive hover:bg-destructive-tint hover:text-destructive')}
                                onClick={() => void handleToggleCardStatus(card)}
                              >
                                {card.inactive ? '재사용' : '사용 중지'}
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </section>

      {/* 자산 등록 / 수정 모달 */}
      <ResponsiveOverlay
        open={Boolean(assetForm)}
        onOpenChange={(open) => {
          if (!open) setAssetForm(null);
        }}
      >
        {assetForm ? (
          <ResponsiveOverlayContent>
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>{assetForm.id ? '자산 정보 수정' : '자산 등록'}</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>{assetForm.id ? '속성 변경과 사용 중지 여부를 관리해요.' : '새 자산·계좌·부채를 등록해요.'}</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3.5" dialogClassName="gap-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">자산 구분</span>
                  <Select
                    value={assetForm.group}
                    onValueChange={(nextGroup) => {
                      const group = nextGroup as AssetGroupKey;
                      const nextType = ASSET_SUBTYPE_OPTIONS[group][0] ?? '';
                      setAssetInvalid(new Set());
                      setAssetForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              group,
                              typeLabel: nextType,
                              unitLabel: nextType.startsWith('금 ') ? '돈' : nextType === '현금' ? 'KRW' : 'USD',
                              includeInLivingBudget: group === 'cash-liquid' ? prev.includeInLivingBudget : false
                            }
                          : null
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_GROUP_ORDER.map((meta) => (
                        <SelectItem key={meta.key} value={meta.key}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">세부 유형</span>
                  <Select
                    value={assetForm.typeLabel}
                    onValueChange={(nextType) => {
                      setAssetInvalid(new Set());
                      setAssetForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              typeLabel: nextType,
                              unitLabel: nextType.startsWith('금 ') ? '돈' : nextType === '현금' ? 'KRW' : nextType === '외화 계좌' ? 'USD' : prev.unitLabel
                            }
                          : null
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_SUBTYPE_OPTIONS[assetForm.group].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="asset-form-name" className="text-xs font-semibold text-foreground">
                    자산명
                  </label>
                  <Input
                    id="asset-form-name"
                    placeholder="예: 우리 생활비 통장"
                    value={assetForm.name}
                    invalid={assetInvalid.has('name')}
                    onChange={(event) => {
                      setAssetForm((prev) => (prev ? { ...prev, name: event.target.value } : null));
                      clearAssetInvalid('name');
                    }}
                  />
                </div>

                {assetForm.group === 'loan-deposit' || assetForm.group === 'debt' ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="asset-form-counterparty" className="text-xs font-semibold text-foreground">
                      {getCounterpartyRoleLabel(assetForm.group)} (사람 또는 기관)
                    </label>
                    <Input
                      id="asset-form-counterparty"
                      placeholder={assetForm.group === 'loan-deposit' ? '예: 임대인 김OO, 박대리(외부인)' : '예: 카카오뱅크, 세입자 김OO'}
                      value={assetForm.counterparty}
                      onChange={(event) => setAssetForm((prev) => (prev ? { ...prev, counterparty: event.target.value } : null))}
                    />
                  </div>
                ) : assetForm.typeLabel !== '현금' && assetForm.typeLabel !== '금 실물' && assetForm.typeLabel !== '부동산' ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="asset-form-inst" className="text-xs font-semibold text-foreground">
                      금융기관(선택)
                    </label>
                    <Input
                      id="asset-form-inst"
                      placeholder="예: 우리은행"
                      value={assetForm.institution}
                      onChange={(event) => setAssetForm((prev) => (prev ? { ...prev, institution: event.target.value } : null))}
                    />
                  </div>
                ) : null}

                {assetForm.typeLabel === '현금' || assetForm.typeLabel === '외화 계좌' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">통화</span>
                    <Select value={assetForm.unitLabel} onValueChange={(next) => setAssetForm((prev) => (prev ? { ...prev, unitLabel: next } : null))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(assetForm.typeLabel === '현금' ? CASH_CURRENCY_OPTIONS : FX_CURRENCY_OPTIONS).map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : assetForm.typeLabel === '금 통장' || assetForm.typeLabel === '금 실물' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">단위</span>
                    <Select value={assetForm.unitLabel} onValueChange={(next) => setAssetForm((prev) => (prev ? { ...prev, unitLabel: next } : null))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOLD_UNIT_OPTIONS.map((goldUnit) => (
                          <SelectItem key={goldUnit.unit} value={goldUnit.unit}>
                            {goldUnit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div
                  className={cn(
                    'flex flex-col gap-1.5',
                    assetForm.id && assetForm.typeLabel !== '외화 계좌' && !assetForm.typeLabel.startsWith('금 ') && assetForm.typeLabel !== '부동산' ? 'sm:col-span-2' : ''
                  )}
                >
                  <span className="text-xs font-semibold text-foreground">소유자</span>
                  <Select value={assetForm.owner} disabled={Boolean(assetForm.id)} onValueChange={(nextOwner) => setAssetForm((prev) => (prev ? { ...prev, owner: nextOwner } : null))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((memberName) => (
                        <SelectItem key={memberName} value={memberName}>
                          {memberName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assetForm.id ? <p className="text-[11px] text-muted-foreground">등록된 자산의 소유자는 바꿀 수 없어요.</p> : null}
                </div>

                {!assetForm.id && assetForm.typeLabel !== '외화 계좌' && !(assetForm.typeLabel === '현금' && assetForm.unitLabel !== 'KRW') && !assetForm.typeLabel.startsWith('금 ') ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="asset-form-balance" className="text-xs font-semibold text-foreground">
                      초기 잔액 · 평가액
                    </label>
                    <NumberInput
                      id="asset-form-balance"
                      suffix="원"
                      value={assetForm.currentBalance}
                      invalid={assetInvalid.has('balance')}
                      onValueChange={(next) => {
                        setAssetForm((prev) => (prev ? { ...prev, currentBalance: next } : null));
                        clearAssetInvalid('balance');
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {assetForm.typeLabel === '외화 계좌' || (assetForm.typeLabel === '현금' && assetForm.unitLabel !== 'KRW') || assetForm.typeLabel === '금 통장' || assetForm.typeLabel === '금 실물'
                ? (() => {
                    const quoteKind = assetForm.typeLabel === '외화 계좌' || assetForm.typeLabel === '현금' ? 'fx' : 'gold';
                    const ratePerUnit = getReferenceRateForUnit(quoteKind, assetForm.unitLabel);
                    return (
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        {!assetForm.id || !assets.find((item) => item.id === assetForm.id)?.marketQuote ? (
                          <MarketQuoteValuationFields
                            assetKind={quoteKind}
                            unitLabel={assetForm.unitLabel}
                            ratePerUnit={ratePerUnit}
                            inputId="asset-form-quantity"
                            quantityText={assetForm.quantityText}
                            invalid={assetInvalid.has('quantity')}
                            onQuantityTextChange={(next) => {
                              setAssetForm((prev) => (prev ? { ...prev, quantityText: next } : null));
                              clearAssetInvalid('quantity');
                            }}
                          />
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            보유량 수정은 자산 현황에서 할 수 있고, 원화 평가액은 {quoteKind === 'fx' ? '공통 환율 시세' : '공통 금 시세'}로 자동 계산돼요.
                          </p>
                        )}
                      </div>
                    );
                  })()
                : null}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="asset-form-memo" className="text-xs font-semibold text-foreground">
                  용도 · 메모 (선택)
                </label>
                <Input
                  id="asset-form-memo"
                  maxLength={60}
                  placeholder="예: 카드 대금 결제용, 급여 입금, 비상금 통장"
                  value={assetForm.memo}
                  onChange={(event) => setAssetForm((prev) => (prev ? { ...prev, memo: event.target.value } : null))}
                />
              </div>

              {assetForm.group === 'cash-liquid' ? (
                <Checkbox
                  label={assetForm.typeLabel === '현금' ? '생활비에 포함' : '생활비 계좌로 사용'}
                  checked={assetForm.includeInLivingBudget}
                  onCheckedChange={(checked) => setAssetForm((prev) => (prev ? { ...prev, includeInLivingBudget: checked === true } : null))}
                />
              ) : null}

              <NoticeBox variant="info">
                {assetForm.id
                  ? '잔액이 0원이 아니거나 카드 결제·송금 계좌, 고정 거래 계좌로 연결된 자산은 사용 중지할 수 없어요.'
                  : `${getAssetGroupLabel(assetForm.group)} 항목으로 등록돼요. 단순 잔액 추가는 새 수입·지출을 만들지 않아요.`}
              </NoticeBox>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter sheetClassName="flex-wrap gap-2">
              {assetForm.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn('mr-auto', assetForm.inactive ? 'text-primary' : 'text-destructive hover:bg-destructive-tint hover:text-destructive')}
                  onClick={() => void handleToggleAssetStatus()}
                >
                  {assetForm.inactive ? '다시 사용' : '사용 중지'}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setAssetForm(null)}>
                취소
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveAsset}>
                저장
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>

      {/* 카드 3단계 등록 모달 */}
      <SettingsCardRegistrationOverlay open={cardRegOpen} onOpenChange={setCardRegOpen} owners={owners} assets={assets} onComplete={(newCard) => onCardsChange((prev) => [...prev, newCard])} />

      {/* 카드 수정 모달 */}
      <ResponsiveOverlay
        open={Boolean(cardEditForm && editingCardTarget)}
        onOpenChange={(open) => {
          if (!open) setCardEditForm(null);
        }}
      >
        {cardEditForm && editingCardTarget ? (
          <ResponsiveOverlayContent>
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>카드 설정 수정</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>
                {editingCardTarget.issuer} · {editingCardTarget.kind === 'credit' ? '신용카드' : '체크카드'} (소유자 {editingCardTarget.owner})
              </ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3.5" dialogClassName="gap-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-card-label" className="text-xs font-semibold text-foreground">
                    카드 표시명
                  </label>
                  <Input
                    id="edit-card-label"
                    value={cardEditForm.label}
                    invalid={cardEditInvalid.has('label')}
                    onChange={(event) => {
                      setCardEditForm((prev) => (prev ? { ...prev, label: event.target.value } : null));
                      clearCardEditInvalid('label');
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-card-last4" className="text-xs font-semibold text-foreground">
                    마지막 4자리 (필수)
                  </label>
                  <Input
                    id="edit-card-last4"
                    inputMode="numeric"
                    maxLength={4}
                    className="tabular-nums"
                    value={cardEditForm.last4}
                    invalid={cardEditInvalid.has('last4')}
                    onChange={(event) => {
                      setCardEditForm((prev) => (prev ? { ...prev, last4: event.target.value.replace(/\D/g, '').slice(0, 4) } : null));
                      clearCardEditInvalid('last4');
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{editingCardTarget.kind === 'credit' ? '결제 계좌' : '출금 계좌'}</span>
                  <Select
                    value={cardEditForm.paymentAccountId}
                    onValueChange={(next) => {
                      setCardEditForm((prev) => (prev ? { ...prev, paymentAccountId: next } : null));
                      clearCardEditInvalid('paymentAccountId');
                    }}
                  >
                    <SelectTrigger invalid={cardEditInvalid.has('paymentAccountId')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLiquidAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.owner})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingCardTarget.kind === 'credit' ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-foreground">송금 계좌 (준비금 출발)</span>
                      <Select
                        value={cardEditForm.transferSourceAccountId}
                        onValueChange={(next) => {
                          setCardEditForm((prev) => (prev ? { ...prev, transferSourceAccountId: next } : null));
                          clearCardEditInvalid('transferSourceAccountId');
                        }}
                      >
                        <SelectTrigger invalid={cardEditInvalid.has('transferSourceAccountId')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {activeLiquidAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.owner})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-foreground">결제일</span>
                      <Select
                        value={cardEditForm.dueDay}
                        onValueChange={(next) => {
                          setCardEditForm((prev) => (prev ? { ...prev, dueDay: next } : null));
                          clearCardEditInvalid('dueDay');
                        }}
                      >
                        <SelectTrigger invalid={cardEditInvalid.has('dueDay')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, index) => {
                            const value = String(index + 1);
                            return (
                              <SelectItem key={value} value={value}>
                                매월 {value}일
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
              </div>

              <Checkbox
                label="후불교통 기능 사용"
                checked={cardEditForm.useDeferredTransit}
                onCheckedChange={(checked) => setCardEditForm((prev) => (prev ? { ...prev, useDeferredTransit: checked === true } : null))}
              />

              {cardEditForm.useDeferredTransit ? (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">후불교통 출금 계좌</span>
                    <Select
                      value={cardEditForm.transitAccountId}
                      onValueChange={(next) => {
                        setCardEditForm((prev) => (prev ? { ...prev, transitAccountId: next } : null));
                        clearCardEditInvalid('transitAccountId');
                      }}
                    >
                      <SelectTrigger invalid={cardEditInvalid.has('transitAccountId')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeLiquidAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">후불교통 출금일</span>
                    <Select
                      value={cardEditForm.transitDay}
                      onValueChange={(next) => {
                        setCardEditForm((prev) => (prev ? { ...prev, transitDay: next } : null));
                        clearCardEditInvalid('transitDay');
                      }}
                    >
                      <SelectTrigger invalid={cardEditInvalid.has('transitDay')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, index) => {
                          const value = String(index + 1);
                          return (
                            <SelectItem key={value} value={value}>
                              매월 {value}일
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              <NoticeBox variant="info">카드 마지막 4자리는 중복 가능하며 기존 거래 연결은 내부 카드 ID로 유지돼요.</NoticeBox>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter sheetClassName="flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setCardEditForm(null)}>
                취소
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveCardEdit}>
                저장
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>

      {/* 카드 조건 확인 · 개인 조건 수정 모달 */}
      <ResponsiveOverlay
        open={Boolean(inspectingCard && conditionDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setConditionCardId(null);
            setConditionDraft(null);
          }
        }}
      >
        {inspectingCard && conditionDraft ? (
          <ResponsiveOverlayContent size="lg">
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>{inspectingCard.label} · 실적 조건</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>
                {inspectingCard.productName} · {inspectingCard.kind === 'credit' ? '신용카드' : '체크카드'}
              </ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-4" dialogClassName="gap-4">
              <NoticeBox variant="info">개인 조건을 수정해 저장하면 공용 카드 조건은 유지한 채 이 카드에만 적용돼요.</NoticeBox>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">실적 산정 기간</span>
                  <Select value={conditionDraft.period} onValueChange={(next) => setConditionDraft((prev) => (prev ? { ...prev, period: next as CardRulePeriod } : null))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="전월 1일~말일">전월 1일~말일</SelectItem>
                      <SelectItem value="확인 필요">확인 필요</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">할인 거래 실적</span>
                  <Select value={conditionDraft.discountRule} onValueChange={(next) => setConditionDraft((prev) => (prev ? { ...prev, discountRule: next as CardRuleDiscount } : null))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="거래 전체 제외">거래 전체 제외</SelectItem>
                      <SelectItem value="할인액만 제외">할인액만 제외</SelectItem>
                      <SelectItem value="전액 인정">전액 인정</SelectItem>
                      <SelectItem value="확인 필요">확인 필요</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inspectingCard.kind === 'credit' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">할부 실적 반영</span>
                    <Select value={conditionDraft.installmentRule} onValueChange={(next) => setConditionDraft((prev) => (prev ? { ...prev, installmentRule: next as CardRuleInstallment } : null))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="첫 달 전체 승인금액">첫 달 전체 승인금액</SelectItem>
                        <SelectItem value="매월 납부금액">매월 납부금액</SelectItem>
                        <SelectItem value="확인 필요">확인 필요</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-xs font-bold text-foreground">실적 제외 항목</h3>
                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground break-keep">
                  {inspectingCard.exclusions.length > 0 ? inspectingCard.exclusions.join(', ') : '선택된 제외 항목 없음'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-foreground">혜택과 실적 단계</h3>
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {inspectingCard.tiers.map((tier, index) => (
                    <div key={tier.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                      <span className="font-semibold text-foreground tabular-nums">
                        {index + 1}단계 · {formatWon(tier.threshold)} 이상
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {tier.benefit} (월 한도 {tier.limitUnit === '점' ? `${tier.limit.toLocaleString('ko-KR')}점` : formatWon(tier.limit)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter sheetClassName="flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setConditionCardId(null)}>
                {isMobile ? '닫기' : '취소'}
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveConditions}>
                개인 조건 저장
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>
    </div>
  );
};
