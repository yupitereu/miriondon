'use client';

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@repo/ui-core';
import { Check, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';

import { MiriondonSymbol, MiriondonWordmark } from '@/shared/BrandLogo';

export type BrandLogoId = 'time-shift' | 'card-fold' | 'future-arc' | 'dual-ring' | 'hangul-stamp' | 'ledger-shift' | 'credit-to-check' | 'instant-check-card';
export type BrandWordmarkId = 'korean-check' | 'korean-two-tone' | 'korean-dot' | 'english-geometric';

type BrandWordmarkMeta = {
  id: BrandWordmarkId;
  numberLabel: string;
  name: string;
  subtitle: string;
  recommended?: boolean;
  keywords: string[];
  rationale: string;
  pros: string;
  caution: string;
};

const DEFAULT_WORDMARK_PROPOSAL: BrandWordmarkMeta = {
  id: 'korean-check',
  numberLabel: 'A안',
  name: '미리온돈 + 체크 포인트',
  subtitle: '와인 단색 한글 워드마크 · 우상단 ✓ 포인트',
  recommended: true,
  keywords: ['한글 워드마크', '체크카드 ✓', '7안 심볼 패밀리'],
  rationale: '타이트한 자간(-0.05em)의 와인색 한글 워드마크 끝에 티얼 체크(✓) 1개를 얹어, 별도 심볼 없이도 "신용카드를 체크카드처럼" 컨셉과 7안 파비콘의 패밀리 톤을 연결함.',
  pros: '사이드바·로그인 화면에서 군더더기 없이 브랜드 이름이 즉시 각인되고, 기본 본문 텍스트와 확실히 구분됨.',
  caution: '체크 포인트 크기가 너무 크면 글자 균형이 오른쪽으로 쏠리므로 자간과 상단 정렬을 일정하게 유지해야 함.'
};

const BRAND_WORDMARK_PROPOSALS: BrandWordmarkMeta[] = [
  DEFAULT_WORDMARK_PROPOSAL,
  {
    id: 'korean-two-tone',
    numberLabel: 'B안',
    name: '2톤 의미 분리 (미리 · 온돈)',
    subtitle: '미리(와인) + 온돈(잉크) 컬러 대비',
    keywords: ['의미 강조', '무장식 미니멀', '높은 가독성'],
    rationale: '장식 요소 없이 "미리"(선반영, 와인)와 "온돈"(자금, 딥 잉크)을 컬러 대비만으로 분리해 이름 자체가 설명이 되도록 구성함.',
    pros: '어떠한 그래픽 기호도 쓰지 않아 가장 차분하고 오래 질리지 않는 금융 서비스 톤을 유지함.',
    caution: '다크 히어로 반전 모드에서는 컬러 대신 투명도(100% vs 72%)로 구분하므로 대비가 다소 부드러워짐.'
  },
  {
    id: 'korean-dot',
    numberLabel: 'C안',
    name: '미니멀 워드마크 (미리온돈.)',
    subtitle: '딥 잉크 단색 + 티얼 마침표 포인트',
    keywords: ['절제된 금융톤', '마침표 시그니처', '다크/라이트 범용'],
    rationale: '삼성·카카오처럼 브랜드명 자체에 힘을 싣고, 베이스라인 끝 티얼 마침표(.) 하나로 "정산·확인 완료" 인상을 절제해 담음.',
    pros: '와인색을 UI 주요 버튼·강조에 양보하면서 로고는 중립 잉크로 단단하게 중심을 잡아줌.',
    caution: '와인 브랜드 컬러 존재감이 약해질 수 있어 사이드바·로그인 배경 톤과 함께 조율해야 함.'
  },
  {
    id: 'english-geometric',
    numberLabel: 'D안',
    name: '영문 지오메트릭 (miriondon)',
    subtitle: '카카오 스타일 소문자 워드마크 + 티얼 포인트',
    keywords: ['영문 워드마크', '모던 테크톤', '소문자 리듬'],
    rationale: '둥근 기하학적 소문자 miriondon에 끝 체크 포인트만 더해 테크·핀테크 브랜드 특유의 세련된 영문 인상을 구현함.',
    pros: '영문 타이포의 균일한 리듬으로 시각적 완성도가 높고 다국어·대시보드 UI와 잘 어울림.',
    caution: '국내 가계부 첫 방문 사용자가 "미리 온 돈"이라는 한글 의미를 직관적으로 파악하는 데 한 박자 걸릴 수 있음.'
  }
];

export const BrandWordmark = ({ id, tone = 'brand', size = 'md', className }: { id: BrandWordmarkId; tone?: 'brand' | 'mono-light'; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const isMonoLight = tone === 'mono-light';
  const sizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const accentColor = isMonoLight ? '#7ED6BE' : 'hsl(var(--positive))';

  switch (id) {
    case 'korean-check':
      return (
        <span className={cn('inline-flex items-start leading-none font-black tracking-[-0.055em] select-none', sizeClass, isMonoLight ? 'text-white' : 'text-primary', className)}>
          <span>미리온돈</span>
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className={cn('ml-0.5 shrink-0', size === 'sm' ? 'mt-0.5 size-2.5' : size === 'lg' ? 'mt-0.5 size-4' : 'mt-0.5 size-3')}>
            <path d="M2.2 7.2 L5.4 10.4 L11.8 3.6" stroke={accentColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );

    case 'korean-two-tone':
      return <MiriondonWordmark tone={tone} size={size} className={className} />;

    case 'korean-dot':
      return (
        <span className={cn('inline-flex items-baseline leading-none font-black tracking-[-0.055em] select-none', sizeClass, isMonoLight ? 'text-white' : 'text-foreground', className)}>
          <span>미리온돈</span>
          <span aria-hidden="true" className={cn('ml-0.5 inline-block rounded-full', size === 'sm' ? 'size-1.5' : size === 'lg' ? 'size-2' : 'size-1.5')} style={{ backgroundColor: accentColor }} />
        </span>
      );

    case 'english-geometric':
      return (
        <span className={cn('inline-flex items-start leading-none font-extrabold tracking-[-0.04em] lowercase select-none', sizeClass, isMonoLight ? 'text-white' : 'text-primary', className)}>
          <span>miriondon</span>
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className={cn('ml-0.5 shrink-0', size === 'sm' ? 'mt-0.5 size-2.5' : size === 'lg' ? 'mt-0.5 size-3.5' : 'mt-0.5 size-3')}>
            <path d="M2.2 7.2 L5.4 10.4 L11.8 3.6" stroke={accentColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
  }
};

type BrandLogoMeta = {
  id: BrandLogoId;
  numberLabel: string;
  name: string;
  subtitle: string;
  recommended?: boolean;
  keywords: string[];
  rationale: string;
  pros: string;
  caution: string;
};

const DEFAULT_LOGO_PROPOSAL: BrandLogoMeta = {
  id: 'time-shift',
  numberLabel: '1안',
  name: '타임-시프트 M 모노그램',
  subtitle: '선반영 궤적 · Forward-Shift M',
  keywords: ['선반영', '예정 지출', '16px 최적'],
  rationale: '앞으로 나갈 돈을 미리 당겨 반영하는 핵심 메커니즘을 10° 전진 기울기의 기하학적 M과 선행(Lead) 레이어로 표현함.',
  pros: '16px 파비콘·태블릿 레일 단독 배치에서 M 판독성이 가장 높고 Light/Dark 단일 컬러 대응이 깔끔함.',
  caution: '범용 M 핀테크 로고와 구분되도록 앞뒤 레이어 대비와 꺾임 각도를 유지해야 함.'
};

const BRAND_LOGO_PROPOSALS: BrandLogoMeta[] = [
  DEFAULT_LOGO_PROPOSAL,
  {
    id: 'card-fold',
    numberLabel: '2안',
    name: '실선·점선 카드 폴드 M',
    subtitle: '확정 카드 + 예정 지출 폴드',
    keywords: ['카드 실적', '예정 분절선', '결제 준비액'],
    rationale: '두 장의 카드/장부가 엇갈려 M 골격을 이루며, 앞쪽 실선(이미 쓴 돈)과 뒤쪽 분절선(앞으로 나갈 돈)을 대비시킴.',
    pros: '카드값·실적·준비금 관리라는 도메인 기능이 첫눈에 읽힘.',
    caution: '초소형(16px) 축소 시 뒤쪽 분절선이 뭉개지지 않게 스트로크 굵기 단순화가 필수임.'
  },
  {
    id: 'future-arc',
    numberLabel: '3안',
    name: '프레젠트-투-퓨처 아크',
    subtitle: '미리 온 궤적 코인',
    keywords: ['돈의 흐름', '생활비 코인', '서사적'],
    rationale: '오른쪽(미래)에서 출발한 분절 궤적이 현재 생활비 코인 중심부로 미리 들어오는 흐름을 원형 배지에 담음.',
    pros: '기존 사후 기록형 가계부와 다른 미리온돈만의 시간축 개념을 가장 잘 설명함.',
    caution: '이니셜 M과 직접 연결되지 않아 태블릿 레일 단독 아이콘 사용 시 문자 연상이 약할 수 있음.'
  },
  {
    id: 'dual-ring',
    numberLabel: '4안',
    name: '듀얼 인터록 링',
    subtitle: '공동 가계부 · 잔액 대조',
    keywords: ['공동 관리', '잔액 대조', '2색 포인트'],
    rationale: '와인(--primary)과 긍정 티얼(--positive) 두 고리가 교차해 개인·공동 가계부와 실제/예정 잔액 대조를 상징함.',
    pros: '딱딱한 금융 톤을 낮춰 부부·가족 타겟에게 친근하고 균형 잡힌 인상을 줌.',
    caution: '2색 구조상 단색 인쇄·단색 파비콘에서는 흑백 톤 분리 가이드가 별도로 필요함.'
  },
  {
    id: 'hangul-stamp',
    numberLabel: '5안',
    name: '한글 스탬프 모노그램',
    subtitle: '초성 ㅁ + 인입 코인',
    keywords: ['한글 정체성', '장부 도장', '스퀘어클'],
    rationale: '서비스명 첫 글자 ㅁ을 라운드 장부 프레임으로 두고, 우측 상단에서 코인이 미리 들어오는 노치 포인트를 배치함.',
    pros: '국내 사용자 기억 각인력과 앱 아이콘(1:1 비율) 완성도가 뛰어남.',
    caution: '영문 표기(Miriondon) 단독 노출 환경에서는 M 기반 심볼 대비 연결감이 낮아질 수 있음.'
  },
  {
    id: 'ledger-shift',
    numberLabel: '6안',
    name: '장부 속 타임-시프트 M',
    subtitle: '채워진 장부 실루엣 + 단순화 M',
    keywords: ['가계부 정체성', '선반영 M', '16px 선명'],
    rationale: '채워진 장부 실루엣(좌측 책등 컷) 안에 1안의 전진 기울기 M을 단선으로 단순화해 넣고, 우상단 전진 화살표로 선반영 흐름을 결합함.',
    pros: '가계부 도메인 직관성과 영문 이니셜 M 식별을 동시에 챙기면서도 16px 축소 시 선 뭉개짐을 방지함.',
    caution: '책등 라인과 내부 M 사이의 여백 비율이 좁아지면 16px에서 붙어 보일 수 있어 여백 유지가 중요함.'
  },
  {
    id: 'credit-to-check',
    numberLabel: '7안',
    name: '체크카드 M 배지',
    subtitle: '신용카드 → 체크(✓)카드화 · M 모노그램',
    recommended: true,
    keywords: ['신용→체크카드', '즉시 차감 ✓', 'M 심볼'],
    rationale: '신용카드 실루엣 안에 미리온돈 M을 새기고, 우상단에 투명 컷아웃을 둔 티얼 체크(✓) 인장을 결합해 "신용카드를 체크카드처럼 쓰는" 핵심 가치를 직관적으로 표현함.',
    pros: '카드 + 체크(✓)의 이중 의미(체크카드 · 결제 준비 완료)와 브랜드 이니셜 M이 한눈에 읽히고 어떤 배경 위에서도 컷아웃 간격이 깔끔함.',
    caution: '16px 초소형 탭에서는 우상단 체크 원 내부 획이 얇아지지 않도록 두꺼운 스트로크 유지가 필요함.'
  },
  {
    id: 'instant-check-card',
    numberLabel: '8안',
    name: '신용→체크 듀얼 카드',
    subtitle: '예정 신용카드 뒤 · 즉시 체크카드 앞',
    keywords: ['신용→체크 전환', 'IC 칩 + ✓', '순수 아이콘'],
    rationale: '뒤쪽 반투명 신용카드(예정 결제)에서 앞쪽 솔리드 카드(IC 칩 + 굵은 체크 ✓)로 전환되는 2레이어 실루엣으로 신용카드의 체크카드화를 문자 없이 상징함.',
    pros: '문자(M)에 묶이지 않은 순수 심볼이라 16px 파비콘과 글로벌·한글 환경 모두에서 조형 완성도가 높음.',
    caution: 'M 모노그램이 없어 단독 노출 시 서비스명 연상은 브랜드 노출 누적에 의존함.'
  }
];

export const BrandLogoMark = ({ id, className, tone = 'brand' }: { id: BrandLogoId; className?: string; tone?: 'brand' | 'mono-light' }) => {
  const maskId = useId();
  const isMonoLight = tone === 'mono-light';
  const primaryColor = isMonoLight ? '#FFFFFF' : 'hsl(var(--primary))';
  const secondaryColor = isMonoLight ? 'rgba(255, 255, 255, 0.45)' : 'hsl(var(--positive))';
  const echoColor = isMonoLight ? 'rgba(255, 255, 255, 0.34)' : 'hsl(var(--primary))';
  const echoOpacity = isMonoLight ? 1 : 0.28;

  switch (id) {
    case 'time-shift': {
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          {/* Ahead/future echo ribbon shifted forward */}
          <path d="M17 34 L19.5 15 L28 24.5 L36.5 15 L39 34" stroke={echoColor} strokeOpacity={echoOpacity} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
          {/* Main anchored forward-leaning M */}
          <path d="M9.5 34 L12 15 L20.5 24.5 L29 15 L31.5 34" stroke={primaryColor} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
          {/* Forward arrival chevron accent */}
          <path d="M35.5 11.5 L40.5 15.5 L35.5 19.5" stroke={secondaryColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    case 'card-fold':
      return <MiriondonSymbol tone={tone} className={className} />;

    case 'future-arc': {
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          {/* Confirmed present coin arc (left & bottom) */}
          <path d="M31.5 9.8 A16.5 16.5 0 1 0 38.8 31.2" stroke={primaryColor} strokeWidth="4.6" strokeLinecap="round" />
          {/* Incoming scheduled arc segments from future (top-right) */}
          <path d="M36.5 13.5 A16.5 16.5 0 0 1 40.5 24" stroke={echoColor} strokeOpacity={isMonoLight ? 0.55 : 0.38} strokeWidth="4.6" strokeLinecap="round" />
          {/* Flowing m-wave bridge pulling future into present center */}
          <path d="M15.5 27.5 C17.5 19.5, 22 19.5, 24 25 C26 30.5, 30.5 28.5, 33 21.5" stroke={primaryColor} strokeWidth="3.8" strokeLinecap="round" />
          <circle cx="33.5" cy="20.5" r="3" fill={secondaryColor} />
        </svg>
      );
    }

    case 'dual-ring': {
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          {/* Left / primary ring */}
          <rect x="7" y="15" width="22" height="18" rx="9" transform="rotate(-24 18 24)" stroke={primaryColor} strokeWidth="4.4" />
          {/* Right / balance & shared ring */}
          <rect x="19" y="15" width="22" height="18" rx="9" transform="rotate(24 30 24)" stroke={secondaryColor} strokeWidth="4.4" />
          {/* Center intersection highlight dot */}
          <circle cx="24" cy="24" r="2.8" fill={primaryColor} />
        </svg>
      );
    }

    case 'hangul-stamp': {
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          {/* Open ㅁ ledger stamp frame */}
          <path
            d="M27.5 11 H15 C12.5 11 11 12.5 11 15 V33 C11 35.5 12.5 37 15 37 H33 C35.5 37 37 35.5 37 33 V20.5"
            stroke={primaryColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Pre-arriving coin at top-right opening */}
          <circle cx="36" cy="12" r="4.5" fill={secondaryColor} />
        </svg>
      );
    }

    case 'ledger-shift': {
      const innerCutout = isMonoLight ? 'hsl(var(--hero-to))' : '#FFFFFF';
      const spineStroke = isMonoLight ? 'rgba(69, 26, 55, 0.28)' : 'rgba(255, 255, 255, 0.28)';
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          {/* Solid filled ledger silhouette with clipped top-right corner */}
          <path d="M11 7 H30.5 L39 15.5 V37 C39 39.2 37.2 41 35 41 H11 C8.8 41 7 39.2 7 37 V11 C7 8.8 8.8 7 11 7 Z" fill={primaryColor} />
          {/* Subtle left ledger spine seam */}
          <line x1="12.5" y1="11.5" x2="12.5" y2="36.5" stroke={spineStroke} strokeWidth="2" strokeLinecap="round" />
          {/* Simplified forward-leaning M from Proposal 1 */}
          <path d="M16.5 31 L18.5 18.5 L24.5 25 L30.5 18.5 L32.5 31" stroke={innerCutout} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          {/* Top-right forward arrival chevron accent */}
          <path d="M34.5 7.5 L39.5 11.5 L34.5 15.5" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    case 'credit-to-check': {
      const innerCutout = isMonoLight ? 'hsl(var(--hero-to))' : '#FFFFFF';
      const badgeFill = isMonoLight ? '#FFFFFF' : 'hsl(var(--positive))';
      const badgeCheck = isMonoLight ? 'hsl(var(--hero-to))' : '#FFFFFF';
      const chipFill = isMonoLight ? 'rgba(69, 26, 55, 0.24)' : 'rgba(255, 255, 255, 0.3)';
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="48" height="48" fill="white" />
              <circle cx="37" cy="15.5" r="10.2" fill="black" />
            </mask>
          </defs>
          {/* Credit card body with crisp transparent cutout around check badge */}
          <g mask={`url(#${maskId})`}>
            <rect x="4" y="15" width="36" height="26" rx="5.5" fill={primaryColor} />
            {/* Subtle bottom card detail stripe */}
            <rect x="9.5" y="19" width="7" height="2.4" rx="1.2" fill={chipFill} />
            {/* Forward M monogram anchored inside the card */}
            <path d="M10.5 34.5 L12.5 23.5 L19 29.5 L25.5 23.5 L27.5 34.5" stroke={innerCutout} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {/* Instant Check (체크카드) seal at top-right */}
          <circle cx="37" cy="15.5" r="8.2" fill={badgeFill} />
          <path d="M33.3 15.6 L36 18.3 L41 12.9" stroke={badgeCheck} strokeWidth="2.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    case 'instant-check-card': {
      const innerCutout = isMonoLight ? 'hsl(var(--hero-to))' : '#FFFFFF';
      const chipFill = isMonoLight ? 'rgba(69, 26, 55, 0.28)' : 'rgba(255, 255, 255, 0.36)';
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="48" height="48" fill="white" />
              <rect x="3" y="13.5" width="38" height="28" rx="7" fill="black" />
            </mask>
          </defs>
          {/* Back deferred credit card layer */}
          <g mask={`url(#${maskId})`}>
            <rect x="10" y="7.5" width="33" height="22" rx="5" fill={echoColor} fillOpacity={isMonoLight ? 0.34 : 0.24} />
            <rect x="30" y="10.8" width="9" height="2.6" rx="1.3" fill={secondaryColor} />
          </g>
          {/* Front solid instant check-card */}
          <rect x="5" y="15.5" width="34" height="24" rx="5.5" fill={primaryColor} />
          {/* Credit card IC chip + mini card bar */}
          <rect x="10" y="21.5" width="7" height="5.2" rx="1.4" fill={chipFill} />
          <rect x="10" y="30.2" width="9.5" height="2.4" rx="1.2" fill={chipFill} />
          {/* Bold checkmark turning credit card into check card */}
          <path d="M22.5 28.5 L27 33 L35 23" stroke={innerCutout} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
  }
};

export const BrandLogoProposals = () => {
  const [selectedId, setSelectedId] = useState<BrandLogoId>('card-fold');
  const [selectedWordmarkId, setSelectedWordmarkId] = useState<BrandWordmarkId>('korean-two-tone');
  const selectedProposal = BRAND_LOGO_PROPOSALS.find((item) => item.id === selectedId) ?? DEFAULT_LOGO_PROPOSAL;
  const selectedWordmark = BRAND_WORDMARK_PROPOSALS.find((item) => item.id === selectedWordmarkId) ?? DEFAULT_WORDMARK_PROPOSAL;

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 md:p-6">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="wine">워드마크 4종 · 심볼 8종</Badge>
          <Badge variant="neutral">Wine Violet &amp; Warm Stone 대응</Badge>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground break-keep md:text-2xl">미리온돈 (Miriondon) 브랜드 로고 제안</h1>
        <p className="text-sm text-muted-foreground">넓은 화면(PC 사이드바·로그인·히어로)용 워드마크 단독 시안과 1:1 영역(파비콘·앱 아이콘·태블릿 레일)용 심볼 시안을 분리해 비교함.</p>
      </div>

      {/* Part 1: Wordmark Standalone Proposals */}
      <section aria-label="메인 워드마크 시안" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground">1. 메인 워드마크 (심볼 없이 서비스명 단독)</h2>
            <p className="text-xs text-muted-foreground">PC 사이드바 · 히어로 배너 · 로그인 화면에서 심볼을 빼고 서비스명만으로 브랜드 각인력을 높이는 구성</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BRAND_WORDMARK_PROPOSALS.map((item) => {
              const active = item.id === selectedWordmarkId;
              return (
                <Button key={item.id} type="button" size="sm" variant={active ? 'primary' : 'outline'} className="cursor-pointer" onClick={() => setSelectedWordmarkId(item.id)}>
                  {item.numberLabel}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Wordmark Live UI Preview */}
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base break-keep">
              워드마크 실착 미리보기: {selectedWordmark.numberLabel} · {selectedWordmark.name}
            </CardTitle>
            <CardDescription>{selectedWordmark.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* PC Sidebar Standalone Wordmark */}
            <div className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3.5">
              <span className="text-xs font-semibold text-muted-foreground">PC 사이드바 단독 (236px)</span>
              <div className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-sidebar-border bg-sidebar p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <BrandWordmark id={selectedWordmarkId} size="md" />
                </div>
                <div className="rounded-md bg-sidebar-accent px-2.5 py-1.5 text-xs font-bold text-sidebar-accent-foreground">결산</div>
                <div className="px-2.5 py-1 text-xs font-medium text-muted-foreground">지출 내역</div>
              </div>
              <span className="text-[11px] text-muted-foreground">심볼 제거로 사이드바 상단 밀도 정리</span>
            </div>

            {/* Hero / Login Banner Standalone Wordmark */}
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3.5">
              <span className="text-xs font-semibold text-muted-foreground">히어로 / 로그인 배너</span>
              <div className="flex flex-col gap-2.5 rounded-xl p-4 text-hero-foreground" style={{ background: 'linear-gradient(135deg, hsl(var(--hero-from)), hsl(var(--hero-to)))' }}>
                <BrandWordmark id={selectedWordmarkId} tone="mono-light" size="lg" />
                <p className="text-xs leading-snug text-white/85 break-keep">신용카드를 체크카드처럼, 미리 반영하는 생활비 가계부</p>
              </div>
              <span className="text-[11px] text-muted-foreground">딥 플럼 그라데이션 위 반전 워드마크</span>
            </div>

            {/* Mobile Top Header / Login Card */}
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3.5">
              <span className="text-xs font-semibold text-muted-foreground">모바일 헤더 · 로그인 카드</span>
              <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <BrandWordmark id={selectedWordmarkId} size="sm" />
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">우리집 가계부</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-foreground">남은 생활비</span>
                  <span className="text-lg font-extrabold text-primary tabular-nums">1,420,000원</span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">본문 텍스트와의 시각적 위계 확인</span>
            </div>
          </CardContent>
        </Card>

        {/* Wordmark 4 Proposals Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {BRAND_WORDMARK_PROPOSALS.map((proposal) => {
            const isSelected = proposal.id === selectedWordmarkId;
            return (
              <Card key={proposal.id} className={cn('min-w-0 transition-colors', isSelected ? 'border-primary ring-2 ring-primary/15' : 'hover:border-border-strong')}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={proposal.recommended ? 'wine' : 'neutral'}>{proposal.numberLabel}</Badge>
                        {proposal.recommended ? (
                          <Badge variant="positive" className="gap-1">
                            <Sparkles className="size-3" />
                            1순위 추천
                          </Badge>
                        ) : null}
                      </div>
                      <CardTitle className="text-base">{proposal.name}</CardTitle>
                      <CardDescription>{proposal.subtitle}</CardDescription>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? 'primary' : 'outline'}
                      className="min-h-control-sm shrink-0 cursor-pointer gap-1"
                      onClick={() => setSelectedWordmarkId(proposal.id)}
                    >
                      {isSelected ? <Check className="size-3.5" /> : null}
                      {isSelected ? '선택됨' : '미리보기'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background py-4">
                      <BrandWordmark id={proposal.id} size="lg" />
                      <span className="text-[11px] font-medium text-muted-foreground">라이트 기본</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg py-4" style={{ background: 'linear-gradient(135deg, hsl(var(--hero-from)), hsl(var(--hero-to)))' }}>
                      <BrandWordmark id={proposal.id} tone="mono-light" size="lg" />
                      <span className="text-[11px] font-medium text-white/85">히어로 반전</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {proposal.keywords.map((keyword) => (
                      <Badge key={keyword} variant="neutral">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <dl className="flex flex-col gap-1.5 rounded-lg bg-muted/55 p-3 text-xs leading-relaxed">
                    <div className="flex gap-2">
                      <dt className="w-11 shrink-0 font-bold text-foreground">컨셉</dt>
                      <dd className="text-foreground/90">{proposal.rationale}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-11 shrink-0 font-bold text-positive">강점</dt>
                      <dd className="text-muted-foreground">{proposal.pros}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-11 shrink-0 font-bold text-warning">유의</dt>
                      <dd className="text-muted-foreground">{proposal.caution}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Part 2: Symbol / Favicon / App Icon Proposals */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-6">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-foreground">2. 심볼 아이콘 (파비콘 · 앱 아이콘 · 태블릿 레일)</h2>
          <p className="text-xs text-muted-foreground">1:1 정사각형 초소형 슬롯(16px~48px)에서 사용하는 별도 심볼 시안 8종</p>
        </div>
      </div>

      {/* Live UI Integration Preview */}
      <Card className="min-w-0">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base break-keep">
                실착 미리보기: {selectedProposal.numberLabel} · {selectedProposal.name}
              </CardTitle>
              <CardDescription>{selectedProposal.subtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BRAND_LOGO_PROPOSALS.map((item) => {
                const active = item.id === selectedId;
                return (
                  <Button key={item.id} type="button" size="sm" variant={active ? 'primary' : 'outline'} className="cursor-pointer" onClick={() => setSelectedId(item.id)}>
                    {item.numberLabel}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 1. Favicon & App Icon */}
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3.5">
            <span className="text-xs font-semibold text-muted-foreground">파비콘 · 앱 아이콘</span>
            <div className="flex items-center gap-3">
              <div className="inline-flex size-12 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
                <BrandLogoMark id={selectedId} className="size-8" />
              </div>
              <div className="inline-flex size-12 items-center justify-center rounded-xl shadow-xs" style={{ background: 'linear-gradient(135deg, hsl(var(--hero-from)), hsl(var(--hero-to)))' }}>
                <BrandLogoMark id={selectedId} tone="mono-light" className="size-8" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5">
                <BrandLogoMark id={selectedId} className="size-4 shrink-0" />
                <span className="text-[11px] font-medium text-foreground">미리온돈</span>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground">48px 스퀘어클 · 16px 브라우저 탭</span>
          </div>

          {/* 2. Tablet Icon Rail */}
          <div className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3.5">
            <span className="text-xs font-semibold text-muted-foreground">태블릿 레일 (76px)</span>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-24 w-[76px] shrink-0 flex-col items-center justify-between rounded-lg border border-sidebar-border bg-sidebar py-2.5">
                <BrandLogoMark id={selectedId} className="size-7" />
                <div className="flex flex-col items-center gap-0.5 rounded-md bg-sidebar-accent px-2.5 py-1">
                  <span className="text-[10px] font-bold text-sidebar-accent-foreground">결산</span>
                </div>
              </div>
              <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">단독 심볼만으로 브랜드 식별이 가능한지 확인</p>
            </div>
            <span className="text-[11px] text-muted-foreground">기존 텍스트 M 대체 위치</span>
          </div>

          {/* 3. PC Sidebar Lockup */}
          <div className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3.5">
            <span className="text-xs font-semibold text-muted-foreground">PC 사이드바 Lockup (236px)</span>
            <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-sidebar-border bg-sidebar p-3">
              <div className="flex min-w-0 items-center gap-2">
                <BrandLogoMark id={selectedId} className="size-7 shrink-0" />
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                  <span className="text-base font-extrabold tracking-[-0.03em] text-sidebar-foreground">미리온돈</span>
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Miriondon</span>
                </div>
              </div>
              <div className="rounded-md bg-sidebar-accent px-2.5 py-1.5 text-xs font-bold text-sidebar-accent-foreground">결산</div>
            </div>
            <span className="text-[11px] text-muted-foreground">심볼 + 한글/영문 워드마크 조합</span>
          </div>

          {/* 4. Hero / Login Banner */}
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3.5">
            <span className="text-xs font-semibold text-muted-foreground">히어로 / 로그인 배너</span>
            <div className="flex flex-col gap-2 rounded-xl p-3.5 text-hero-foreground" style={{ background: 'linear-gradient(135deg, hsl(var(--hero-from)), hsl(var(--hero-to)))' }}>
              <div className="flex items-center gap-2">
                <BrandLogoMark id={selectedId} tone="mono-light" className="size-6 shrink-0" />
                <span className="text-sm font-extrabold tracking-tight">미리온돈</span>
              </div>
              <p className="text-[11px] leading-snug text-white/85">이미 쓴 카드값과 앞으로 나갈 돈까지 반영한 남은 생활비</p>
            </div>
            <span className="text-[11px] text-muted-foreground">딥 플럼 그라데이션 위 반전 모드</span>
          </div>
        </CardContent>
      </Card>

      {/* All 5 Proposals Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {BRAND_LOGO_PROPOSALS.map((proposal) => {
          const isSelected = proposal.id === selectedId;
          return (
            <Card key={proposal.id} className={cn('min-w-0 transition-colors', isSelected ? 'border-primary ring-2 ring-primary/15' : 'hover:border-border-strong')}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={proposal.recommended ? 'wine' : 'neutral'}>{proposal.numberLabel}</Badge>
                      {proposal.recommended ? (
                        <Badge variant="positive" className="gap-1">
                          <Sparkles className="size-3" />
                          1순위 추천
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle className="text-base">{proposal.name}</CardTitle>
                    <CardDescription>{proposal.subtitle}</CardDescription>
                  </div>
                  <Button type="button" size="sm" variant={isSelected ? 'primary' : 'outline'} className="min-h-control-sm shrink-0 cursor-pointer gap-1" onClick={() => setSelectedId(proposal.id)}>
                    {isSelected ? <Check className="size-3.5" /> : null}
                    {isSelected ? '선택됨' : '미리보기'}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {/* Visual Specimen Strip */}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {/* Light Card Mark */}
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-3.5">
                    <BrandLogoMark id={proposal.id} className="size-11" />
                    <span className="text-[11px] font-medium text-muted-foreground">기본 심볼</span>
                  </div>

                  {/* Hero Gradient App Tile */}
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg py-3.5" style={{ background: 'linear-gradient(135deg, hsl(var(--hero-from)), hsl(var(--hero-to)))' }}>
                    <BrandLogoMark id={proposal.id} tone="mono-light" className="size-11" />
                    <span className="text-[11px] font-medium text-white/85">히어로 반전</span>
                  </div>

                  {/* Horizontal Lockup + 16px Scale */}
                  <div className="col-span-2 flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background px-2 py-3.5 sm:col-span-1">
                    <div className="flex items-center gap-1.5">
                      <BrandLogoMark id={proposal.id} className="size-5 shrink-0" />
                      <span className="text-xs font-extrabold tracking-tight text-foreground">미리온돈</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BrandLogoMark id={proposal.id} className="size-4 shrink-0" />
                      <span className="text-[10px] text-muted-foreground tabular-nums">16px</span>
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5">
                  {proposal.keywords.map((keyword) => (
                    <Badge key={keyword} variant="neutral">
                      {keyword}
                    </Badge>
                  ))}
                </div>

                {/* Rationale / Pros / Caution */}
                <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed">
                  <p className="text-foreground">
                    <span className="font-bold">컨셉: </span>
                    {proposal.rationale}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-positive">강점: </span>
                    {proposal.pros}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-warning">유의: </span>
                    {proposal.caution}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
