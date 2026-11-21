'use client';

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@repo/ui-core';
import { Check, Sparkles } from 'lucide-react';
import { useState } from 'react';

export type BrandLogoId = 'time-shift' | 'card-fold' | 'future-arc' | 'dual-ring' | 'hangul-stamp';

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
  recommended: true,
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
  }
];

export const BrandLogoMark = ({ id, className, tone = 'brand' }: { id: BrandLogoId; className?: string; tone?: 'brand' | 'mono-light' }) => {
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

    case 'card-fold': {
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
          {/* Back scheduled-expense card (segmented border) */}
          <rect
            x="21"
            y="10"
            width="18"
            height="26"
            rx="4.5"
            transform="rotate(14 30 23)"
            stroke={echoColor}
            strokeOpacity={isMonoLight ? 0.65 : 0.52}
            strokeWidth="3.2"
            strokeDasharray="6 3.5"
            strokeLinecap="round"
          />
          {/* Front confirmed card tilted to form M valley */}
          <rect x="8.5" y="11" width="18.5" height="26" rx="4.5" transform="rotate(-12 17.75 24)" fill={primaryColor} />
          {/* Card magnetic / chip accent */}
          <rect x="13" y="17.5" width="7" height="3.2" rx="1.6" transform="rotate(-12 16.5 19.1)" fill={isMonoLight ? 'hsl(var(--hero-to))' : 'hsl(var(--card))'} />
          {/* Future anchor pill on front-right edge */}
          <path d="M29.5 28.5 L35.5 22.5" stroke={secondaryColor} strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    }

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
  }
};

export const BrandLogoProposals = () => {
  const [selectedId, setSelectedId] = useState<BrandLogoId>('time-shift');
  const selectedProposal = BRAND_LOGO_PROPOSALS.find((item) => item.id === selectedId) ?? DEFAULT_LOGO_PROPOSAL;

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 md:p-6">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="wine">브랜드 로고 시안 5종</Badge>
          <Badge variant="neutral">Wine Violet &amp; Warm Stone 대응</Badge>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground break-keep md:text-2xl">미리온돈 (Miriondon) 브랜드 로고 제안</h1>
        <p className="text-sm text-muted-foreground">아래에서 시안을 선택하면 상단 실착 미리보기(브라우저 파비콘 · 태블릿 아이콘 레일 · PC 사이드바 · 히어로 배너)에 즉시 반영됨.</p>
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
