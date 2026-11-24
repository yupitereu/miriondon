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
import { ArrowDownCircle, ArrowRight, ArrowUpCircle, CircleHelp, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { INCOME_KINDS, createIncomeLines, getIncomeLineItem, sumIncomeLines, type IncomeKind, type IncomeLine } from '@/previews/income/income-model';
import {
  CURRENT_PREVIEW_MONTH,
  buildPreviewHref,
  type BudgetAllocationRule,
  type FixedExpenseRuleRecord,
  type FixedIncomeRuleRecord,
  type LedgerAssetRecord,
  type LedgerCardRecord,
  type LedgerCategoryRecord
} from '@/previews/settings/settings-model';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatWon } from '@/shared/design-format';
import { showValidationAlert } from '@/shared/design-validation';

const sectionClass = 'rounded-xl border border-border bg-card p-4 sm:p-5';

const formatYearMonth = ({ year, month }: PeriodMonthValue) => `${year}-${String(month).padStart(2, '0')}`;
const parseYearMonth = (ym: string): PeriodMonthValue => ({ year: Number(ym.slice(0, 4)) || 2026, month: Number(ym.slice(5, 7)) || 11 });
const formatDisplayMonth = (ym: string) => ym.replace('-', '.');

const getFixedCreateNoticeText = (kind: '수입' | '지출', applyNow: boolean, startMonth: PeriodMonthValue) => {
  if (applyNow) {
    return `적용 시작월(${formatDisplayMonth(formatYearMonth(startMonth))}) 이후 생성된 ${kind} 내역에 바로 추가되고, 신규 월의 장부가 생성될 때 자동 반영돼요.`;
  }
  return `추가된 고정 ${kind}은 신규 월의 장부가 생성될 때 자동 반영돼요.`;
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
  onFixedExpensesChange,
  previewQuery
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
  previewQuery?: string;
}) => {
  const [incomeDraft, setIncomeDraft] = useState<FixedIncomeDraft | null>(null);
  const [incomeInvalid, setIncomeInvalid] = useState<Set<string>>(() => new Set());
  const [expenseDraft, setExpenseDraft] = useState<FixedExpenseDraft | null>(null);
  const [expenseInvalid, setExpenseInvalid] = useState<Set<string>>(() => new Set());

  const activeDepositAccounts = assets.filter((item) => !item.inactive && item.group === 'cash-liquid' && !item.isDefaultCash);
  const activeCashAssets = assets.filter((item) => !item.inactive && item.isDefaultCash);
  const activeCards = cards.filter((card) => !card.inactive);
  const activeCategories = categories.filter((cat) => !cat.disabled);

  const findAssetName = (assetId: string) => assets.find((item) => item.id === assetId)?.name ?? '계좌 확인 필요';
  const findCategoryName = (categoryId: string) => {
    const found = categories.find((cat) => cat.id === categoryId);
    if (!found) return '분류 확인 필요';
    return found.disabled ? `${found.name} (비활성)` : found.name;
  };
  const findExpensePaymentLabel = (rule: FixedExpenseRuleRecord) => {
    if (rule.paymentMethodType === 'card') {
      const card = cards.find((item) => item.id === rule.paymentTargetId);
      return card ? `${card.label} · ${card.last4}` : '카드 확인 필요';
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
    if (rule) {
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
        payments: rule.payments.map((line) => ({ ...line })),
        deductions: rule.deductions.map((line) => ({ ...line })),
        applyNow: false
      });
      return;
    }

    const defaultOwner = owners[0] ?? '민지(나)';
    const ownerAccounts = activeDepositAccounts.filter((item) => item.owner === defaultOwner);
    const defaultAccountId = ownerAccounts[0]?.id ?? activeDepositAccounts[0]?.id ?? '';
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
      payments: createIncomeLines('근로소득', 'payments'),
      deductions: createIncomeLines('근로소득', 'deductions'),
      applyNow: true
    });
  };

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

    const paymentSum = sumIncomeLineArray(incomeDraft.payments);
    const deductionSum = sumIncomeLineArray(incomeDraft.deductions);
    const netAmount = paymentSum - deductionSum;
    const hasEmptyCustomLabel =
      incomeDraft.payments.some((line) => !line.itemId && !line.label?.trim() && (Number(line.amount) || 0) > 0) ||
      incomeDraft.deductions.some((line) => !line.itemId && !line.label?.trim() && (Number(line.amount) || 0) > 0);

    if (hasEmptyCustomLabel) {
      errors.push('직접 추가한 지급·공제 항목의 이름을 입력해 주세요.');
    }
    if (paymentSum <= 0 || netAmount <= 0) {
      nextInvalid.add('payments');
      errors.push('예정 실수령액(지급 합계 − 공제 합계)이 0원보다 커야 해요.');
    }

    if (errors.length > 0) {
      setIncomeInvalid(nextInvalid);
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
      active: incomeDraft.id ? (fixedIncomes.find((item) => item.id === incomeDraft.id)?.active ?? true) : true,
      payments: incomeDraft.payments.map((line) => ({ ...line })),
      deductions: incomeDraft.deductions.map((line) => ({ ...line }))
    };

    onFixedIncomesChange((prev) => (incomeDraft.id ? prev.map((item) => (item.id === incomeDraft.id ? savedRule : item)) : [...prev, savedRule]));
    const applyNowChecked = !incomeDraft.id && incomeDraft.applyNow;
    setIncomeDraft(null);
    void dialog.alert({
      title: '고정 수입을 저장했어요',
      description: applyNowChecked
        ? `앞으로 생성되는 신규 월부터 자동 추가하며, ${formatDisplayMonth(startYm)} 이후 수입 내역에도 지금 바로 추가했어요.`
        : '앞으로 생성되는 신규 월부터 자동 추가하며, 이미 생성된 월의 내역은 바뀌지 않아요.'
    });
  };

  const handleToggleFixedIncome = async (rule: FixedIncomeRuleRecord) => {
    const nextActive = !rule.active;
    const ok = await dialog.confirm({
      title: nextActive ? `'${rule.title}' 고정 수입을 재개할까요?` : `'${rule.title}' 고정 수입을 일시중지할까요?`,
      description: nextActive ? '앞으로 생성되는 신규 월부터 예정 수입으로 다시 자동 추가돼요.' : '앞으로 생성되는 신규 월부터 자동 추가를 멈춰요. 이미 생성된 월의 내역은 유지돼요.',
      confirmText: nextActive ? '재개' : '중지'
    });
    if (!ok) return;
    onFixedIncomesChange((prev) => prev.map((item) => (item.id === rule.id ? { ...item, active: nextActive } : item)));
  };

  const handleDeleteFixedIncome = async (rule: FixedIncomeRuleRecord) => {
    const ok = await dialog.confirm({
      title: `'${rule.title}' 고정 수입을 삭제할까요?`,
      description: '앞으로 생성되는 신규 월부터 자동 생성을 멈춰요. 이미 생성된 월의 수입 내역은 그대로 유지돼요.',
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
      active: expenseDraft.id ? (fixedExpenses.find((item) => item.id === expenseDraft.id)?.active ?? true) : true
    };

    onFixedExpensesChange((prev) => (expenseDraft.id ? prev.map((item) => (item.id === expenseDraft.id ? savedRule : item)) : [...prev, savedRule]));
    const applyNowChecked = !expenseDraft.id && expenseDraft.applyNow;
    setExpenseDraft(null);
    void dialog.alert({
      title: '고정 지출을 저장했어요',
      description: applyNowChecked
        ? `앞으로 생성되는 신규 월부터 자동 추가하며, ${formatDisplayMonth(startYm)} 이후 지출 내역에도 지금 바로 추가했어요.`
        : '앞으로 생성되는 신규 월부터 자동 추가하며, 이미 생성된 월의 지출 내역은 바뀌지 않아요.'
    });
  };

  const handleToggleFixedExpense = async (rule: FixedExpenseRuleRecord) => {
    const nextActive = !rule.active;
    const ok = await dialog.confirm({
      title: nextActive ? `'${rule.title}' 고정 지출을 재개할까요?` : `'${rule.title}' 고정 지출을 일시중지할까요?`,
      description: nextActive ? '앞으로 생성되는 신규 월부터 예정 지출로 다시 자동 추가돼요.' : '앞으로 생성되는 신규 월부터 자동 추가를 멈춰요. 이미 생성된 월의 내역은 유지돼요.',
      confirmText: nextActive ? '재개' : '중지'
    });
    if (!ok) return;
    onFixedExpensesChange((prev) => prev.map((item) => (item.id === rule.id ? { ...item, active: nextActive } : item)));
  };

  const handleDeleteFixedExpense = async (rule: FixedExpenseRuleRecord) => {
    const ok = await dialog.confirm({
      title: `'${rule.title}' 고정 지출을 삭제할까요?`,
      description: '앞으로 생성되는 신규 월부터 자동 생성을 멈춰요. 이미 생성된 월의 지출 내역은 그대로 유지돼요.',
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
      <NoticeBox variant="info">
        고정 수입·고정 지출은 소유자·관리자·구성원 모두 등록하고 수정·일시중지할 수 있어요. 아직 생성되지 않은 신규 월이 열릴 때만 예정 거래로 자동 추가하며, 이미 생성된 월의 내역과는 완전히 분리해요.
      </NoticeBox>

      {/* 고정 수입 섹션 */}
      <section className={sectionClass} aria-label="고정 수입 관리">
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
                매월 반복되는 급여나 정기 수입을 등록하면 새 월 생성 시 입금 예정으로 자동 추가돼요. 실제 입금 보정과 완료 처리는 수입 내역에서 진행해요.
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
              {fixedIncomes.map((rule) => {
                const netAmount = sumIncomeLines(rule.payments) - sumIncomeLines(rule.deductions);
                return (
                  <div key={rule.id} className="flex flex-col gap-2.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className={cn('text-sm font-bold break-keep', !rule.active && 'text-muted-foreground line-through')}>{rule.title}</strong>
                          <Badge variant="neutral">{rule.kind}</Badge>
                          <Badge variant={rule.active ? 'positive' : 'neutral'}>{rule.active ? '활성' : '일시중지'}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                          <MemberAvatar name={rule.owner} size="xs" mode="icon-hover" />
                          <span>{rule.owner}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{findAssetName(rule.accountId)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          매월 {rule.day}일 · {rule.budgetRule === 'next' ? '익월 예산 배정' : '입금 당월 반영'}
                        </p>
                      </div>
                      <strong className="shrink-0 text-sm font-bold whitespace-nowrap text-income tabular-nums">{formatWon(netAmount)}</strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openFixedIncomeEditor(rule)}>
                        수정
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleFixedIncome(rule)}>
                        {rule.active ? '일시중지' : '재개'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive hover:bg-destructive-tint hover:text-destructive"
                        onClick={() => void handleDeleteFixedIncome(rule)}
                      >
                        삭제
                      </Button>
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
                    <th scope="col" className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                      내용
                    </th>
                    <th scope="col" className="w-30 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-40">
                      귀속 · 입금 계좌
                    </th>
                    <th scope="col" className="w-26 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-34">
                      예정일 · 반영
                    </th>
                    <th scope="col" className="w-24 px-2 py-2.5 text-right font-medium whitespace-nowrap lg:w-28">
                      예정 실수령액
                    </th>
                    <th scope="col" className="w-15 px-2 py-2.5 text-center font-medium whitespace-nowrap lg:w-18">
                      상태
                    </th>
                    <th scope="col" className="w-28 px-3 py-2.5 text-right font-medium whitespace-nowrap lg:w-32">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fixedIncomes.map((rule) => {
                    const netAmount = sumIncomeLines(rule.payments) - sumIncomeLines(rule.deductions);
                    return (
                      <tr key={rule.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <p className={cn('truncate font-semibold text-foreground', !rule.active && 'text-muted-foreground line-through')}>{rule.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {rule.kind} · {rule.payer || '지급처 미입력'}
                          </p>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <MemberAvatar name={rule.owner} size="xs" mode="icon-hover" />
                            <span className="truncate text-xs font-medium text-foreground">{rule.owner}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{findAssetName(rule.accountId)}</p>
                        </td>
                        <td className="px-2 py-2.5 text-xs">
                          <p className="font-medium text-foreground tabular-nums">매월 {rule.day}일</p>
                          <p className="truncate text-muted-foreground tabular-nums">
                            {rule.budgetRule === 'next' ? '익월 배정' : '당월 반영'} · {formatDisplayMonth(rule.startMonth)}~
                          </p>
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold whitespace-nowrap text-income tabular-nums">{formatWon(netAmount)}</td>
                        <td className="px-2 py-2.5 text-center whitespace-nowrap">
                          <Badge variant={rule.active ? 'positive' : 'neutral'}>{rule.active ? '활성' : '중지'}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => openFixedIncomeEditor(rule)}>
                              수정
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleFixedIncome(rule)}>
                              {rule.active ? '중지' : '재개'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="break-keep">수정·삭제해도 이미 생성된 월의 수입 내역은 바뀌지 않아요.</p>
          <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
            <Link href={buildPreviewHref('/preview/income', previewQuery)}>
              수입 내역에서 예정 수입 확인 <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 고정 지출 섹션 */}
      <section className={sectionClass} aria-label="고정 지출 관리">
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
                매월 반복되는 구독·통신비·공과금 등을 등록하면 새 월이 생성될 때 예정 지출로 자동 추가되어 생활비와 카드 실적에 선반영돼요.
              </PopoverContent>
            </Popover>
          </div>
          <Button type="button" variant="expense" size="sm" aria-label="고정 지출 추가" onClick={() => openFixedExpenseEditor(null)}>
            <Plus className="size-4" /> 추가
          </Button>
        </div>

        {fixedExpenses.length === 0 ? (
          <EmptyState title="등록된 고정 지출이 없어요" description="매월 고정으로 나가는 지출을 등록하면 새 달이 열릴 때 자동으로 예정 지출에 반영해요." />
        ) : (
          <>
            {/* 모바일 카드 리스트 */}
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
              {fixedExpenses.map((rule) => {
                const netAmount = rule.approvedAmount - rule.discountAmount;
                return (
                  <div key={rule.id} className="flex flex-col gap-2.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className={cn('text-sm font-bold break-keep', !rule.active && 'text-muted-foreground line-through')}>{rule.title}</strong>
                          <Badge variant="neutral">{findCategoryName(rule.categoryId)}</Badge>
                          <Badge variant={rule.active ? 'positive' : 'neutral'}>{rule.active ? '활성' : '일시중지'}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="truncate">{findExpensePaymentLabel(rule)}</span>
                          <span aria-hidden="true">·</span>
                          <MemberAvatar name={rule.actualUser} size="xs" mode="icon-hover" />
                          <span>{rule.actualUser}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">매월 {rule.day}일</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <strong className="block text-sm font-bold whitespace-nowrap text-expense tabular-nums">{formatWon(netAmount)}</strong>
                        {rule.discountAmount > 0 ? <span className="block text-[11px] text-muted-foreground tabular-nums">할인 {formatWon(rule.discountAmount)}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openFixedExpenseEditor(rule)}>
                        수정
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleFixedExpense(rule)}>
                        {rule.active ? '일시중지' : '재개'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive hover:bg-destructive-tint hover:text-destructive"
                        onClick={() => void handleDeleteFixedExpense(rule)}
                      >
                        삭제
                      </Button>
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
                    <th scope="col" className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                      내용
                    </th>
                    <th scope="col" className="w-30 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-40">
                      결제 · 실사용자
                    </th>
                    <th scope="col" className="w-26 px-2 py-2.5 text-left font-medium whitespace-nowrap lg:w-34">
                      예정일 · 시작월
                    </th>
                    <th scope="col" className="w-24 px-2 py-2.5 text-right font-medium whitespace-nowrap lg:w-28">
                      예정 금액
                    </th>
                    <th scope="col" className="w-15 px-2 py-2.5 text-center font-medium whitespace-nowrap lg:w-18">
                      상태
                    </th>
                    <th scope="col" className="w-28 px-3 py-2.5 text-right font-medium whitespace-nowrap lg:w-32">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fixedExpenses.map((rule) => {
                    const netAmount = rule.approvedAmount - rule.discountAmount;
                    return (
                      <tr key={rule.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <p className={cn('truncate font-semibold text-foreground', !rule.active && 'text-muted-foreground line-through')}>{rule.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{findCategoryName(rule.categoryId)}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <p className="truncate text-xs font-medium text-foreground">{findExpensePaymentLabel(rule)}</p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <MemberAvatar name={rule.actualUser} size="xs" mode="icon-hover" />
                            <span className="truncate text-xs text-muted-foreground">실사용자 {rule.actualUser}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-xs">
                          <p className="font-medium text-foreground tabular-nums">매월 {rule.day}일</p>
                          <p className="truncate text-muted-foreground tabular-nums">{formatDisplayMonth(rule.startMonth)}~</p>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">
                          <p className="font-bold whitespace-nowrap text-expense">{formatWon(netAmount)}</p>
                          {rule.discountAmount > 0 ? <p className="text-[11px] text-muted-foreground">할인 {formatWon(rule.discountAmount)}</p> : null}
                        </td>
                        <td className="px-2 py-2.5 text-center whitespace-nowrap">
                          <Badge variant={rule.active ? 'positive' : 'neutral'}>{rule.active ? '활성' : '중지'}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => openFixedExpenseEditor(rule)}>
                              수정
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleFixedExpense(rule)}>
                              {rule.active ? '중지' : '재개'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="break-keep">이미 생성된 월의 금액 보정·삭제는 지출 내역에서 해당 월 건만 수정해요.</p>
          <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
            <Link href={buildPreviewHref('/preview/expenses', previewQuery)}>
              지출 내역에서 예정 거래 확인 <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
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
              <ResponsiveOverlayDescription>새 월 생성 시 입금 예정 수입으로 자동 추가할 기본 구성을 설정해요.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3" dialogClassName="gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">수입 종류</span>
                  <Select
                    value={incomeDraft.kind}
                    onValueChange={(nextKind) => {
                      const kind = nextKind as IncomeKind;
                      setIncomeDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              kind,
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
                    value={incomeDraft.startMonth}
                    invalid={incomeInvalid.has('startMonth')}
                    onChange={(next) => {
                      setIncomeDraft((prev) => (prev ? { ...prev, startMonth: next } : null));
                      clearIncomeInvalid('startMonth');
                    }}
                  />
                </div>
              </div>

              {/* 지급 항목 */}
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">지급 항목</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIncomeDraft((prev) => (prev ? { ...prev, payments: [...prev.payments, { id: `custom-pay-${Date.now()}`, label: '', amount: '0', taxStatus: '과세' }] } : null))}
                  >
                    <Plus className="size-3.5" /> 지급 추가
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {incomeDraft.payments.map((line) => {
                    const meta = getIncomeLineItem(incomeDraft.kind, 'payments', line.itemId);
                    return (
                      <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_8.5rem_auto] items-center gap-2">
                        {meta ? (
                          <span className="truncate text-xs font-medium text-foreground">{meta.label}</span>
                        ) : (
                          <Input
                            size="md"
                            placeholder="항목명"
                            value={line.label ?? ''}
                            onChange={(event) =>
                              setIncomeDraft((prev) => (prev ? { ...prev, payments: prev.payments.map((entry) => (entry.id === line.id ? { ...entry, label: event.target.value } : entry)) } : null))
                            }
                          />
                        )}
                        <NumberInput
                          size="md"
                          suffix="원"
                          value={Number(line.amount) || 0}
                          invalid={incomeInvalid.has('payments')}
                          onValueChange={(next) => {
                            setIncomeDraft((prev) => (prev ? { ...prev, payments: prev.payments.map((entry) => (entry.id === line.id ? { ...entry, amount: String(next ?? 0) } : entry)) } : null));
                            clearIncomeInvalid('payments');
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={incomeDraft.payments.length <= 1}
                          aria-label="지급 항목 삭제"
                          className="size-9 text-muted-foreground hover:text-destructive"
                          onClick={() => setIncomeDraft((prev) => (prev ? { ...prev, payments: prev.payments.filter((entry) => entry.id !== line.id) } : null))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 공제 항목 */}
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">공제 항목</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIncomeDraft((prev) => (prev ? { ...prev, deductions: [...prev.deductions, { id: `custom-ded-${Date.now()}`, label: '', amount: '0' }] } : null))}
                  >
                    <Plus className="size-3.5" /> 공제 추가
                  </Button>
                </div>
                {incomeDraft.deductions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">등록된 공제 항목이 없어요.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {incomeDraft.deductions.map((line) => {
                      const meta = getIncomeLineItem(incomeDraft.kind, 'deductions', line.itemId);
                      return (
                        <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_8.5rem_auto] items-center gap-2">
                          {meta ? (
                            <span className="truncate text-xs font-medium text-foreground">{meta.label}</span>
                          ) : (
                            <Input
                              size="md"
                              placeholder="항목명"
                              value={line.label ?? ''}
                              onChange={(event) =>
                                setIncomeDraft((prev) =>
                                  prev ? { ...prev, deductions: prev.deductions.map((entry) => (entry.id === line.id ? { ...entry, label: event.target.value } : entry)) } : null
                                )
                              }
                            />
                          )}
                          <NumberInput
                            size="md"
                            suffix="원"
                            value={Number(line.amount) || 0}
                            onValueChange={(next) =>
                              setIncomeDraft((prev) =>
                                prev ? { ...prev, deductions: prev.deductions.map((entry) => (entry.id === line.id ? { ...entry, amount: String(next ?? 0) } : entry)) } : null
                              )
                            }
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="공제 항목 삭제"
                            className="size-9 text-muted-foreground hover:text-destructive"
                            onClick={() => setIncomeDraft((prev) => (prev ? { ...prev, deductions: prev.deductions.filter((entry) => entry.id !== line.id) } : null))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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
                  ? '수정한 내용은 앞으로 새로 생성되는 월부터 적용해요. 이미 생성된 월의 수입 내역과 세부 급여 명세는 바뀌지 않아요.'
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
              <ResponsiveOverlayDescription>새 월 생성 시 예정 지출로 자동 추가할 기본 구성을 설정해요.</ResponsiveOverlayDescription>
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
                              performanceIncluded: parsed.type === 'card'
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
                  <span className="text-xs font-semibold text-foreground">실사용자</span>
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
                  ? '수정한 내용은 앞으로 새로 생성되는 월부터 적용해요. 이미 생성된 월의 지출 내역은 바뀌지 않아요.'
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
