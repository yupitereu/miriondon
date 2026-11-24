'use client';

import {
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle
} from '@repo/ui-composition';
import { Badge, Button, Checkbox, Input, NoticeBox, NumberInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@repo/ui-core';
import { Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  CARD_CATALOG_PRODUCTS,
  CARD_EXCLUSION_GROUPS,
  CARD_ISSUER_OPTIONS,
  type CardProductTemplate,
  type CardRuleDiscount,
  type CardRuleInstallment,
  type CardRulePeriod,
  type CardTierConfig,
  type LedgerAssetRecord,
  type LedgerCardRecord
} from '@/previews/settings/settings-model';
import { showValidationAlert } from '@/shared/design-validation';

type EditableTierDraft = {
  id: string;
  threshold: number | null;
  benefit: string;
  limit: number | null;
  limitUnit: '원' | '점';
};

export const SettingsCardRegistrationOverlay = ({
  open,
  onOpenChange,
  owners,
  assets,
  onComplete
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: readonly string[];
  assets: readonly LedgerAssetRecord[];
  onComplete: (card: LedgerCardRecord) => void;
}) => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [issuer, setIssuer] = useState('');
  const [issuerOther, setIssuerOther] = useState('');
  const [query, setQuery] = useState('');
  const [searchDone, setSearchDone] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const [product, setProduct] = useState<CardProductTemplate | null>(null);
  const [period, setPeriod] = useState<CardRulePeriod>('전월 1일~말일');
  const [discountRule, setDiscountRule] = useState<CardRuleDiscount>('확인 필요');
  const [installmentRule, setInstallmentRule] = useState<CardRuleInstallment>('확인 필요');
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [customExclusions, setCustomExclusions] = useState<string[]>([]);
  const [customExclusionInput, setCustomExclusionInput] = useState('');
  const [tiers, setTiers] = useState<EditableTierDraft[]>([]);
  const [productMatched, setProductMatched] = useState(false);

  const [label, setLabel] = useState('');
  const [last4, setLast4] = useState('');
  const [owner, setOwner] = useState(owners[0] ?? '민지(나)');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [transferSourceAccountId, setTransferSourceAccountId] = useState('');
  const [dueDay, setDueDay] = useState('14');
  const [useDeferredTransit, setUseDeferredTransit] = useState(false);
  const [transitAccountId, setTransitAccountId] = useState('');
  const [transitDay, setTransitDay] = useState('10');
  const [easyChoice, setEasyChoice] = useState('');
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set());

  const resetAll = () => {
    setStep(0);
    setIssuer('');
    setIssuerOther('');
    setQuery('');
    setSearchDone(false);
    setAiDone(false);
    setProduct(null);
    setExclusions([]);
    setCustomExclusions([]);
    setCustomExclusionInput('');
    setTiers([]);
    setProductMatched(false);
    setLabel('');
    setLast4('');
    setOwner(owners[0] ?? '민지(나)');
    setPaymentAccountId('');
    setTransferSourceAccountId('');
    setDueDay('14');
    setUseDeferredTransit(false);
    setTransitAccountId('');
    setTransitDay('10');
    setEasyChoice('');
    setInvalidFields(new Set());
  };

  const clearInvalid = (fieldKey: string) => {
    setInvalidFields((prev) => {
      if (!prev.has(fieldKey)) return prev;
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });
  };

  const effectiveIssuer = issuer === '기타' ? issuerOther.trim() : issuer;
  const activeLiquidAccounts = assets.filter((item) => !item.inactive && item.group === 'cash-liquid' && !item.isDefaultCash);
  const ownerAccounts = activeLiquidAccounts.filter((item) => item.owner === owner);
  const selectableAccounts = ownerAccounts.length > 0 ? ownerAccounts : activeLiquidAccounts;

  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, '');
  const catalogMatches = CARD_CATALOG_PRODUCTS.filter((item) => {
    if (!effectiveIssuer) return false;
    if (issuer !== '기타' && item.issuer !== effectiveIssuer) return false;
    if (!searchDone || !normalizedQuery) return true;
    return `${item.name} ${item.issuer} ${item.kind === 'credit' ? '신용' : '체크'}`.toLowerCase().replace(/\s+/g, '').includes(normalizedQuery);
  });

  const handleSelectProduct = (selected: CardProductTemplate) => {
    const defaultOwner = owners[0] ?? '민지(나)';
    const candidateAccounts = activeLiquidAccounts.filter((item) => item.owner === defaultOwner);
    const defaultPool = candidateAccounts.length > 0 ? candidateAccounts : activeLiquidAccounts;
    const defaultPaymentAcc = defaultPool.find((item) => !item.includeInLivingBudget)?.id ?? defaultPool[0]?.id ?? '';
    const defaultTransferAcc = defaultPool.find((item) => item.includeInLivingBudget)?.id ?? defaultPaymentAcc;

    setProduct(selected);
    setPeriod(selected.period);
    setDiscountRule(selected.discountRule);
    setInstallmentRule(selected.installmentRule ?? '확인 필요');
    setExclusions([...selected.exclusions]);
    setCustomExclusions([]);
    setTiers(
      selected.tiers.map((tier, index) => ({
        id: `draft-tier-${index}`,
        threshold: tier.threshold,
        benefit: tier.benefit,
        limit: tier.limit,
        limitUnit: tier.limitUnit ?? '원'
      }))
    );
    setProductMatched(false);
    setLabel(selected.name);
    setOwner(defaultOwner);
    setPaymentAccountId(defaultPaymentAcc);
    setTransferSourceAccountId(defaultTransferAcc);
    setTransitAccountId(defaultPaymentAcc);
    setInvalidFields(new Set());
    setStep(1);
  };

  const handleSearchCatalog = () => {
    if (!issuer) {
      setInvalidFields(new Set(['issuer']));
      void showValidationAlert(['카드사를 먼저 선택해 주세요.'], '검색할 수 없어요');
      return;
    }
    if (issuer === '기타' && !issuerOther.trim()) {
      setInvalidFields(new Set(['issuerOther']));
      void showValidationAlert(['카드사 이름을 직접 입력해 주세요.'], '검색할 수 없어요');
      return;
    }
    setSearchDone(true);
    setAiDone(false);
  };

  const handleSearchAi = () => {
    if (!issuer || (issuer === '기타' && !issuerOther.trim())) {
      setInvalidFields(new Set([issuer ? 'issuerOther' : 'issuer']));
      void showValidationAlert(['카드사를 먼저 선택하거나 입력해 주세요.'], '탐색할 수 없어요');
      return;
    }
    if (!query.trim()) {
      setInvalidFields(new Set(['query']));
      void showValidationAlert(['AI로 찾을 카드 상품명을 입력해 주세요.'], '탐색할 수 없어요');
      return;
    }
    setSearchDone(true);
    setAiDone(true);
  };

  const handleAddCustomExclusion = () => {
    const value = customExclusionInput.trim();
    const existingAll = [...CARD_EXCLUSION_GROUPS.flatMap((group) => [...group.items]), ...customExclusions];
    if (!value || existingAll.includes(value)) {
      setInvalidFields(new Set(['customExclusion']));
      void showValidationAlert([value ? '이미 목록에 있는 항목이에요.' : '추가할 제외 항목을 입력해 주세요.'], '추가할 수 없어요');
      return;
    }
    setCustomExclusions((prev) => [...prev, value]);
    setExclusions((prev) => [...prev, value]);
    setCustomExclusionInput('');
    clearInvalid('customExclusion');
  };

  const handleConditionsNext = () => {
    const errors: string[] = [];
    const nextInvalid = new Set<string>();
    if (!productMatched) {
      errors.push('카드사·상품명·종류·버전이 내 카드와 일치하는지 확인해 주세요.');
    }
    for (let index = 0; index < tiers.length; index += 1) {
      const tier = tiers[index];
      if (!tier) continue;
      if (tier.threshold == null || !Number.isSafeInteger(tier.threshold) || tier.threshold < 0) {
        nextInvalid.add(`tier-threshold-${tier.id}`);
      }
      if (!tier.benefit.trim()) {
        nextInvalid.add(`tier-benefit-${tier.id}`);
      }
      if (tier.limit == null || !Number.isSafeInteger(tier.limit) || tier.limit < 0) {
        nextInvalid.add(`tier-limit-${tier.id}`);
      }
      if (index > 0 && (tier.threshold ?? 0) <= (tiers[index - 1]?.threshold ?? 0)) {
        nextInvalid.add(`tier-threshold-${tier.id}`);
      }
    }
    if (nextInvalid.size > 0) {
      errors.push('각 실적 단계의 기준 금액(오름차순), 혜택 내용, 월 한도를 입력해 주세요.');
    }
    if (errors.length > 0) {
      setInvalidFields(nextInvalid);
      void showValidationAlert(errors, '다음 단계로 갈 수 없어요');
      return;
    }
    setInvalidFields(new Set());
    setStep(2);
  };

  const handleSubmitCard = () => {
    if (!product) return;
    const errors: string[] = [];
    const nextInvalid = new Set<string>();
    const trimmedLabel = label.trim();
    const trimmedLast4 = last4.trim();

    if (!trimmedLabel) {
      nextInvalid.add('label');
      errors.push('카드 표시명을 입력해 주세요.');
    }
    if (!/^[0-9]{4}$/.test(trimmedLast4)) {
      nextInvalid.add('last4');
      errors.push('카드번호 마지막 4자리를 숫자 4자리로 입력해 주세요.');
    }
    if (!paymentAccountId) {
      nextInvalid.add('paymentAccountId');
      errors.push(product.kind === 'credit' ? '카드대금 결제 계좌를 선택해 주세요.' : '일반 결제 출금 계좌를 선택해 주세요.');
    }
    if (product.kind === 'credit') {
      if (!transferSourceAccountId) {
        nextInvalid.add('transferSourceAccountId');
        errors.push('준비금을 보낼 송금 계좌를 선택해 주세요.');
      }
      if (!dueDay) {
        nextInvalid.add('dueDay');
        errors.push('신용카드 결제일을 선택해 주세요.');
      }
    }
    if (useDeferredTransit && (!transitAccountId || !transitDay)) {
      if (!transitAccountId) nextInvalid.add('transitAccountId');
      if (!transitDay) nextInvalid.add('transitDay');
      errors.push('후불교통 출금 계좌와 출금일을 선택해 주세요.');
    }
    if (errors.length > 0) {
      setInvalidFields(nextInvalid);
      void showValidationAlert(errors);
      return;
    }

    const normalizedTiers: CardTierConfig[] = tiers.map((tier, index) => ({
      id: `tier-${Date.now()}-${index}`,
      threshold: tier.threshold ?? 0,
      benefit: tier.benefit.trim(),
      limit: tier.limit ?? 0,
      limitUnit: tier.limitUnit
    }));

    const isPersonalOverride =
      period !== product.period ||
      discountRule !== product.discountRule ||
      (product.kind === 'credit' && installmentRule !== (product.installmentRule ?? '확인 필요')) ||
      JSON.stringify([...exclusions].sort()) !== JSON.stringify([...product.exclusions].sort()) ||
      JSON.stringify(normalizedTiers.map(({ threshold, benefit, limit }) => ({ threshold, benefit, limit }))) !==
        JSON.stringify(product.tiers.map(({ threshold, benefit, limit }) => ({ threshold, benefit, limit })));

    const newCard: LedgerCardRecord = {
      id: `card-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      issuer: product.issuer,
      kind: product.kind,
      edition: product.edition,
      label: trimmedLabel,
      last4: trimmedLast4,
      owner,
      paymentAccountId,
      transferSourceAccountId: product.kind === 'credit' ? transferSourceAccountId : paymentAccountId,
      dueDay: product.kind === 'credit' ? dueDay : '',
      useDeferredTransit,
      transitAccountId: useDeferredTransit ? transitAccountId : '',
      transitDay: useDeferredTransit ? transitDay : '',
      easyChoice: product.easyChoiceRequired ? easyChoice || undefined : undefined,
      inactive: false,
      conditionSource: isPersonalOverride ? 'personal' : product.source,
      verifiedAt: product.verifiedAt.slice(5),
      period,
      discountRule,
      installmentRule: product.kind === 'credit' ? installmentRule : undefined,
      exclusions,
      customExclusions,
      tiers: normalizedTiers
    };

    onComplete(newCard);
    resetAll();
    onOpenChange(false);
  };

  const stepLabels = ['1. 카드 선택', '2. 조건 확인', '3. 내 카드 설정'] as const;

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetAll();
        onOpenChange(nextOpen);
      }}
    >
      <ResponsiveOverlayContent size="lg">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>카드 등록</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>공용 카드를 선택하거나 AI 탐색으로 조건을 확인해 등록해요.</ResponsiveOverlayDescription>
          <ol aria-label="카드 등록 단계" className="mt-2 grid grid-cols-3 gap-1.5">
            {stepLabels.map((stepLabel, index) => {
              const active = step === index;
              const completed = step > index;
              return (
                <li
                  key={stepLabel}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold tabular-nums sm:text-xs',
                    active ? 'border-primary bg-primary-tint text-primary' : completed ? 'border-positive/40 bg-positive-tint/60 text-positive' : 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  {stepLabel}
                </li>
              );
            })}
          </ol>
        </ResponsiveOverlayHeader>

        <ResponsiveOverlayBody sheetClassName="gap-4" dialogClassName="gap-4">
          {step === 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">카드사</span>
                  <Select
                    value={issuer}
                    onValueChange={(next) => {
                      setIssuer(next);
                      setSearchDone(false);
                      setAiDone(false);
                      clearInvalid('issuer');
                    }}
                  >
                    <SelectTrigger invalid={invalidFields.has('issuer')}>
                      <SelectValue placeholder="카드사를 선택해 주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_ISSUER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === '기타' ? '기타 카드사 (직접 입력)' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {issuer === '기타' ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-card-issuer-other" className="text-xs font-semibold text-foreground">
                      카드사 이름
                    </label>
                    <Input
                      id="reg-card-issuer-other"
                      placeholder="예: 카카오뱅크"
                      value={issuerOther}
                      invalid={invalidFields.has('issuerOther')}
                      onChange={(event) => {
                        setIssuerOther(event.target.value);
                        clearInvalid('issuerOther');
                      }}
                    />
                  </div>
                ) : null}

                <div className={cn('flex flex-col gap-1.5', issuer !== '기타' && 'sm:col-span-1')}>
                  <label htmlFor="reg-card-query" className="text-xs font-semibold text-foreground">
                    상품명
                  </label>
                  <Input
                    id="reg-card-query"
                    placeholder="예: Easy shopping, Deep Dream"
                    disabled={!issuer}
                    value={query}
                    invalid={invalidFields.has('query')}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      clearInvalid('query');
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="primary" size="md" disabled={!issuer} onClick={handleSearchCatalog}>
                  <Search className="size-4" /> 검색
                </Button>
                <Button type="button" variant="outline" size="md" disabled={!issuer} onClick={handleSearchAi}>
                  <Sparkles className="size-4" /> 목록에 없는 카드 AI로 찾기
                </Button>
              </div>

              {effectiveIssuer ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">{searchDone ? '검색 결과' : `${effectiveIssuer} 공용 상품`}</p>
                  {catalogMatches.length > 0 ? (
                    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                      {catalogMatches.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <strong className="text-sm text-foreground">{item.name}</strong>
                              <Badge variant={item.source === 'public-verified' ? 'positive' : 'warning'}>{item.source === 'public-verified' ? '공용 검수' : '공식 자료 · 검수 전'}</Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.issuer} · {item.kind === 'credit' ? '신용카드' : '체크카드'} · {item.edition}
                            </p>
                          </div>
                          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => handleSelectProduct(item)}>
                            선택
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-xs text-muted-foreground">
                      일치하는 공용 상품이 없어요. 상품명을 입력하고 AI로 찾아볼 수 있어요.
                    </p>
                  )}
                </div>
              ) : null}

              {aiDone && effectiveIssuer ? (
                <NoticeBox variant="info">
                  <p className="font-semibold text-foreground">AI 탐색 결과 (운영자 검수 전)</p>
                  <p className="mt-1 text-xs text-muted-foreground">실제 AI 호출 없이 작동하는 예시예요. 다음 화면에서 내 카드 조건과 일치하는지 확인해 주세요.</p>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {(['credit', 'debit'] as const).map((kind) => (
                      <div key={kind} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <span className="text-xs font-medium text-foreground">
                          {query.trim()} ({kind === 'credit' ? '신용카드' : '체크카드'} · {effectiveIssuer})
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleSelectProduct({
                              id: `ai-${kind}-${Date.now()}`,
                              name: query.trim(),
                              issuer: effectiveIssuer,
                              kind,
                              edition: '기본형',
                              source: 'ai-pending',
                              verifiedAt: '2026.11.24',
                              period: '전월 1일~말일',
                              discountRule: '확인 필요',
                              installmentRule: kind === 'credit' ? '확인 필요' : undefined,
                              exclusions: ['아파트 관리비', '국세 · 지방세 · 4대보험'],
                              tiers: [{ threshold: 300000, benefit: '예시 혜택 (확인 필요)', limit: 10000, limitUnit: '원' }]
                            })
                          }
                        >
                          확인
                        </Button>
                      </div>
                    ))}
                  </div>
                </NoticeBox>
              ) : null}
            </>
          ) : null}

          {step === 1 && product ? (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.issuer} · {product.kind === 'credit' ? '신용카드' : '체크카드'} · {product.edition}
                    </p>
                  </div>
                  <Badge variant={product.source === 'public-verified' ? 'positive' : 'warning'}>
                    {product.source === 'public-verified' ? '공용 검수 완료' : product.source === 'official-pending' ? '공식 자료 · 검수 전' : 'AI 탐색 · 검수 전'}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">확인일 {product.verifiedAt}</p>
              </div>

              <NoticeBox variant={product.source === 'public-verified' ? 'info' : 'warning'}>
                {product.source === 'public-verified'
                  ? '운영자가 확인한 공용 카드 조건이에요. 내 카드 설정에 맞춰 수정하면 개인 조건으로 저장돼요.'
                  : '미확정(확인 필요) 조건은 확정된 값처럼 계산하지 않고 결산에서 안내 표시를 유지해요.'}
              </NoticeBox>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">실적 산정 기간</span>
                  <Select value={period} onValueChange={(value) => setPeriod(value as CardRulePeriod)}>
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
                  <Select value={discountRule} onValueChange={(value) => setDiscountRule(value as CardRuleDiscount)}>
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
                {product.kind === 'credit' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">할부 실적 반영</span>
                    <Select value={installmentRule} onValueChange={(value) => setInstallmentRule(value as CardRuleInstallment)}>
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

              <div className="flex flex-col gap-2.5">
                <div>
                  <h3 className="text-sm font-bold text-foreground">실적 제외 항목</h3>
                  <p className="text-xs text-muted-foreground">체크한 항목은 카드 실적 계산에서 제외해요. 생활비 분류와는 별개예요.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {[...CARD_EXCLUSION_GROUPS, ...(customExclusions.length > 0 ? [{ group: '직접 추가', items: customExclusions }] : [])].map((group) => (
                    <div key={group.group} className="rounded-lg border border-border p-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">{group.group}</p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {group.items.map((item) => {
                          const checked = exclusions.includes(item);
                          return (
                            <Checkbox
                              key={item}
                              label={item}
                              checked={checked}
                              onCheckedChange={(nextChecked) => {
                                setExclusions((prev) => (nextChecked === true ? [...prev, item] : prev.filter((entry) => entry !== item)));
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="목록에 없는 제외 항목 직접 입력"
                    value={customExclusionInput}
                    invalid={invalidFields.has('customExclusion')}
                    onChange={(event) => {
                      setCustomExclusionInput(event.target.value);
                      clearInvalid('customExclusion');
                    }}
                  />
                  <Button type="button" variant="outline" size="md" className="shrink-0" onClick={handleAddCustomExclusion}>
                    추가
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">혜택과 실적 단계</h3>
                    <p className="text-xs text-muted-foreground">실적 기준은 낮은 금액부터 오름차순으로 입력해요.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTiers((prev) => [...prev, { id: `draft-tier-${Date.now()}`, threshold: null, benefit: '', limit: null, limitUnit: product.easyChoiceRequired ? '점' : '원' }])}
                  >
                    <Plus className="size-3.5" /> 단계 추가
                  </Button>
                </div>
                {tiers.map((tier, index) => (
                  <div key={tier.id} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{index + 1}단계</span>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setTiers((prev) => prev.filter((item) => item.id !== tier.id))}>
                        <Trash2 className="size-3.5" /> 삭제
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <NumberInput
                        size="md"
                        placeholder="실적 기준"
                        suffix="원"
                        value={tier.threshold}
                        invalid={invalidFields.has(`tier-threshold-${tier.id}`)}
                        onValueChange={(next) => {
                          setTiers((prev) => prev.map((item) => (item.id === tier.id ? { ...item, threshold: next } : item)));
                          clearInvalid(`tier-threshold-${tier.id}`);
                        }}
                      />
                      <Input
                        size="md"
                        placeholder="혜택 내용"
                        value={tier.benefit}
                        invalid={invalidFields.has(`tier-benefit-${tier.id}`)}
                        onChange={(event) => {
                          setTiers((prev) => prev.map((item) => (item.id === tier.id ? { ...item, benefit: event.target.value } : item)));
                          clearInvalid(`tier-benefit-${tier.id}`);
                        }}
                      />
                      <NumberInput
                        size="md"
                        placeholder="월 한도"
                        suffix={tier.limitUnit}
                        value={tier.limit}
                        invalid={invalidFields.has(`tier-limit-${tier.id}`)}
                        onValueChange={(next) => {
                          setTiers((prev) => prev.map((item) => (item.id === tier.id ? { ...item, limit: next } : item)));
                          clearInvalid(`tier-limit-${tier.id}`);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Checkbox label="카드사·상품명·종류·버전이 내 카드와 일치해요." checked={productMatched} onCheckedChange={(checked) => setProductMatched(checked === true)} />
            </>
          ) : null}

          {step === 2 && product ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.issuer} · {product.kind === 'credit' ? '신용카드' : '체크카드'}
                  </p>
                </div>
                <Badge variant={product.source === 'public-verified' ? 'positive' : 'warning'}>{product.source === 'public-verified' ? '공용 조건' : '검수 전 조건'}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-card-label" className="text-xs font-semibold text-foreground">
                    카드 표시명
                  </label>
                  <Input
                    id="reg-card-label"
                    value={label}
                    invalid={invalidFields.has('label')}
                    onChange={(event) => {
                      setLabel(event.target.value);
                      clearInvalid('label');
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-card-last4" className="text-xs font-semibold text-foreground">
                    카드번호 마지막 4자리 (필수)
                  </label>
                  <Input
                    id="reg-card-last4"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="예: 0012"
                    className="tabular-nums"
                    value={last4}
                    invalid={invalidFields.has('last4')}
                    onChange={(event) => {
                      setLast4(event.target.value.replace(/\D/g, '').slice(0, 4));
                      clearInvalid('last4');
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">소유자</span>
                  <Select
                    value={owner}
                    onValueChange={(nextOwner) => {
                      setOwner(nextOwner);
                      const pool = activeLiquidAccounts.filter((item) => item.owner === nextOwner);
                      const fallback = pool.length > 0 ? pool : activeLiquidAccounts;
                      const nextPay = fallback[0]?.id ?? '';
                      setPaymentAccountId(nextPay);
                      setTransferSourceAccountId(fallback.find((item) => item.includeInLivingBudget)?.id ?? nextPay);
                      setTransitAccountId(nextPay);
                    }}
                  >
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
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{product.kind === 'credit' ? '결제 계좌 (청구 출금)' : '일반 결제 출금 계좌'}</span>
                  <Select
                    value={paymentAccountId}
                    onValueChange={(next) => {
                      setPaymentAccountId(next);
                      clearInvalid('paymentAccountId');
                    }}
                  >
                    <SelectTrigger invalid={invalidFields.has('paymentAccountId')}>
                      <SelectValue placeholder="계좌 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.typeLabel})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {product.kind === 'credit' ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-foreground">송금 계좌 (준비금 출발)</span>
                      <Select
                        value={transferSourceAccountId}
                        onValueChange={(next) => {
                          setTransferSourceAccountId(next);
                          clearInvalid('transferSourceAccountId');
                        }}
                      >
                        <SelectTrigger invalid={invalidFields.has('transferSourceAccountId')}>
                          <SelectValue placeholder="계좌 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectableAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.typeLabel})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-foreground">결제일</span>
                      <Select
                        value={dueDay}
                        onValueChange={(next) => {
                          setDueDay(next);
                          clearInvalid('dueDay');
                        }}
                      >
                        <SelectTrigger invalid={invalidFields.has('dueDay')}>
                          <SelectValue placeholder="결제일 선택" />
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

                {product.easyChoiceRequired ? (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-xs font-semibold text-foreground">선택서비스 (KB국민 Easy shopping)</span>
                    <Select value={easyChoice || 'none'} onValueChange={(next) => setEasyChoice(next === 'none' ? '' : next)}>
                      <SelectTrigger>
                        <SelectValue placeholder="나중에 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">나중에 선택</SelectItem>
                        <SelectItem value="아파트 관리비">아파트 관리비</SelectItem>
                        <SelectItem value="편의점">편의점</SelectItem>
                        <SelectItem value="배달앱">배달앱</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <Checkbox label="후불교통 기능 사용" checked={useDeferredTransit} onCheckedChange={(checked) => setUseDeferredTransit(checked === true)} />

              {useDeferredTransit ? (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">후불교통 출금 계좌</span>
                    <Select
                      value={transitAccountId}
                      onValueChange={(next) => {
                        setTransitAccountId(next);
                        clearInvalid('transitAccountId');
                      }}
                    >
                      <SelectTrigger invalid={invalidFields.has('transitAccountId')}>
                        <SelectValue placeholder="계좌 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableAccounts.map((acc) => (
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
                      value={transitDay}
                      onValueChange={(next) => {
                        setTransitDay(next);
                        clearInvalid('transitDay');
                      }}
                    >
                      <SelectTrigger invalid={invalidFields.has('transitDay')}>
                        <SelectValue placeholder="출금일 선택" />
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

              <NoticeBox variant="info">
                {product.kind === 'credit'
                  ? '결제 계좌와 송금 계좌가 같으면 지불 대기, 다르면 지불 준비 필요 상태로 자동 제안해요. 전체 카드번호·유효기간·CVC는 입력받지 않아요.'
                  : '체크카드 일반 결제는 연결 계좌에서 바로 출금되며 별도 준비 대상에 잡히지 않아요. 전체 카드번호·유효기간·CVC는 입력받지 않아요.'}
              </NoticeBox>
            </>
          ) : null}
        </ResponsiveOverlayBody>

        <ResponsiveOverlayFooter sheetClassName="flex-wrap gap-2">
          {step === 0 ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep((prev) => (prev === 2 ? 1 : 0))}>
                이전
              </Button>
              {step === 1 ? (
                <Button type="button" variant="primary" onClick={handleConditionsNext}>
                  내 카드 설정
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={handleSubmitCard}>
                  등록
                </Button>
              )}
            </>
          )}
        </ResponsiveOverlayFooter>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
};
