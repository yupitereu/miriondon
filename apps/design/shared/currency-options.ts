export type CurrencyOption = {
  code: string;
  name: string;
  label: string;
  ratePerUnit: number;
};

const RAW_FX_CURRENCIES: ReadonlyArray<{ code: string; name: string; ratePerUnit: number }> = [
  { code: 'JPY', name: '일본 엔', ratePerUnit: 9.1 },
  { code: 'VND', name: '베트남 동', ratePerUnit: 0.055 },
  { code: 'USD', name: '미국 달러', ratePerUnit: 1385 },
  { code: 'THB', name: '태국 바트', ratePerUnit: 40 },
  { code: 'PHP', name: '필리핀 페소', ratePerUnit: 24 },
  { code: 'TWD', name: '대만 달러', ratePerUnit: 43 },
  { code: 'CNY', name: '중국 위안', ratePerUnit: 192 },
  { code: 'HKD', name: '홍콩 달러', ratePerUnit: 177 },
  { code: 'SGD', name: '싱가포르 달러', ratePerUnit: 1040 },
  { code: 'MYR', name: '말레이시아 링깃', ratePerUnit: 310 },
  { code: 'IDR', name: '인도네시아 루피아', ratePerUnit: 0.084 },
  { code: 'EUR', name: '유로', ratePerUnit: 1500 },
  { code: 'GBP', name: '영국 파운드', ratePerUnit: 1760 },
  { code: 'AUD', name: '호주 달러', ratePerUnit: 900 },
  { code: 'CAD', name: '캐나다 달러', ratePerUnit: 1000 },
  { code: 'CHF', name: '스위스 프랑', ratePerUnit: 1560 }
];

const toCurrencyOption = (entry: { code: string; name: string; ratePerUnit: number }): CurrencyOption => ({
  ...entry,
  label: `${entry.code} (${entry.name})`
});

export const FX_CURRENCY_OPTIONS: ReadonlyArray<CurrencyOption> = RAW_FX_CURRENCIES.map(toCurrencyOption);

export const CASH_CURRENCY_OPTIONS: ReadonlyArray<CurrencyOption> = [toCurrencyOption({ code: 'KRW', name: '대한민국 원', ratePerUnit: 1 }), ...FX_CURRENCY_OPTIONS];

/** 통화 코드에 대응하는 국가·통화 단위명(예: `미국 달러`)을 반환한다. */
export const getCurrencyDisplayName = (code: string): string | null => CASH_CURRENCY_OPTIONS.find((item) => item.code === code)?.name ?? null;
