'use client';

import {
  DatePicker,
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useIsMobileView
} from '@repo/ui-core';
import { ArrowLeft, ChevronDown, CircleHelp, Plus, Sparkles, Upload, X } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';

import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatWon } from '@/shared/design-format';
import { setTaxRecordingEnabled, useTaxRecordingEnabled } from '@/shared/design-ledger-settings';
import {
  DESIGN_PROFILE_NAME,
  isCurrentUserName,
  normalizeMemberBaseName,
  useAllMemberTaxStatuses,
  usePersonalBusinesses,
  usePersonalProfile,
  type PersonalBusiness,
  type PersonalTaxStatus
} from '@/shared/design-personal-businesses';
import { showValidationAlert } from '@/shared/design-validation';
import { ExpenseAiAssist } from '@/shared/expense-form/ExpenseAiAssist';
import {
  ACTUAL_USERS,
  CATEGORIES,
  DEPOSIT_ACCOUNTS,
  EXPENSE_CASH_RECEIPT_OPTIONS,
  EXPENSE_PROOF_OPTIONS,
  EXPENSE_YEAR_END_TAX_OPTIONS,
  PAYMENT_METHOD_ITEMS,
  RECOVERY_PEOPLE,
  computeExpensePreview,
  createEmptyExpensePreset,
  createInstallmentPreset,
  createLumpSumSplitPreset,
  createValidationAndLockPreset,
  getDefaultPaymentStatusForMethod,
  getDefaultTransferSourceAccountForMethod,
  getPaymentMethodMeta,
  isCompletedEditLocked,
  isCreditCardMethod,
  syncSingleSplitDraft,
  validateExpenseDraftDetailed,
  withAutoInstallmentPrincipal,
  type ExpenseCashReceiptType,
  type ExpenseCategorySplit,
  type ExpenseDraft,
  type ExpenseProofType,
  type ExpenseRecoveryItem,
  type ExpenseTaxScope,
  type ExpenseYearEndTaxType,
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

const resolveExpenseTaxEligibility = (
  draft: ExpenseDraft,
  profile: { name: string; taxStatus: PersonalTaxStatus },
  allBusinesses: readonly PersonalBusiness[],
  memberTaxStatuses: Readonly<Record<string, PersonalTaxStatus>> = {}
) => {
  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);
  const taxOwner = methodMeta.owner;
  const isCurrentUser = isCurrentUserName(taxOwner, profile.name);
  const normalizedOwner = normalizeMemberBaseName(taxOwner);
  const taxOwnerStatus: PersonalTaxStatus = isCurrentUser ? profile.taxStatus : (memberTaxStatuses[taxOwner] ?? memberTaxStatuses[normalizedOwner] ?? 'none');
  const ownerBusinesses = allBusinesses.filter(
    (business) => business.active && (isCurrentUser ? business.owner === DESIGN_PROFILE_NAME : normalizeMemberBaseName(business.owner) === normalizeMemberBaseName(taxOwner))
  );
  const allowsYearEndTax = taxOwnerStatus === 'worker' || (taxOwnerStatus === 'dependent' && ownerBusinesses.length === 0);
  const taxInfo = draft.taxInfo ?? {};
  const retainedBusiness = allBusinesses.find(({ id, active }) => !active && id === taxInfo.businessId);
  const selectedBusinessId = ownerBusinesses.some(({ id }) => id === taxInfo.businessId) ? taxInfo.businessId : retainedBusiness?.id;
  const cashReceiptAllowed = methodMeta.kind !== 'card';
  const showWorkerTax = allowsYearEndTax || Boolean(taxInfo.yearEndTaxType || (cashReceiptAllowed && taxInfo.cashReceiptType));
  const showBusinessTax = ownerBusinesses.length > 0 || Boolean(retainedBusiness || taxInfo.isBusinessExpense);
  return { ownerBusinesses, retainedBusiness, selectedBusinessId, cashReceiptAllowed, showWorkerTax, showBusinessTax };
};

type ExpenseFormFieldsProps = {
  draft: ExpenseDraft;
  onChange: (next: ExpenseDraft) => void;
  idPrefix?: string;
  onOpenAi?: () => void;
  aiAppliedNotice?: string | null;
  showFieldErrors?: boolean;
};

