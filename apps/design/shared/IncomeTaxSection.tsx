'use client';

import { DatePicker, PeriodPicker, type PeriodMonthValue } from '@repo/ui-composition';
import { Input, NumberInput, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@repo/ui-core';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { EMPLOYMENT_OPTIONS, INCOME_DETAIL_FIELDS, type IncomeDetailKey, type IncomeDetails, type IncomeKind } from '@/previews/income/income-model';
import { useTaxRecordingEnabled } from '@/shared/design-ledger-settings';
import {
  isCurrentUserName,
  normalizeMemberBaseName,
  useAllMemberTaxStatuses,
  usePersonalBusinesses,
  usePersonalProfile,
  type PersonalBusiness,
  type PersonalTaxStatus
} from '@/shared/design-personal-businesses';

const parseDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const formatDate = (value: Date | null) => (value ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : '');

const parseMonth = (value: string): PeriodMonthValue | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
};

const formatMonth = ({ year, month }: PeriodMonthValue) => `${year}-${String(month).padStart(2, '0')}`;
const validTaxAmount = (amount: string) => /^\d+$/.test(amount) && Number.isSafeInteger(Number(amount));

const TaxField = ({ label, help, children }: { label: string; help?: ReactNode; children: (id: string) => ReactNode }) => {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex min-h-5 items-center gap-1">
        <label htmlFor={id} className="text-xs font-semibold text-foreground">
          {label}
        </label>
        {help ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`${label} 안내`}
                className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                <CircleHelp className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              aria-label={`${label} 안내`}
              tabIndex={0}
              className="max-h-[min(28rem,var(--radix-popover-content-available-height))] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain p-3 text-xs leading-relaxed whitespace-pre-line break-keep"
            >
              {help}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {children(id)}
    </div>
  );
};

export const resolveIncomeTaxMeta = (
  {
    owner,
    kind,
    businessId,
    retainedRecordBusinessId,
    details,
    taxRecordingEnabled
  }: {
    owner: string;
    kind: IncomeKind;
    businessId?: string;
    retainedRecordBusinessId?: string;
    details?: IncomeDetails;
    taxRecordingEnabled: boolean;
  },
  profile: { name: string; taxStatus: PersonalTaxStatus },
  allBusinesses: readonly PersonalBusiness[],
  memberTaxStatuses: Readonly<Record<string, PersonalTaxStatus>> = {}
) => {
  const isOwnerWorker = isCurrentUserName(owner, profile.name)
    ? profile.taxStatus === 'worker'
    : (memberTaxStatuses[owner] ?? memberTaxStatuses[normalizeMemberBaseName(owner)] ?? 'none') === 'worker';
  const normalizedOwner = normalizeMemberBaseName(owner);
  const memberBusinesses = allBusinesses.filter((business) => normalizeMemberBaseName(business.owner) === normalizedOwner);
  const availableBusinesses = memberBusinesses.filter(({ active }) => active);
  const retainedBusiness = memberBusinesses.find(({ id, active }) => !active && id === businessId && (!retainedRecordBusinessId || id === retainedRecordBusinessId));
  const selectedBusinessId = availableBusinesses.some(({ id }) => id === businessId) ? businessId : retainedBusiness?.id;
  const resolvedDetails = details ?? {};
  const employment = EMPLOYMENT_OPTIONS.find((option) => option === resolvedDetails.employment) ?? '';
  const detailFields = INCOME_DETAIL_FIELDS[kind].filter(({ key }) => key !== 'vatAmount' || resolvedDetails.vatStatus === '포함' || resolvedDetails.vatStatus === '별도');
  const activeDetailFields = taxRecordingEnabled ? detailFields : [];
  const showEmploymentField = kind === '근로소득' && isOwnerWorker;
  const showBusinessField = kind === '사업소득' && (availableBusinesses.length > 0 || Boolean(retainedBusiness));
  const employmentInvalid = taxRecordingEnabled && showEmploymentField && !employment;
  const invalidServiceRange = taxRecordingEnabled && Boolean(resolvedDetails.serviceStart && resolvedDetails.serviceEnd && resolvedDetails.serviceEnd < resolvedDetails.serviceStart);
  const invalidDetailAmountKeys = new Set(activeDetailFields.filter(({ key, type }) => type === 'amount' && resolvedDetails[key] && !validTaxAmount(resolvedDetails[key])).map(({ key }) => key));

  return {
    isOwnerWorker,
    availableBusinesses,
    retainedBusiness,
    selectedBusinessId,
    employment,
    activeDetailFields,
    showEmploymentField,
    showBusinessField,
    employmentInvalid,
    invalidServiceRange,
    invalidDetailAmountKeys
  };
};

export type IncomeTaxSectionProps = {
  owner: string;
  kind: IncomeKind;
  businessId?: string;
  retainedRecordBusinessId?: string;
  details?: IncomeDetails;
  onBusinessIdChange: (next: string | undefined) => void;
  onDetailChange: (key: IncomeDetailKey, value: string) => void;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  invalidFields?: {
    attributionMonth?: boolean;
    employment?: boolean;
    invalidServiceRange?: boolean;
    invalidDetailAmountKeys?: ReadonlySet<string>;
  };
  attributionMonthProps?: {
    value: string;
    fallbackMonth: string;
    onChange: (ym: string) => void;
  };
  attributionRuleProps?: {
    value: 'current' | 'previous';
    onChange: (next: 'current' | 'previous') => void;
  };
  className?: string;
};

