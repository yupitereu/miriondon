export type PreviewRoute = {
  id: string;
  label: string;
  path: string;
  description: string;
};

export type ViewportPreset = {
  id: '320' | '375' | '768' | '1280';
  label: string;
  width: number;
};

export const DEFAULT_PREVIEW_ROUTE: PreviewRoute = {
  id: 'settlement',
  label: '결산 (월별 · 연간)',
  path: '/preview/settlement',
  description: '가계부 월별 · 연간 결산 반응형 시안'
};

export const PREVIEW_ROUTES: PreviewRoute[] = [
  DEFAULT_PREVIEW_ROUTE,
  {
    id: 'expenses',
    label: '지출 내역',
    path: '/preview/expenses',
    description: '지출 내역 조회 · 필터 · 지출 입력/수정 시트 시안'
  },
  {
    id: 'funds',
    label: '지불 관리',
    path: '/preview/funds',
    description: '계좌별 채울 금액 · 조정 · 지불 상태 일괄 변경 시안'
  },
  {
    id: 'assets',
    label: '자산 현황',
    path: '/preview/assets',
    description: '계좌·현금·저축·부채 보유금 갱신 및 예정 입출금 대조 시안'
  },
  {
    id: 'expense-edit',
    label: '지출 입력 · 할부',
    path: '/preview/expense-edit',
    description: '지출 입력(분할 · 회수 · 유이자 할부) 반응형 시트/모달 시안'
  },
  {
    id: 'design-system',
    label: 'Design System',
    path: '/preview/design-system',
    description: '토큰 · @repo/ui-core · @repo/ui-composition 인터랙티브 카탈로그'
  }
];

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: '320', label: '최소 320px', width: 320 },
  { id: '375', label: '모바일 375px', width: 375 },
  { id: '768', label: '태블릿 768px', width: 768 },
  { id: '1280', label: 'PC 1280px', width: 1280 }
];

export const COMPARE_VIEWPORT_IDS: ViewportPreset['id'][] = ['320', '375', '768', '1280'];
