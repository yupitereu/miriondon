'use client';

import { Button, NoticeBox } from '@repo/ui-core';
import { FilePlus2, Sparkles, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import type { IncomeRecord } from '@/previews/income/income-model';
import { showValidationAlert } from '@/shared/design-validation';

export const IncomeAiAssist = ({ draft, onBack, onApply }: { draft: IncomeRecord; onBack: () => void; onApply: (next: IncomeRecord) => void }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasMeaningfulAmount = (amount: string | undefined) => Boolean(amount && Number(amount) > 0);
  const proposedValue = (rows: IncomeRecord['payments'], itemId: string, value: string) => {
    if (draft.kind !== '근로소득') return '반영하지 않음';
    const row = rows.find((item) => item.itemId === itemId);
    return hasMeaningfulAmount(row?.amount) ? '기존 값 유지' : row ? value : '항목 없음';
  };

  const selectFile = (next: File | undefined) => {
    if (!next) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(next.type) || next.size > 10 * 1024 * 1024) {
      void showValidationAlert(['이미지 또는 PDF 파일 1개를 10MB 이하로 올려 주세요.'], '확인해 주세요');
      return;
    }
    setFile(next);
  };

  const apply = () => {
    const fillLine = (rows: IncomeRecord['payments'], itemId: string, amount: string) => rows.map((row) => (row.itemId === itemId && !hasMeaningfulAmount(row.amount) ? { ...row, amount } : row));
    onApply({
      ...draft,
      title: draft.title || '11월 급여',
      payer: draft.payer || '(주)미리온테크',
      ...(draft.kind === '근로소득' ? { payments: fillLine(draft.payments, 'base-pay', '3000000'), deductions: fillLine(draft.deductions, 'income-tax', '100000') } : {})
    });
  };

  return (
    <section
      aria-label="AI 입력 보조"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        selectFile(event.dataTransfer.files[0]);
      }}
      onPaste={(event) => {
        const image = Array.from(event.clipboardData.items)
          .find((item) => item.type.startsWith('image/'))
          ?.getAsFile();
        if (image) {
          event.preventDefault();
          selectFile(image);
        }
      }}
    >
      {!review ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="income-ai-text" className="text-xs font-semibold">
              수입 설명 또는 명세 내용
            </label>
            <textarea
              id="income-ai-text"
              rows={3}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
              }}
              placeholder="예: 11월 급여 기본급 300만원, 소득세 10만원"
              className="w-full resize-y rounded-md border border-border-strong bg-card px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
            />
          </div>
          <div className="rounded-lg border border-dashed border-border-strong bg-muted/35 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">수입 자료 (선택)</p>
                <p className="text-[11px] text-muted-foreground">급여명세서, 사업소득 지급명세서, 퇴직소득 명세서 등</p>
                <p className="text-[11px] text-muted-foreground">PNG·JPEG·WebP·PDF, 10MB 이하</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="sr-only"
                onChange={(event) => {
                  selectFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                <FilePlus2 className="size-3.5" /> 파일 선택
              </Button>
            </div>
            {file ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">{file.name}</span>
                <button type="button" aria-label="첨부 파일 제거" className="cursor-pointer p-2" onClick={() => setFile(null)}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              직접 입력
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!text.trim() && !file) {
                  void showValidationAlert(['수입 자료를 올리거나 수입 내용을 입력해 주세요.'], '확인해 주세요');
                  return;
                }
                setReview(true);
              }}
            >
              <Sparkles className="size-3.5" /> 초안 만들기 · 시연
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">예시 초안이에요. 인식한 내용을 확인해 주세요.</p>
          <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border text-xs">
            {[
              ['내용', draft.title ? '기존 값 유지' : '11월 급여'],
              ['지급처', draft.payer ? '기존 값 유지' : '(주)미리온테크'],
              ['지급 · 기본급', proposedValue(draft.payments, 'base-pay', '3,000,000원')],
              ['공제 · 소득세', proposedValue(draft.deductions, 'income-tax', '100,000원')],
              ['귀속월', '확인 필요'],
              ['입금 상태', '기존 값 유지']
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold text-right tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {draft.kind !== '근로소득' ? (
            <NoticeBox variant="info" className="text-xs">
              예시 금액은 근로소득에만 반영돼요.
            </NoticeBox>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReview(false)}>
              다시 입력
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              초안 반영
            </Button>
          </div>
        </>
      )}
    </section>
  );
};