/** 단건 수입·고정 수입 설정에서 세무정보 기록 활성화 시 공통으로 사용하는 세무 정보 입력 섹션. */
export const IncomeTaxSection = ({
  owner,
  kind,
  businessId,
  retainedRecordBusinessId,
  details: rawDetails,
  onBusinessIdChange,
  onDetailChange,
  open,
  onOpenChange,
  invalidFields,
  attributionMonthProps,
  attributionRuleProps,
  className
}: IncomeTaxSectionProps) => {
  const taxRecordingEnabled = useTaxRecordingEnabled();
  const profile = usePersonalProfile();
  const allBusinesses = usePersonalBusinesses();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const details = rawDetails ?? {};

  const { availableBusinesses, retainedBusiness, selectedBusinessId, employment, activeDetailFields, showEmploymentField, showBusinessField } = resolveIncomeTaxMeta(
    { owner, kind, businessId, retainedRecordBusinessId, details, taxRecordingEnabled },
    profile,
    allBusinesses,
    memberTaxStatuses
  );

  if (!taxRecordingEnabled) {
    return null;
  }

  const hasAnyTaxFields = Boolean(attributionMonthProps || attributionRuleProps) || showEmploymentField || showBusinessField || activeDetailFields.length > 0;
  if (!hasAnyTaxFields) {
    return null;
  }

  return (
    <section className={cn('flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        <h3 className="text-sm font-bold text-foreground">
          세무 정보 <span className="text-xs font-medium text-muted-foreground">(선택)</span>
        </h3>
        <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 min-[360px]:grid-cols-2">
          {attributionMonthProps ? (
            <TaxField label="귀속월" help={'수입이 발생한 기간에 해당하는 연월을 입력해 주세요.\n입금일이나 예산 반영월과 다를 수 있어요.'}>
              {(id) => (
                <PeriodPicker
                  id={id}
                  mode="month"
                  size="default"
                  value={
                    parseMonth(attributionMonthProps.value) ??
                    parseMonth(attributionMonthProps.fallbackMonth) ?? {
                      year: new Date().getFullYear(),
                      month: new Date().getMonth() + 1
                    }
                  }
                  invalid={Boolean(invalidFields?.attributionMonth)}
                  onChange={(month) => attributionMonthProps.onChange(formatMonth(month))}
                  className="min-w-0"
                />
              )}
            </TaxField>
          ) : attributionRuleProps ? (
            <TaxField label="귀속월" help={'수입이 발생한 기간 기준 귀속월 반영 규칙을 선택해 주세요.\n전달에 일한 급여라면 입금 전월로 설정할 수 있어요.'}>
              {(id) => (
                <Select value={attributionRuleProps.value} onValueChange={(next) => attributionRuleProps.onChange(next as 'current' | 'previous')}>
                  <SelectTrigger id={id} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">입금 당월 반영</SelectItem>
                    <SelectItem value="previous">입금 전월 반영</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </TaxField>
          ) : null}

          {showEmploymentField ? (
            <TaxField label="근로 구분">
              {(id) => (
                <Select
                  value={employment}
                  required
                  onValueChange={(next) => {
                    const option = EMPLOYMENT_OPTIONS.find((item) => item === next);
                    if (option !== undefined) onDetailChange('employment', option);
                  }}
                >
                  <SelectTrigger id={id} invalid={Boolean(invalidFields?.employment)} className="w-full">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </TaxField>
          ) : null}

          {showBusinessField ? (
            <TaxField label="사업자 (선택)">
              {(id) => (
                <Select value={selectedBusinessId ?? 'unassigned'} onValueChange={(value) => onBusinessIdChange(value === 'unassigned' ? undefined : value)}>
                  <SelectTrigger id={id} className="min-w-0">
                    <SelectValue placeholder="선택 안 함" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[var(--radix-select-content-available-width)]">
                    <SelectItem value="unassigned">선택 안 함</SelectItem>
                    {availableBusinesses.map((business) => (
                      <SelectItem key={business.id} value={business.id} className="wrap-anywhere">
                        {business.name}
                        {business.businessNumber ? ` (${business.businessNumber})` : ''}
                      </SelectItem>
                    ))}
                    {retainedBusiness ? (
                      <SelectItem value={retainedBusiness.id} className="wrap-anywhere" disabled>
                        {retainedBusiness.name} (사용 중지)
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              )}
            </TaxField>
          ) : null}

          {activeDetailFields.map((field) => {
            const value = details[field.key] ?? '';
            return (
              <TaxField key={field.key} label={field.label}>
                {(id) => {
                  if (field.type === 'choice') {
                    return (
                      <Select value={value || '선택 안 함'} onValueChange={(next) => onDetailChange(field.key, next === '선택 안 함' ? '' : next)}>
                        <SelectTrigger id={id} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['선택 안 함', ...field.options].map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }
                  if (field.type === 'date') {
                    const isInvalidServiceDate = Boolean(invalidFields?.invalidServiceRange) && (field.key === 'serviceStart' || field.key === 'serviceEnd');
                    return (
                      <DatePicker
                        id={id}
                        value={parseDate(value)}
                        invalid={isInvalidServiceDate}
                        onChange={(date) => onDetailChange(field.key, formatDate(date))}
                        presets={[]}
                        clearable
                        placeholder="날짜 선택"
                        className="min-w-0"
                      />
                    );
                  }
                  if (field.type === 'amount') {
                    return (
                      <NumberInput
                        id={id}
                        invalid={Boolean(invalidFields?.invalidDetailAmountKeys?.has(field.key))}
                        value={value ? Number(value) : null}
                        onValueChange={(amount) => onDetailChange(field.key, amount === null ? '' : String(amount))}
                      />
                    );
                  }
                  return <Input id={id} value={value} onChange={(event) => onDetailChange(field.key, event.target.value)} />;
                }}
              </TaxField>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
