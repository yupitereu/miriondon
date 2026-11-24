'use client';

import { Input } from '@repo/ui-core';

import { formatWon } from '@/shared/design-format';

export type MarketQuoteValuationResult = {
  isValid: boolean;
  quantity: number;
  computedKrw: number | null;
};

/** 시세 연동 자산(외화·금)의 보유량 문자열을 파싱하고 공통 참고 시세 기준 원화 평가액을 계산한다. */
export const calculateQuoteValuation = (quantityText: string, ratePerUnit: number): MarketQuoteValuationResult => {
  const trimmed = quantityText.trim();
  const parsedQty = Number(quantityText.replace(/,/g, '').trim());
  const isValid = trimmed.length > 0 && Number.isFinite(parsedQty) && parsedQty >= 0;
  return {
    isValid,
    quantity: isValid ? parsedQty : 0,
    computedKrw: isValid ? Math.round(parsedQty * ratePerUnit) : null
  };
};

export type MarketQuoteValuationFieldsProps = {
  assetKind: 'fx' | 'gold';
  unitLabel: string;
  ratePerUnit: number;
  rateSource?: string;
  rateUpdatedAt?: string;
  quantityText: string;
  onQuantityTextChange: (next: string) => void;
  inputId?: string;
  invalid?: boolean;
};

/** 외화 계좌·금 등 시세 연동 자산의 보유량 입력 및 자동 계산된 원화 참고 평가액을 공통 렌더링한다. */
export const MarketQuoteValuationFields = ({
  assetKind,
  unitLabel,
  ratePerUnit,
  rateSource,
  rateUpdatedAt,
  quantityText,
  onQuantityTextChange,
  inputId = 'asset-quote-quantity',
  invalid = false
}: MarketQuoteValuationFieldsProps) => {
  const { computedKrw } = calculateQuoteValuation(quantityText, ratePerUnit);
  const resolvedSource = rateSource ?? (assetKind === 'fx' ? '공통 환율 참고 시세' : '공통 금 참고 시세');
  const unitPrefix = assetKind === 'fx' ? `1 ${unitLabel}` : `1${unitLabel}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs font-semibold text-foreground">
          보유량 ({unitLabel})
        </label>
        <Input
          id={inputId}
          size="md"
          inputMode="decimal"
          placeholder={assetKind === 'fx' ? '예: 1200' : '예: 10'}
          className="tabular-nums"
          suffix={unitLabel}
          value={quantityText}
          invalid={invalid}
          onChange={(event) => onQuantityTextChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-3 text-xs tabular-nums">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">원화 참고 평가액 (자동 계산)</span>
          <strong className="text-sm font-extrabold text-primary">{computedKrw !== null ? formatWon(computedKrw) : '보유량 입력'}</strong>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {resolvedSource} · {unitPrefix} = {formatWon(ratePerUnit)}
          {rateUpdatedAt ? ` (${rateUpdatedAt} 기준)` : ''}
        </span>
      </div>
    </div>
  );
};
