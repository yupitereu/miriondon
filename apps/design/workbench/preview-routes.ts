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
    id: 'installments',
    label: '할부 관리',
    path: '/preview/installments',
    description: '진행 중·완료 할부 조회 · 조기 완납 · 할부 삭제 · 청구 예정표 시안'
  },
  {
    id: 'receivables',
    label: '회수금 관리',
    path: '/preview/receivables',
    description: '거래일 기준 전체 기간 미회수·완료 조회 · 기간(시작일·종료일)/상대/입금 계좌 필터 · 일괄 회수 처리 시안'
  },
  {
    id: 'assets',
    label: '자산 현황',
    path: '/preview/assets',
    description: '구성원별·4대 자산 분류 순자산 현황 · 예정 입출금 분리 대조 · 외화/금 기준 환율 환산 시안'
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
  },
  {
    id: 'brand-logo',
    label: '브랜드 로고 (5안)',
    path: '/preview/brand-logo',
    description: '미리온돈 브랜드 로고 5종 시안 · 사이즈 · Light/Dark · 실착 비교'
  }
];

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: '320', label: '최소 320px', width: 320 },
  { id: '375', label: '모바일 375px', width: 375 },
  { id: '768', label: '태블릿 768px', width: 768 },
  { id: '1280', label: 'PC 1280px', width: 1280 }
];

export const COMPARE_VIEWPORT_IDS: ViewportPreset['id'][] = ['320', '375', '768', '1280'];
