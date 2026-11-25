'use client';

import {
  EmptyState,
  PeriodPicker,
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  dialog,
  type PeriodMonthValue
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  cn
} from '@repo/ui-core';
import { ArrowDownCircle, ArrowUpCircle, CircleHelp, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

import {
  EMPLOYMENT_OPTIONS,
  INCOME_DETAIL_FIELDS,
  INCOME_KINDS,
  createIncomeLines,
  sumIncomeLines,
  type IncomeDetailKey,
  type IncomeDetails,
  type IncomeKind,
  type IncomeLine
} from '@/previews/income/income-model';
import {
  CURRENT_PREVIEW_MONTH,
  type BudgetAllocationRule,
  type FixedExpenseRuleRecord,
  type FixedIncomeRuleRecord,
  type LedgerAssetRecord,
  type LedgerCardRecord,
  type LedgerCategoryRecord,
  type TaxAttributionMonthRule
} from '@/previews/settings/settings-model';
import { IncomeLineItemsEditor } from '@/shared/IncomeLineItemsEditor';
import { IncomeTaxSection, resolveIncomeTaxMeta } from '@/shared/IncomeTaxSection';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatWon } from '@/shared/design-format';
import { useTaxRecordingEnabled } from '@/shared/design-ledger-settings';
import { useAllMemberTaxStatuses, usePersonalBusinesses, usePersonalProfile } from '@/shared/design-personal-businesses';
import { showValidationAlert } from '@/shared/design-validation';
import { ExpenseTaxSection, resolveExpenseTaxEligibilityByMethod } from '@/shared/expense-form/ExpenseTaxSection';
import { validateExpenseTaxInfo, type ExpenseTaxInfo } from '@/shared/expense-form/expense-form-model';

const sectionClass = 'rounded-xl border border-border bg-card p-4 sm:p-5';

const formatYearMonth = ({ year, month }: PeriodMonthValue) => `${year}-${String(month).padStart(2, '0')}`;
const parseYearMonth = (ym: string): PeriodMonthValue => ({ year: Number(ym.slice(0, 4)) || 2026, month: Number(ym.slice(5, 7)) || 11 });
const formatDisplayMonth = (ym: string) => ym.replace('-', '.');

const getFixedCreateNoticeText = (kind: '수입' | '지출', applyNow: boolean, startMonth: PeriodMonthValue) => {
  if (applyNow) {
    return `적용 시작월(${formatDisplayMonth(formatYearMonth(startMonth))}) 이후 생성된 ${kind} 내역에 바로 추가되고, 신규 생성 월 장부에 자동 반영돼요.`;
  }
  return `추가된 고정 ${kind}은 신규 생성 월 장부에 자동 반영돼요.`;
};

const sumIncomeLineArray = (lines: readonly IncomeLine[]) => lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

type FixedIncomeDraft = {
  id: string | null;
  kind: IncomeKind;
  title: string;
  payer: string;
  owner: string;
  accountId: string;
  day: number | null;
  budgetRule: BudgetAllocationRule;
  startMonth: PeriodMonthValue;
  attributionMonthRule: TaxAttributionMonthRule;
  businessId?: string;
  details?: IncomeDetails;
  payments: IncomeLine[];
  deductions: IncomeLine[];
  applyNow: boolean;
};

type FixedExpenseDraft = {
  id: string | null;
  title: string;
  categoryId: string;
  paymentChoiceValue: string;
  actualUser: string;
  day: number | null;
  startMonth: PeriodMonthValue;
  approvedAmount: number | null;
  discountAmount: number | null;
  performanceIncluded: boolean;
  taxInfo?: ExpenseTaxInfo;
  applyNow: boolean;
};

