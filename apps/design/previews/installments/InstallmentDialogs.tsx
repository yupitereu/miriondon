'use client';

import { DatePicker, type PeriodMonthValue } from '@repo/ui-composition';
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
  SelectValue
} from '@repo/ui-core';
import { useMemo, useState, type SubmitEvent } from 'react';

import type { InstallmentPlanItem, InstallmentRoundItem } from '@/previews/installments/installments-model';
import { formatWon } from '@/shared/design-format';
import { addMonthsToPeriod, formatYearMonth, type PaymentStatus } from '@/shared/expense-form/expense-form-model';

type EarlyPayoffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: InstallmentPlanItem;
  remainingRounds: InstallmentRoundItem[];
  defaultPeriod: PeriodMonthValue;
  onConfirm: (payload: { planId: string; payoffAmount: number; yearMonth: string; payoffDate: Date; status: PaymentStatus }) => void;
};

export const EarlyPayoffDialog = ({ open, onOpenChange, plan, remainingRounds, defaultPeriod, onConfirm }: EarlyPayoffDialogProps) => {
  const remainingTotal = remainingRounds.reduce((sum, round) => sum + round.amount, 0);
  const firstRound = remainingRounds[0]?.roundNumber ?? 1;
  const lastRound = remainingRounds[remainingRounds.length - 1]?.roundNumber ?? plan.totalMonths;
  const roundRangeLabel = firstRound === lastRound ? `${firstRound}회차` : `${firstRound}~${lastRound}회차`;

  const monthOptions = useMemo(() => {
    return [-1, 0, 1, 2].map((delta) => formatYearMonth(addMonthsToPeriod(defaultPeriod, delta)));
  }, [defaultPeriod]);

  const [payoffAmount, setPayoffAmount] = useState<number | null>(remainingTotal);
  const [yearMonth, setYearMonth] = useState<string>(() => formatYearMonth(defaultPeriod));
  const [payoffDate, setPayoffDate] = useState<Date | null>(() => new Date(defaultPeriod.year, defaultPeriod.month - 1, 4));
  const [status, setStatus] = useState<PaymentStatus>('지불 완료');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (payoffAmount === null || !Number.isSafeInteger(payoffAmount) || payoffAmount <= 0) {
      setErrorMessage('선결제 금액을 1원 이상의 정수로 입력해 주세요.');
      return;
    }
    if (!payoffDate) {
      setErrorMessage('선결제일을 선택해 주세요.');
      return;
    }

    setErrorMessage(null);
    onConfirm({
      planId: plan.id,
      payoffAmount,
      yearMonth,
      payoffDate,
      status
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="break-keep">{plan.merchant} · 조기 완납</DialogTitle>
            <DialogDescription className="break-keep">
              남은 {remainingRounds.length}개 회차({roundRangeLabel}, 합계 {formatWon(remainingTotal)})를 단일 선결제 거래로 합쳐 완납 처리해요.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="early-payoff-amount" className="text-xs font-semibold text-foreground">
                  선결제 금액
                </label>
                <NumberInput
                  id="early-payoff-amount"
                  size="md"
                  value={payoffAmount}
                  onValueChange={(next) => {
                    setPayoffAmount(next);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  suffix="원"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="early-payoff-month" className="text-xs font-semibold text-foreground">
                  반영할 예산월
                </label>
                <Select value={yearMonth} onValueChange={setYearMonth}>
                  <SelectTrigger id="early-payoff-month" size="md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((ym) => (
                      <SelectItem key={ym} value={ym}>
                        {ym}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground">선결제일</span>
                <DatePicker
                  value={payoffDate}
                  onChange={(next) => {
                    setPayoffDate(next);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  presets={['today', 'yesterday']}
                  sheetTitle="선결제일 선택"
                  className="h-control-md min-h-control-md"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="early-payoff-status" className="text-xs font-semibold text-foreground">
                  선결제 지불 상태
                </label>
                <Select value={status} onValueChange={(next) => setStatus(next as PaymentStatus)}>
                  <SelectTrigger id="early-payoff-status" size="md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="지불 완료">지불 완료 (출금 완료)</SelectItem>
                    <SelectItem value="지불 대기">지불 대기 (자금 확보)</SelectItem>
                    <SelectItem value="준비 필요">준비 필요 (예정)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <NoticeBox variant="info">승인월에 전액 카드 실적이 반영된 할부는 조기 완납 시 실적을 중복 합산하지 않아요.</NoticeBox>

            {errorMessage ? (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-4 sm:flex sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              조기 완납
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
