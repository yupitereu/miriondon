'use client';

import { DatePicker, dialog } from '@repo/ui-composition';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  NoticeBox,
  NumberInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useIsMobileView
} from '@repo/ui-core';
import { ArrowLeft, CircleHelp, Plus, Sparkles, X } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';

import { formatWon } from '@/shared/design-format';
import { ExpenseAiAssist } from '@/shared/expense-form/ExpenseAiAssist';
import {
  ACTUAL_USERS,
  CATEGORIES,
  DEPOSIT_ACCOUNTS,
  PAYMENT_METHOD_ITEMS,
  RECOVERY_PEOPLE,
  computeExpensePreview,
  createEmptyExpensePreset,
  createInstallmentPreset,
  createLumpSumSplitPreset,
  createValidationAndLockPreset,
  getDefaultPaymentStatusForMethod,
  getDefaultTransferSourceAccountForMethod,
  formatInstallmentTypeLabel,
  getPaymentMethodMeta,
  isCompletedEditLocked,
  isCreditCardMethod,
  syncSingleSplitDraft,
  validateExpenseDraft,
  withAutoInstallmentPrincipal,
  type ExpenseCategorySplit,
  type ExpenseDraft,
  type ExpenseRecoveryItem,
  type InstallmentType,
  type PaymentPlan,
  type PaymentStatus
} from '@/shared/expense-form/expense-form-model';

export {
  computeExpensePreview,
  createEmptyExpensePreset,
  createInstallmentPreset,
  createLumpSumSplitPreset,
  type ExpenseCategorySplit,
  type ExpenseDraft,
  type ExpenseRecoveryItem,
  type InstallmentType,
  type PaymentPlan,
  type PaymentStatus
};

const CUSTOM_RECOVERY_PERSON = '__custom__';

type ExpenseFormFieldsProps = {
  draft: ExpenseDraft;
  onChange: (next: ExpenseDraft) => void;
  idPrefix?: string;
  onOpenAi?: () => void;
  aiAppliedNotice?: string | null;
  showValidationErrors?: boolean;
};

