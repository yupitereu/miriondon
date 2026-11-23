'use client';

import {
  DatePicker,
  PeriodPicker,
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  type PeriodMonthValue
} from '@repo/ui-composition';
import { Button, Input, NumberInput, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn, useIsMobileView } from '@repo/ui-core';
import { ArrowLeft, ChevronDown, CircleHelp, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { IncomeAiAssist } from '@/previews/income/IncomeAiAssist';
import {
  createIncomeLines,
  EMPLOYMENT_OPTIONS,
  INCOME_DETAIL_FIELDS,
  INCOME_KINDS,
  INCOME_OWNERS,
  INCOME_STATUSES,
  TAX_OPTIONS,
  getIncomeDepositAccounts,
  getIncomeLineItem,
  netIncome,
  sumIncomeLines,
  type IncomeLine,
  type IncomeRecord
} from '@/previews/income/income-model';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { isPastTransactionDate } from '@/shared/design-date';
import { formatWon } from '@/shared/design-format';
import { useTaxRecordingEnabled } from '@/shared/design-ledger-settings';
import { isCurrentUserName, normalizeMemberBaseName, useAllMemberTaxStatuses, usePersonalBusinesses, usePersonalProfile } from '@/shared/design-personal-businesses';
import { showValidationAlert } from '@/shared/design-validation';

const sectionClassName = 'flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4';

const incomeKindDescriptions: Record<IncomeRecord['kind'], string> = {
  근로소득: '고용되어 일하고 받은 급여·상여금·일용임금.',
  사업소득: '개인사업이나 계속해서 하는 프리랜서 일로 번 돈.',
  이자소득: '예금·적금·채권 등에서 받은 이자.',
  배당소득: '주식 배당금이나 배당으로 분류된 펀드·ETF 분배금.',
  연금소득: '국민연금이나 연금저축 등에서 연금으로 받은 돈.',
  기타소득: '일회성 강연료·원고료·공모전 상금 등.',
  퇴직소득: '퇴직할 때 받는 퇴직금 등.',
  '자산 처분': '주식·부동산·금 등을 판 대금.',
  '그 밖의 입금': '증여·상속으로 받은 돈이나 세금 환급금 등.'
};

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

const Field = ({ label, help, children }: { label: string; help?: ReactNode; children: (id: string) => ReactNode }) => {
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

const Choice = <T extends string>({
  id,
  value,
  options,
  onChange,
  placeholder,
  required,
  invalid,
  renderOption
}: {
  id: string;
  value: T | '';
  options: readonly T[];
  onChange: (value: T) => void;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  renderOption?: (option: T) => ReactNode;
}) => (
  <Select
    value={value}
    required={required}
    onValueChange={(next) => {
      const option = options.find((item) => item === next);
      if (option !== undefined) onChange(option);
    }}
  >
    <SelectTrigger id={id} invalid={invalid} className="w-full">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option} value={option}>
          {renderOption ? renderOption(option) : option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const validAmount = (amount: string) => /^\d+$/.test(amount) && Number.isSafeInteger(Number(amount));
const hasPositiveLine = (rows: IncomeLine[]) => rows.some((row) => row.amount !== '' && Number(row.amount) > 0);
const validLines = (rows: IncomeLine[], section: 'payments' | 'deductions', taxRecordingEnabled: boolean) =>
  rows.every((row) => {
    if (row.itemId) return !row.amount || validAmount(row.amount);
    return Boolean(row.label?.trim() && row.amount && validAmount(row.amount) && Number(row.amount) > 0 && (section === 'deductions' || !taxRecordingEnabled || row.taxStatus));
  }) && Number.isSafeInteger(sumIncomeLines(rows));

export const IncomeEditor = ({
  record,
  existing,
  onClose,
  onSave,
  onViewAssets
}: {
  record: IncomeRecord;
  existing: boolean;
  onClose: () => void;
  onSave: (record: IncomeRecord) => void;
  onViewAssets: () => void;
}) => {
  const isMobile = useIsMobileView();
  const [open, setOpen] = useState(true);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);
  const finishWithExit = (done: () => void) => {
    if (!isMobile) {
      done();
      return;
    }
    if (!open) return;
    setOpen(false);
    closeTimerRef.current = setTimeout(done, 220);
  };
  const [draft, setDraft] = useState(() => ({ ...record, attributionMonth: record.attributionMonth || record.month }));
  const statusManuallyChanged = useRef(false);
  const monthManuallyChanged = useRef(Boolean(existing && record.month && record.date && record.month !== record.date.slice(0, 7)));
  const attributionManuallyChanged = useRef(Boolean(existing && record.attributionMonth && record.date && record.attributionMonth !== record.date.slice(0, 7)));
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const taxRecordingEnabled = useTaxRecordingEnabled();
  const profile = usePersonalProfile();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const isOwnerWorker = isCurrentUserName(draft.owner, profile.name)
    ? profile.taxStatus === 'worker'
    : (memberTaxStatuses[draft.owner] ?? memberTaxStatuses[normalizeMemberBaseName(draft.owner)] ?? 'none') === 'worker';
  const [taxOpen, setTaxOpen] = useState(
    () =>
      Boolean(record.businessId) ||
      Boolean(existing && record.attributionMonth && record.attributionMonth !== record.month) ||
      Boolean(existing && record.kind === '근로소득' && isOwnerWorker && record.details?.employment) ||
      INCOME_DETAIL_FIELDS[record.kind].some(({ key }) => Boolean(record.details?.[key]))
  );
  const [paymentsOpen, setPaymentsOpen] = useState(true);
  const [deductionsOpen, setDeductionsOpen] = useState(() => hasPositiveLine(record.deductions));
  const [draftsByKind, setDraftsByKind] = useState<Partial<Record<IncomeRecord['kind'], Pick<IncomeRecord, 'payments' | 'deductions' | 'details'>>>>({});
  const title = existing ? '수입 수정' : '수입 추가';
  const net = netIncome(draft);
  const hasPositivePayment = draft.payments.some((row) => row.amount !== '' && validAmount(row.amount) && Number(row.amount) > 0);
  const hasAmounts = hasPositivePayment && validLines(draft.payments, 'payments', taxRecordingEnabled) && validLines(draft.deductions, 'deductions', taxRecordingEnabled) && net >= 0;
  const depositAccounts = getIncomeDepositAccounts(draft.owner);
  const memberBusinesses = usePersonalBusinesses().filter(({ owner }) => owner === draft.owner);
  const availableBusinesses = memberBusinesses.filter(({ active }) => active);
  const retainedBusiness = memberBusinesses.find(({ id, active }) => !active && id === draft.businessId && id === record.businessId);
  const businessId = availableBusinesses.some(({ id }) => id === draft.businessId) ? draft.businessId : retainedBusiness?.id;
  const showEmploymentField = draft.kind === '근로소득' && isOwnerWorker;
  const showBusinessField = draft.kind === '사업소득' && (availableBusinesses.length > 0 || Boolean(retainedBusiness));
  const details = draft.details ?? {};
  const employment = EMPLOYMENT_OPTIONS.find((option) => option === details.employment) ?? '';
  const detailFields = INCOME_DETAIL_FIELDS[draft.kind].filter(({ key }) => key !== 'vatAmount' || details.vatStatus === '포함' || details.vatStatus === '별도');
  const activeDetailFields = taxRecordingEnabled ? detailFields : [];
  const update = <K extends keyof IncomeRecord>(key: K, value: IncomeRecord[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateDetail = (key: keyof typeof details, value: string) => {
    setDraft((current) => {
      const next = { ...current.details, [key]: value || undefined };
      if (key === 'vatStatus' && value !== '포함' && value !== '별도') delete next.vatAmount;
      return { ...current, details: next };
    });
  };

  const paymentsOverflow = !Number.isSafeInteger(sumIncomeLines(draft.payments));
  const deductionsOverflow = !Number.isSafeInteger(sumIncomeLines(draft.deductions));
  const invalidServiceRange = taxRecordingEnabled && Boolean(details.serviceStart && details.serviceEnd && details.serviceEnd < details.serviceStart);
  const invalidDetailAmountKeys = new Set(activeDetailFields.filter(({ key, type }) => type === 'amount' && details[key] && !validAmount(details[key])).map(({ key }) => key));
  const paymentNameErrors = new Set(draft.payments.filter((row) => !row.itemId && !row.label?.trim()).map((row) => row.id));
  const paymentAmountErrors = new Set(
    draft.payments
      .filter(
        (row) =>
          !hasPositivePayment ||
          (row.itemId ? Boolean(row.amount && !validAmount(row.amount)) : !row.amount || !validAmount(row.amount) || Number(row.amount) <= 0) ||
          (paymentsOverflow && Boolean(row.amount))
      )
      .map((row) => row.id)
  );
  const paymentTaxErrors = new Set(taxRecordingEnabled ? draft.payments.filter((row) => !row.itemId && !row.taxStatus).map((row) => row.id) : []);
  const deductionNameErrors = new Set(draft.deductions.filter((row) => !row.itemId && !row.label?.trim()).map((row) => row.id));
  const deductionAmountErrors = new Set(
    draft.deductions
      .filter(
        (row) =>
          (row.itemId ? Boolean(row.amount && !validAmount(row.amount)) : !row.amount || !validAmount(row.amount) || Number(row.amount) <= 0) ||
          ((net < 0 || deductionsOverflow) && Boolean(row.amount))
      )
      .map((row) => row.id)
  );
  const fieldErrors = {
    title: !draft.title.trim(),
    payer: !draft.payer.trim(),
    date: !draft.date,
    month: !draft.month,
    attributionMonth: taxRecordingEnabled && !draft.attributionMonth,
    accountId: !depositAccounts.some((account) => account.id === draft.accountId),
    employment: taxRecordingEnabled && showEmploymentField && !employment,
    invalidServiceRange,
    invalidDetailAmountKeys,
    paymentNameErrors,
    paymentAmountErrors,
    paymentTaxErrors,
    deductionNameErrors,
    deductionAmountErrors
  };
  const invalidFields = showFieldErrors ? fieldErrors : null;

  const save = async (confirmDeposit = false) => {
    const errors: string[] = [];
    if (fieldErrors.title || fieldErrors.payer || fieldErrors.month || fieldErrors.date || fieldErrors.attributionMonth) {
      errors.push(taxRecordingEnabled ? '내용, 지급처, 입금일, 예산 반영월과 귀속월을 입력해 주세요.' : '내용, 지급처, 입금일과 예산 반영월을 입력해 주세요.');
    }
    if (fieldErrors.accountId) {
      errors.push('입금 계좌를 선택해 주세요.');
    }
    if (fieldErrors.employment) {
      errors.push('근로 구분을 선택해 주세요.');
    }
    if (!hasAmounts) {
      errors.push('지급 금액을 입력하고, 추가한 항목을 확인해 주세요.');
    }
    if (fieldErrors.invalidServiceRange) {
      errors.push('근속 종료일을 시작일과 같거나 이후로 선택해 주세요.');
    }
    if (fieldErrors.invalidDetailAmountKeys.size > 0) {
      errors.push('세무 정보의 금액을 확인해 주세요.');
    }
    if (errors.length > 0) {
      setShowFieldErrors(true);
      if (fieldErrors.attributionMonth || fieldErrors.employment || fieldErrors.invalidServiceRange || fieldErrors.invalidDetailAmountKeys.size > 0) {
        setTaxOpen(true);
      }
      if (fieldErrors.paymentNameErrors.size > 0 || fieldErrors.paymentAmountErrors.size > 0 || fieldErrors.paymentTaxErrors.size > 0) {
        setPaymentsOpen(true);
      }
      if (fieldErrors.deductionNameErrors.size > 0 || fieldErrors.deductionAmountErrors.size > 0) {
        setDeductionsOpen(true);
      }
      await showValidationAlert(errors);
      return;
    }
    setShowFieldErrors(false);
    finishWithExit(() => onSave({ ...draft, businessId: draft.kind === '사업소득' ? businessId : undefined, status: confirmDeposit ? '입금 완료' : draft.status }));
  };

  const fields = (
    <div className="flex min-w-0 flex-col gap-3.5">
      <section className={sectionClassName}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">수입 정보</h3>
          {!existing ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setAiOpen(true)} className="gap-1 px-2.5 text-xs">
              <Sparkles className="size-3.5 text-primary" />
              AI로 초안 작성
            </Button>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <Field
            label="수입 종류"
            help={
              <dl className="divide-y divide-border">
                {INCOME_KINDS.map((kind) => (
                  <div key={kind} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 py-1.5 first:pt-0 last:pb-0">
                    <dt className="font-semibold text-foreground">{kind}</dt>
                    <dd className="text-muted-foreground">{incomeKindDescriptions[kind]}</dd>
                  </div>
                ))}
              </dl>
            }
          >
            {(id) => (
              <Choice
                id={id}
                value={draft.kind}
                options={INCOME_KINDS}
                onChange={(kind) => {
                  if (kind === draft.kind) return;
                  setDraftsByKind((current) => ({ ...current, [draft.kind]: { payments: draft.payments, deductions: draft.deductions, details: draft.details } }));
                  const next = draftsByKind[kind] ?? {
                    payments: createIncomeLines(kind, 'payments'),
                    deductions: createIncomeLines(kind, 'deductions'),
                    details: kind === '근로소득' ? { employment: EMPLOYMENT_OPTIONS[0] } : undefined
                  };
                  setDraft({ ...draft, kind, ...next });
                  setDeductionsOpen(hasPositiveLine(next.deductions));
                  setTaxOpen(INCOME_DETAIL_FIELDS[kind].some(({ key }) => Boolean(next.details?.[key])));
                }}
              />
            )}
          </Field>
          <Field label="구성원">
            {(id) => (
              <Choice
                id={id}
                value={draft.owner}
                options={INCOME_OWNERS}
                renderOption={(owner) => <MemberAvatar name={owner} size="xs" />}
                onChange={(owner) => setDraft((current) => (current.owner === owner ? current : { ...current, owner, accountId: '', businessId: undefined }))}
              />
            )}
          </Field>
          <Field label="내용">{(id) => <Input id={id} invalid={Boolean(invalidFields?.title)} value={draft.title} onChange={(e) => update('title', e.target.value)} />}</Field>
          <Field label="지급처">{(id) => <Input id={id} invalid={Boolean(invalidFields?.payer)} value={draft.payer} onChange={(e) => update('payer', e.target.value)} />}</Field>
          <Field label="입금 계좌">
            {(id) => (
              <Select value={draft.accountId} disabled={!depositAccounts.length} onValueChange={(value) => update('accountId', value)}>
                <SelectTrigger id={id} invalid={Boolean(invalidFields?.accountId)} className="min-w-0">
                  <SelectValue placeholder={depositAccounts.length ? '계좌 선택' : '등록된 계좌 없음'} />
                </SelectTrigger>
                <SelectContent>
                  {depositAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field label="입금 상태">
            {(id) => (
              <Choice
                id={id}
                value={draft.status}
                options={INCOME_STATUSES}
                onChange={(value) => {
                  statusManuallyChanged.current = true;
                  setDraft((current) => ({ ...current, status: value, date: value === '입금 완료' && current.status === '입금 예정' && current.date === record.date ? '' : current.date }));
                }}
              />
            )}
          </Field>
          <Field label="입금일">
            {(id) => (
              <DatePicker
                id={id}
                value={parseDate(draft.date)}
                invalid={Boolean(invalidFields?.date)}
                onChange={(date) => {
                  const nextMonth = date ? formatMonth({ year: date.getFullYear(), month: date.getMonth() + 1 }) : null;
                  setDraft((current) => ({
                    ...current,
                    date: formatDate(date),
                    month: nextMonth && !monthManuallyChanged.current ? nextMonth : current.month,
                    attributionMonth: nextMonth && !attributionManuallyChanged.current ? nextMonth : current.attributionMonth,
                    status: date && !statusManuallyChanged.current ? (isPastTransactionDate(date) ? '입금 완료' : '입금 예정') : current.status
                  }));
                }}
                presets={[]}
                placeholder="날짜 선택"
                className="min-w-0"
              />
            )}
          </Field>
          <Field label="예산 반영월" help={'이 수입을 예산에 반영할 월을 선택해 주세요.\n입금일과 다른 월을 선택할 수 있어요.'}>
            {(id) => {
              const value = parseMonth(draft.month);
              return value ? (
                <PeriodPicker
                  id={id}
                  mode="month"
                  size="default"
                  value={value}
                  invalid={Boolean(invalidFields?.month)}
                  onChange={(month) => {
                    monthManuallyChanged.current = true;
                    const formatted = formatMonth(month);
                    if (!taxRecordingEnabled && !attributionManuallyChanged.current) {
                      setDraft((current) => ({ ...current, month: formatted, attributionMonth: formatted }));
                    } else {
                      update('month', formatted);
                    }
                  }}
                  className="min-w-0"
                />
              ) : null;
            }}
          </Field>
        </div>
        {existing && record.status === '입금 완료' ? (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onViewAssets}>
            입금 계좌 잔액 확인
          </Button>
        ) : null}
      </section>
      {taxRecordingEnabled ? (
        <section className={sectionClassName}>
          <button
            type="button"
            aria-expanded={taxOpen}
            onClick={() => setTaxOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <h3 className="text-sm font-bold text-foreground">
              세무 정보 <span className="text-xs font-medium text-muted-foreground">(선택)</span>
            </h3>
            <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', taxOpen && 'rotate-180')} />
          </button>
          {taxOpen ? (
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              <Field label="귀속월" help={'수입이 발생한 기간에 해당하는 연월을 입력해 주세요.\n입금일이나 예산 반영월과 다를 수 있어요.'}>
                {(id) => (
                  <PeriodPicker
                    id={id}
                    mode="month"
                    size="default"
                    value={parseMonth(draft.attributionMonth) ?? parseMonth(draft.month) ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }}
                    invalid={Boolean(invalidFields?.attributionMonth)}
                    onChange={(month) => {
                      attributionManuallyChanged.current = true;
                      update('attributionMonth', formatMonth(month));
                    }}
                    className="min-w-0"
                  />
                )}
              </Field>
              {showEmploymentField ? (
                <Field label="근로 구분">
                  {(id) => (
                    <Choice
                      id={id}
                      value={employment}
                      options={EMPLOYMENT_OPTIONS}
                      onChange={(value) => updateDetail('employment', value)}
                      placeholder="선택"
                      required
                      invalid={Boolean(invalidFields?.employment)}
                    />
                  )}
                </Field>
              ) : null}
              {showBusinessField ? (
                <Field label="사업자 (선택)">
                  {(id) => (
                    <Select value={businessId ?? 'unassigned'} onValueChange={(value) => update('businessId', value === 'unassigned' ? undefined : value)}>
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
                </Field>
              ) : null}
              {detailFields.map((field) => {
                const value = details[field.key] ?? '';
                return (
                  <Field key={field.key} label={field.label}>
                    {(id) => {
                      if (field.type === 'choice') {
                        return (
                          <Choice id={id} value={value || '선택 안 함'} options={['선택 안 함', ...field.options]} onChange={(next) => updateDetail(field.key, next === '선택 안 함' ? '' : next)} />
                        );
                      }
                      if (field.type === 'date') {
                        const isInvalidServiceDate = Boolean(invalidFields?.invalidServiceRange) && (field.key === 'serviceStart' || field.key === 'serviceEnd');
                        return (
                          <DatePicker
                            id={id}
                            value={parseDate(value)}
                            invalid={isInvalidServiceDate}
                            onChange={(date) => updateDetail(field.key, formatDate(date))}
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
                            invalid={Boolean(invalidFields?.invalidDetailAmountKeys.has(field.key))}
                            value={value ? Number(value) : null}
                            onValueChange={(amount) => updateDetail(field.key, amount === null ? '' : String(amount))}
                          />
                        );
                      }
                      return <Input id={id} value={value} onChange={(event) => updateDetail(field.key, event.target.value)} />;
                    }}
                  </Field>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
      {(['payments', 'deductions'] as const).map((key) => {
        const label = key === 'payments' ? '지급 항목' : '공제 항목';
        const rows = draft[key];
        const isExpanded = key === 'payments' ? paymentsOpen : deductionsOpen;
        const toggleExpanded = () => (key === 'payments' ? setPaymentsOpen((open) => !open) : setDeductionsOpen((open) => !open));
        const sectionSum = sumIncomeLines(rows);
        const patchLine = (id: string, patch: Partial<IncomeLine>) =>
          update(
            key,
            rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
          );
        return (
          <section key={key} className={sectionClassName}>
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={toggleExpanded}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <h3 className="text-sm font-bold text-foreground">{label}</h3>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-sm font-bold text-foreground tabular-nums">{Number.isSafeInteger(sectionSum) ? formatWon(sectionSum) : '—'}</span>
                <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
              </span>
            </button>
            {isExpanded ? (
              <div className="grid min-w-0 gap-2">
                {rows.map((row) => {
                  const item = getIncomeLineItem(draft.kind, key, row.itemId);
                  const itemLabel = item?.label ?? row.label ?? '';
                  const isCustom = !row.itemId;
                  return (
                    <div
                      key={row.id}
                      className={`grid items-center gap-1.5 ${
                        key === 'payments' && taxRecordingEnabled
                          ? isCustom
                            ? 'grid-cols-[minmax(0,26%)_minmax(0,1fr)_3.75rem_1.75rem] min-[480px]:grid-cols-[minmax(0,34%)_minmax(0,1fr)_4.25rem_1.75rem]'
                            : 'grid-cols-[minmax(0,34%)_minmax(0,1fr)_2.75rem] min-[480px]:grid-cols-[minmax(0,36%)_minmax(0,1fr)_2.75rem]'
                          : isCustom
                            ? 'grid-cols-[minmax(0,38%)_minmax(0,1fr)_1.75rem]'
                            : 'grid-cols-[minmax(0,38%)_minmax(0,1fr)]'
                      }`}
                    >
                      <div className="min-w-0">
                        {isCustom ? (
                          <Input
                            aria-label={`${label} ${itemLabel || '새 항목'} 이름`}
                            placeholder="항목명"
                            className="min-w-0 flex-1"
                            invalid={Boolean((key === 'payments' ? invalidFields?.paymentNameErrors : invalidFields?.deductionNameErrors)?.has(row.id))}
                            value={row.label ?? ''}
                            onChange={(e) => patchLine(row.id, { label: e.target.value })}
                          />
                        ) : (
                          <span className="block text-xs leading-tight font-medium text-foreground break-keep">{itemLabel}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <NumberInput
                          aria-label={`${itemLabel || label} 금액`}
                          placeholder="금액 (원)"
                          className="w-full min-w-0 text-right tabular-nums"
                          invalid={Boolean((key === 'payments' ? invalidFields?.paymentAmountErrors : invalidFields?.deductionAmountErrors)?.has(row.id))}
                          value={row.amount === '' ? null : Number(row.amount)}
                          onValueChange={(value) => patchLine(row.id, { amount: value === null ? '' : String(value) })}
                        />
                      </div>
                      {key === 'payments' && taxRecordingEnabled ? (
                        <div className="flex min-w-0 justify-end">
                          {isCustom ? (
                            <Select value={row.taxStatus ?? '과세'} onValueChange={(value) => patchLine(row.id, { taxStatus: TAX_OPTIONS.find((option) => option === value) })}>
                              <SelectTrigger
                                aria-label={`${itemLabel || '추가 항목'} 과세 구분`}
                                invalid={Boolean(invalidFields?.paymentTaxErrors.has(row.id))}
                                className="w-[3.75rem] gap-0.5 px-1.5 text-xs min-[480px]:w-[4.25rem]"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TAX_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : item?.taxStatus ? (
                            <span
                              className={`inline-flex h-6 w-11 items-center justify-center rounded-md px-1.5 text-[10px] font-semibold whitespace-nowrap ${
                                item.taxStatus === '비과세' ? 'bg-primary-tint text-primary' : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {item.taxStatus}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {isCustom ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="!size-7 !min-w-7 !min-h-7 p-0"
                          aria-label={`${itemLabel || '추가 항목'} 삭제`}
                          onClick={() =>
                            update(
                              key,
                              rows.filter((candidate) => candidate.id !== row.id)
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => update(key, [...rows, { id: crypto.randomUUID(), label: '', amount: '0', ...(key === 'payments' ? { taxStatus: '과세' as const } : {}) }])}
                  >
                    <Plus className="size-3.5" /> {label} 추가
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
      <section className={cn(sectionClassName, 'gap-2 border-income/20 bg-income-tint')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">실수령액</h3>
          <output className="text-base font-extrabold text-income tabular-nums">{hasAmounts ? formatWon(net) : '—'}</output>
        </div>
      </section>
    </div>
  );

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => finishWithExit(onClose)}>
        취소
      </Button>
      <Button type="button" onClick={() => void save(existing && record.status === '입금 예정' && draft.status === '입금 완료')}>
        {existing && record.status === '입금 예정' && draft.status === '입금 완료' ? '입금 완료' : '저장'}
      </Button>
    </div>
  );

  const aiContent = (
    <IncomeAiAssist
      draft={draft}
      onBack={() => setAiOpen(false)}
      onApply={(next) => {
        setDraft(next);
        if (hasPositiveLine(next.payments)) setPaymentsOpen(true);
        if (hasPositiveLine(next.deductions)) setDeductionsOpen(true);
        if (INCOME_DETAIL_FIELDS[next.kind].some(({ key }) => Boolean(next.details?.[key])) || Boolean(next.businessId) || Boolean(next.attributionMonth && next.attributionMonth !== next.month)) {
          setTaxOpen(true);
        }
        setAiOpen(false);
      }}
    />
  );

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) finishWithExit(onClose);
      }}
    >
      <ResponsiveOverlayContent size="lg" aria-describedby={undefined}>
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>
            {aiOpen ? (
              <span className="flex items-center gap-1.5">
                <button type="button" aria-label="수입 입력으로 돌아가기" className="cursor-pointer p-1" onClick={() => setAiOpen(false)}>
                  <ArrowLeft className="size-4" />
                </button>
                AI로 초안 작성
              </span>
            ) : (
              title
            )}
          </ResponsiveOverlayTitle>
        </ResponsiveOverlayHeader>
        <ResponsiveOverlayBody dialogClassName="max-h-[calc(100dvh-11rem)]">{aiOpen ? aiContent : fields}</ResponsiveOverlayBody>
        {!aiOpen ? <ResponsiveOverlayFooter>{footer}</ResponsiveOverlayFooter> : null}
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
};