export const SettingsFixedTab = ({
  owners,
  actualUsers,
  assets,
  cards,
  categories,
  fixedIncomes,
  onFixedIncomesChange,
  fixedExpenses,
  onFixedExpensesChange
}: {
  owners: readonly string[];
  actualUsers: readonly string[];
  assets: readonly LedgerAssetRecord[];
  cards: readonly LedgerCardRecord[];
  categories: readonly LedgerCategoryRecord[];
  fixedIncomes: readonly FixedIncomeRuleRecord[];
  onFixedIncomesChange: (updater: (prev: FixedIncomeRuleRecord[]) => FixedIncomeRuleRecord[]) => void;
  fixedExpenses: readonly FixedExpenseRuleRecord[];
  onFixedExpensesChange: (updater: (prev: FixedExpenseRuleRecord[]) => FixedExpenseRuleRecord[]) => void;
}) => {
  const taxRecordingEnabled = useTaxRecordingEnabled();
  const profile = usePersonalProfile();
  const allBusinesses = usePersonalBusinesses();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const [incomeDraft, setIncomeDraft] = useState<FixedIncomeDraft | null>(null);
  const [incomeTaxOpen, setIncomeTaxOpen] = useState(false);
  const [incomePaymentsOpen, setIncomePaymentsOpen] = useState(true);
  const [incomeDeductionsOpen, setIncomeDeductionsOpen] = useState(true);
  const [incomeInvalid, setIncomeInvalid] = useState<Set<string>>(() => new Set());
  const [expenseDraft, setExpenseDraft] = useState<FixedExpenseDraft | null>(null);
  const [expenseInvalid, setExpenseInvalid] = useState<Set<string>>(() => new Set());
  const sortedFixedIncomes = [...fixedIncomes].sort((a, b) => a.day - b.day);
  const sortedFixedExpenses = [...fixedExpenses].sort((a, b) => a.day - b.day);

  const activeDepositAccounts = assets.filter((item) => !item.inactive && item.group === 'cash-liquid' && item.typeLabel !== '현금');
  const activeCashAssets = assets.filter((item) => !item.inactive && item.group === 'cash-liquid' && item.typeLabel === '현금');
  const activeCards = cards.filter((card) => !card.inactive);
  const activeCategories = categories.filter((cat) => !cat.disabled);

  const findAssetName = (assetId: string) => assets.find((item) => item.id === assetId)?.name ?? '계좌 확인 필요';
  const findCategoryName = (categoryId: string) => {
    const found = categories.find((cat) => cat.id === categoryId);
    if (!found) return '분류 확인 필요';
    return found.name;
  };
  const findExpensePaymentLabel = (rule: FixedExpenseRuleRecord) => {
    if (rule.paymentMethodType === 'card') {
      const card = cards.find((item) => item.id === rule.paymentTargetId);
      return card?.label ?? '카드 확인 필요';
    }
    return findAssetName(rule.paymentTargetId);
  };

  const clearIncomeInvalid = (key: string) => {
    setIncomeInvalid((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const clearExpenseInvalid = (key: string) => {
    setExpenseInvalid((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const openFixedIncomeEditor = (rule: FixedIncomeRuleRecord | null) => {
    setIncomeInvalid(new Set());
    setIncomePaymentsOpen(true);
    setIncomeDeductionsOpen(true);
    if (rule) {
      setIncomeTaxOpen(
        Boolean(rule.businessId) ||
          rule.attributionMonthRule === 'previous' ||
          Boolean(rule.kind === '근로소득' && rule.details?.employment) ||
          INCOME_DETAIL_FIELDS[rule.kind].some(({ key }) => Boolean(rule.details?.[key]))
      );
      setIncomeDraft({
        id: rule.id,
        kind: rule.kind,
        title: rule.title,
        payer: rule.payer,
        owner: rule.owner,
        accountId: rule.accountId,
        day: rule.day,
        budgetRule: rule.budgetRule,
        startMonth: parseYearMonth(rule.startMonth),
        attributionMonthRule: rule.attributionMonthRule ?? 'current',
        businessId: rule.businessId,
        details: rule.details ? { ...rule.details } : undefined,
        payments: rule.payments.map((line) => ({ ...line })),
        deductions: rule.deductions.map((line) => ({ ...line })),
        applyNow: false
      });
      return;
    }

    const defaultOwner = owners[0] ?? '민지(나)';
    const ownerAccounts = activeDepositAccounts.filter((item) => item.owner === defaultOwner);
    const defaultAccountId = ownerAccounts[0]?.id ?? activeDepositAccounts[0]?.id ?? '';
    setIncomeTaxOpen(false);
    setIncomeDraft({
      id: null,
      kind: '근로소득',
      title: '',
      payer: '',
      owner: defaultOwner,
      accountId: defaultAccountId,
      day: 25,
      budgetRule: 'current',
      startMonth: parseYearMonth(CURRENT_PREVIEW_MONTH),
      attributionMonthRule: 'current',
      details: { employment: EMPLOYMENT_OPTIONS[0] },
      payments: createIncomeLines('근로소득', 'payments'),
      deductions: createIncomeLines('근로소득', 'deductions'),
      applyNow: true
    });
  };

  const editingIncomeRule = incomeDraft?.id ? fixedIncomes.find((item) => item.id === incomeDraft.id) : undefined;
  const incomeTaxMeta = incomeDraft
    ? resolveIncomeTaxMeta(
        {
          owner: incomeDraft.owner,
          kind: incomeDraft.kind,
          businessId: incomeDraft.businessId,
          retainedRecordBusinessId: editingIncomeRule?.businessId,
          details: incomeDraft.details,
          taxRecordingEnabled
        },
        profile,
        allBusinesses,
        memberTaxStatuses
      )
    : null;

  const handleSaveFixedIncome = () => {
    if (!incomeDraft) return;
    const errors: string[] = [];
    const nextInvalid = new Set<string>();
    const startYm = formatYearMonth(incomeDraft.startMonth);

    if (!incomeDraft.title.trim()) {
      nextInvalid.add('title');
      errors.push('내용을 입력해 주세요.');
    }
    if (!incomeDraft.accountId) {
      nextInvalid.add('accountId');
      errors.push('입금 계좌를 선택해 주세요.');
    }
    if (incomeDraft.day == null || !Number.isInteger(incomeDraft.day) || incomeDraft.day < 1 || incomeDraft.day > 31) {
      nextInvalid.add('day');
      errors.push('입금 예정일은 1~31일 사이 정수로 입력해 주세요.');
    }
    if (incomeTaxMeta?.employmentInvalid) {
      nextInvalid.add('employment');
      errors.push('근로 구분을 선택해 주세요.');
    }

    const paymentSum = sumIncomeLineArray(incomeDraft.payments);
    const deductionSum = sumIncomeLineArray(incomeDraft.deductions);
    const netAmount = paymentSum - deductionSum;
    const hasEmptyCustomLabel =
      incomeDraft.payments.some((line) => !line.itemId && !line.label?.trim() && (Number(line.amount) || 0) > 0) ||
      incomeDraft.deductions.some((line) => !line.itemId && !line.label?.trim() && (Number(line.amount) || 0) > 0);

    if (hasEmptyCustomLabel) {
      setIncomePaymentsOpen(true);
      setIncomeDeductionsOpen(true);
      errors.push('직접 추가한 지급·공제 항목의 이름을 입력해 주세요.');
    }
    if (paymentSum <= 0 || netAmount <= 0) {
      nextInvalid.add('payments');
      setIncomePaymentsOpen(true);
      setIncomeDeductionsOpen(true);
      errors.push('예정 실수령액(지급 합계 − 공제 합계)이 0원보다 커야 해요.');
    }
    if (incomeTaxMeta?.invalidServiceRange) {
      nextInvalid.add('invalidServiceRange');
      errors.push('근속 종료일을 시작일과 같거나 이후로 선택해 주세요.');
    }
    if (incomeTaxMeta && incomeTaxMeta.invalidDetailAmountKeys.size > 0) {
      for (const key of incomeTaxMeta.invalidDetailAmountKeys) {
        nextInvalid.add(`detail:${key}`);
      }
      errors.push('세무 정보의 금액을 확인해 주세요.');
    }

    if (errors.length > 0) {
      setIncomeInvalid(nextInvalid);
      if (incomeTaxMeta?.employmentInvalid || incomeTaxMeta?.invalidServiceRange || (incomeTaxMeta?.invalidDetailAmountKeys.size ?? 0) > 0) {
        setIncomeTaxOpen(true);
      }
      void showValidationAlert(errors);
      return;
    }

    const savedRule: FixedIncomeRuleRecord = {
      id: incomeDraft.id ?? `fix-inc-${Date.now()}`,
      kind: incomeDraft.kind,
      title: incomeDraft.title.trim(),
      payer: incomeDraft.payer.trim(),
      owner: incomeDraft.owner,
      accountId: incomeDraft.accountId,
      day: incomeDraft.day ?? 25,
      budgetRule: incomeDraft.budgetRule,
      startMonth: startYm,
      attributionMonthRule: taxRecordingEnabled ? incomeDraft.attributionMonthRule : undefined,
      businessId: incomeDraft.kind === '사업소득' ? incomeTaxMeta?.selectedBusinessId : undefined,
      details: incomeDraft.details,
      payments: incomeDraft.payments.map((line) => ({ ...line })),
      deductions: incomeDraft.deductions.map((line) => ({ ...line }))
    };

    onFixedIncomesChange((prev) => (incomeDraft.id ? prev.map((item) => (item.id === incomeDraft.id ? savedRule : item)) : [...prev, savedRule]));
    const applyNowChecked = !incomeDraft.id && incomeDraft.applyNow;
    setIncomeDraft(null);
    void dialog.alert({
      title: '고정 수입을 저장했어요',
      description: applyNowChecked
        ? `신규 생성 월부터 자동 추가하며, ${formatDisplayMonth(startYm)} 이후 수입 내역에도 지금 바로 추가했어요.`
        : '신규 생성 월부터 자동 추가하며, 이미 생성된 월의 내역은 바뀌지 않아요.'
    });
  };

  const handleDeleteFixedIncome = async (rule: FixedIncomeRuleRecord) => {
    const ok = await dialog.confirm({
      title: `'${rule.title}' 고정 수입을 삭제할까요?`,
      description: '신규 생성 월부터 자동 생성을 멈춰요. 이미 생성된 월의 수입 내역은 그대로 유지돼요.',
      confirmText: '삭제',
      variant: 'destructive'
    });
    if (!ok) return;
    onFixedIncomesChange((prev) => prev.filter((item) => item.id !== rule.id));
    setIncomeDraft(null);
  };

  const openFixedExpenseEditor = (rule: FixedExpenseRuleRecord | null) => {
    setExpenseInvalid(new Set());
    if (rule) {
      setExpenseDraft({
        id: rule.id,
        title: rule.title,
        categoryId: rule.categoryId,
        paymentChoiceValue: `${rule.paymentMethodType}:${rule.paymentTargetId}`,
        actualUser: rule.actualUser,
        day: rule.day,
        startMonth: parseYearMonth(rule.startMonth),
        approvedAmount: rule.approvedAmount,
        discountAmount: rule.discountAmount,
        performanceIncluded: rule.performanceIncluded,
        taxInfo: rule.taxInfo ? { ...rule.taxInfo } : undefined,
        applyNow: false
      });
      return;
    }

    const defaultPaymentChoice = activeCards[0]
      ? `card:${activeCards[0].id}`
      : activeDepositAccounts[0]
        ? `account:${activeDepositAccounts[0].id}`
        : activeCashAssets[0]
          ? `cash:${activeCashAssets[0].id}`
          : '';

    setExpenseDraft({
      id: null,
      title: '',
      categoryId: activeCategories[0]?.id ?? '',
      paymentChoiceValue: defaultPaymentChoice,
      actualUser: actualUsers[0] ?? '민지(나)',
      day: 25,
      startMonth: parseYearMonth(CURRENT_PREVIEW_MONTH),
      approvedAmount: null,
      discountAmount: 0,
      performanceIncluded: Boolean(activeCards[0]),
      applyNow: true
    });
  };

  const parsePaymentChoice = (choice: string): { type: 'card' | 'account' | 'cash'; targetId: string } => {
    const [rawType, ...rest] = choice.split(':');
    const targetId = rest.join(':');
    if (rawType === 'card' || rawType === 'account' || rawType === 'cash') {
      return { type: rawType, targetId };
    }
    return { type: 'account', targetId };
  };

  const resolveExpenseMethodOwner = (choice: string, fallbackOwner: string) => {
    const parsed = parsePaymentChoice(choice);
    const owner = parsed.type === 'card' ? cards.find((c) => c.id === parsed.targetId)?.owner : assets.find((a) => a.id === parsed.targetId)?.owner;
    return { methodKind: parsed.type, owner: owner ?? fallbackOwner };
  };

  const handleSaveFixedExpense = () => {
    if (!expenseDraft) return;
    const errors: string[] = [];
    const nextInvalid = new Set<string>();
    const startYm = formatYearMonth(expenseDraft.startMonth);
    const { type: paymentMethodType, targetId: paymentTargetId } = parsePaymentChoice(expenseDraft.paymentChoiceValue);

    if (!expenseDraft.title.trim()) {
      nextInvalid.add('title');
      errors.push('내용을 입력해 주세요.');
    }
    if (!expenseDraft.categoryId) {
      nextInvalid.add('categoryId');
      errors.push('분류를 선택해 주세요.');
    }
    if (!paymentTargetId) {
      nextInvalid.add('paymentChoiceValue');
      errors.push('결제 수단을 선택해 주세요.');
    }
    if (expenseDraft.day == null || !Number.isInteger(expenseDraft.day) || expenseDraft.day < 1 || expenseDraft.day > 31) {
      nextInvalid.add('day');
      errors.push('매월 예정일은 1~31일 사이 정수로 입력해 주세요.');
    }

    const approved = expenseDraft.approvedAmount ?? 0;
    const discount = paymentMethodType === 'card' ? (expenseDraft.discountAmount ?? 0) : 0;
    if (expenseDraft.approvedAmount == null || !Number.isSafeInteger(approved) || approved <= 0) {
      nextInvalid.add('approvedAmount');
      errors.push('기본 예정 금액을 0원보다 큰 정수로 입력해 주세요.');
    }
    if (paymentMethodType === 'card' && (!Number.isSafeInteger(discount) || discount < 0 || approved - discount <= 0)) {
      nextInvalid.add('discountAmount');
      errors.push('할인 후 예정 금액이 0원보다 커야 해요.');
    }

    const expenseMethodMeta = resolveExpenseMethodOwner(expenseDraft.paymentChoiceValue, expenseDraft.actualUser);
    const { showBusinessTax } = resolveExpenseTaxEligibilityByMethod(
      { owner: expenseMethodMeta.owner, methodKind: expenseMethodMeta.methodKind, taxInfo: expenseDraft.taxInfo },
      profile,
      allBusinesses,
      memberTaxStatuses
    );
    const taxValidation = validateExpenseTaxInfo(expenseDraft.taxInfo, taxRecordingEnabled && showBusinessTax);
    if (taxValidation.errors.length > 0) {
      errors.push(...taxValidation.errors);
      if (taxValidation.businessId) nextInvalid.add('businessId');
      if (taxValidation.inputVatAmount) nextInvalid.add('inputVatAmount');
    }

    if (errors.length > 0) {
      setExpenseInvalid(nextInvalid);
      void showValidationAlert(errors);
      return;
    }

    const savedRule: FixedExpenseRuleRecord = {
      id: expenseDraft.id ?? `fix-exp-${Date.now()}`,
      title: expenseDraft.title.trim(),
      categoryId: expenseDraft.categoryId,
      paymentMethodType,
      paymentTargetId,
      actualUser: expenseDraft.actualUser,
      day: expenseDraft.day ?? 25,
      startMonth: startYm,
      approvedAmount: approved,
      discountAmount: discount,
      performanceIncluded: paymentMethodType === 'card' ? expenseDraft.performanceIncluded : false,
      taxInfo: taxRecordingEnabled ? expenseDraft.taxInfo : undefined
    };

    onFixedExpensesChange((prev) => (expenseDraft.id ? prev.map((item) => (item.id === expenseDraft.id ? savedRule : item)) : [...prev, savedRule]));
    const applyNowChecked = !expenseDraft.id && expenseDraft.applyNow;
    setExpenseDraft(null);
    void dialog.alert({
      title: '고정 지출을 저장했어요',
      description: applyNowChecked
        ? `신규 생성 월부터 자동 추가하며, ${formatDisplayMonth(startYm)} 이후 지출 내역에도 지금 바로 추가했어요.`
        : '신규 생성 월부터 자동 추가하며, 이미 생성된 월의 지출 내역은 바뀌지 않아요.'
    });
  };

  const handleDeleteFixedExpense = async (rule: FixedExpenseRuleRecord) => {
    const ok = await dialog.confirm({
      title: `'${rule.title}' 고정 지출을 삭제할까요?`,
      description: '신규 생성 월부터 자동 생성을 멈춰요. 이미 생성된 월의 지출 내역은 그대로 유지돼요.',
      confirmText: '삭제',
      variant: 'destructive'
    });
    if (!ok) return;
    onFixedExpensesChange((prev) => prev.filter((item) => item.id !== rule.id));
    setExpenseDraft(null);
  };

  const incomePaymentTotal = incomeDraft ? sumIncomeLineArray(incomeDraft.payments) : 0;
  const incomeDeductionTotal = incomeDraft ? sumIncomeLineArray(incomeDraft.deductions) : 0;
  const incomeNetTotal = incomePaymentTotal - incomeDeductionTotal;
  const incomeDepositPool = incomeDraft
    ? (() => {
        const ownerSpecific = activeDepositAccounts.filter((item) => item.owner === incomeDraft.owner);
        return ownerSpecific.length > 0 ? ownerSpecific : activeDepositAccounts;
      })()
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* 고정 수입 섹션 */}
      <section id="fixed-income" className={cn(sectionClass, 'scroll-mt-20')} aria-label="고정 수입 관리">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowDownCircle aria-hidden="true" className="size-4 text-income" />
            <h2 className="text-base font-bold">고정 수입</h2>
            <Badge variant="count" className="tabular-nums">
              {fixedIncomes.length}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="고정 수입 관리 안내"
                  className="-my-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CircleHelp aria-hidden="true" className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                매월 반복되는 급여나 정기 수입을 등록하면 신규 생성 월 장부에 입금 예정으로 자동 추가돼요. 실제 입금 보정과 완료 처리는 수입 내역에서 진행해요.
              </PopoverContent>
            </Popover>
          </div>
          <Button type="button" variant="income" size="sm" aria-label="고정 수입 추가" onClick={() => openFixedIncomeEditor(null)}>
            <Plus className="size-4" /> 추가
          </Button>
        </div>

        {fixedIncomes.length === 0 ? (
          <EmptyState title="등록된 고정 수입이 없어요" description="매월 들어오는 급여나 정기 수입을 등록하면 월 예산과 바로 대조할 수 있어요." />
        ) : (
          <>
            {/* 모바일 카드 리스트 */}
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
              {sortedFixedIncomes.map((rule) => {
                const netAmount = sumIncomeLines(rule.payments) - sumIncomeLines(rule.deductions);
                return (
                  <div
                    key={rule.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${rule.title} 수정`}
                    className="flex cursor-pointer flex-col gap-2 p-3 transition-colors hover:bg-muted/20 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                    onClick={() => openFixedIncomeEditor(rule)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      openFixedIncomeEditor(rule);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex rounded-md bg-primary-tint/55 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">매월 {rule.day}일</span>
                      <Badge variant="neutral">{rule.kind}</Badge>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="text-sm font-bold break-keep text-foreground">{rule.title}</strong>
                        </div>
                      </div>
                      <strong className="shrink-0 text-sm font-bold whitespace-nowrap text-income tabular-nums">{formatWon(netAmount)}</strong>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <MemberAvatar name={rule.owner} size="sm" mode="icon-hover" />
                      <span className="min-w-0 truncate">{findAssetName(rule.accountId)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 태블릿/PC 정렬 테이블 */}
            <div className="hidden overflow-hidden rounded-lg border border-border md:block">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="w-20 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-24">
                      예정일
                    </th>
                    <th scope="col" className="w-20 px-2 py-2.5 text-left font-medium whitespace-nowrap">
                      소득 분류
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                      내용
                    </th>
                    <th scope="col" className="w-30 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-40">
                      귀속 · 입금 계좌
                    </th>
                    <th scope="col" className="w-24 px-2 py-2.5 text-right font-medium whitespace-nowrap lg:w-28">
                      예정 실수령액
                    </th>
                    <th scope="col" className="w-12 px-1 py-2.5 text-center font-medium whitespace-nowrap">
                      수정
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedFixedIncomes.map((rule) => {
                    const netAmount = sumIncomeLines(rule.payments) - sumIncomeLines(rule.deductions);
                    return (
                      <tr key={rule.id} className="hover:bg-muted/20">
                        <td className="px-2 py-2.5 text-xs">
                          <p className="font-semibold text-foreground tabular-nums">매월 {rule.day}일</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <Badge variant="neutral">{rule.kind}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="truncate font-semibold text-foreground">{rule.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{rule.payer || '지급처 미입력'}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <p className="truncate text-xs font-medium text-foreground">{findAssetName(rule.accountId)}</p>
                          <div className="flex items-center gap-1.5">
                            <MemberAvatar name={rule.owner} size="xs" mode="icon-hover" />
                            <span className="truncate text-xs text-muted-foreground">{rule.owner}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold whitespace-nowrap text-income tabular-nums">{formatWon(netAmount)}</td>
                        <td className="px-1 py-2.5 text-center">
                          <Button type="button" size="icon-xs" variant="outline" aria-label={`${rule.title} 수정`} title={`${rule.title} 수정`} onClick={() => openFixedIncomeEditor(rule)}>
                            <Pencil aria-hidden="true" className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 고정 지출 섹션 */}
      <section id="fixed-expense" className={cn(sectionClass, 'scroll-mt-20')} aria-label="고정 지출 관리">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowUpCircle aria-hidden="true" className="size-4 text-expense" />
            <h2 className="text-base font-bold">고정 지출</h2>
            <Badge variant="count" className="tabular-nums">
              {fixedExpenses.length}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="고정 지출 관리 안내"
                  className="-my-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CircleHelp aria-hidden="true" className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                매월 반복되는 구독·통신비·공과금 등을 등록하면 신규 생성 월 장부에 예정 지출로 자동 추가되어 생활비와 카드 실적에 선반영돼요.
              </PopoverContent>
            </Popover>
          </div>
          <Button type="button" variant="expense" size="sm" aria-label="고정 지출 추가" onClick={() => openFixedExpenseEditor(null)}>
            <Plus className="size-4" /> 추가
          </Button>
        </div>

        {fixedExpenses.length === 0 ? (
          <EmptyState title="등록된 고정 지출이 없어요" description="매월 고정으로 나가는 지출을 등록하면 신규 생성 월 장부에 예정 지출로 자동 반영해요." />
        ) : (
          <>
            {/* 모바일 카드 리스트 */}
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
              {sortedFixedExpenses.map((rule) => {
                const discountedAmount = rule.approvedAmount - rule.discountAmount;
                return (
                  <div
                    key={rule.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${rule.title} 수정`}
                    className="flex cursor-pointer flex-col gap-2 p-3 transition-colors hover:bg-muted/20 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                    onClick={() => openFixedExpenseEditor(rule)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      openFixedExpenseEditor(rule);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex rounded-md bg-primary-tint/55 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">매월 {rule.day}일</span>
                      <Badge variant="neutral">{findCategoryName(rule.categoryId)}</Badge>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="text-sm font-bold break-keep text-foreground">{rule.title}</strong>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <strong className="block text-sm font-bold whitespace-nowrap text-expense tabular-nums">{formatWon(discountedAmount)}</strong>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <MemberAvatar name={rule.actualUser} size="sm" mode="icon-hover" />
                      <span className="min-w-0 flex-1 truncate">{findExpensePaymentLabel(rule)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 태블릿/PC 정렬 테이블 */}
            <div className="hidden overflow-hidden rounded-lg border border-border md:block">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="w-20 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-24">
                      예정일
                    </th>
                    <th scope="col" className="w-20 px-2 py-2.5 text-left font-medium whitespace-nowrap">
                      지출 분류
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                      내용
                    </th>
                    <th scope="col" className="w-30 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-40">
                      지출 수단 · 구성원
                    </th>
                    <th scope="col" className="w-24 px-2 py-2.5 text-right font-medium whitespace-nowrap lg:w-28">
                      할인 전 금액
                    </th>
                    <th scope="col" className="w-12 px-1 py-2.5 text-center font-medium whitespace-nowrap">
                      수정
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedFixedExpenses.map((rule) => (
                    <tr key={rule.id} className="hover:bg-muted/20">
                      <td className="px-2 py-2.5 text-xs">
                        <p className="font-medium text-foreground tabular-nums">매월 {rule.day}일</p>
                      </td>
                      <td className="px-2 py-2.5">
                        <Badge variant="neutral">{findCategoryName(rule.categoryId)}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="truncate font-semibold text-foreground">{rule.title}</p>
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="truncate text-xs font-medium text-foreground">{findExpensePaymentLabel(rule)}</p>
                        <div className="mt-0.5 flex items-center gap-1">
                          <MemberAvatar name={rule.actualUser} size="xs" mode="icon-hover" />
                          <span className="truncate text-xs text-muted-foreground">{rule.actualUser}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        <p className="font-bold whitespace-nowrap text-expense">{formatWon(rule.approvedAmount)}</p>
                        {rule.discountAmount > 0 ? <p className="text-[11px] text-muted-foreground">할인 {formatWon(rule.discountAmount)}</p> : null}
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <Button type="button" size="icon-xs" variant="outline" aria-label={`${rule.title} 수정`} title={`${rule.title} 수정`} onClick={() => openFixedExpenseEditor(rule)}>
                          <Pencil aria-hidden="true" className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 고정 수입 추가 / 수정 모달 */}
      <ResponsiveOverlay
        open={Boolean(incomeDraft)}
        onOpenChange={(open) => {
          if (!open) setIncomeDraft(null);
        }}
      >
        {incomeDraft ? (
          <ResponsiveOverlayContent size="lg">
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>{incomeDraft.id ? '고정 수입 수정' : '고정 수입 추가'}</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>신규 생성 월 장부에 입금 예정 수입으로 자동 추가할 기본 구성을 설정해요.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3" dialogClassName="gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">소득 분류</span>
                  <Select
                    value={incomeDraft.kind}
                    onValueChange={(nextKind) => {
                      const kind = nextKind as IncomeKind;
                      const nextDetails: IncomeDetails | undefined = kind === '근로소득' ? { employment: EMPLOYMENT_OPTIONS[0] } : undefined;
                      setIncomeTaxOpen(INCOME_DETAIL_FIELDS[kind].some(({ key }) => Boolean(nextDetails?.[key])));
                      setIncomePaymentsOpen(true);
                      setIncomeDeductionsOpen(true);
                      setIncomeDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              kind,
                              businessId: kind === '사업소득' ? prev.businessId : undefined,
                              details: nextDetails,
                              payments: createIncomeLines(kind, 'payments'),
                              deductions: createIncomeLines(kind, 'deductions')
                            }
                          : null
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fix-inc-title" className="text-xs font-semibold text-foreground">
                    내용
                  </label>
                  <Input
                    id="fix-inc-title"
                    placeholder="예: 정규 월 급여"
                    value={incomeDraft.title}
                    invalid={incomeInvalid.has('title')}
                    onChange={(event) => {
                      setIncomeDraft((prev) => (prev ? { ...prev, title: event.target.value } : null));
                      clearIncomeInvalid('title');
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fix-inc-payer" className="text-xs font-semibold text-foreground">
                    지급처 · 선택
                  </label>
                  <Input
                    id="fix-inc-payer"
                    placeholder="예: (주)미리온테크"
                    value={incomeDraft.payer}
                    onChange={(event) => setIncomeDraft((prev) => (prev ? { ...prev, payer: event.target.value } : null))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">귀속자</span>
                  <Select
                    value={incomeDraft.owner}
                    onValueChange={(nextOwner) => {
                      const pool = activeDepositAccounts.filter((item) => item.owner === nextOwner);
                      const fallback = pool.length > 0 ? pool : activeDepositAccounts;
                      setIncomeDraft((prev) => (prev ? { ...prev, owner: nextOwner, accountId: fallback[0]?.id ?? '' } : null));
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
                  <span className="text-xs font-semibold text-foreground">입금 계좌</span>
                  <Select
                    value={incomeDraft.accountId}
                    onValueChange={(next) => {
                      setIncomeDraft((prev) => (prev ? { ...prev, accountId: next } : null));
                      clearIncomeInvalid('accountId');
                    }}
                  >
                    <SelectTrigger invalid={incomeInvalid.has('accountId')}>
                      <SelectValue placeholder="계좌 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeDepositPool.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fix-inc-day" className="text-xs font-semibold text-foreground">
                    입금 예정일
                  </label>
                  <NumberInput
                    id="fix-inc-day"
                    suffix="일"
                    value={incomeDraft.day}
                    invalid={incomeInvalid.has('day')}
                    onValueChange={(next) => {
                      setIncomeDraft((prev) => (prev ? { ...prev, day: next } : null));
                      clearIncomeInvalid('day');
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">예산 반영 방식</span>
                  <Select value={incomeDraft.budgetRule} onValueChange={(next) => setIncomeDraft((prev) => (prev ? { ...prev, budgetRule: next as BudgetAllocationRule } : null))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">입금 당월 예산에 반영</SelectItem>
                      <SelectItem value="next">익월(다음 달) 예산에 배정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">적용 시작월</span>
                  <PeriodPicker
                    mode="month"
                    variant="outlined"
                    size="default"
                    className="min-h-control-lg px-2"
                    value={incomeDraft.startMonth}
                    invalid={incomeInvalid.has('startMonth')}
                    onChange={(next) => {
                      setIncomeDraft((prev) => (prev ? { ...prev, startMonth: next } : null));
                      clearIncomeInvalid('startMonth');
                    }}
                  />
                </div>
              </div>

              <IncomeTaxSection
                owner={incomeDraft.owner}
                kind={incomeDraft.kind}
                businessId={incomeDraft.businessId}
                retainedRecordBusinessId={editingIncomeRule?.businessId}
                details={incomeDraft.details}
                onBusinessIdChange={(next) => setIncomeDraft((prev) => (prev ? { ...prev, businessId: next } : null))}
                onDetailChange={(key: IncomeDetailKey, value: string) => {
                  setIncomeDraft((prev) => {
                    if (!prev) return null;
                    const nextDetails = { ...prev.details, [key]: value || undefined };
                    if (key === 'vatStatus' && value !== '포함' && value !== '별도') {
                      delete nextDetails.vatAmount;
                    }
                    return { ...prev, details: nextDetails };
                  });
                  clearIncomeInvalid(key === 'employment' ? 'employment' : `detail:${key}`);
                }}
                open={incomeTaxOpen}
                onOpenChange={setIncomeTaxOpen}
                attributionRuleProps={{
                  value: incomeDraft.attributionMonthRule,
                  onChange: (next) => setIncomeDraft((prev) => (prev ? { ...prev, attributionMonthRule: next } : null))
                }}
                invalidFields={{
                  employment: incomeInvalid.has('employment'),
                  invalidServiceRange: incomeInvalid.has('invalidServiceRange'),
                  invalidDetailAmountKeys: new Set(
                    Array.from(incomeInvalid)
                      .filter((item) => item.startsWith('detail:'))
                      .map((item) => item.slice('detail:'.length))
                  )
                }}
              />

              <IncomeLineItemsEditor
                key={incomeDraft.kind}
                kind={incomeDraft.kind}
                payments={incomeDraft.payments}
                deductions={incomeDraft.deductions}
                taxRecordingEnabled={taxRecordingEnabled}
                expandedSections={{ payments: incomePaymentsOpen, deductions: incomeDeductionsOpen }}
                onExpandedChange={(section, expanded) => {
                  if (section === 'payments') setIncomePaymentsOpen(expanded);
                  else setIncomeDeductionsOpen(expanded);
                }}
                minPaymentRows={1}
                errors={incomeInvalid.has('payments') ? { payments: { amount: new Set(incomeDraft.payments.map((line) => line.id)) } } : undefined}
                onLinesChange={(section, rows) => {
                  setIncomeDraft((prev) => (prev ? { ...prev, [section]: rows } : null));
                  clearIncomeInvalid(section);
                }}
              />

              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/35 px-3.5 py-2.5 text-sm tabular-nums">
                <span className="font-semibold text-foreground">예정 실수령액 (지급 − 공제)</span>
                <strong className={cn('text-base font-extrabold', incomeNetTotal > 0 ? 'text-income' : 'text-destructive')}>{formatWon(incomeNetTotal)}</strong>
              </div>

              {!incomeDraft.id ? (
                <Checkbox
                  wrapperClassName="min-h-7"
                  label={`적용 시작월(${formatDisplayMonth(formatYearMonth(incomeDraft.startMonth))}) 이후 수입 내역에도 지금 바로 추가`}
                  checked={incomeDraft.applyNow}
                  onCheckedChange={(checked) => setIncomeDraft((prev) => (prev ? { ...prev, applyNow: checked === true } : null))}
                />
              ) : null}

              <NoticeBox variant="info">
                {incomeDraft.id
                  ? '수정한 내용은 신규 생성 월부터 적용해요. 이미 생성된 월의 수입 내역은 바뀌지 않아요.'
                  : getFixedCreateNoticeText('수입', incomeDraft.applyNow, incomeDraft.startMonth)}
              </NoticeBox>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter sheetClassName="flex-wrap gap-2">
              {incomeDraft.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto text-destructive hover:bg-destructive-tint hover:text-destructive"
                  onClick={() => {
                    const target = fixedIncomes.find((item) => item.id === incomeDraft.id);
                    if (target) void handleDeleteFixedIncome(target);
                  }}
                >
                  삭제
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setIncomeDraft(null)}>
                취소
              </Button>
              <Button type="button" variant="income" onClick={handleSaveFixedIncome}>
                {incomeDraft.id ? '저장' : '추가'}
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>

      {/* 고정 지출 추가 / 수정 모달 */}
      <ResponsiveOverlay
        open={Boolean(expenseDraft)}
        onOpenChange={(open) => {
          if (!open) setExpenseDraft(null);
        }}
      >
        {expenseDraft ? (
          <ResponsiveOverlayContent size="lg">
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>{expenseDraft.id ? '고정 지출 수정' : '고정 지출 추가'}</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>신규 생성 월 장부에 예정 지출로 자동 추가할 기본 구성을 설정해요.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3" dialogClassName="gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fix-exp-title" className="text-xs font-semibold text-foreground">
                    내용
                  </label>
                  <Input
                    id="fix-exp-title"
                    placeholder="예: 월세 · 관리비, 통신비"
                    value={expenseDraft.title}
                    invalid={expenseInvalid.has('title')}
                    onChange={(event) => {
                      setExpenseDraft((prev) => (prev ? { ...prev, title: event.target.value } : null));
                      clearExpenseInvalid('title');
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">분류</span>
                  <Select
                    value={expenseDraft.categoryId}
                    onValueChange={(next) => {
                      setExpenseDraft((prev) => (prev ? { ...prev, categoryId: next } : null));
                      clearExpenseInvalid('categoryId');
                    }}
                  >
                    <SelectTrigger invalid={expenseInvalid.has('categoryId')}>
                      <SelectValue placeholder="분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">결제 수단</span>
                  <Select
                    value={expenseDraft.paymentChoiceValue}
                    onValueChange={(next) => {
                      const parsed = parsePaymentChoice(next);
                      const ownerOfMethod = parsed.type === 'card' ? cards.find((c) => c.id === parsed.targetId)?.owner : assets.find((a) => a.id === parsed.targetId)?.owner;
                      setExpenseDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              paymentChoiceValue: next,
                              actualUser: ownerOfMethod ?? prev.actualUser,
                              discountAmount: parsed.type === 'card' ? prev.discountAmount : 0,
                              performanceIncluded: parsed.type === 'card',
                              taxInfo: parsed.type === 'card' && prev.taxInfo?.cashReceiptType ? { ...prev.taxInfo, cashReceiptType: undefined } : prev.taxInfo
                            }
                          : null
                      );
                      clearExpenseInvalid('paymentChoiceValue');
                    }}
                  >
                    <SelectTrigger invalid={expenseInvalid.has('paymentChoiceValue')}>
                      <SelectValue placeholder="결제 수단 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCards.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>카드</SelectLabel>
                          {activeCards.map((card) => (
                            <SelectItem key={card.id} value={`card:${card.id}`}>
                              {card.label} · {card.last4} ({card.owner})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                      {activeDepositAccounts.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>계좌 이체</SelectLabel>
                          {activeDepositAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={`account:${acc.id}`}>
                              {acc.name} ({acc.owner})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                      {activeCashAssets.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>현금</SelectLabel>
                          {activeCashAssets.map((acc) => (
                            <SelectItem key={acc.id} value={`cash:${acc.id}`}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">구성원</span>
                  <Select value={expenseDraft.actualUser} onValueChange={(next) => setExpenseDraft((prev) => (prev ? { ...prev, actualUser: next } : null))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actualUsers.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fix-exp-day" className="text-xs font-semibold text-foreground">
                    매월 예정일
                  </label>
                  <NumberInput
                    id="fix-exp-day"
                    suffix="일"
                    value={expenseDraft.day}
                    invalid={expenseInvalid.has('day')}
                    onValueChange={(next) => {
                      setExpenseDraft((prev) => (prev ? { ...prev, day: next } : null));
                      clearExpenseInvalid('day');
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">적용 시작월</span>
                  <PeriodPicker
                    mode="month"
                    variant="outlined"
                    size="default"
                    className="min-h-control-lg px-2"
                    value={expenseDraft.startMonth}
                    invalid={expenseInvalid.has('startMonth')}
                    onChange={(next) => {
                      setExpenseDraft((prev) => (prev ? { ...prev, startMonth: next } : null));
                      clearExpenseInvalid('startMonth');
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fix-exp-amount" className="text-xs font-semibold text-foreground">
                    {parsePaymentChoice(expenseDraft.paymentChoiceValue).type === 'card' ? '기본 예정 금액 (할인 전)' : '기본 예정 금액'}
                  </label>
                  <NumberInput
                    id="fix-exp-amount"
                    suffix="원"
                    value={expenseDraft.approvedAmount}
                    invalid={expenseInvalid.has('approvedAmount')}
                    onValueChange={(next) => {
                      setExpenseDraft((prev) => (prev ? { ...prev, approvedAmount: next } : null));
                      clearExpenseInvalid('approvedAmount');
                    }}
                  />
                </div>

                {parsePaymentChoice(expenseDraft.paymentChoiceValue).type === 'card' ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fix-exp-discount" className="text-xs font-semibold text-foreground">
                      카드사 할인
                    </label>
                    <NumberInput
                      id="fix-exp-discount"
                      suffix="원"
                      value={expenseDraft.discountAmount}
                      invalid={expenseInvalid.has('discountAmount')}
                      onValueChange={(next) => {
                        setExpenseDraft((prev) => (prev ? { ...prev, discountAmount: next } : null));
                        clearExpenseInvalid('discountAmount');
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {(() => {
                const { owner: methodOwner, methodKind } = resolveExpenseMethodOwner(expenseDraft.paymentChoiceValue, expenseDraft.actualUser);
                return (
                  <ExpenseTaxSection
                    owner={methodOwner}
                    methodKind={methodKind}
                    taxInfo={expenseDraft.taxInfo}
                    idPrefix="fix-exp-tax"
                    businessIdInvalid={expenseInvalid.has('businessId')}
                    inputVatInvalid={expenseInvalid.has('inputVatAmount')}
                    onTaxInfoChange={(nextTaxInfo) => {
                      setExpenseDraft((prev) => (prev ? { ...prev, taxInfo: nextTaxInfo } : null));
                      clearExpenseInvalid('businessId');
                      clearExpenseInvalid('inputVatAmount');
                    }}
                  />
                );
              })()}

              {parsePaymentChoice(expenseDraft.paymentChoiceValue).type === 'card' || !expenseDraft.id ? (
                <div className="flex flex-col gap-1.5">
                  {parsePaymentChoice(expenseDraft.paymentChoiceValue).type === 'card' ? (
                    <Checkbox
                      wrapperClassName="min-h-7"
                      label="카드 이용 실적에 반영"
                      checked={expenseDraft.performanceIncluded}
                      onCheckedChange={(checked) => setExpenseDraft((prev) => (prev ? { ...prev, performanceIncluded: checked === true } : null))}
                    />
                  ) : null}

                  {!expenseDraft.id ? (
                    <Checkbox
                      wrapperClassName="min-h-7"
                      label={`적용 시작월(${formatDisplayMonth(formatYearMonth(expenseDraft.startMonth))}) 이후 지출 내역에도 지금 바로 추가`}
                      checked={expenseDraft.applyNow}
                      onCheckedChange={(checked) => setExpenseDraft((prev) => (prev ? { ...prev, applyNow: checked === true } : null))}
                    />
                  ) : null}
                </div>
              ) : null}

              <NoticeBox variant="info">
                {expenseDraft.id
                  ? '수정한 내용은 신규 생성 월부터 적용해요. 이미 생성된 월의 지출 내역은 바뀌지 않아요.'
                  : getFixedCreateNoticeText('지출', expenseDraft.applyNow, expenseDraft.startMonth)}
              </NoticeBox>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter sheetClassName="flex-wrap gap-2">
              {expenseDraft.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto text-destructive hover:bg-destructive-tint hover:text-destructive"
                  onClick={() => {
                    const target = fixedExpenses.find((item) => item.id === expenseDraft.id);
                    if (target) void handleDeleteFixedExpense(target);
                  }}
                >
                  삭제
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setExpenseDraft(null)}>
                취소
              </Button>
              <Button type="button" variant="expense" onClick={handleSaveFixedExpense}>
                {expenseDraft.id ? '저장' : '추가'}
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>
    </div>
  );
};