export const ExpenseFormFields = ({ draft, onChange, idPrefix = 'expense-form', onOpenAi, aiAppliedNotice, showValidationErrors = false }: ExpenseFormFieldsProps) => {
  const metrics = computeExpensePreview(draft);
  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);
  const doneLocked = isCompletedEditLocked(draft);
  const laterRoundLocked = !doneLocked && draft.mode === 'edit' && draft.paymentPlan === 'installment' && (draft.initialInstallmentRound ?? draft.installmentRound ?? 1) >= 2;
  const siblingRoundsLocked = !doneLocked && draft.mode === 'edit' && draft.paymentPlan === 'installment' && Boolean(draft.hasLockedSiblingRounds);
  const baseFieldsLocked = doneLocked || laterRoundLocked || siblingRoundsLocked;
  const recoveryLockedByInstallment = draft.paymentPlan === 'installment' && (draft.initialInstallmentRound ?? draft.installmentRound ?? 1) >= 2;
  const installmentAllowed = isCreditCardMethod(methodMeta);
  const validationErrors = validateExpenseDraft(draft);

  const handleAddSplit = () => {
    const expectedTotal = draft.paymentPlan === 'installment' ? metrics.installmentRoundTotal : metrics.approved;
    const allocated = draft.splits.reduce((sum, row) => sum + Math.max(0, row.amount ?? 0), 0);
    const remaining = Math.max(0, expectedTotal - allocated);
    const usedCategories = new Set(draft.splits.map((row) => row.category));
    const nextCategory = CATEGORIES.find((category) => !usedCategories.has(category)) ?? '기타';

    onChange({
      ...draft,
      splits: [
        ...draft.splits,
        {
          id: `split-${Date.now()}-${draft.splits.length + 1}`,
          category: nextCategory,
          amount: remaining > 0 ? remaining : null,
          discount: 0
        }
      ]
    });
  };

  const handleDistributeDiscount = () => {
    const totalSplitAmount = draft.splits.reduce((sum, row) => sum + Math.max(0, row.amount ?? 0), 0);
    if (totalSplitAmount <= 0 || metrics.discount <= 0) {
      return;
    }

    let distributedSoFar = 0;
    const nextSplits = draft.splits.map((row, index) => {
      if (index === draft.splits.length - 1) {
        return { ...row, discount: Math.max(0, metrics.discount - distributedSoFar) };
      }
      const share = Math.round((Math.max(0, row.amount ?? 0) / totalSplitAmount) * metrics.discount);
      distributedSoFar += share;
      return { ...row, discount: share };
    });

    onChange({ ...draft, splits: nextSplits });
  };

  const handlePaymentMethodChange = (nextMethod: string) => {
    const nextMeta = getPaymentMethodMeta(nextMethod);
    const shouldForceLumpSum = !isCreditCardMethod(nextMeta) && draft.paymentPlan === 'installment';
    const nextStatus = draft.mode === 'create' ? getDefaultPaymentStatusForMethod(nextMeta, draft.viewedMonth) : draft.paymentStatus;
    const needsConditionalTransferSource = (nextMeta.kind === 'account' || nextMeta.kind === 'cash') && nextStatus === '준비 필요';
    const nextDraft: ExpenseDraft = {
      ...draft,
      paymentMethod: nextMethod,
      actualUser: nextMeta.owner,
      paymentPlan: shouldForceLumpSum ? 'lump-sum' : draft.paymentPlan,
      paymentStatus: nextStatus,
      transferSourceAccount: needsConditionalTransferSource ? getDefaultTransferSourceAccountForMethod(nextMeta) : undefined
    };
    onChange(syncSingleSplitDraft(nextDraft));
  };

  const handleSelectPlan = (plan: PaymentPlan) => {
    if (plan === draft.paymentPlan || (plan === 'installment' && !installmentAllowed)) {
      return;
    }

    if (plan === 'installment') {
      const months = Math.max(2, Math.min(36, draft.installmentMonths ?? 3));
      onChange(
        withAutoInstallmentPrincipal(draft, {
          ...draft,
          paymentPlan: 'installment',
          installmentMonths: months,
          installmentRound: draft.installmentRound ?? 1
        })
      );
      return;
    }

    onChange(syncSingleSplitDraft({ ...draft, paymentPlan: 'lump-sum' }));
  };

  const handleAddRecovery = () => {
    onChange({
      ...draft,
      recoveries: [
        ...draft.recoveries,
        {
          id: `rec-${Date.now()}-${draft.recoveries.length + 1}`,
          person: RECOVERY_PEOPLE[draft.recoveries.length % RECOVERY_PEOPLE.length] ?? '박대리 (미참여)',
          targetAmount: metrics.actualPaid > 0 ? Math.round(metrics.actualPaid / 2) : null,
          receivedAmount: 0,
          depositAccount: '신한 쏠편한 입출금'
        }
      ]
    });
  };

  const splitSum = draft.splits.reduce((sum, row) => sum + Math.max(0, row.amount ?? 0), 0);
  const splitExpected = draft.paymentPlan === 'installment' ? metrics.installmentRoundTotal : metrics.approved;
  const splitDiff = splitExpected - splitSum;

  return (
    <div className="flex flex-col gap-3.5">
      {doneLocked ? (
        <NoticeBox variant="warning" className="text-xs">
          지불 완료된 거래는 결제 수단·결제 금액·할인을 바로 고칠 수 없어요. 수정이 필요하면 아래 지불 상태를 &apos;지불 대기&apos; 또는 &apos;준비 필요&apos;로 먼저 변경해 저장하세요.
        </NoticeBox>
      ) : null}

      {aiAppliedNotice ? (
        <NoticeBox variant="info" className="text-xs">
          {aiAppliedNotice}
        </NoticeBox>
      ) : null}

      {/* Section 1: 지출 정보 */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">지출 정보</h3>
          {onOpenAi ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenAi} className="gap-1 px-2.5 text-xs">
              <Sparkles className="size-3.5 text-primary" />
              <span>AI로 초안 작성</span>
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-merchant`} className="text-xs font-semibold text-foreground">
              사용처 <span className="text-primary">*</span>
            </label>
            <Input id={`${idPrefix}-merchant`} value={draft.merchant} onChange={(event) => onChange({ ...draft, merchant: event.target.value })} placeholder="예: 강남역 점심 회식" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-memo`} className="text-xs font-semibold text-foreground">
              상세내역 (선택)
            </label>
            <Input id={`${idPrefix}-memo`} value={draft.memo} onChange={(event) => onChange({ ...draft, memo: event.target.value })} placeholder="예: 팀 점심 회식 · 2인 정산" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              거래일 <span className="text-primary">*</span>
            </span>
            <DatePicker value={draft.transactionDate} onChange={(date) => onChange({ ...draft, transactionDate: date })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              결제 수단 <span className="text-primary">*</span>
            </span>
            <Select value={draft.paymentMethod} disabled={baseFieldsLocked} onValueChange={handlePaymentMethodChange}>
              <SelectTrigger aria-label="결제 수단">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_ITEMS.map((method) => (
                  <SelectItem key={method.label} value={method.label}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex min-h-5 items-center">
              <span className="text-xs font-semibold text-foreground">실사용자</span>
            </div>
            <Select value={draft.actualUser} onValueChange={(value) => onChange({ ...draft, actualUser: value })}>
              <SelectTrigger aria-label="실사용자">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTUAL_USERS.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-foreground">지불 상태</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="지불 상태 안내"
                    className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  >
                    <CircleHelp className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="z-[60] w-72 max-w-[calc(100vw-2rem)] p-3 text-xs">
                  <p className="mb-2 font-bold text-foreground">지불 상태 안내</p>
                  <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground break-keep">
                    <li>
                      <strong className="text-foreground">준비 필요</strong>: 지불할 돈을 아직 결제 계좌에 준비하지 않은 상태예요.
                    </li>
                    <li>
                      <strong className="text-foreground">지불 대기</strong>: 결제 계좌나 현금에 금액을 채워 두고 실제 지불을 기다리는 상태예요.
                    </li>
                    <li>
                      <strong className="text-foreground">지불 완료</strong>: 카드대금 납부·상대방 송금·현금 지급이 모두 끝난 상태예요.
                    </li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
            <Select
              value={draft.paymentStatus}
              onValueChange={(value) => {
                const nextStatus = value as PaymentStatus;
                const needsTransferSource = (methodMeta.kind === 'account' || methodMeta.kind === 'cash') && nextStatus === '준비 필요';
                onChange({
                  ...draft,
                  paymentStatus: nextStatus,
                  transferSourceAccount: needsTransferSource ? (draft.transferSourceAccount ?? getDefaultTransferSourceAccountForMethod(methodMeta)) : undefined
                });
              }}
            >
              <SelectTrigger aria-label="지불 상태">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="준비 필요">준비 필요</SelectItem>
                <SelectItem value="지불 대기">지불 대기</SelectItem>
                <SelectItem value="지불 완료">지불 완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(methodMeta.kind === 'account' || methodMeta.kind === 'cash') && draft.paymentStatus === '준비 필요' ? (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/35 p-3">
            <label htmlFor={`${idPrefix}-transfer-source`} className="text-xs font-semibold text-foreground">
              송금 계좌 <span className="font-normal text-muted-foreground">(준비할 돈을 보낼 계좌)</span>
            </label>
            <Select value={draft.transferSourceAccount ?? getDefaultTransferSourceAccountForMethod(methodMeta)} onValueChange={(value) => onChange({ ...draft, transferSourceAccount: value })}>
              <SelectTrigger id={`${idPrefix}-transfer-source`} aria-label="송금 계좌">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPOSIT_ACCOUNTS.map((account) => (
                  <SelectItem key={account} value={account}>
                    {account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground break-keep">
              준비 필요 금액은 선택한 송금 계좌의 예상 잔액에 출금 예정으로 반영되며, 지불 관리에서 준비 처리 시 기본 송금 계좌로 제안돼요.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-approved`} className="text-xs font-semibold text-foreground">
              결제 금액 (할인 전) <span className="text-primary">*</span>
            </label>
            <NumberInput
              id={`${idPrefix}-approved`}
              value={draft.approvedAmount}
              disabled={baseFieldsLocked}
              onValueChange={(value) => onChange(withAutoInstallmentPrincipal(draft, { ...draft, approvedAmount: value }))}
              suffix="원"
              placeholder="0"
              className="border-primary/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-discount`} className="text-xs font-semibold text-foreground">
              할인 금액
            </label>
            <NumberInput
              id={`${idPrefix}-discount`}
              value={draft.cardDiscount}
              disabled={baseFieldsLocked}
              onValueChange={(value) => onChange(withAutoInstallmentPrincipal(draft, { ...draft, cardDiscount: value }))}
              suffix="원"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary-tint px-3.5 py-2.5">
          <span className="text-xs font-semibold text-foreground">실결제액</span>
          <span className="text-base font-extrabold text-primary tabular-nums">{formatWon(metrics.actualPaid)}</span>
        </div>

        {installmentAllowed ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground">납부방식</span>
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  disabled={baseFieldsLocked}
                  onClick={() => handleSelectPlan('lump-sum')}
                  className={cn(
                    'min-h-control-sm rounded-md text-xs font-bold transition-colors disabled:opacity-60',
                    draft.paymentPlan === 'lump-sum' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  일시불
                </button>
                <button
                  type="button"
                  disabled={baseFieldsLocked}
                  onClick={() => handleSelectPlan('installment')}
                  className={cn(
                    'min-h-control-sm rounded-md text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                    draft.paymentPlan === 'installment' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  할부
                </button>
              </div>
            </div>

            {draft.paymentPlan === 'installment' ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/35 p-3">
                {siblingRoundsLocked || laterRoundLocked ? (
                  <NoticeBox variant="info" className="text-xs">
                    {siblingRoundsLocked
                      ? '지불 대기·지불 완료된 다른 회차가 있어 결제 수단·결제 금액·할인·납부방식·개월 수·회차는 잠겨 있어요. 할부 유형과 남은 회차의 납부원금·수수료는 수정할 수 있어요.'
                      : '2회차 이후 회차는 원거래 기준(결제 수단·결제 금액·할인·납부방식·개월 수·회차)을 변경할 수 없어요. 할부 유형과 납부원금·수수료는 수정할 수 있어요.'}
                  </NoticeBox>
                ) : null}

                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <div className="col-span-2 flex flex-col gap-1 md:col-span-1">
                    <span className="text-xs font-semibold text-foreground">할부 유형</span>
                    <Select
                      value={draft.installmentType}
                      disabled={doneLocked}
                      onValueChange={(value) => {
                        const nextType = value as InstallmentType;
                        onChange(
                          withAutoInstallmentPrincipal(draft, {
                            ...draft,
                            installmentType: nextType,
                            installmentFee: nextType === 'interest-free' ? 0 : draft.installmentFee
                          })
                        );
                      }}
                    >
                      <SelectTrigger aria-label="할부 유형">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interest-free">무이자</SelectItem>
                        <SelectItem value="interest">유이자 · 부분 무이자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${idPrefix}-inst-months`} className="text-xs font-semibold text-foreground">
                      개월 수 (2~36)
                    </label>
                    <NumberInput
                      id={`${idPrefix}-inst-months`}
                      value={draft.installmentMonths}
                      disabled={baseFieldsLocked}
                      onValueChange={(value) => onChange(withAutoInstallmentPrincipal(draft, { ...draft, installmentMonths: value }))}
                      suffix="개월"
                      placeholder="3"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${idPrefix}-inst-round`} className="text-xs font-semibold text-foreground">
                      이번 회차
                    </label>
                    <NumberInput
                      id={`${idPrefix}-inst-round`}
                      value={draft.installmentRound}
                      disabled={baseFieldsLocked}
                      onValueChange={(value) => onChange(withAutoInstallmentPrincipal(draft, { ...draft, installmentRound: value }))}
                      suffix="회차"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`${idPrefix}-inst-principal`} className="text-xs font-semibold text-foreground">
                        이번 회차 납부원금
                      </label>
                      {!doneLocked && metrics.recommendedPrincipal > 0 && (draft.installmentPrincipal ?? null) !== metrics.recommendedPrincipal ? (
                        <button
                          type="button"
                          onClick={() => onChange(syncSingleSplitDraft({ ...draft, installmentPrincipal: metrics.recommendedPrincipal }))}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          균등 분할 ({formatWon(metrics.recommendedPrincipal)})
                        </button>
                      ) : null}
                    </div>
                    <NumberInput
                      id={`${idPrefix}-inst-principal`}
                      value={draft.installmentPrincipal}
                      disabled={doneLocked}
                      onValueChange={(value) => onChange(syncSingleSplitDraft({ ...draft, installmentPrincipal: value }))}
                      suffix="원"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${idPrefix}-inst-fee`} className="text-xs font-semibold text-foreground">
                      이자·수수료
                    </label>
                    <NumberInput
                      id={`${idPrefix}-inst-fee`}
                      value={draft.installmentType === 'interest-free' ? 0 : draft.installmentFee}
                      disabled={doneLocked || draft.installmentType === 'interest-free'}
                      onValueChange={(value) => onChange(syncSingleSplitDraft({ ...draft, installmentFee: value }))}
                      suffix="원"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary-tint px-3 py-2">
                  <span className="text-xs font-semibold text-foreground">이번 회차 총 납부액 ({draft.installmentType === 'interest-free' ? '무이자 · 수정 가능' : '원금+이자 합계'})</span>
                  <span className="text-sm font-extrabold text-primary tabular-nums">{formatWon(metrics.installmentRoundTotal)}</span>
                </div>

                <p className="text-[11px] leading-relaxed text-muted-foreground break-keep tabular-nums">
                  총 승인 {formatWon(metrics.approved)} 중 {formatInstallmentTypeLabel(draft.installmentType)} {metrics.round}/{metrics.months}회차(
                  {formatWon(metrics.installmentRoundTotal)})가 이번 달 생활비에 반영돼요.
                  {draft.installmentType === 'interest-free' && metrics.round === 1 && metrics.interestFreeRemainder > 0 && metrics.principal === metrics.recommendedPrincipal
                    ? ` (원 단위 나머지 ${formatWon(metrics.interestFreeRemainder)} 첫 회차 포함)`
                    : ''}
                </p>

                {metrics.principal > metrics.availablePrincipalBalance ? (
                  <p className="text-[11px] font-semibold text-destructive break-keep tabular-nums">
                    이번 회차 납부원금이 남은 원금 잔액({formatWon(metrics.availablePrincipalBalance)})을 초과했어요.
                  </p>
                ) : metrics.remainingAfterCurrentCount > 0 && metrics.principal > 0 ? (
                  <p className="text-[11px] text-primary break-keep tabular-nums">
                    저장 시 남은 {metrics.remainingAfterCurrentCount}개 회차 납부원금이 월 {formatWon(metrics.nextRemainingPrincipalPerMonth)}
                    {metrics.nextRemainingRemainder > 0 ? ` (다음 회차 +${formatWon(metrics.nextRemainingRemainder)})` : ''} · 잔여 원금 {formatWon(metrics.remainingAfterCurrentBalance)}으로
                    재계산돼요.
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {/* 지출 분류 */}
        {(() => {
          const hasMultiSplits = draft.splits.length > 1;
          const splitGridColsClass = hasMultiSplits
            ? 'min-[360px]:grid-cols-[minmax(64px,0.8fr)_minmax(0,1.2fr)_minmax(0,1.05fr)_22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_28px]'
            : 'min-[360px]:grid-cols-[minmax(64px,0.8fr)_minmax(0,1.2fr)_minmax(0,1.05fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]';

          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  지출 분류 <span className="text-primary">*</span>
                </span>
                <Button type="button" variant="outline" size="sm" disabled={doneLocked} onClick={handleAddSplit} className="gap-1">
                  <Plus className="size-3.5" />
                  <span>분류 추가</span>
                </Button>
              </div>

              <div className={cn('hidden gap-1 px-0.5 text-[11px] font-medium text-muted-foreground min-[360px]:grid md:gap-1.5', splitGridColsClass)}>
                <span>분류</span>
                <span className="md:hidden">금액</span>
                <span className="hidden md:inline">금액 (할인 전)</span>
                <span className="md:hidden">할인</span>
                <span className="hidden md:inline">할인 금액</span>
                {hasMultiSplits ? <span className="sr-only">삭제</span> : null}
              </div>

              <div className="flex flex-col gap-2">
                {draft.splits.map((split, index) => (
                  <div
                    key={split.id}
                    className={cn(
                      'grid grid-cols-2 items-center gap-1 rounded-lg border border-border/70 p-2 min-[360px]:rounded-none min-[360px]:border-0 min-[360px]:p-0 md:gap-1.5',
                      splitGridColsClass
                    )}
                  >
                    <div className="col-span-2 flex items-center gap-1.5 min-[360px]:contents">
                      <Select
                        value={split.category || undefined}
                        onValueChange={(val) =>
                          onChange({
                            ...draft,
                            splits: draft.splits.map((row) => (row.id === split.id ? { ...row, category: val } : row))
                          })
                        }
                      >
                        <SelectTrigger size="md" wrapperClassName="min-w-0 flex-1" aria-label={`분류 ${index + 1}`} className="px-2 text-xs md:px-3 md:text-sm">
                          <SelectValue placeholder="분류 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {hasMultiSplits ? (
                        <button
                          type="button"
                          aria-label="분류 행 삭제"
                          disabled={doneLocked}
                          onClick={() => {
                            const remaining = draft.splits.filter((row) => row.id !== split.id);
                            onChange(syncSingleSplitDraft({ ...draft, splits: remaining }));
                          }}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 min-[360px]:order-last"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>

                    <NumberInput
                      aria-label={`분류 금액 ${index + 1}`}
                      value={split.amount}
                      disabled={doneLocked}
                      onValueChange={(value) =>
                        onChange({
                          ...draft,
                          splits: draft.splits.map((row) => (row.id === split.id ? { ...row, amount: value } : row))
                        })
                      }
                      suffix="원"
                      placeholder="0"
                      className="px-2 text-xs md:px-3 md:text-sm"
                    />

                    <NumberInput
                      aria-label={`분류 할인 ${index + 1}`}
                      value={draft.paymentPlan === 'installment' ? 0 : split.discount}
                      disabled={doneLocked || draft.paymentPlan === 'installment'}
                      onValueChange={(value) =>
                        onChange({
                          ...draft,
                          splits: draft.splits.map((row) => (row.id === split.id ? { ...row, discount: value } : row))
                        })
                      }
                      suffix="원"
                      placeholder="0"
                      className="px-2 text-xs md:px-3 md:text-sm"
                    />
                  </div>
                ))}
              </div>

              {hasMultiSplits && (splitExpected > 0 || draft.paymentPlan !== 'installment') ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  {splitExpected > 0 ? (
                    <span className={cn('text-[11px] font-medium tabular-nums', splitDiff === 0 ? 'text-muted-foreground' : 'text-destructive')}>
                      {splitDiff === 0 ? '합계 일치' : `기준 대비 ${formatWon(Math.abs(splitDiff))} 차이`}
                    </span>
                  ) : (
                    <span />
                  )}
                  {draft.paymentPlan !== 'installment' ? (
                    <Button type="button" variant="secondary" size="sm" disabled={doneLocked || metrics.discount <= 0} onClick={handleDistributeDiscount}>
                      할인 자동 배분
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })()}

        {methodMeta.kind === 'card' ? (
          <div className="pt-0.5">
            <Checkbox
              id={`${idPrefix}-card-perf`}
              checked={draft.includeInCardPerformance}
              onCheckedChange={(checked) => onChange({ ...draft, includeInCardPerformance: checked === true })}
              wrapperClassName="min-h-8"
              label={<span className="text-xs font-semibold text-foreground">카드 이용 실적에 반영</span>}
            />
          </div>
        ) : null}
      </section>

      {/* Section 2: 회수 금액 (받을 돈) */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">회수 금액 (받을 돈)</h3>
          {recoveryLockedByInstallment ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex shrink-0 cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                  <Button type="button" variant="outline" size="sm" disabled className="gap-1">
                    <Plus className="size-3.5" />
                    <span>회수 상대 추가</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="end">
                할부 거래의 회수 금액은 1회차(승인월)에서만 연결할 수 있어요.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={handleAddRecovery} className="gap-1">
              <Plus className="size-3.5" />
              <span>회수 상대 추가</span>
            </Button>
          )}
        </div>

        {draft.recoveries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
            {recoveryLockedByInstallment ? '할부 회수 금액은 1회차(승인월) 거래에서만 기록할 수 있어요.' : '함께 결제하고 나눠 받을 금액이 있으면 `+ 회수 상대 추가`로 기록할 수 있어요.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {draft.recoveries.map((rec, index) => {
              const isCustomPerson = Boolean(rec.isCustomPerson) || (rec.person.trim().length > 0 && !(RECOVERY_PEOPLE as readonly string[]).includes(rec.person));

              return (
                <div key={rec.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <Select
                          value={isCustomPerson ? CUSTOM_RECOVERY_PERSON : rec.person}
                          onValueChange={(value) => {
                            const nextIsCustom = value === CUSTOM_RECOVERY_PERSON;
                            onChange({
                              ...draft,
                              recoveries: draft.recoveries.map((item) =>
                                item.id === rec.id ? { ...item, isCustomPerson: nextIsCustom, person: nextIsCustom ? (isCustomPerson ? item.person : '') : value } : item
                              )
                            });
                          }}
                        >
                          <SelectTrigger aria-label={`회수 상대 ${index + 1}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RECOVERY_PEOPLE.map((person) => (
                              <SelectItem key={person} value={person}>
                                {person}
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                            <SelectItem value={CUSTOM_RECOVERY_PERSON}>직접 입력</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <button
                        type="button"
                        aria-label="회수 상대 삭제"
                        onClick={() =>
                          onChange({
                            ...draft,
                            recoveries: draft.recoveries.filter((item) => item.id !== rec.id)
                          })
                        }
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {isCustomPerson ? (
                      <Input
                        aria-label={`회수 상대 ${index + 1} 이름 직접 입력`}
                        value={rec.person}
                        onChange={(event) =>
                          onChange({
                            ...draft,
                            recoveries: draft.recoveries.map((item) => (item.id === rec.id ? { ...item, isCustomPerson: true, person: event.target.value } : item))
                          })
                        }
                        placeholder="이름을 직접 입력해 주세요 (예: 이과장)"
                      />
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${idPrefix}-rec-target-${rec.id}`} className="text-xs font-semibold text-foreground">
                        회수 대상 금액 <span className="text-primary">*</span>
                      </label>
                      <NumberInput
                        id={`${idPrefix}-rec-target-${rec.id}`}
                        value={rec.targetAmount}
                        onValueChange={(value) =>
                          onChange({
                            ...draft,
                            recoveries: draft.recoveries.map((item) => (item.id === rec.id ? { ...item, targetAmount: value } : item))
                          })
                        }
                        suffix="원"
                        placeholder="0"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${idPrefix}-rec-received-${rec.id}`} className="text-xs font-semibold text-foreground">
                        회수한 금액
                      </label>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <NumberInput
                          id={`${idPrefix}-rec-received-${rec.id}`}
                          value={rec.receivedAmount}
                          onValueChange={(value) =>
                            onChange({
                              ...draft,
                              recoveries: draft.recoveries.map((item) => (item.id === rec.id ? { ...item, receivedAmount: value } : item))
                            })
                          }
                          wrapperClassName="min-w-0 flex-1"
                          suffix="원"
                          placeholder="0"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            onChange({
                              ...draft,
                              recoveries: draft.recoveries.map((item) => (item.id === rec.id ? { ...item, receivedAmount: item.targetAmount ?? 0 } : item))
                            })
                          }
                        >
                          전액
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-foreground">
                      입금 계좌 <span className="text-primary">*</span>
                    </span>
                    <Select
                      value={rec.depositAccount}
                      onValueChange={(value) =>
                        onChange({
                          ...draft,
                          recoveries: draft.recoveries.map((item) => (item.id === rec.id ? { ...item, depositAccount: value } : item))
                        })
                      }
                    >
                      <SelectTrigger aria-label={`입금 계좌 ${index + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPOSIT_ACCOUNTS.map((account) => (
                          <SelectItem key={account} value={account}>
                            {account}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 4: 반영 미리보기 */}
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-3.5 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">반영 미리보기</h3>
          <Badge variant="neutral">{metrics.autoBudgetMonth.monthText} 반영</Badge>
        </div>
        <div className="flex flex-col gap-1.5 text-xs tabular-nums">
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 text-muted-foreground">실결제 금액</span>
            <span className="text-right font-bold text-foreground break-keep">
              {draft.paymentPlan === 'installment'
                ? `${formatWon(metrics.installmentRoundTotal)} (총 할부 원승인 ${formatWon(metrics.actualPaid)} · ${metrics.round}/${metrics.months}회차)`
                : metrics.discount > 0
                  ? `${formatWon(metrics.actualPaid)} (원승인 ${formatWon(metrics.approved)} · 할인 ${formatWon(metrics.discount)})`
                  : formatWon(metrics.actualPaid)}
            </span>
          </div>
          {metrics.recoveryTarget > 0 ? (
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">받을 돈 (회수 대상)</span>
              <span className="text-right font-bold text-foreground break-keep">
                {metrics.recoveryTargetNames.length > 0 ? `${formatWon(metrics.recoveryTarget)} (${metrics.recoveryTargetNames.join(', ')})` : formatWon(metrics.recoveryTarget)}
              </span>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 text-muted-foreground">생활비 반영 지출</span>
            <span className={cn('text-right font-bold break-keep', metrics.livingBudgetExpense < 0 ? 'text-destructive' : 'text-foreground')}>{formatWon(metrics.livingBudgetExpense)}</span>
          </div>
          {metrics.isCardMethod ? (
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">카드 실적 인정 금액</span>
              <span className="text-right font-bold text-foreground break-keep">
                {metrics.cardPerformanceAmount === null
                  ? metrics.cardPerformanceNote
                  : metrics.cardPerformanceNote
                    ? `${formatWon(metrics.cardPerformanceAmount)} (${metrics.cardPerformanceNote})`
                    : formatWon(metrics.cardPerformanceAmount)}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {draft.isFixedExpenseGenerated ? (
        <NoticeBox variant="info" className="text-xs">
          고정 지출에서 자동 생성된 이 달 내역이에요. 여기서 수정한 내용은 이 달 건에만 반영되며 고정 지출 설정은 바뀌지 않아요.
        </NoticeBox>
      ) : null}

      {showValidationErrors && validationErrors.length > 0 ? (
        <NoticeBox variant="error" className="text-xs">
          <ul className="list-disc space-y-0.5 pl-4">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </NoticeBox>
      ) : null}
    </div>
  );
};

type ExpenseFormOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ExpenseDraft;
  onDraftChange: (next: ExpenseDraft) => void;
  onSave: (draft: ExpenseDraft) => void;
  onDelete?: (draft: ExpenseDraft) => void;
};

export const ExpenseFormOverlay = ({ open, onOpenChange, draft, onDraftChange, onSave, onDelete }: ExpenseFormOverlayProps) => {
  const isMobile = useIsMobileView();
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const title = aiOpen ? 'AI로 초안 작성' : draft.mode === 'edit' ? '지출 수정' : '지출 입력';
  const showDeleteButton = draft.mode === 'edit' && Boolean(onDelete);
  const currentInitialStatus = draft.initialPaymentStatus ?? draft.paymentStatus;
  const deleteDisabledReason =
    currentInitialStatus !== '준비 필요'
      ? `${currentInitialStatus} 상태의 거래는 삭제할 수 없어요. 지불 상태를 '준비 필요'로 먼저 변경해 저장해 주세요.`
      : draft.paymentPlan === 'installment' && (draft.initialInstallmentRound ?? draft.installmentRound ?? 1) >= 2
        ? '2회차 이후 할부 거래는 삭제할 수 없어요.'
        : draft.recoveries.some((rec) => (rec.receivedAmount ?? 0) > 0)
          ? '이미 회수한 금액이 기록된 지출은 삭제할 수 없어요. 회수한 금액을 0원으로 먼저 정정해 주세요.'
          : null;

  const renderDeleteButton = (size: 'lg' | 'md') => {
    if (!showDeleteButton) {
      return null;
    }

    const buttonClassName = cn('border-destructive/40 text-destructive hover:bg-destructive-tint hover:text-destructive', size === 'lg' && 'px-3.5');

    if (!deleteDisabledReason) {
      return (
        <Button type="button" variant="outline" size={size} className={cn('shrink-0', buttonClassName)} onClick={() => onDelete?.(draft)}>
          삭제
        </Button>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            aria-label={`삭제 불가: ${deleteDisabledReason}`}
            className="inline-flex shrink-0 cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <Button type="button" variant="outline" size={size} disabled className={buttonClassName}>
              삭제
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {deleteDisabledReason}
        </TooltipContent>
      </Tooltip>
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowValidationErrors(false);
      setAiOpen(false);
      setAiNotice(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateExpenseDraft(draft);
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    setShowValidationErrors(false);
    onSave(draft);
  };

  const handleApplyAiCandidate = (nextDraft: ExpenseDraft, summaryText: string) => {
    onDraftChange(nextDraft);
    setAiNotice(summaryText);
    setAiOpen(false);
  };

  const aiContent = <ExpenseAiAssist draft={draft} onBack={() => setAiOpen(false)} onApplyCandidate={handleApplyAiCandidate} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="max-h-[92dvh]">
          {aiOpen ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <SheetHeader>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="지출 입력으로 돌아가기"
                    onClick={() => setAiOpen(false)}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <SheetTitle>{title}</SheetTitle>
                </div>
                <SheetDescription className="sr-only">결제 캡처 또는 설명으로 지출 초안을 작성합니다.</SheetDescription>
              </SheetHeader>
              <SheetBody className="pr-0.5">{aiContent}</SheetBody>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription className="sr-only">지출 금액, 분류 분할, 납부 방식과 회수 금액을 입력합니다.</SheetDescription>
              </SheetHeader>
              <SheetBody className="pr-0.5">
                <ExpenseFormFields
                  draft={draft}
                  onChange={onDraftChange}
                  idPrefix="sheet-expense"
                  onOpenAi={() => setAiOpen(true)}
                  aiAppliedNotice={aiNotice}
                  showValidationErrors={showValidationErrors}
                />
              </SheetBody>
              <SheetFooter className="flex-row gap-2">
                {renderDeleteButton('lg')}
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button type="submit" variant="primary" size="lg" className="flex-1">
                  지출 저장
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        {aiOpen ? (
          <div className="flex min-h-0 flex-col gap-3">
            <DialogHeader>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="지출 입력으로 돌아가기"
                  onClick={() => setAiOpen(false)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <DialogTitle>{title}</DialogTitle>
              </div>
              <DialogDescription className="sr-only">결제 캡처 또는 설명으로 지출 초안을 작성합니다.</DialogDescription>
            </DialogHeader>
            <DialogBody className="max-h-[calc(100dvh-11rem)] pr-1">{aiContent}</DialogBody>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-3">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">지출 금액, 분류 분할, 납부 방식과 회수 금액을 입력합니다.</DialogDescription>
            </DialogHeader>
            <DialogBody className="max-h-[calc(100dvh-11rem)] pr-1">
              <ExpenseFormFields
                draft={draft}
                onChange={onDraftChange}
                idPrefix="dialog-expense"
                onOpenAi={() => setAiOpen(true)}
                aiAppliedNotice={aiNotice}
                showValidationErrors={showValidationErrors}
              />
            </DialogBody>
            <DialogFooter className={showDeleteButton ? 'sm:justify-between' : undefined}>
              {renderDeleteButton('md')}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="md" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button type="submit" variant="primary" size="md">
                  지출 저장
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

type ExpensePreviewPreset = 'lump-sum' | 'ai-review' | 'installment' | 'validation-error' | 'empty';

const PRESET_MAP: Record<ExpensePreviewPreset, { createDraft: () => ExpenseDraft; showErrors: boolean }> = {
  'lump-sum': { createDraft: createLumpSumSplitPreset, showErrors: false },
  'ai-review': { createDraft: createEmptyExpensePreset, showErrors: false },
  installment: { createDraft: createInstallmentPreset, showErrors: false },
  'validation-error': { createDraft: createValidationAndLockPreset, showErrors: true },
  empty: { createDraft: createEmptyExpensePreset, showErrors: false }
};

const normalizePreviewPreset = (value?: string): ExpensePreviewPreset => {
  return value && value in PRESET_MAP ? (value as ExpensePreviewPreset) : 'lump-sum';
};

export const ExpenseEditPreview = ({ initialPreset }: { initialPreset?: string }) => {
  const resolvedInitial = normalizePreviewPreset(initialPreset);
  const [preset, setPreset] = useState<ExpensePreviewPreset>(resolvedInitial);
  const [draft, setDraft] = useState<ExpenseDraft>(() => PRESET_MAP[resolvedInitial].createDraft());
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(() => PRESET_MAP[resolvedInitial].showErrors);
  const [aiOpen, setAiOpen] = useState<boolean>(() => resolvedInitial === 'ai-review');
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const handleSelectPreset = (nextPreset: ExpensePreviewPreset) => {
    setPreset(nextPreset);
    setDraft(PRESET_MAP[nextPreset].createDraft());
    setShowValidationErrors(PRESET_MAP[nextPreset].showErrors);
    setAiOpen(nextPreset === 'ai-review');
    setAiNotice(null);
  };

  const handleSave = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateExpenseDraft(draft);
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    setShowValidationErrors(false);
    const preview = computeExpensePreview(draft);
    await dialog.alert({
      title: '지출 저장 미리보기',
      description: `${preview.autoBudgetMonth.monthText} 반영 · ${draft.merchant || '사용처 미입력'} · 실결제 ${formatWon(preview.paymentReserve)} (생활비 반영 ${formatWon(preview.livingBudgetExpense)})`
    });
  };

  return (
    <div className="min-h-dvh bg-black/75 text-foreground md:px-6 md:py-6">
      <div className="mx-auto mb-3 flex max-w-2xl flex-wrap items-center justify-between gap-2 px-3 pt-3 text-xs md:px-0 md:pt-0">
        <Badge className="border-white/20 bg-white/10 text-white">시안 상태 프리셋</Badge>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" size="sm" variant={preset === 'lump-sum' ? 'primary' : 'secondary'} onClick={() => handleSelectPreset('lump-sum')}>
            일시불 · 분할 · 회수
          </Button>
          <Button type="button" size="sm" variant={preset === 'ai-review' ? 'primary' : 'secondary'} onClick={() => handleSelectPreset('ai-review')}>
            AI 초안 검토
          </Button>
          <Button type="button" size="sm" variant={preset === 'installment' ? 'primary' : 'secondary'} onClick={() => handleSelectPreset('installment')}>
            할부(유이자)
          </Button>
          <Button type="button" size="sm" variant={preset === 'validation-error' ? 'primary' : 'secondary'} onClick={() => handleSelectPreset('validation-error')}>
            검증 오류
          </Button>
          <Button type="button" size="sm" variant={preset === 'empty' ? 'primary' : 'secondary'} onClick={() => handleSelectPreset('empty')}>
            초기화
          </Button>
        </div>
      </div>

      {/* BottomSheet on < 768px, Centered Modal on >= 768px */}
      {aiOpen ? (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-t-2xl border border-border-strong bg-surface-elevated p-4 text-card-foreground shadow-lg md:rounded-2xl md:p-6">
          <div className="mx-auto h-1 w-10 rounded-full bg-border-strong md:hidden" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="지출 입력으로 돌아가기"
                onClick={() => setAiOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
              <h1 className="text-base font-bold tracking-tight text-foreground md:text-lg">AI로 초안 작성</h1>
            </div>
            <button
              type="button"
              aria-label="시안 닫기 안내"
              onClick={() =>
                void dialog.alert({
                  title: '지출 입력 시안',
                  description: '실제 화면에서는 닫기 버튼을 누르면 지출 내역 화면으로 돌아갑니다.'
                })
              }
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <ExpenseAiAssist
            key={preset}
            draft={draft}
            defaultOpenReview={preset === 'ai-review'}
            onBack={() => setAiOpen(false)}
            onApplyCandidate={(nextDraft, summary) => {
              setDraft(nextDraft);
              setAiNotice(summary);
              setAiOpen(false);
            }}
          />
        </div>
      ) : (
        <form
          onSubmit={(event) => void handleSave(event)}
          className="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-t-2xl border border-border-strong bg-surface-elevated p-4 text-card-foreground shadow-lg md:rounded-2xl md:p-6"
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-border-strong md:hidden" />

          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground md:text-lg">{draft.mode === 'edit' ? '지출 수정' : '지출 입력'}</h1>
            <button
              type="button"
              aria-label="시안 닫기 안내"
              onClick={() =>
                void dialog.alert({
                  title: '지출 입력 시안',
                  description: '실제 화면에서는 닫기 버튼을 누르면 지출 내역 화면으로 돌아갑니다.'
                })
              }
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <ExpenseFormFields draft={draft} onChange={setDraft} idPrefix="preview-expense" onOpenAi={() => setAiOpen(true)} aiAppliedNotice={aiNotice} showValidationErrors={showValidationErrors} />

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="lg" className="flex-1 md:flex-none" onClick={() => handleSelectPreset(preset)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="lg" className="flex-1 md:flex-none">
              지출 저장
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
