'use client';

import { Checkbox, NumberInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@repo/ui-core';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { useTaxRecordingEnabled } from '@/shared/design-ledger-settings';
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
import {
  EXPENSE_CASH_RECEIPT_OPTIONS,
  EXPENSE_PROOF_OPTIONS,
  EXPENSE_YEAR_END_TAX_OPTIONS,
  type ExpenseCashReceiptType,
  type ExpenseProofType,
  type ExpenseTaxInfo,
  type ExpenseTaxScope,
  type ExpenseYearEndTaxType,
  type PaymentMethodKind
} from '@/shared/expense-form/expense-form-model';

export const resolveExpenseTaxEligibilityByMethod = (
  { owner, methodKind, taxInfo }: { owner: string; methodKind: PaymentMethodKind; taxInfo?: ExpenseTaxInfo },
  profile: { name: string; taxStatus: PersonalTaxStatus },
  allBusinesses: readonly PersonalBusiness[],
  memberTaxStatuses: Readonly<Record<string, PersonalTaxStatus>> = {}
) => {
  const isCurrentUser = isCurrentUserName(owner, profile.name);
  const normalizedOwner = normalizeMemberBaseName(owner);
  const taxOwnerStatus: PersonalTaxStatus = isCurrentUser ? profile.taxStatus : (memberTaxStatuses[owner] ?? memberTaxStatuses[normalizedOwner] ?? 'none');
  const ownerBusinesses = allBusinesses.filter((business) => business.active && (isCurrentUser ? business.owner === DESIGN_PROFILE_NAME : normalizeMemberBaseName(business.owner) === normalizedOwner));
  const allowsYearEndTax = taxOwnerStatus === 'worker' || (taxOwnerStatus === 'dependent' && ownerBusinesses.length === 0);
  const resolvedTaxInfo = taxInfo ?? {};
  const retainedBusiness = allBusinesses.find(({ id, active }) => !active && id === resolvedTaxInfo.businessId);
  const selectedBusinessId = ownerBusinesses.some(({ id }) => id === resolvedTaxInfo.businessId) ? resolvedTaxInfo.businessId : retainedBusiness?.id;
  const cashReceiptAllowed = methodKind !== 'card';
  const showWorkerTax = allowsYearEndTax || Boolean(resolvedTaxInfo.yearEndTaxType || (cashReceiptAllowed && resolvedTaxInfo.cashReceiptType));
  const showBusinessTax = ownerBusinesses.length > 0 || Boolean(retainedBusiness || resolvedTaxInfo.isBusinessExpense);
  return { ownerBusinesses, retainedBusiness, selectedBusinessId, cashReceiptAllowed, showWorkerTax, showBusinessTax };
};

export type ExpenseTaxSectionProps = {
  owner: string;
  methodKind: PaymentMethodKind;
  taxInfo: ExpenseTaxInfo | undefined;
  onTaxInfoChange: (next: ExpenseTaxInfo | undefined) => void;
  idPrefix?: string;
  businessIdInvalid?: boolean;
  inputVatInvalid?: boolean;
  className?: string;
};

/** 단건 지출·고정 지출 설정에서 세무정보 기록 활성화 시 공통으로 사용하는 세무 정보 입력 섹션. */
export const ExpenseTaxSection = ({
  owner,
  methodKind,
  taxInfo: rawTaxInfo,
  onTaxInfoChange,
  idPrefix = 'expense-tax',
  businessIdInvalid = false,
  inputVatInvalid = false,
  className
}: ExpenseTaxSectionProps) => {
  const taxRecordingEnabled = useTaxRecordingEnabled();
  const profile = usePersonalProfile();
  const allBusinesses = usePersonalBusinesses();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const taxInfo = rawTaxInfo ?? {};
  const { ownerBusinesses, retainedBusiness, selectedBusinessId, cashReceiptAllowed, showWorkerTax, showBusinessTax } = resolveExpenseTaxEligibilityByMethod(
    { owner, methodKind, taxInfo },
    profile,
    allBusinesses,
    memberTaxStatuses
  );

  const showTaxSection = taxRecordingEnabled && (showWorkerTax || showBusinessTax);
  const dualTaxEligible = showWorkerTax && showBusinessTax;
  const hasWorkerDetailValue = Boolean(taxInfo.yearEndTaxType || (cashReceiptAllowed && taxInfo.cashReceiptType));
  const [taxTab, setTaxTab] = useState<ExpenseTaxScope>(() => (taxInfo.taxScope === 'business' || taxInfo.isBusinessExpense ? 'business' : 'worker'));
  const activeTaxScope: ExpenseTaxScope = taxInfo.taxScope === 'business' || taxInfo.isBusinessExpense ? 'business' : taxInfo.taxScope === 'worker' || hasWorkerDetailValue ? 'worker' : taxTab;
  const workerTaxActive = showWorkerTax && (!dualTaxEligible || activeTaxScope === 'worker');
  const businessTaxActive = showBusinessTax && (dualTaxEligible ? activeTaxScope === 'business' : Boolean(taxInfo.isBusinessExpense));
  const hasBusinessValue = Boolean(taxInfo.isBusinessExpense || selectedBusinessId || taxInfo.proofType || (taxInfo.inputVatAmount ?? 0) > 0);
  const hasTaxInfoValue = Boolean((workerTaxActive && hasWorkerDetailValue) || (businessTaxActive && hasBusinessValue));
  const hasTaxInfoError = businessIdInvalid || inputVatInvalid;
  const [taxExpanded, setTaxExpanded] = useState(() => hasTaxInfoValue);
  const isTaxOpen = taxExpanded || hasTaxInfoError;

  if (!showTaxSection) {
    return null;
  }

  const handleSelectTaxTab = (nextScope: ExpenseTaxScope) => {
    if (nextScope === activeTaxScope) {
      return;
    }
    setTaxTab(nextScope);
    if (rawTaxInfo) {
      onTaxInfoChange(undefined);
    }
  };

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
            onTaxInfoChange(
              dualTaxEligible
                ? hasWorkerValue
                  ? { taxScope: 'worker', yearEndTaxType: nextYearEnd, cashReceiptType: nextCashReceipt, isBusinessExpense: false }
                  : undefined
                : { ...taxInfo, yearEndTaxType: nextYearEnd }
            );
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
              onTaxInfoChange(
                dualTaxEligible
                  ? hasWorkerValue
                    ? { taxScope: 'worker', yearEndTaxType: taxInfo.yearEndTaxType, cashReceiptType: nextCashReceipt, isBusinessExpense: false }
                    : undefined
                  : { ...taxInfo, cashReceiptType: nextCashReceipt }
              );
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
            onTaxInfoChange({
              ...taxInfo,
              ...(dualTaxEligible ? { taxScope: 'business' as const, isBusinessExpense: true } : {}),
              businessId: value || undefined
            })
          }
        >
          <SelectTrigger id={`${idPrefix}-tax-business`} invalid={businessIdInvalid}>
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
            onTaxInfoChange({
              ...taxInfo,
              ...(dualTaxEligible ? { taxScope: 'business' as const, isBusinessExpense: true } : {}),
              proofType: value === '__none__' ? undefined : (value as ExpenseProofType)
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
          invalid={inputVatInvalid}
          onValueChange={(value) =>
            onTaxInfoChange({
              ...taxInfo,
              ...(dualTaxEligible ? { taxScope: 'business' as const, isBusinessExpense: true } : {}),
              inputVatAmount: value
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
          wrapperClassName="min-h-7"
          checked={Boolean(taxInfo.isBusinessExpense)}
          onCheckedChange={(checked) => {
            const nextEnabled = checked === true;
            if (!nextEnabled) {
              if (dualTaxEligible) {
                setTaxTab('business');
              }
              onTaxInfoChange(undefined);
              return;
            }
            const matchedBusiness = ownerBusinesses[0];
            onTaxInfoChange({
              ...(dualTaxEligible ? { taxScope: 'business' as const } : {}),
              isBusinessExpense: true,
              businessId: selectedBusinessId ?? matchedBusiness?.id,
              proofType: taxInfo.proofType,
              inputVatAmount: taxInfo.inputVatAmount
            });
          }}
        />
      </div>
      {taxInfo.isBusinessExpense ? businessTaxFields : null}
    </div>
  );

  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4', className)}>
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
  );
};
