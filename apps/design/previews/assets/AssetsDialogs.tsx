'use client';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  NoticeBox,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn
} from '@repo/ui-core';
import { ArrowRight } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';

import {
  ASSET_RECEIVABLES_BY_PERSON,
  BUDGET_REMAINING_BASELINE,
  formatQuantityWithUnit,
  getAssetCurrentValuation,
  getAssetExpectedTotals,
  getCounterpartyRoleLabel,
  getTotalUncollectedReceivables,
  type AssetDetailItem,
  type AssetValuationMode
} from '@/previews/assets/assets-model';
import { GOLD_UNIT_OPTIONS, getReferenceRateForUnit } from '@/previews/settings/settings-model';
import { MarketQuoteValuationFields, calculateQuoteValuation } from '@/shared/MarketQuoteValuationFields';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatSignedWon, formatWon } from '@/shared/design-format';

export type AssetBalanceSavePayload = {
  assetId: string;
  currentBalance: number;
  valuationMode?: AssetValuationMode;
  quantity?: number;
  unitLabel?: string;
  ratePerUnit?: number;
};

export const AssetBalanceEditDialog = ({
  open,
  onOpenChange,
  asset,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetailItem;
  onSave: (payload: AssetBalanceSavePayload) => void;
}) => {
  const quote = asset.marketQuote;
  const isDebt = asset.group === 'debt';

  const [quantityText, setQuantityText] = useState<string>(() => (quote ? String(quote.quantity) : ''));
  const [unitLabel, setUnitLabel] = useState<string>(() => quote?.unitLabel ?? '돈');
  const [manualAmount, setManualAmount] = useState<number | null>(() => getAssetCurrentValuation(asset));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ratePerUnit = quote?.assetKind === 'gold' ? getReferenceRateForUnit('gold', unitLabel) : (quote?.ratePerUnit ?? 0);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (quote) {
      const { isValid, quantity, computedKrw } = calculateQuoteValuation(quantityText, ratePerUnit);
      if (!isValid || computedKrw === null) {
        setErrorMessage(`0 이상의 보유량(${unitLabel})을 입력해 주세요.`);
        return;
      }
      setErrorMessage(null);
      onSave({
        assetId: asset.id,
        currentBalance: computedKrw,
        valuationMode: 'reference-rate',
        quantity,
        unitLabel,
        ratePerUnit
      });
      onOpenChange(false);
      return;
    }

    if (manualAmount === null || !Number.isSafeInteger(manualAmount) || manualAmount < 0) {
      setErrorMessage('0원 이상의 정수로 입력해 주세요.');
      return;
    }

    setErrorMessage(null);
    onSave({
      assetId: asset.id,
      currentBalance: manualAmount
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="break-keep">{asset.name}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-1 break-keep">
              <MemberAvatar name={asset.owner} size="xs" />
              {[asset.institution, asset.typeLabel].filter(Boolean).map((part) => (
                <span key={part}>· {part}</span>
              ))}
              {asset.counterparty ? (
                <span>
                  · {getCounterpartyRoleLabel(asset.group)} {asset.counterparty}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3.5 pt-4">
            {quote ? (
              <>
                {quote.assetKind === 'gold' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">단위</span>
                    <Select
                      value={unitLabel}
                      onValueChange={(next) => {
                        const currentQuantity = Number(quantityText.replace(/,/g, '').trim());
                        if (quantityText.trim() && Number.isFinite(currentQuantity)) {
                          const grams = unitLabel === '돈' ? currentQuantity * 3.75 : currentQuantity;
                          const converted = next === '돈' ? grams / 3.75 : grams;
                          setQuantityText(String(Number(converted.toPrecision(12))));
                        }
                        setUnitLabel(next);
                        if (errorMessage) setErrorMessage(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOLD_UNIT_OPTIONS.map((option) => (
                          <SelectItem key={option.unit} value={option.unit}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <MarketQuoteValuationFields
                  assetKind={quote.assetKind}
                  unitLabel={unitLabel}
                  ratePerUnit={ratePerUnit}
                  rateSource={quote.rateSource}
                  rateUpdatedAt={quote.rateUpdatedAt}
                  quantityText={quantityText}
                  invalid={Boolean(errorMessage)}
                  onQuantityTextChange={(next) => {
                    setQuantityText(next);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="asset-balance-input" className="text-xs font-semibold text-foreground">
                  {isDebt ? '남은 원금' : '현재 보유금액'}
                </label>
                <NumberInput
                  id="asset-balance-input"
                  size="md"
                  value={manualAmount}
                  onValueChange={(next) => {
                    setManualAmount(next);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  suffix="원"
                />
              </div>
            )}

            {errorMessage ? (
              <p role="alert" className="text-xs font-semibold text-destructive break-keep">
                {errorMessage}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-4 sm:flex sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const LivingBudgetDiffDialog = ({ open, onOpenChange, livingAssets }: { open: boolean; onOpenChange: (open: boolean) => void; livingAssets: readonly AssetDetailItem[] }) => {
  const livingActualTotal = livingAssets.reduce((sum, item) => sum + getAssetCurrentValuation(item), 0);
  const livingInflowTotal = livingAssets.reduce((sum, item) => sum + getAssetExpectedTotals(item).inflow, 0);
  const livingOutflowTotal = livingAssets.reduce((sum, item) => sum + getAssetExpectedTotals(item).outflow, 0);
  const projectedLivingTotal = livingActualTotal + livingInflowTotal - livingOutflowTotal;
  const diff = projectedLivingTotal - BUDGET_REMAINING_BASELINE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0">
        <DialogHeader>
          <DialogTitle>실계좌·가계부 차액</DialogTitle>
          <DialogDescription className="break-keep">미기입 내역이나 계좌 잔액 차이가 있으면 두 금액이 달라질 수 있어요.</DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3.5 pt-4">
          <div className="flex flex-col divide-y divide-border text-xs tabular-nums">
            <div className="flex flex-col gap-2.5 pb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">생활비 계좌·현금 예상 잔액</span>
                <span className="text-sm font-extrabold text-foreground">{formatWon(projectedLivingTotal)}</span>
              </div>
              <div className="ml-1 flex flex-col gap-2 border-l-2 border-border pl-3 text-[11px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">생활비 계좌 · 현금 ({livingAssets.length}건)</span>
                    <span className="font-bold text-foreground">{formatWon(livingActualTotal)}</span>
                  </div>
                  <div className="flex flex-col gap-1 pl-2 text-muted-foreground">
                    {livingAssets.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <MemberAvatar name={item.owner} mode="icon-hover" size="xs" className="shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="shrink-0 font-medium text-foreground">{formatWon(getAssetCurrentValuation(item))}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">입금 예정 (수입 예정 · 미회수)</span>
                  <span className="font-bold text-income">{formatSignedWon(livingInflowTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">출금 예정 (지불 준비 필요 · 지불 대기)</span>
                  <span className="font-bold text-expense">{formatSignedWon(-livingOutflowTotal)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 py-3">
              <span className="text-sm font-bold text-foreground">
                예산상 남은 생활비 <span className="text-xs font-medium text-muted-foreground">(11월 결산)</span>
              </span>
              <span className="text-sm font-extrabold text-foreground">{formatWon(BUDGET_REMAINING_BASELINE)}</span>
            </div>
            <div className="pt-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg bg-warning-tint/60 px-3.5 py-3">
                <span className="text-sm font-bold text-foreground">실계좌 − 예산 차액</span>
                <span className="ml-auto text-sm font-extrabold whitespace-nowrap text-warning">
                  {formatSignedWon(diff)}
                  {diff !== 0 ? <span className="ml-1 text-xs font-semibold">{diff > 0 ? '(많음)' : '(적음)'}</span> : null}
                </span>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="pt-4">
          <Button type="button" variant="primary" size="md" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AssetReceivablesDialog = ({ open, onOpenChange, onGoReceivables }: { open: boolean; onOpenChange: (open: boolean) => void; onGoReceivables: () => void }) => {
  const totalUncollected = getTotalUncollectedReceivables();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="gap-0">
        <DialogHeader>
          <DialogTitle>전체 미회수 금액</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3.5 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-positive-tint/45 px-4 py-3 tabular-nums">
            <span className="text-xs font-bold text-foreground">전체 미회수 합계</span>
            <span className="text-lg font-extrabold text-positive">{formatWon(totalUncollected)}</span>
          </div>

          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card text-xs">
            {ASSET_RECEIVABLES_BY_PERSON.map((item) => (
              <div key={item.person} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <MemberAvatar name={item.person} size="sm" labelClassName="font-bold text-foreground" />
                  <span className="text-[11px] text-muted-foreground tabular-nums">{item.count}건</span>
                </div>
                <span className="font-extrabold text-positive tabular-nums">{formatWon(item.amount)}</span>
              </div>
            ))}
          </div>

          <NoticeBox variant="info">미회수 금액은 현재 자산에는 포함되지 않고, 입금 예정 금액으로 분류돼 예상 잔액에 반영돼요.</NoticeBox>
        </DialogBody>

        <DialogFooter className="grid grid-cols-2 gap-2 pt-4 sm:flex sm:justify-end">
          <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              onOpenChange(false);
              onGoReceivables();
            }}
          >
            회수 관리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ExpectedFlowDetailDialog = ({
  open,
  onOpenChange,
  asset,
  onNavigate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetailItem;
  onNavigate: (path: '/preview/funds' | '/preview/receivables') => void;
}) => {
  const current = getAssetCurrentValuation(asset);
  const { inflow, outflow } = getAssetExpectedTotals(asset);
  const projected = current + inflow - outflow;
  const flows = asset.expectedFlows ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0">
        <DialogHeader>
          <DialogTitle className="break-keep">예정 입출금 내역({asset.name})</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1 break-keep">
            <MemberAvatar name={asset.owner} size="xs" />
            <span>· {asset.typeLabel}</span>
            {asset.marketQuote ? <span>· {formatQuantityWithUnit(asset.marketQuote)}</span> : null}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3.5 pt-4">
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/35 p-3 text-xs tabular-nums sm:grid sm:grid-cols-3 sm:gap-2 sm:text-center">
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:gap-0.5">
              <span className="text-[11px] text-muted-foreground">현재 보유금</span>
              <span className="font-bold whitespace-nowrap text-foreground">{formatWon(current)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:gap-0.5">
              <span className="text-[11px] text-muted-foreground">예정 순증감</span>
              <span className={cn('font-bold whitespace-nowrap', inflow - outflow < 0 ? 'text-destructive' : 'text-positive')}>{formatSignedWon(inflow - outflow)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-1.5 sm:flex-col sm:gap-0.5 sm:border-t-0 sm:pt-0">
              <span className="text-[11px] font-semibold text-primary sm:font-normal sm:text-muted-foreground">예상 잔액</span>
              <span className="font-extrabold whitespace-nowrap text-primary">{formatWon(projected)}</span>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {flows.map((flow) => (
              <div key={flow.id} className="flex items-center justify-between gap-2 px-3.5 py-3 text-xs">
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="font-bold text-foreground break-keep">{flow.label}</span>
                  <span className="text-[11px] text-muted-foreground break-keep">{flow.subLabel}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn('font-extrabold tabular-nums', flow.direction === 'inflow' ? 'text-income' : 'text-expense')}>
                    {formatSignedWon(flow.direction === 'inflow' ? flow.amount : -flow.amount)}
                  </span>
                  {flow.linkPath ? (
                    <button
                      type="button"
                      onClick={() => {
                        const target = flow.linkPath;
                        onOpenChange(false);
                        if (target) {
                          onNavigate(target);
                        }
                      }}
                      className="inline-flex cursor-pointer items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
                    >
                      <span>{flow.linkLabel ?? '내역 보기'}</span>
                      <ArrowRight className="size-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <NoticeBox variant="info">예정 입출금은 기존 지출·준비금·회수 기록에서 자동으로 집계돼요.</NoticeBox>
        </DialogBody>

        <DialogFooter className="pt-4">
          <Button type="button" variant="primary" size="md" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
