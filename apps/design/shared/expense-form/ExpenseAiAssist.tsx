'use client';

import { Badge, Button, Checkbox, NoticeBox, cn } from '@repo/ui-core';
import { ImagePlus, Loader2, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { formatWon } from '@/shared/design-format';
import { DEFAULT_VIEWED_MONTH, getPaymentMethodMeta, isCompletedEditLocked, type ExpenseCategorySplit, type ExpenseDraft } from '@/shared/expense-form/expense-form-model';

type AssistScenarioId = 'simple' | 'split';
type AssistStage = 'input' | 'loading' | 'review' | 'error';
type AssistErrorKind = 'validation' | 'parse-failed' | 'timeout' | null;

type AiDraftCandidate = {
  sourceSummary: string;
  merchant: string | null;
  transactionDate: Date | null;
  paymentMethod: string | null;
  paymentMethodUncertain?: boolean;
  approvedAmount: number | null;
  cardDiscount: number | null;
  memo: string | null;
  splits: Array<{ category: string; amount: number; uncertain?: boolean }>;
  includeInCardPerformance: boolean | null;
  cardPerformanceReason?: string;
  duplicateMatch?: {
    dateLabel: string;
    merchant: string;
    amount: number;
    paymentMethod: string;
  } | null;
};

export type ExpenseAiAssistProps = {
  draft: ExpenseDraft;
  onApplyCandidate: (nextDraft: ExpenseDraft, appliedNotice: string) => void;
  onBack?: () => void;
  defaultOpenReview?: boolean;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const formatDateShort = (date: Date | null): string => {
  if (!date) {
    return '미입력';
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const createFormSnapshot = (draft: ExpenseDraft): string =>
  JSON.stringify({
    mode: draft.mode,
    initialPaymentStatus: draft.initialPaymentStatus ?? null,
    merchant: draft.merchant,
    memo: draft.memo,
    paymentMethod: draft.paymentMethod,
    date: draft.transactionDate ? draft.transactionDate.toISOString().slice(0, 10) : null,
    approvedAmount: draft.approvedAmount,
    cardDiscount: draft.cardDiscount,
    paymentPlan: draft.paymentPlan,
    includeInCardPerformance: draft.includeInCardPerformance,
    splits: draft.splits.map((s) => ({ category: s.category, amount: s.amount, discount: s.discount }))
  });

const buildSyntheticCandidate = (scenario: AssistScenarioId, draft: ExpenseDraft): AiDraftCandidate => {
  const viewed = draft.viewedMonth ?? DEFAULT_VIEWED_MONTH;
  const baseDate = new Date(viewed.year, viewed.month - 1, 4);

  if (scenario === 'split') {
    return {
      sourceSummary: '[합성 메모] 예시 마트에서 현대카드 ZERO로 100,000원 결제(할인 5,000원), 식비 80,000원 + 생활 20,000원',
      merchant: '예시 마트',
      transactionDate: baseDate,
      paymentMethod: '현대카드 ZERO (지은)',
      approvedAmount: 100000,
      cardDiscount: 5000,
      memo: '식료품 · 생활용품 장보기',
      splits: [
        { category: '식비', amount: 80000 },
        { category: '생활', amount: 20000 }
      ],
      includeInCardPerformance: true,
      cardPerformanceReason: '할인 제외 95,000원 인정',
      duplicateMatch: null
    };
  }

  return {
    sourceSummary: '[합성 알림] 11/04 예시 상점 12,000원 승인 (카드 번호 마스킹 · 분류 미확인)',
    merchant: '예시 상점',
    transactionDate: baseDate,
    paymentMethod: null,
    paymentMethodUncertain: true,
    approvedAmount: 12000,
    cardDiscount: 0,
    memo: null,
    splits: [{ category: '', amount: 12000, uncertain: true }],
    includeInCardPerformance: null,
    cardPerformanceReason: '결제 카드 미확인 · 직접 확인 필요',
    duplicateMatch: null
  };
};

type ProposalItem = {
  label: string;
  valueText: string;
  status: 'proposed' | 'unchanged' | 'uncertain' | 'locked';
};

export const ExpenseAiAssist = ({ draft, onApplyCandidate, onBack, defaultOpenReview = false }: ExpenseAiAssistProps) => {
  const [stage, setStage] = useState<AssistStage>(defaultOpenReview ? 'review' : 'input');
  const [text, setText] = useState(defaultOpenReview ? '11/04 예시 마트에서 현대카드로 100,000원 결제(할인 5,000원), 식비 80,000원 · 생활 20,000원' : '');
  const [imageFile, setImageFile] = useState<{ name: string; url: string; size: number } | null>(null);
  const [errorKind, setErrorKind] = useState<AssistErrorKind>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [candidate, setCandidate] = useState<AiDraftCandidate | null>(() => (defaultOpenReview ? buildSyntheticCandidate('split', draft) : null));
  const [reviewSnapshot, setReviewSnapshot] = useState<string | null>(() => (defaultOpenReview ? createFormSnapshot(draft) : null));
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  const revokeImage = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      revokeImage();
    };
  }, [revokeImage]);

  const handleSelectImage = (file: File | null | undefined) => {
    if (!file) {
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
      setErrorKind('validation');
      setErrorMessage('PNG·JPEG·WebP 이미지 1장을 10MB 이하로 올려 주세요.');
      return;
    }
    revokeImage();
    const nextUrl = URL.createObjectURL(file);
    imageUrlRef.current = nextUrl;
    setImageFile({ name: file.name || '붙여넣은 캡처 이미지', url: nextUrl, size: file.size });
    setErrorKind(null);
    setErrorMessage('');
  };

  const handleClear = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    revokeImage();
    setText('');
    setImageFile(null);
    setCandidate(null);
    setReviewSnapshot(null);
    setDuplicateConfirmed(false);
    setErrorKind(null);
    setErrorMessage('');
    setStage('input');
  };

  const runAnalysis = () => {
    if (!text.trim() && !imageFile) {
      setErrorKind('validation');
      setErrorMessage('결제 캡처 이미지를 올리거나 지출 설명을 입력해 주세요.');
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    setErrorKind(null);
    setErrorMessage('');
    setStage('loading');

    const snapshotAtRequest = createFormSnapshot(draft);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setCandidate(buildSyntheticCandidate('simple', draft));
      setReviewSnapshot(snapshotAtRequest);
      setDuplicateConfirmed(false);
      setStage('review');
    }, 350);
  };

  const doneLocked = isCompletedEditLocked(draft);
  const installmentLocked = draft.paymentPlan === 'installment';
  const isStaleSnapshot = stage === 'review' && reviewSnapshot !== null && reviewSnapshot !== createFormSnapshot(draft);

  const buildProposalItems = (): ProposalItem[] => {
    if (!candidate) {
      return [];
    }
    const splitSummary = candidate.splits.map((part) => `${part.category || '직접 선택'} ${formatWon(part.amount)}`).join(' · ');
    const resolvedMethodMeta = candidate.paymentMethod ? getPaymentMethodMeta(candidate.paymentMethod) : null;
    const effectiveMethodMeta = resolvedMethodMeta ?? getPaymentMethodMeta(draft.paymentMethod);
    const showDiscountRow = effectiveMethodMeta.kind === 'card';
    const showCardPerfRow = effectiveMethodMeta.kind === 'card';

    const items: ProposalItem[] = [
      {
        label: '사용처',
        valueText: candidate.merchant ?? '미확인',
        status: !candidate.merchant ? 'uncertain' : draft.merchant.trim() === candidate.merchant ? 'unchanged' : 'proposed'
      },
      {
        label: '거래일',
        valueText: formatDateShort(candidate.transactionDate),
        status: formatDateShort(draft.transactionDate) === formatDateShort(candidate.transactionDate) ? 'unchanged' : 'proposed'
      },
      {
        label: '결제 금액',
        valueText: doneLocked || installmentLocked ? `${formatWon(draft.approvedAmount ?? 0)} (기존 유지)` : candidate.approvedAmount ? formatWon(candidate.approvedAmount) : '미확인',
        status: doneLocked || installmentLocked ? 'locked' : !candidate.approvedAmount ? 'uncertain' : draft.approvedAmount === candidate.approvedAmount ? 'unchanged' : 'proposed'
      }
    ];

    if (showDiscountRow) {
      items.push({
        label: '할인 금액',
        valueText: doneLocked || installmentLocked ? `${formatWon(draft.cardDiscount ?? 0)} (기존 유지)` : formatWon(candidate.cardDiscount ?? 0),
        status: doneLocked || installmentLocked ? 'locked' : (draft.cardDiscount ?? 0) === (candidate.cardDiscount ?? 0) ? 'unchanged' : 'proposed'
      });
    }

    items.push(
      {
        label: '결제 수단',
        valueText: doneLocked ? `${draft.paymentMethod} (기존 유지)` : candidate.paymentMethodUncertain ? '미확인 · 직접 선택 필요' : (candidate.paymentMethod ?? draft.paymentMethod),
        status: doneLocked ? 'locked' : candidate.paymentMethodUncertain ? 'uncertain' : candidate.paymentMethod && candidate.paymentMethod !== draft.paymentMethod ? 'proposed' : 'unchanged'
      },
      {
        label: '분류별 금액',
        valueText: doneLocked || installmentLocked ? '할부·완료 회차 기존 유지' : splitSummary,
        status: doneLocked || installmentLocked ? 'locked' : candidate.splits.some((part) => !part.category) ? 'uncertain' : 'proposed'
      }
    );

    if (showCardPerfRow) {
      items.push({
        label: '카드 이용 실적',
        valueText: doneLocked
          ? `${draft.includeInCardPerformance ? '반영' : '미반영'} (기존 유지)`
          : candidate.includeInCardPerformance === null
            ? (candidate.cardPerformanceReason ?? '미확인 · 직접 확인 필요')
            : `${candidate.includeInCardPerformance ? '반영' : '실적 제외'}${candidate.cardPerformanceReason ? ` (${candidate.cardPerformanceReason})` : ''}`,
        status: doneLocked ? 'locked' : candidate.includeInCardPerformance === null ? 'uncertain' : draft.includeInCardPerformance === candidate.includeInCardPerformance ? 'unchanged' : 'proposed'
      });
    }

    return items;
  };

  const handleApply = () => {
    if (!candidate) {
      return;
    }
    if (isStaleSnapshot) {
      setErrorKind('validation');
      setErrorMessage('초안 확인 중 아래 폼 입력이 변경됐어요. 재확인을 눌러 최신 폼 기준으로 다시 대조해 주세요.');
      return;
    }
    if (candidate.duplicateMatch && !duplicateConfirmed) {
      setErrorKind('validation');
      setErrorMessage('중복 후보 확인 체크박스를 선택해 주세요.');
      return;
    }

    const nextDraft: ExpenseDraft = { ...draft };

    if (candidate.merchant) {
      nextDraft.merchant = candidate.merchant;
    }
    if (candidate.transactionDate) {
      nextDraft.transactionDate = candidate.transactionDate;
    }
    if (candidate.memo && !nextDraft.memo.trim()) {
      nextDraft.memo = candidate.memo;
    }

    if (!doneLocked) {
      if (candidate.paymentMethod && candidate.paymentMethod !== nextDraft.paymentMethod) {
        const meta = getPaymentMethodMeta(candidate.paymentMethod);
        nextDraft.paymentMethod = meta.label;
        nextDraft.actualUser = meta.owner;
        if (meta.kind !== 'card' && nextDraft.paymentPlan === 'installment') {
          nextDraft.paymentPlan = 'lump-sum';
        }
      }

      if (candidate.includeInCardPerformance !== null) {
        nextDraft.includeInCardPerformance = candidate.includeInCardPerformance;
      }

      const discountAllowed = getPaymentMethodMeta(nextDraft.paymentMethod).kind === 'card';

      if (!installmentLocked) {
        if (candidate.approvedAmount !== null) {
          nextDraft.approvedAmount = candidate.approvedAmount;
        }
        if (!discountAllowed) {
          nextDraft.cardDiscount = 0;
        } else if (candidate.cardDiscount !== null) {
          nextDraft.cardDiscount = candidate.cardDiscount;
        }
        if (candidate.splits.length > 0) {
          const existingByCategory = new Map(draft.splits.map((row) => [row.category, row.discount]));
          const mappedSplits: ExpenseCategorySplit[] = candidate.splits.map((part, idx) => ({
            id: `ai-split-${Date.now()}-${idx + 1}`,
            category: part.category || draft.splits[idx]?.category || '',
            amount: part.amount,
            // 기존 분류별 할인은 유지하고 새 분류 할인은 미입력(null)으로 둠(비카드 수단은 0 고정)
            discount: !discountAllowed ? 0 : part.category && existingByCategory.has(part.category) ? (existingByCategory.get(part.category) ?? null) : null,
            installmentFee: 0
          }));
          nextDraft.splits = mappedSplits;
        } else if (!discountAllowed) {
          nextDraft.splits = nextDraft.splits.map((row) => ({ ...row, discount: 0, installmentFee: 0 }));
        }
      }
    }

    const discountAllowedAfterApply = getPaymentMethodMeta(nextDraft.paymentMethod).kind === 'card';
    revokeImage();
    setImageFile(null);
    setErrorKind(null);
    setErrorMessage('');
    setStage('input');
    const summaryText = discountAllowedAfterApply
      ? 'AI 초안을 폼에 반영했어요. 분류·할인을 확인한 뒤 지출 저장을 눌러 확정하세요.'
      : 'AI 초안을 폼에 반영했어요. 분류·금액을 확인한 뒤 지출 저장을 눌러 확정하세요.';
    onApplyCandidate(nextDraft, summaryText);
  };

  const proposalItems = buildProposalItems();
  const paymentMethodWillChange = Boolean(candidate && !doneLocked && candidate.paymentMethod && candidate.paymentMethod !== draft.paymentMethod);
  const nextOwnerName = candidate?.paymentMethod ? getPaymentMethodMeta(candidate.paymentMethod).owner : null;

  return (
    <section
      aria-label="AI 입력 보조"
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) {
          handleSelectImage(dropped);
        }
      }}
      onPaste={(event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));
        if (imageItem) {
          const pastedFile = imageItem.getAsFile();
          if (pastedFile) {
            event.preventDefault();
            handleSelectImage(pastedFile);
          }
        }
      }}
      className={cn('flex flex-col gap-3 rounded-xl border bg-card p-3.5 transition-colors md:p-4', isDragging ? 'border-primary bg-primary-tint/60' : 'border-border')}
    >
      <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground break-keep">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <span>결제 캡처 붙여넣기·첨부 또는 글 설명으로 초안을 채워요. 참고화면에서는 합성 예시로 흐름을 확인합니다.</span>
      </div>

      {stage === 'input' || stage === 'error' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-assist-text" className="text-xs font-semibold text-foreground">
              지출 설명 또는 문자·알림 붙여넣기
            </label>
            <textarea
              id="expense-assist-text"
              rows={2}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (errorKind === 'validation') {
                  setErrorKind(null);
                  setErrorMessage('');
                }
              }}
              placeholder="예: 11/04 예시 마트 10만원(할인 5천원), 식비 8만원 + 생활 2만원"
              className="w-full resize-y rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border-strong bg-muted/35 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">결제 캡처 1장 (선택)</p>
                <p className="text-[11px] text-muted-foreground">PNG·JPEG·WebP, 10MB 이하 · 붙여넣기/끌어놓기 지원</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  handleSelectImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                <ImagePlus className="size-3.5" />
                <span>이미지 선택</span>
              </Button>
            </div>

            {imageFile ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <img src={imageFile.url} alt="첨부 결제 이미지 미리보기" className="size-10 shrink-0 rounded object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{imageFile.name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{Math.max(1, Math.round(imageFile.size / 1024))} KB · 로컬 미리보기</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="첨부 이미지 제거"
                  onClick={() => {
                    revokeImage();
                    setImageFile(null);
                  }}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          {stage === 'error' || errorMessage ? (
            <NoticeBox variant={errorKind === 'timeout' ? 'warning' : 'error'} className="text-xs">
              {errorMessage}
            </NoticeBox>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              입력 비우기
            </Button>
            {onBack ? (
              <Button type="button" variant="outline" size="sm" onClick={onBack}>
                직접 입력
              </Button>
            ) : null}
            <Button type="button" variant="primary" size="sm" onClick={runAnalysis}>
              {stage === 'error' ? '다시 시도' : '초안 만들기 · 시연'}
            </Button>
          </div>
        </>
      ) : null}

      {stage === 'loading' ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            <span>원문과 이미지를 바탕으로 지출 초안을 정리하고 있어요…</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              setStage('input');
            }}
          >
            취소
          </Button>
        </div>
      ) : null}

      {stage === 'review' && candidate ? (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-border bg-muted/35 p-2.5 text-xs">
            <p className="font-semibold text-foreground">원문 확인 (합성 예시 · 미저장)</p>
            <p className="mt-1 text-muted-foreground break-keep">{text.trim() || candidate.sourceSummary}</p>
            {imageFile ? (
              <div className="mt-2 flex items-center gap-2">
                <img src={imageFile.url} alt="원본 첨부 이미지" className="size-11 rounded object-cover" />
                <span className="truncate text-[11px] text-muted-foreground">{imageFile.name}</span>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
              <span>항목</span>
              <span>AI 제안</span>
            </div>
            <div className="divide-y divide-border text-xs">
              {proposalItems.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="shrink-0 font-semibold text-muted-foreground break-keep">{item.label}</span>
                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-right">
                    <span className={cn('font-semibold break-keep tabular-nums', item.status === 'proposed' ? 'text-primary' : item.status === 'uncertain' ? 'text-warning' : 'text-foreground')}>
                      {item.valueText}
                    </span>
                    {item.status === 'uncertain' ? <Badge variant="warning">미확인</Badge> : null}
                    {item.status === 'locked' ? <Badge variant="neutral">기존 유지</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!installmentLocked && candidate.splits.length > 0 ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground break-keep">
              기존 분류별 할인 입력은 유지하고, 새로 제안된 분류 할인은 미입력으로 둬요. 반영 후 폼의 &apos;할인 자동 배분&apos; 버튼으로 맞출 수 있어요.
            </p>
          ) : null}

          {paymentMethodWillChange && nextOwnerName ? (
            <NoticeBox variant="info" className="text-xs">
              결제 수단이 바뀌면 실사용자도 새 수단 소유자({nextOwnerName})로 함께 바뀌어요. 회수 내역은 유지돼요.
            </NoticeBox>
          ) : null}

          {candidate.duplicateMatch ? (
            <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning-tint p-2.5 text-xs">
              <p className="font-bold text-foreground">중복 후보 1건 발견</p>
              <p className="text-muted-foreground tabular-nums break-keep">
                {candidate.duplicateMatch.dateLabel} · {candidate.duplicateMatch.merchant} · {formatWon(candidate.duplicateMatch.amount)} ({candidate.duplicateMatch.paymentMethod})
              </p>
              <label className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                <Checkbox
                  checked={duplicateConfirmed}
                  onCheckedChange={(checked) => {
                    setDuplicateConfirmed(checked === true);
                    if (checked === true && errorKind === 'validation') {
                      setErrorKind(null);
                      setErrorMessage('');
                    }
                  }}
                />
                <span>기존 거래와 다른 별도 결제임을 확인했어요</span>
              </label>
            </div>
          ) : null}

          {isStaleSnapshot ? (
            <NoticeBox variant="warning" className="text-xs">
              아래 폼 입력이 바뀌었어요. 현재 입력을 덮어쓰지 않도록 재확인 후 반영해 주세요.
            </NoticeBox>
          ) : null}

          {errorMessage ? (
            <NoticeBox variant="error" className="text-xs">
              {errorMessage}
            </NoticeBox>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStage('input')}>
              다시 입력
            </Button>
            {isStaleSnapshot ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setReviewSnapshot(createFormSnapshot(draft));
                  setErrorKind(null);
                  setErrorMessage('');
                }}
                className="gap-1"
              >
                <RotateCcw className="size-3.5" />
                <span>최신 폼으로 재확인</span>
              </Button>
            ) : null}
            <Button type="button" variant="primary" size="sm" disabled={isStaleSnapshot} onClick={handleApply}>
              확인한 초안 반영
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