export const ExpenseFormFields = ({ draft, onChange, idPrefix = 'expense-form', onOpenAi, aiAppliedNotice, showFieldErrors = false }: ExpenseFormFieldsProps) => {
  const metrics = computeExpensePreview(draft);
  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);
  const taxRecordingEnabled = useTaxRecordingEnabled();
  const profile = usePersonalProfile();
  const allBusinesses = usePersonalBusinesses();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const taxInfo = draft.taxInfo ?? {};
  const { ownerBusinesses, retainedBusiness, selectedBusinessId, cashReceiptAllowed, showWorkerTax, showBusinessTax } = resolveExpenseTaxEligibility(draft, profile, allBusinesses, memberTaxStatuses);
  const showTaxSection = taxRecordingEnabled && (showWorkerTax || showBusinessTax);
  const dualTaxEligible = showWorkerTax && showBusinessTax;
  const hasWorkerDetailValue = Boolean(taxInfo.yearEndTaxType || (cashReceiptAllowed && taxInfo.cashReceiptType));
  const [taxTab, setTaxTab] = useState<ExpenseTaxScope>(() => (taxInfo.taxScope === 'business' || taxInfo.isBusinessExpense ? 'business' : 'worker'));
  const activeTaxScope: ExpenseTaxScope = taxInfo.taxScope === 'business' || taxInfo.isBusinessExpense ? 'business' : taxInfo.taxScope === 'worker' || hasWorkerDetailValue ? 'worker' : taxTab;
  const invalidFields = showFieldErrors ? validateExpenseDraftDetailed(draft, { checkTaxInfo: taxRecordingEnabled && showBusinessTax }).fieldErrors : null;
  const doneLocked = isCompletedEditLocked(draft);
  const laterRoundLocked = !doneLocked && draft.mode === 'edit' && draft.paymentPlan === 'installment' && (draft.initialInstallmentRound ?? draft.installmentRound ?? 1) >= 2;
  const siblingRoundsLocked = !doneLocked && draft.mode === 'edit' && draft.paymentPlan === 'installment' && Boolean(draft.hasLockedSiblingRounds);
  const baseFieldsLocked = doneLocked || laterRoundLocked || siblingRoundsLocked;
  const recoveryLockedByInstallment = draft.paymentPlan === 'installment' && (draft.initialInstallmentRound ?? draft.installmentRound ?? 1) >= 2;
  const [discountExpanded, setDiscountExpanded] = useState(false);
  const workerTaxActive = showWorkerTax && (!dualTaxEligible || activeTaxScope === 'worker');
  const businessTaxActive = showBusinessTax && (dualTaxEligible ? activeTaxScope === 'business' : Boolean(taxInfo.isBusinessExpense));
  const hasBusinessValue = Boolean(taxInfo.isBusinessExpense || selectedBusinessId || taxInfo.proofType || (taxInfo.inputVatAmount ?? 0) > 0);
  const hasTaxInfoValue = Boolean((workerTaxActive && hasWorkerDetailValue) || (businessTaxActive && hasBusinessValue));
  const hasTaxInfoError = Boolean(invalidFields?.businessId || invalidFields?.inputVatAmount);
  const [taxExpanded, setTaxExpanded] = useState(() => hasTaxInfoValue);
  const isTaxOpen = taxExpanded || hasTaxInfoError;

  const handleSelectTaxTab = (nextScope: ExpenseTaxScope) => {
    if (nextScope === activeTaxScope) {
      return;
    }
    setTaxTab(nextScope);
    if (draft.taxInfo) {
      onChange({
        ...draft,
        taxInfo: undefined
      });
    }
  };
  const installmentAllowed = isCreditCardMethod(methodMeta);
  const discountAllowed = methodMeta.kind === 'card';
  const hasDiscountValue = (draft.cardDiscount ?? 0) > 0 || draft.splits.some((row) => (row.discount ?? 0) > 0);
  const hasDiscountError = Boolean(invalidFields && (invalidFields.cardDiscount || (draft.paymentPlan !== 'installment' && Object.keys(invalidFields.splitAdjustments).length > 0)));
  const discountVisible = discountAllowed && (hasDiscountValue || hasDiscountError || discountExpanded);
  const splitAdjMode: 'discount' | 'installment-fee' | 'none' = !discountAllowed
    ? 'none'
    : draft.paymentPlan !== 'installment'
      ? discountVisible
        ? 'discount'
        : 'none'
      : draft.installmentType === 'interest'
        ? 'installment-fee'
        : 'none';
  const hasSplitAdjColumn = splitAdjMode !== 'none';
  const splitAdjTotal = splitAdjMode === 'discount' ? metrics.discount : splitAdjMode === 'installment-fee' ? metrics.fee : 0;

  const handleAddSplit = () => {
    const expectedTotal = draft.paymentPlan === 'installment' ? metrics.principal : metrics.approved;
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
          discount: 0,
          installmentFee: 0
        }
      ]
    });
  };

  const handleDistributeAdjustment = () => {
    const totalSplitAmount = draft.splits.reduce((sum, row) => sum + Math.max(0, row.amount ?? 0), 0);
    if (!hasSplitAdjColumn || totalSplitAmount <= 0 || splitAdjTotal <= 0) {
      return;
    }

    const fieldKey = splitAdjMode === 'discount' ? 'discount' : 'installmentFee';
    let distributedSoFar = 0;
    const nextSplits = draft.splits.map((row, index) => {
      if (index === draft.splits.length - 1) {
        return { ...row, [fieldKey]: Math.max(0, splitAdjTotal - distributedSoFar) };
      }
      const share = Math.round((Math.max(0, row.amount ?? 0) / totalSplitAmount) * splitAdjTotal);
      distributedSoFar += share;
      return { ...row, [fieldKey]: share };
    });

    onChange({ ...draft, splits: nextSplits });
  };

  const handlePaymentMethodChange = (nextMethod: string) => {
    const nextMeta = getPaymentMethodMeta(nextMethod);
    const shouldForceLumpSum = !isCreditCardMethod(nextMeta) && draft.paymentPlan === 'installment';
    const shouldResetDiscount = nextMeta.kind !== 'card';
    if (shouldResetDiscount) {
      setDiscountExpanded(false);
    }
    const nextStatus = draft.mode === 'create' && !draft.paymentStatusManuallySet ? getDefaultPaymentStatusForMethod(nextMeta, draft.transactionDate) : draft.paymentStatus;
    const needsConditionalTransferSource = (nextMeta.kind === 'account' || nextMeta.kind === 'cash') && nextStatus === '지불 준비 필요';
    const nextSplits =
      shouldResetDiscount || shouldForceLumpSum
        ? draft.splits.map((row) => ({
            ...row,
            discount: shouldResetDiscount ? 0 : row.discount,
            installmentFee: shouldResetDiscount || shouldForceLumpSum ? 0 : row.installmentFee
          }))
        : draft.splits;
    const ownerChanged = normalizeMemberBaseName(nextMeta.owner) !== normalizeMemberBaseName(methodMeta.owner);
    if (ownerChanged) {
      setTaxTab('worker');
    }
    const clearedCashReceiptTaxInfo =
      nextMeta.kind === 'card' && draft.taxInfo?.cashReceiptType
        ? !draft.taxInfo.yearEndTaxType && !draft.taxInfo.isBusinessExpense
          ? undefined
          : { ...draft.taxInfo, cashReceiptType: undefined }
        : draft.taxInfo;
    const nextTaxInfo = ownerChanged ? undefined : clearedCashReceiptTaxInfo;
    const nextDraft: ExpenseDraft = {
      ...draft,
      paymentMethod: nextMethod,
      actualUser: nextMeta.owner,
      paymentPlan: shouldForceLumpSum ? 'lump-sum' : draft.paymentPlan,
      cardDiscount: shouldResetDiscount ? 0 : draft.cardDiscount,
      splits: nextSplits,
      paymentStatus: nextStatus,
      transferSourceAccount: needsConditionalTransferSource ? getDefaultTransferSourceAccountForMethod(nextMeta) : undefined,
      taxInfo: nextTaxInfo
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
          installmentRound: draft.installmentRound ?? 1,
          splits: draft.splits.map((row) => ({
            ...row,
            discount: 0,
            installmentFee: draft.installmentType === 'interest' ? (row.installmentFee ?? 0) : 0
          }))
        })
      );
      return;
    }

    onChange(
      syncSingleSplitDraft({
        ...draft,
        paymentPlan: 'lump-sum',
        splits: draft.splits.map((row) => ({ ...row, installmentFee: 0 }))
      })
    );
  };

  const handleAddRecovery = () => {
    onChange({
      ...draft,
      recoveries: [
        ...draft.recoveries,
        {
          id: `rec-${Date.now()}-${draft.recoveries.length + 1}`,
          person: RECOVERY_PEOPLE[draft.recoveries.length % RECOVERY_PEOPLE.length] ?? '지은 (구성원)',
          targetAmount: metrics.actualPaid > 0 ? Math.round(metrics.actualPaid / 2) : null,
          receivedAmount: 0,
          depositAccount: '신한 쏠편한 입출금'
        }
      ]
    });
  };

  const splitSum = draft.splits.reduce((sum, row) => sum + Math.max(0, row.amount ?? 0), 0);
  const splitExpected = draft.paymentPlan === 'installment' ? metrics.principal : metrics.approved;
  const splitDiff = splitExpected - splitSum;
  const splitTargetLabel = draft.paymentPlan === 'installment' ? '이번 회차 납부원금' : '결제 금액';
  const splitAdjLabel = splitAdjMode === 'discount' ? '할인 금액' : '이자·수수료';
  const splitAdjSum = hasSplitAdjColumn ? draft.splits.reduce((sum, row) => sum + Math.max(0, Math.trunc((splitAdjMode === 'discount' ? row.discount : row.installmentFee) ?? 0)), 0) : 0;
  const splitAdjDiff = splitAdjTotal - splitAdjSum;

  const workerTaxFields = (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-tax-yearend`} className="text-xs font-semibold text-foreground">
          공제 구분
        </label>
        <Select
          value={taxInfo.yearEndTaxType ?? '__none__'}
          onValueChange={(value) => {
            const nextYearEnd = value === '__none__' ? undefined : (value as ExpenseYearEndTaxType);
            const nextCashReceipt = cashReceiptAllowed ? taxInfo.cashReceiptType : undefined;
            const hasWorkerValue = Boolean(nextYearEnd || nextCashReceipt);
            onChange({
              ...draft,
              taxInfo: dualTaxEligible
                ? hasWorkerValue
                  ? { taxScope: 'worker', yearEndTaxType: nextYearEnd, cashReceiptType: nextCashReceipt, isBusinessExpense: false }
                  : undefined
                : { ...taxInfo, yearEndTaxType: nextYearEnd }
            });
          }}
        >
          <SelectTrigger id={`${idPrefix}-tax-yearend`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">선택 안 함</SelectItem>
            {EXPENSE_YEAR_END_TAX_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cashReceiptAllowed ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-tax-cash-receipt`} className="text-xs font-semibold text-foreground">
            현금영수증
          </label>
          <Select
            value={taxInfo.cashReceiptType ?? '__none__'}
            onValueChange={(value) => {
              const nextCashReceipt = value === '__none__' ? undefined : (value as ExpenseCashReceiptType);
              const hasWorkerValue = Boolean(taxInfo.yearEndTaxType || nextCashReceipt);
              onChange({
                ...draft,
                taxInfo: dualTaxEligible
                  ? hasWorkerValue
                    ? { taxScope: 'worker', yearEndTaxType: taxInfo.yearEndTaxType, cashReceiptType: nextCashReceipt, isBusinessExpense: false }
                    : undefined
                  : { ...taxInfo, cashReceiptType: nextCashReceipt }
              });
            }}
          >
            <SelectTrigger id={`${idPrefix}-tax-cash-receipt`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">선택 안 함</SelectItem>
              {EXPENSE_CASH_RECEIPT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );

  const businessTaxFields = (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      <div className="flex flex-col gap-1 md:col-span-2">
        <label htmlFor={`${idPrefix}-tax-business`} className="text-xs font-semibold text-foreground">
          사업자 <span className="text-primary">*</span>
        </label>
        <Select
          value={selectedBusinessId ?? ''}
          disabled={ownerBusinesses.length === 0 && !retainedBusiness}
          onValueChange={(value) =>
            onChange({
              ...draft,
              taxInfo: {
                ...taxInfo,
                ...(dualTaxEligible ? { taxScope: 'business' as const, isBusinessExpense: true } : {}),
                businessId: value || undefined
              }
            })
          }
        >
          <SelectTrigger id={`${idPrefix}-tax-business`} invalid={Boolean(invalidFields?.businessId)}>
            <SelectValue placeholder={ownerBusinesses.length > 0 || retainedBusiness ? '사업자 선택' : '등록된 사업자 없음'} />
          </SelectTrigger>
          <SelectContent>
            {ownerBusinesses.map((business) => (
              <SelectItem key={business.id} value={business.id} className="wrap-anywhere">
                {business.name}
                {business.businessNumber ? ` (${business.businessNumber})` : ''}
              </SelectItem>
            ))}
            {retainedBusiness ? (
              <SelectItem value={retainedBusiness.id} disabled className="wrap-anywhere">
                {retainedBusiness.name} (사용 중지)
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-tax-proof`} className="text-xs font-semibold text-foreground">
          적격증빙 구분
        </label>
        <Select
          value={taxInfo.proofType ?? '__none__'}
          onValueChange={(value) =>
            onChange({
              ...draft,
              taxInfo: {
                ...taxInfo,
                ...(dualTaxEligible ? { taxScope: 'business' as const, isBusinessExpense: true } : {}),
                proofType: value === '__none__' ? undefined : (value as ExpenseProofType)
              }
            })
          }
        >
          <SelectTrigger id={`${idPrefix}-tax-proof`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">선택 안 함</SelectItem>
            {EXPENSE_PROOF_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-tax-vat`} className="text-xs font-semibold text-foreground">
          매입 부가세
        </label>
        <NumberInput
          id={`${idPrefix}-tax-vat`}
          value={taxInfo.inputVatAmount ?? null}
          invalid={Boolean(invalidFields?.inputVatAmount)}
          onValueChange={(value) =>
            onChange({
              ...draft,
              taxInfo: {
                ...taxInfo,
                ...(dualTaxEligible ? { taxScope: 'business' as const, isBusinessExpense: true } : {}),
                inputVatAmount: value
              }
            })
          }
          suffix="원"
          placeholder="0"
        />
      </div>
    </div>
  );

  const businessTaxContent = (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {dualTaxEligible ? null : <span className="text-xs font-semibold text-muted-foreground">사업자 경비</span>}
        <Checkbox
          label="사업 경비로 기록"
          checked={Boolean(taxInfo.isBusinessExpense)}
          onCheckedChange={(checked) => {
            const nextEnabled = checked === true;
            if (!nextEnabled) {
              if (dualTaxEligible) {
                setTaxTab('business');
              }
              onChange({ ...draft, taxInfo: undefined });
              return;
            }
            const matchedBusiness = ownerBusinesses[0];
            onChange({
              ...draft,
              taxInfo: {
                ...(dualTaxEligible ? { taxScope: 'business' as const } : {}),
                isBusinessExpense: true,
                businessId: selectedBusinessId ?? matchedBusiness?.id,
                proofType: taxInfo.proofType,
                inputVatAmount: taxInfo.inputVatAmount
              }
            });
          }}
        />
      </div>
      {taxInfo.isBusinessExpense ? businessTaxFields : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-3.5">
      {doneLocked ? (
        <NoticeBox variant="warning" className="text-xs">
          {discountAllowed
            ? "지불 완료된 거래는 결제 수단·결제 금액·할인을 바로 고칠 수 없어요. 수정이 필요하면 아래 지불 상태를 '지불 대기' 또는 '지불 준비 필요'로 먼저 변경해 저장하세요."
            : "지불 완료된 거래는 결제 수단·결제 금액을 바로 고칠 수 없어요. 수정이 필요하면 아래 지불 상태를 '지불 대기' 또는 '지불 준비 필요'로 먼저 변경해 저장하세요."}
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
            <Input
              id={`${idPrefix}-merchant`}
              value={draft.merchant}
              invalid={Boolean(invalidFields?.merchant)}
              onChange={(event) => onChange({ ...draft, merchant: event.target.value })}
              placeholder="예: 강남역 점심 회식"
            />
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
            <DatePicker
              value={draft.transactionDate}
              invalid={Boolean(invalidFields?.transactionDate)}
              onChange={(date) => {
                const nextStatus = date && methodMeta.kind !== 'card' && !draft.paymentStatusManuallySet ? getDefaultPaymentStatusForMethod(methodMeta, date) : draft.paymentStatus;
                const needsTransferSource = (methodMeta.kind === 'account' || methodMeta.kind === 'cash') && nextStatus === '지불 준비 필요';
                onChange({
                  ...draft,
                  transactionDate: date,
                  paymentStatus: nextStatus,
                  transferSourceAccount: needsTransferSource ? (draft.transferSourceAccount ?? getDefaultTransferSourceAccountForMethod(methodMeta)) : undefined
                });
              }}
            />
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
                    <MemberAvatar name={user} size="xs" />
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
                      <strong className="text-foreground">지불 준비 필요</strong>: 지불할 돈을 아직 결제 계좌에 준비하지 않은 상태예요.
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
                const needsTransferSource = (methodMeta.kind === 'account' || methodMeta.kind === 'cash') && nextStatus === '지불 준비 필요';
                onChange({
                  ...draft,
                  paymentStatus: nextStatus,
                  paymentStatusManuallySet: true,
                  transferSourceAccount: needsTransferSource ? (draft.transferSourceAccount ?? getDefaultTransferSourceAccountForMethod(methodMeta)) : undefined
                });
              }}
            >
              <SelectTrigger aria-label="지불 상태">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="지불 준비 필요">지불 준비 필요</SelectItem>
                <SelectItem value="지불 대기">지불 대기</SelectItem>
                <SelectItem value="지불 완료">지불 완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(methodMeta.kind === 'account' || methodMeta.kind === 'cash') && draft.paymentStatus === '지불 준비 필요' ? (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/35 p-3">
            <label htmlFor={`${idPrefix}-transfer-source`} className="text-xs font-semibold text-foreground">
              송금 계좌 <span className="font-normal text-muted-foreground">(결제 계좌로 돈을 보낼 계좌)</span>
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
          </div>
        ) : null}

        {discountAllowed ? (
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

      {/* Section 2: 세무 정보 (선택 · 내 정보에 근로자/사업자 등록 시 노출) */}
      {showTaxSection ? (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
          <button
            type="button"
            aria-expanded={isTaxOpen}
            onClick={() => setTaxExpanded((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <h3 className="text-sm font-bold text-foreground">
              세무 정보 <span className="text-xs font-medium text-muted-foreground">(선택)</span>
            </h3>
            <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isTaxOpen && 'rotate-180')} />
          </button>

          {isTaxOpen ? (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {dualTaxEligible ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground">적용 구분</span>
                      <span className="text-[11px] text-muted-foreground">한 가지만 적용되며 항목 선택 시에만 저장돼요</span>
                    </div>
                    <div role="group" aria-label="적용 구분" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.5">
                      {(
                        [
                          { value: 'worker', label: '근로자(부양가족)' },
                          { value: 'business', label: '사업자' }
                        ] as const
                      ).map((option) => {
                        const selected = activeTaxScope === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => handleSelectTaxTab(option.value)}
                            className={cn(
                              'min-h-8 rounded-md px-2 text-xs transition-colors',
                              selected ? 'bg-card font-bold text-primary shadow-sm' : 'font-medium text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {activeTaxScope === 'worker' ? workerTaxFields : null}
                  {activeTaxScope === 'business' ? businessTaxContent : null}
                </>
              ) : showWorkerTax ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">근로자(부양가족)</span>
                  {workerTaxFields}
                </div>
              ) : showBusinessTax ? (
                businessTaxContent
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Section 3: 결제 금액 */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">결제 금액</h3>
          {installmentAllowed ? (
            <div role="group" aria-label="납부방식" className="inline-grid grid-cols-2 rounded-lg bg-muted p-0.5">
              <button
                type="button"
                aria-pressed={draft.paymentPlan === 'lump-sum'}
                disabled={baseFieldsLocked}
                onClick={() => handleSelectPlan('lump-sum')}
                className={cn(
                  'min-h-7 rounded-md px-3 text-xs font-bold transition-colors disabled:opacity-60',
                  draft.paymentPlan === 'lump-sum' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                일시불
              </button>
              <button
                type="button"
                aria-pressed={draft.paymentPlan === 'installment'}
                disabled={baseFieldsLocked}
                onClick={() => handleSelectPlan('installment')}
                className={cn(
                  'min-h-7 rounded-md px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                  draft.paymentPlan === 'installment' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                할부
              </button>
            </div>
          ) : null}
        </div>

        <div className={cn('grid items-end gap-2 md:gap-3', discountVisible ? 'grid-cols-2' : 'grid-cols-1')}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`${idPrefix}-approved`} className="text-xs font-semibold text-foreground">
                {discountVisible ? '결제 금액 (할인 전)' : '결제 금액'} <span className="text-primary">*</span>
              </label>
              {discountAllowed && !discountVisible && !baseFieldsLocked ? (
                <button
                  type="button"
                  onClick={() => setDiscountExpanded(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-tint"
                >
                  <Plus className="size-3" />
                  <span>카드 할인 입력</span>
                </button>
              ) : null}
            </div>
            <NumberInput
              id={`${idPrefix}-approved`}
              value={draft.approvedAmount}
              invalid={Boolean(invalidFields?.approvedAmount)}
              disabled={baseFieldsLocked}
              onValueChange={(value) => onChange(withAutoInstallmentPrincipal(draft, { ...draft, approvedAmount: value }))}
              suffix="원"
              placeholder="0"
              className="border-primary/50"
            />
          </div>

          {discountVisible ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`${idPrefix}-discount`} className="text-xs font-semibold text-foreground">
                  할인 금액
                </label>
                {!baseFieldsLocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountExpanded(false);
                      onChange(
                        syncSingleSplitDraft({
                          ...draft,
                          cardDiscount: 0,
                          splits: draft.splits.map((row) => ({ ...row, discount: 0 }))
                        })
                      );
                    }}
                    className="inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-3" />
                    <span>닫기</span>
                  </button>
                ) : null}
              </div>
              <NumberInput
                id={`${idPrefix}-discount`}
                value={draft.cardDiscount}
                invalid={Boolean(invalidFields?.cardDiscount)}
                disabled={baseFieldsLocked}
                onValueChange={(value) => onChange(withAutoInstallmentPrincipal(draft, { ...draft, cardDiscount: value }))}
                suffix="원"
                placeholder="0"
              />
            </div>
          ) : null}
        </div>

        {installmentAllowed && draft.paymentPlan === 'installment' ? (
          <div className="flex flex-col gap-3">
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
                        installmentFee: nextType === 'interest-free' ? 0 : draft.installmentFee,
                        splits: nextType === 'interest-free' ? draft.splits.map((row) => ({ ...row, installmentFee: 0 })) : draft.splits
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
                  invalid={Boolean(invalidFields?.installmentMonths)}
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
                  invalid={Boolean(invalidFields?.installmentRound)}
                  disabled={baseFieldsLocked}
                  onValueChange={(value) => onChange(withAutoInstallmentPrincipal(draft, { ...draft, installmentRound: value }))}
                  suffix="회차"
                  placeholder="1"
                />
              </div>
            </div>

            <div className={cn('grid grid-cols-1 gap-2.5', draft.installmentType === 'interest' && 'md:grid-cols-2')}>
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
                  invalid={Boolean(invalidFields?.installmentPrincipal)}
                  disabled={doneLocked}
                  onValueChange={(value) => onChange(syncSingleSplitDraft({ ...draft, installmentPrincipal: value }))}
                  suffix="원"
                  placeholder="0"
                />
              </div>

              {draft.installmentType === 'interest' ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor={`${idPrefix}-inst-fee`} className="text-xs font-semibold text-foreground">
                    이자·수수료
                  </label>
                  <NumberInput
                    id={`${idPrefix}-inst-fee`}
                    value={draft.installmentFee}
                    invalid={Boolean(invalidFields?.installmentFee)}
                    disabled={doneLocked}
                    onValueChange={(value) => onChange(syncSingleSplitDraft({ ...draft, installmentFee: value }))}
                    suffix="원"
                    placeholder="0"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-expense/20 bg-expense-tint px-3.5 py-2.5">
              <span className="text-xs font-semibold text-foreground">이번 회차 총 납부액</span>
              <span className="text-base font-extrabold text-expense tabular-nums">{formatWon(metrics.installmentRoundTotal)}</span>
            </div>

            {metrics.principal > metrics.availablePrincipalBalance ? (
              <p className="text-[11px] font-semibold text-destructive break-keep tabular-nums">이번 회차 납부원금이 남은 원금 잔액({formatWon(metrics.availablePrincipalBalance)})을 초과했어요.</p>
            ) : null}
          </div>
        ) : null}

        {discountVisible && draft.paymentPlan !== 'installment' ? (
          <div className="flex items-center justify-between rounded-lg border border-expense/20 bg-expense-tint px-3.5 py-2.5">
            <span className="text-xs font-semibold text-foreground">실결제 금액</span>
            <span className="text-base font-extrabold text-expense tabular-nums">{formatWon(metrics.actualPaid)}</span>
          </div>
        ) : null}

        {/* 분류별 금액 */}
        {(() => {
          const hasMultiSplits = draft.splits.length > 1;
          const splitGridColsClass = hasSplitAdjColumn
            ? hasMultiSplits
              ? 'grid-cols-[minmax(60px,0.75fr)_minmax(0,1.25fr)_minmax(0,1fr)_22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_28px]'
              : 'grid-cols-[minmax(60px,0.75fr)_minmax(0,1.25fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]'
            : hasMultiSplits
              ? 'grid-cols-[minmax(76px,0.9fr)_minmax(0,1.3fr)_22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_28px]'
              : 'grid-cols-[minmax(76px,0.9fr)_minmax(0,1.3fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]';

          return (
            <div className="mt-0.5 flex flex-col gap-2 border-t border-border pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-xs font-semibold text-foreground">
                  분류별 금액 <span className="text-primary">*</span>
                </span>
                <div className="flex items-center gap-1">
                  {hasSplitAdjColumn && hasMultiSplits ? (
                    <Button type="button" variant="secondary" size="sm" disabled={doneLocked || splitAdjTotal <= 0} onClick={handleDistributeAdjustment} className="px-2 text-xs">
                      {splitAdjMode === 'discount' ? '할인 자동 배분' : '이자 자동 배분'}
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" disabled={doneLocked} onClick={handleAddSplit} className="gap-1 px-2 text-xs">
                    <Plus className="size-3.5" />
                    <span>분류 추가</span>
                  </Button>
                </div>
              </div>

              <div className={cn('grid gap-1 px-0.5 text-[11px] font-medium text-muted-foreground md:gap-1.5', splitGridColsClass)}>
                <span>분류</span>
                {splitAdjMode === 'discount' ? (
                  <>
                    <span className="md:hidden">금액</span>
                    <span className="hidden md:inline">금액 (할인 전)</span>
                    <span className="md:hidden">할인</span>
                    <span className="hidden md:inline">할인 금액</span>
                  </>
                ) : splitAdjMode === 'installment-fee' ? (
                  <>
                    <span>원금</span>
                    <span className="md:hidden">이자</span>
                    <span className="hidden md:inline">이자·수수료</span>
                  </>
                ) : (
                  <span>{draft.paymentPlan === 'installment' ? '원금' : '금액'}</span>
                )}
                {hasMultiSplits ? <span className="sr-only">삭제</span> : null}
              </div>

              <div className="flex flex-col gap-2">
                {draft.splits.map((split, index) => (
                  <div key={split.id} className={cn('grid items-center gap-1 md:gap-1.5', splitGridColsClass)}>
                    <Select
                      value={split.category || undefined}
                      onValueChange={(val) =>
                        onChange({
                          ...draft,
                          splits: draft.splits.map((row) => (row.id === split.id ? { ...row, category: val } : row))
                        })
                      }
                    >
                      <SelectTrigger
                        size="md"
                        wrapperClassName="min-w-0"
                        invalid={Boolean(invalidFields?.splitCategories[split.id])}
                        aria-label={`분류 ${index + 1}`}
                        className="px-1.5 text-xs md:px-3 md:text-sm"
                      >
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

                    <NumberInput
                      size="md"
                      aria-label={`분류 금액 ${index + 1}`}
                      value={split.amount}
                      invalid={Boolean(invalidFields?.splitAmounts[split.id])}
                      disabled={doneLocked}
                      onValueChange={(value) =>
                        onChange({
                          ...draft,
                          splits: draft.splits.map((row) => (row.id === split.id ? { ...row, amount: value } : row))
                        })
                      }
                      suffix="원"
                      placeholder="0"
                      className="text-xs md:text-sm"
                    />

                    {hasSplitAdjColumn ? (
                      <NumberInput
                        size="md"
                        aria-label={splitAdjMode === 'discount' ? `분류 할인 ${index + 1}` : `분류 이자 ${index + 1}`}
                        value={splitAdjMode === 'discount' ? split.discount : (split.installmentFee ?? 0)}
                        invalid={Boolean(invalidFields?.splitAdjustments[split.id])}
                        disabled={doneLocked}
                        onValueChange={(value) =>
                          onChange({
                            ...draft,
                            splits: draft.splits.map((row) => (row.id === split.id ? { ...row, [splitAdjMode === 'discount' ? 'discount' : 'installmentFee']: value } : row))
                          })
                        }
                        suffix="원"
                        placeholder="0"
                        className="text-xs md:text-sm"
                      />
                    ) : null}

                    {hasMultiSplits ? (
                      <button
                        type="button"
                        aria-label="분류 행 삭제"
                        disabled={doneLocked}
                        onClick={() => {
                          const remaining = draft.splits.filter((row) => row.id !== split.id);
                          onChange(syncSingleSplitDraft({ ...draft, splits: remaining }));
                        }}
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 md:size-7"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              {(hasMultiSplits && splitExpected > 0 && splitDiff !== 0) || (hasSplitAdjColumn && splitAdjDiff !== 0) ? (
                <div className="flex flex-col gap-0.5 pt-0.5 text-[11px] font-medium text-destructive tabular-nums">
                  {hasMultiSplits && splitExpected > 0 && splitDiff !== 0 ? <span>{`${splitTargetLabel}보다 ${formatWon(Math.abs(splitDiff))} ${splitDiff > 0 ? '적어요' : '많아요'}.`}</span> : null}
                  {hasSplitAdjColumn && splitAdjDiff !== 0 ? <span>{`${splitAdjLabel}보다 ${formatWon(Math.abs(splitAdjDiff))} ${splitAdjDiff > 0 ? '적어요' : '많아요'}.`}</span> : null}
                </div>
              ) : null}
            </div>
          );
        })()}
      </section>

      {/* Section 3: 회수금 */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-bold text-foreground">회수금</h3>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="회수금 안내"
                  className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                >
                  <CircleHelp className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="z-[60] w-72 max-w-[calc(100vw-2rem)] p-3 text-xs">
                <p className="mb-1.5 font-bold text-foreground">회수금 안내</p>
                <div className="space-y-1 text-[11px] leading-relaxed text-muted-foreground break-keep">
                  <p>상대방에게 돌려받을 금액을 기록해요.</p>
                  <p>회수 대상 금액만큼 내 생활비 지출에 반영되지 않아요.</p>
                </div>
                {recoveryLockedByInstallment ? <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground break-keep">할부 거래의 회수금은 1회차(승인월)에서만 연결할 수 있어요.</p> : null}
              </PopoverContent>
            </Popover>
          </div>
          {recoveryLockedByInstallment ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="mr-auto inline-flex shrink-0 cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
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

        {draft.recoveries.length > 0 ? (
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
                          <SelectTrigger aria-label={`회수 상대 ${index + 1}`} invalid={Boolean(!isCustomPerson && invalidFields?.recoveryPersons[rec.id])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RECOVERY_PEOPLE.map((person) => (
                              <SelectItem key={person} value={person}>
                                <MemberAvatar name={person} size="xs" />
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
                        invalid={Boolean(invalidFields?.recoveryPersons[rec.id])}
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
                        invalid={Boolean(invalidFields?.recoveryTargets[rec.id])}
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
                          invalid={Boolean(invalidFields?.recoveryReceived[rec.id])}
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
        ) : null}
      </section>

      {/* Section 5: 반영 미리보기 */}
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
                : discountAllowed && metrics.discount > 0
                  ? `${formatWon(metrics.actualPaid)} (원승인 ${formatWon(metrics.approved)} · 할인 ${formatWon(metrics.discount)})`
                  : formatWon(metrics.actualPaid)}
            </span>
          </div>
          {draft.paymentPlan === 'installment' && metrics.remainingAfterCurrentCount > 0 && metrics.principal > 0 && metrics.principal <= metrics.availablePrincipalBalance ? (
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">잔여 원금</span>
              <span className="text-right font-bold text-foreground break-keep">
                {formatWon(metrics.remainingAfterCurrentBalance)} (남은 {metrics.remainingAfterCurrentCount}회차)
              </span>
            </div>
          ) : null}
          {metrics.recoveryTarget > 0 ? (
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">회수금</span>
              <span className="text-right font-bold text-foreground break-keep">
                {metrics.recoveryTargetNames.length > 0 ? `${formatWon(metrics.recoveryTarget)} (${metrics.recoveryTargetNames.join(', ')})` : formatWon(metrics.recoveryTarget)}
              </span>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 text-muted-foreground">생활비 지출 반영 금액</span>
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
  onOpenImport?: () => void;
};

export const ExpenseFormOverlay = ({ open, onOpenChange, draft, onDraftChange, onSave, onDelete, onOpenImport }: ExpenseFormOverlayProps) => {
  const isMobile = useIsMobileView();
  const taxRecordingEnabled = useTaxRecordingEnabled();
  const profile = usePersonalProfile();
  const allBusinesses = usePersonalBusinesses();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const { showBusinessTax } = resolveExpenseTaxEligibility(draft, profile, allBusinesses, memberTaxStatuses);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const title = aiOpen ? 'AI로 초안 작성' : draft.mode === 'edit' ? '지출 수정' : '지출 추가';
  const showDeleteButton = draft.mode === 'edit' && Boolean(onDelete);
  const currentInitialStatus = draft.initialPaymentStatus ?? draft.paymentStatus;
  const deleteDisabledReason =
    currentInitialStatus !== '지불 준비 필요'
      ? `${currentInitialStatus} 상태의 거래는 삭제할 수 없어요. 지불 상태를 '지불 준비 필요'로 먼저 변경해 저장해 주세요.`
      : draft.paymentPlan === 'installment' && (draft.initialInstallmentRound ?? draft.installmentRound ?? 1) >= 2
        ? '2회차 이후 할부 거래는 삭제할 수 없어요.'
        : draft.recoveries.some((rec) => (rec.receivedAmount ?? 0) > 0)
          ? '이미 회수한 금액이 기록된 지출은 삭제할 수 없어요. 회수한 금액을 0원으로 먼저 정정해 주세요.'
          : null;

  const renderDeleteButton = (size: 'lg' | 'md') => {
    if (!showDeleteButton) {
      return null;
    }

    const buttonClassName = cn('text-destructive hover:bg-destructive-tint hover:text-destructive', size === 'lg' && 'px-3.5');

    if (!deleteDisabledReason) {
      return (
        <Button type="button" variant="ghost" size={size} className={cn('mr-auto shrink-0', buttonClassName)} onClick={() => onDelete?.(draft)}>
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
            className="mr-auto inline-flex shrink-0 cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <Button type="button" variant="ghost" size={size} disabled className={buttonClassName}>
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
      setShowFieldErrors(false);
      setAiOpen(false);
      setAiNotice(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { errors } = validateExpenseDraftDetailed(draft, { checkTaxInfo: taxRecordingEnabled && showBusinessTax });
    if (errors.length > 0) {
      setShowFieldErrors(true);
      await showValidationAlert(errors);
      return;
    }
    setShowFieldErrors(false);
    if (draft.mode === 'edit' && draft.isFixedExpenseGenerated) {
      const confirmed = await dialog.confirm({
        title: '이 달 내역만 수정할까요?',
        description: '변경 사항은 이 달 내역에만 반영되고 고정 지출 설정은 바뀌지 않아요.',
        confirmText: '저장',
        cancelText: '취소'
      });
      if (!confirmed) return;
    }
    onSave(draft);
  };

  const handleApplyAiCandidate = (nextDraft: ExpenseDraft, summaryText: string) => {
    onDraftChange(nextDraft);
    setAiNotice(summaryText);
    setAiOpen(false);
  };

  const aiContent = <ExpenseAiAssist draft={draft} onBack={() => setAiOpen(false)} onApplyCandidate={handleApplyAiCandidate} />;
  const handleOpenImport = () => {
    if (onOpenImport) {
      onOpenImport();
      return;
    }
    void dialog.alert({
      title: '카드 내역 가져오기',
      description: 'CSV 또는 엑셀(.xlsx) 카드 이용 내역을 업로드해 일괄 등록합니다.'
    });
  };

  return (
    <ResponsiveOverlay open={open} onOpenChange={handleOpenChange}>
      <ResponsiveOverlayContent size="lg">
        {aiOpen ? (
          <div className={cn('flex min-h-0 flex-col gap-3', isMobile && 'flex-1')}>
            <ResponsiveOverlayHeader>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`${draft.mode === 'edit' ? '지출 수정' : '지출 추가'}로 돌아가기`}
                  onClick={() => setAiOpen(false)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <ResponsiveOverlayTitle>{title}</ResponsiveOverlayTitle>
              </div>
              <ResponsiveOverlayDescription className="sr-only">결제 캡처 또는 설명으로 지출 초안을 작성합니다.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="pr-0.5" dialogClassName="max-h-[calc(100dvh-11rem)] pr-1">
              {aiContent}
            </ResponsiveOverlayBody>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className={cn('flex min-h-0 flex-col gap-3', isMobile && 'flex-1')}>
            <ResponsiveOverlayHeader className={draft.mode !== 'edit' ? 'pr-9' : undefined}>
              <div className="flex items-center justify-between gap-2">
                <ResponsiveOverlayTitle>{title}</ResponsiveOverlayTitle>
                {draft.mode !== 'edit' ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenImport} className="shrink-0 gap-1 px-2.5 text-xs">
                    <Upload className="size-3.5 text-primary" />
                    <span>카드 내역 가져오기</span>
                  </Button>
                ) : null}
              </div>
              <ResponsiveOverlayDescription className="sr-only">지출 금액, 분류 분할, 납부 방식과 회수 금액을 입력합니다.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="pr-0.5" dialogClassName="max-h-[calc(100dvh-11rem)] pr-1">
              <ExpenseFormFields
                draft={draft}
                onChange={onDraftChange}
                idPrefix={isMobile ? 'sheet-expense' : 'dialog-expense'}
                onOpenAi={() => setAiOpen(true)}
                aiAppliedNotice={aiNotice}
                showFieldErrors={showFieldErrors}
              />
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter sheetClassName="flex-row gap-2">
              {renderDeleteButton('md')}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="md" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button type="submit" variant="primary" size="md">
                  저장
                </Button>
              </div>
            </ResponsiveOverlayFooter>
          </form>
        )}
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
};

type ExpensePreviewPreset = 'lump-sum' | 'ai-review' | 'installment' | 'validation-error' | 'empty';

const PRESET_MAP: Record<ExpensePreviewPreset, () => ExpenseDraft> = {
  'lump-sum': createLumpSumSplitPreset,
  'ai-review': createEmptyExpensePreset,
  installment: createInstallmentPreset,
  'validation-error': createValidationAndLockPreset,
  empty: createEmptyExpensePreset
};

const normalizePreviewPreset = (value?: string): ExpensePreviewPreset => {
  return value && value in PRESET_MAP ? (value as ExpensePreviewPreset) : 'lump-sum';
};

export const ExpenseEditPreview = ({ initialPreset }: { initialPreset?: string }) => {
  const resolvedInitial = normalizePreviewPreset(initialPreset);
  const [preset, setPreset] = useState<ExpensePreviewPreset>(resolvedInitial);
  const [draft, setDraft] = useState<ExpenseDraft>(() => PRESET_MAP[resolvedInitial]());
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [aiOpen, setAiOpen] = useState<boolean>(() => resolvedInitial === 'ai-review');
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const taxRecordingEnabled = useTaxRecordingEnabled();
  const profile = usePersonalProfile();
  const allBusinesses = usePersonalBusinesses();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const { showBusinessTax } = resolveExpenseTaxEligibility(draft, profile, allBusinesses, memberTaxStatuses);

  const handleSelectPreset = (nextPreset: ExpensePreviewPreset) => {
    setPreset(nextPreset);
    setDraft(PRESET_MAP[nextPreset]());
    setShowFieldErrors(false);
    setAiOpen(nextPreset === 'ai-review');
    setAiNotice(null);
  };

  const handleSave = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { errors } = validateExpenseDraftDetailed(draft, { checkTaxInfo: taxRecordingEnabled && showBusinessTax });
    if (errors.length > 0) {
      setShowFieldErrors(true);
      await showValidationAlert(errors);
      return;
    }
    setShowFieldErrors(false);
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
          <Button type="button" size="sm" variant={taxRecordingEnabled ? 'primary' : 'secondary'} onClick={() => setTaxRecordingEnabled(!taxRecordingEnabled)}>
            세무정보 기록: {taxRecordingEnabled ? 'ON' : 'OFF'}
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
                aria-label={`${draft.mode === 'edit' ? '지출 수정' : '지출 추가'}로 돌아가기`}
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
                  title: '지출 추가 시안',
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
            <h1 className="text-base font-bold tracking-tight text-foreground md:text-lg">{draft.mode === 'edit' ? '지출 수정' : '지출 추가'}</h1>
            <div className="flex items-center gap-1.5">
              {draft.mode !== 'edit' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void dialog.alert({
                      title: '카드 내역 가져오기',
                      description: 'CSV 또는 엑셀(.xlsx) 카드 이용 내역을 업로드해 일괄 등록합니다.'
                    })
                  }
                  className="shrink-0 gap-1 px-2.5 text-xs"
                >
                  <Upload className="size-3.5 text-primary" />
                  <span>카드 내역 가져오기</span>
                </Button>
              ) : null}
              <button
                type="button"
                aria-label="시안 닫기 안내"
                onClick={() =>
                  void dialog.alert({
                    title: '지출 추가 시안',
                    description: '실제 화면에서는 닫기 버튼을 누르면 지출 내역 화면으로 돌아갑니다.'
                  })
                }
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <ExpenseFormFields key={preset} draft={draft} onChange={setDraft} idPrefix="preview-expense" onOpenAi={() => setAiOpen(true)} aiAppliedNotice={aiNotice} showFieldErrors={showFieldErrors} />

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="lg" className="flex-1 md:flex-none" onClick={() => handleSelectPreset(preset)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="lg" className="flex-1 md:flex-none">
              저장
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
