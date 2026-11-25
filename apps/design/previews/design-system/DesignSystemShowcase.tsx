'use client';

import {
  Calendar,
  DatePicker,
  EmptyState,
  FilterChipGroup,
  FilterMultiSelect,
  FilterSingleSelect,
  PROFILE_AVATAR_COLORS,
  PeriodPicker,
  ProfileAvatar,
  ProfileAvatarColorPicker,
  SummaryHeroCard,
  dialog,
  resolveProfileAvatarPreset,
  type PeriodCellStatus,
  type PeriodMonthValue,
  type ProfileAvatarColor,
  type SummaryHeroVariant
} from '@repo/ui-composition';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  NoticeBox,
  NumberInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ProgressBar,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@repo/ui-core';
import { ChevronRight, Pencil, SearchX } from 'lucide-react';
import { useState } from 'react';

import { CardPerformanceCard, type CardPerformanceItem } from '@/shared/CardPerformanceCard';
import { FilterResetButton } from '@/shared/FilterResetButton';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { TransactionListHeader, TransactionMobileRow } from '@/shared/TransactionListLayout';

const STANDARD_CARD_TIERS = [
  { step: 1, threshold: 300000, benefits: [{ name: '생활 영역 할인', limit: '월 한도 10,000원' }] },
  { step: 2, threshold: 600000, benefits: [{ name: '생활 영역 할인', limit: '월 한도 20,000원' }] },
  { step: 3, threshold: 1000000, benefits: [{ name: '생활 영역 할인', limit: '월 한도 30,000원' }] }
];

const CARD_PERFORMANCE_STATES: Array<{ stateLabel: string; card: CardPerformanceItem; period?: { month: number; previousMonth: number; previousAmount: number | null } }> = [
  {
    stateLabel: 'State=Below (미달)',
    card: {
      id: 'state-below',
      name: '예시 카드 A',
      totalAmount: 200000,
      meta: '예정 거래 포함 · 공용 조건 · 예시 계산',
      tiers: STANDARD_CARD_TIERS
    }
  },
  {
    stateLabel: 'State=InProgress (일부 단계 달성)',
    card: {
      id: 'state-progress',
      name: '예시 카드 A',
      totalAmount: 480000,
      meta: '예정 거래 포함 · 공용 조건 · 예시 계산',
      tiers: STANDARD_CARD_TIERS
    }
  },
  {
    stateLabel: 'State=Achieved (목표 달성)',
    card: {
      id: 'state-achieved',
      name: '예시 카드 A',
      totalAmount: 1080000,
      meta: '예정 거래 포함 · 공용 조건 · 예시 계산',
      tiers: STANDARD_CARD_TIERS
    }
  },
  {
    stateLabel: 'State=NoTiers (확인된 단계 없음)',
    card: {
      id: 'state-notiers',
      name: '예시 카드 A',
      totalAmount: 200000,
      meta: '예정 거래 포함 · 공용 조건 · 예시 계산',
      tiers: []
    }
  },
  {
    stateLabel: 'State=NeedsReview (일부 조건 확인 필요)',
    period: { month: 11, previousMonth: 10, previousAmount: 330000 },
    card: {
      id: 'state-review',
      name: '예시 카드 B',
      totalAmount: 310000,
      meta: '예정 거래 포함 · 개인 조건 · 일부 조건 확인 필요',
      needsReview: true,
      tiers: STANDARD_CARD_TIERS
    }
  }
];

const COLOR_TOKENS = [
  { name: 'primary', swatchClass: 'bg-primary text-primary-foreground' },
  { name: 'primary-tint', swatchClass: 'bg-primary-tint text-primary border border-primary/20' },
  { name: 'background', swatchClass: 'bg-background text-foreground border border-border' },
  { name: 'card', swatchClass: 'bg-card text-card-foreground border border-border' },
  { name: 'surface-elevated', swatchClass: 'bg-surface-elevated text-popover-foreground border border-border-strong' },
  { name: 'expense', swatchClass: 'bg-expense text-expense-foreground' },
  { name: 'expense-tint', swatchClass: 'bg-expense-tint text-expense' },
  { name: 'income', swatchClass: 'bg-income text-income-foreground' },
  { name: 'income-tint', swatchClass: 'bg-income-tint text-income' },
  { name: 'positive', swatchClass: 'bg-positive text-positive-foreground' },
  { name: 'positive-tint', swatchClass: 'bg-positive-tint text-positive' },
  { name: 'destructive', swatchClass: 'bg-destructive text-destructive-foreground' },
  { name: 'destructive-tint', swatchClass: 'bg-destructive-tint text-destructive' },
  { name: 'warning', swatchClass: 'bg-warning text-warning-foreground' },
  { name: 'warning-tint', swatchClass: 'bg-warning-tint text-warning' }
] as const;

const getSampleMonthStatus = ({ year, month }: { year: number; month?: number }): PeriodCellStatus | undefined => {
  if (!month) {
    return undefined;
  }
  if (year === 2026 && month <= 11) {
    return { badge: '생성됨', tone: 'default' };
  }
  if (year === 2026 && month === 12) {
    return { badge: '미생성', tone: 'muted' };
  }
  return { disabled: true, tone: 'muted' };
};

type CatalogTab = 'all' | 'tokens' | 'ui-core' | 'ui-composition' | 'patterns';

export const DesignSystemShowcase = () => {
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('all');
  const [textValue, setTextValue] = useState('식비 · 점심 회식');
  const [amountValue, setAmountValue] = useState<number | null>(48000);
  const [selectValue, setSelectValue] = useState('shinhan');
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(true);
  const [segmentTab, setSegmentTab] = useState('monthly');
  const [underlineTab, setUnderlineTab] = useState('pending');
  const [pickedDate, setPickedDate] = useState<Date | null>(() => new Date(2026, 10, 15));
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(() => new Date(2026, 10, 15));
  const [periodMonth, setPeriodMonth] = useState<PeriodMonthValue>({ year: 2026, month: 11 });
  const [periodYear, setPeriodYear] = useState(2026);
  const [dialogResult, setDialogResult] = useState<string>('대기 중');
  const [searchValue, setSearchValue] = useState('점심');
  const [periodScope, setPeriodScope] = useState<'all' | 'current' | 'past'>('all');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set(['식비']));
  const [selectedProfileColor, setSelectedProfileColor] = useState<ProfileAvatarColor>('wine');
  const [selectedProfileImage, setSelectedProfileImage] = useState<string | null>(null);
  const [heroDemoVariant, setHeroDemoVariant] = useState<SummaryHeroVariant>('hero');

  const sampleAvatarDataUri =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f6d365'/%3E%3Cstop offset='100%25' stop-color='%23fda085'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23fff' fill-opacity='.9'/%3E%3Cpath d='M14 58c2-11 9-17 18-17s16 6 18 17' fill='%23fff' fill-opacity='.9'/%3E%3C/svg%3E";

  const sampleFilterOptions = ['식비', '카페·간식', '생활용품', '고정지출'] as const;
  const samplePeriodOptions = [
    { id: 'all', label: '전체' },
    { id: 'current', label: '이번 달만' },
    { id: 'past', label: '이전 달만' }
  ] as const;

  const showSection = (section: Exclude<CatalogTab, 'all'>) => catalogTab === 'all' || catalogTab === section;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-stack-mobile p-page-mobile md:p-page-tablet lg:gap-stack-desktop lg:p-page-desktop">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Design System Catalog</h1>
            <Badge variant="wine">SSOT Live</Badge>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground break-keep">
            토큰, @repo/ui-core, @repo/ui-composition 컴포넌트를 패키지별로 분리해 실제 브레이크포인트·다크모드·터치 규격 기준으로 검증합니다.
          </p>
        </div>

        <Tabs variant="underline" value={catalogTab} onValueChange={(val) => setCatalogTab(val as CatalogTab)}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="all" className="flex-none px-3">
              전체
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex-none px-3">
              Foundations
            </TabsTrigger>
            <TabsTrigger value="ui-core" className="flex-none px-3">
              UI-Core
            </TabsTrigger>
            <TabsTrigger value="ui-composition" className="flex-none px-3">
              UI-Composition
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex-none px-3">
              Domain Patterns
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {showSection('tokens') ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-foreground">1. Foundations (토큰 · 수치)</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            {COLOR_TOKENS.map((token) => (
              <div key={token.name} className={cn('flex min-h-14 items-end rounded-md p-2.5', token.swatchClass)}>
                <span className="text-[11px] font-semibold">{token.name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card variant="hero">
              <CardHeader>
                <CardDescription className="text-hero-foreground/80">11월 남은 예산 (Hero · tabular-nums)</CardDescription>
                <CardTitle className="text-2xl font-extrabold tracking-tight text-hero-foreground tabular-nums">1,420,000원</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-xs text-hero-foreground/85 tabular-nums">
                <span>예산 2,200,000원</span>
                <span>지출 −780,000원</span>
              </CardContent>
            </Card>
            <Card variant="hero-expense">
              <CardHeader>
                <CardDescription className="text-hero-foreground/80">11월 지출 합계 (Hero Expense)</CardDescription>
                <CardTitle className="text-2xl font-extrabold tracking-tight text-hero-foreground tabular-nums">780,000원</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-xs text-hero-foreground/85 tabular-nums">
                <span>실결제 828,000원</span>
                <span>회수 48,000원</span>
              </CardContent>
            </Card>
            <Card variant="hero-income">
              <CardHeader>
                <CardDescription className="text-hero-foreground/80">11월 수입 합계 (Hero Income)</CardDescription>
                <CardTitle className="text-2xl font-extrabold tracking-tight text-hero-foreground tabular-nums">4,280,000원</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-xs text-hero-foreground/85 tabular-nums">
                <span>입금 완료 3,500,000원</span>
                <span>입금 예정 780,000원</span>
              </CardContent>
            </Card>
            <Card variant="hero-positive">
              <CardHeader>
                <CardDescription className="text-hero-foreground/80">전체 미회수 금액 (Hero Positive)</CardDescription>
                <CardTitle className="text-2xl font-extrabold tracking-tight text-hero-foreground tabular-nums">258,000원</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-xs text-hero-foreground/85 tabular-nums">
                <span>회수 대기 4건</span>
                <span>부분 회수 2건</span>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {showSection('ui-core') ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">2. UI-Core (@repo/ui-core)</h2>
            <Badge variant="neutral">Domain-neutral Primitives</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Button &amp; Badge</CardTitle>
                <CardDescription>모바일 주요 액션 최소 44px(lg) 및 상태 뱃지</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary" size="lg">
                    저장하기
                  </Button>
                  <Button variant="expense" size="lg">
                    지출 추가
                  </Button>
                  <Button variant="income" size="lg">
                    수입 추가
                  </Button>
                  <Button variant="secondary" size="md">
                    보조 액션
                  </Button>
                  <Button variant="outline" size="md">
                    취소
                  </Button>
                  <Button variant="ghost" size="sm">
                    더보기
                  </Button>
                  <Button variant="destructive" size="md">
                    삭제
                  </Button>
                  <Button variant="link" size="sm">
                    기준일 안내
                  </Button>
                  <Button variant="outline" size="icon-xs" aria-label="행 수정">
                    <Pencil />
                  </Button>
                  <Button variant="primary" size="md" disabled>
                    비활성
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="wine">카드 실적</Badge>
                  <Badge variant="expense">지출 · 출금</Badge>
                  <Badge variant="income">수입 · 입금</Badge>
                  <Badge variant="positive">회수 완료</Badge>
                  <Badge variant="wine" className="bg-primary text-primary-foreground">
                    지불 준비 필요
                  </Badge>
                  <Badge variant="positive">지불 대기</Badge>
                  <Badge variant="neutral">지불 완료</Badge>
                  <Badge variant="warning">검토 필요</Badge>
                  <Badge variant="destructive">예산 초과</Badge>
                  <Badge variant="neutral">현금</Badge>
                  <Badge variant="count">12</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Input, NumberInput &amp; Select</CardTitle>
                <CardDescription>높이 44px 컨트롤, 원화 단위 suffix 및 오류 상태</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Input aria-label="거래 내역" value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="내역을 입력하세요" />
                <SearchInput aria-label="내역 검색" value={searchValue} onValueChange={setSearchValue} placeholder="내역 검색 (지우기 버튼 포함)" />
                <NumberInput aria-label="금액 입력" value={amountValue} onValueChange={setAmountValue} suffix="원" placeholder="0" />
                <NumberInput aria-label="금액 오류 입력" defaultValue={-1000} suffix="원" error="0원 이상의 금액을 입력해 주세요." readOnly />
                <Input aria-label="오류 상태 입력" defaultValue="잘못된 입력" error="필수 항목을 확인해 주세요." readOnly />
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger aria-label="결제 수단 선택">
                    <SelectValue placeholder="결제 수단 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shinhan">신한카드 Mr.Life</SelectItem>
                    <SelectItem value="hyundai">현대카드 ZERO</SelectItem>
                    <SelectItem value="cash">현금 / 계좌이체</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Checkbox, Switch &amp; ProgressBar</CardTitle>
                <CardDescription>터치 영역 44px 확보 및 예산·실적 진행 막대</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Checkbox checked={checked} onCheckedChange={(val) => setChecked(val === true)} label="예정 거래 포함" description="할부 및 고정 지출을 남은 생활비에 미리 반영합니다." />
                <Switch checked={switched} onCheckedChange={setSwitched} label="전월 이월 반영" description="지난달 남은 예산을 이번 달에 합산합니다." />
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-muted-foreground">식비 소진율</span>
                    <span className="font-semibold text-foreground">68%</span>
                  </div>
                  <ProgressBar value={68} variant="default" />
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-muted-foreground">지출 합계 소진율</span>
                    <span className="font-semibold text-expense">42%</span>
                  </div>
                  <ProgressBar value={42} variant="expense" />
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-muted-foreground">쇼핑 예산 초과</span>
                    <span className="font-semibold text-destructive">118%</span>
                  </div>
                  <ProgressBar value={118} variant="over" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tabs, NoticeBox, Dialog &amp; Sheet</CardTitle>
                <CardDescription>세그먼트·언더라인 탭 및 오버레이 컴포넌트</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Tabs variant="segment" value={segmentTab} onValueChange={setSegmentTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="monthly" className="flex-1">
                      월별
                    </TabsTrigger>
                    <TabsTrigger value="yearly" className="flex-1">
                      연간
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="flex-1">
                      자산
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value={segmentTab} className="pt-2 text-xs text-muted-foreground">
                    현재 선택된 탭: {segmentTab}
                  </TabsContent>
                </Tabs>

                <Tabs variant="underline" value={underlineTab} onValueChange={setUnderlineTab}>
                  <TabsList>
                    <TabsTrigger value="pending">회수 대기</TabsTrigger>
                    <TabsTrigger value="done">완료</TabsTrigger>
                  </TabsList>
                  <TabsContent value={underlineTab} className="pt-2 text-xs text-muted-foreground">
                    현재 회수 상태 탭: {underlineTab}
                  </TabsContent>
                </Tabs>

                <NoticeBox variant="info">정보 안내: 이미 기록된 내역은 변경 후에도 보존됩니다.</NoticeBox>
                <NoticeBox variant="warning">주의: 예정 지출 포함 시 남은 생활비가 줄어듭니다.</NoticeBox>
                <NoticeBox variant="error">적자 예고: 이번 달 예산보다 120,000원 초과되었습니다.</NoticeBox>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="md">
                      기본 Dialog 열기
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>기본 Dialog 미리보기</DialogTitle>
                      <DialogDescription>max-width 380px 및 본문 스크롤 규칙이 적용됩니다.</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                      <NoticeBox variant="info">Escape 키 또는 배경 클릭으로 닫을 수 있습니다.</NoticeBox>
                    </DialogBody>
                    <DialogFooter>
                      <Button variant="primary" size="md">
                        확인
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="md">
                      바텀 Sheet 열기
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom">
                    <SheetHeader>
                      <SheetTitle>지출 입력 시트</SheetTitle>
                      <SheetDescription>모바일 바텀시트(최대 90dvh) 미리보기입니다.</SheetDescription>
                    </SheetHeader>
                    <SheetBody>
                      <NumberInput aria-label="시트 금액" defaultValue={15000} suffix="원" />
                    </SheetBody>
                    <SheetFooter>
                      <Button variant="primary" size="lg" className="w-full">
                        저장
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="md">
                      Popover
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 text-xs text-muted-foreground">상승 표면(--surface-elevated) 기반 팝오버입니다.</PopoverContent>
                </Popover>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="md">
                      Tooltip
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>마우스 호버 또는 포커스 시 짧은 안내를 표시합니다.</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="inline-flex cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                      <Button variant="outline" size="md" disabled className="border-destructive/40 text-destructive">
                        비활성 삭제
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>비활성 버튼도 래퍼를 통해 사유를 안내할 수 있어요.</TooltipContent>
                </Tooltip>
              </CardFooter>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Table</CardTitle>
                <CardDescription>가로 스크롤 컨테이너, 체크박스 정렬 및 tabular-nums를 지원하는 공용 표 primitive</CardDescription>
              </CardHeader>
              <CardContent>
                <Table containerClassName="rounded-lg border border-border">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>날짜</TableHead>
                      <TableHead>내역</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">11.15</TableCell>
                      <TableCell className="font-medium">스타벅스 리저브</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">14,500원</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">11.14</TableCell>
                      <TableCell className="font-medium">컬리 장보기</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">62,400원</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {showSection('ui-composition') ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">3. UI-Composition (@repo/ui-composition)</h2>
            <Badge variant="wine">Composite UI Components</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>DatePicker &amp; PeriodPicker</CardTitle>
                <CardDescription>320·375px에서는 바텀시트, 768·1280px에서는 팝오버로 자동 전환됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">DatePicker (프리셋 · 지우기)</span>
                  <DatePicker value={pickedDate} onChange={setPickedDate} clearable />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">PeriodPicker (헤더용 ghost · 폼 입력용 outlined)</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <PeriodPicker mode="month" value={periodMonth} onChange={setPeriodMonth} getCellStatus={getSampleMonthStatus} />
                    <PeriodPicker mode="year" value={periodYear} onChange={setPeriodYear} minYear={2022} maxYear={2028} />
                    <PeriodPicker mode="month" variant="outlined" value={periodMonth} onChange={setPeriodMonth} getCellStatus={getSampleMonthStatus} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">Calendar 단독</span>
                  <div className="w-fit rounded-lg border border-border bg-background p-2">
                    <Calendar mode="single" selected={calendarDate} onSelect={setCalendarDate} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CommonDialog (명령형 Alert / Confirm / Prompt)</CardTitle>
                <CardDescription>Alert · Confirm · Danger · Prompt 4종 인터랙션 검증</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={async () => {
                      await dialog.alert({
                        title: '파일 형식을 확인해 주세요',
                        description: 'CSV 또는 엑셀(.xlsx) 파일만 가져올 수 있어요.',
                        confirmText: '확인'
                      });
                      setDialogResult('Alert: 확인 완료');
                    }}
                  >
                    Alert 열기
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={async () => {
                      const ok = await dialog.confirm({
                        title: '2026년 12월 가계부를 만들까요?',
                        description: '현재 고정 지출과 예산 설정을 그대로 복사해 시작해요.',
                        confirmText: '만들기'
                      });
                      setDialogResult(`Confirm: ${ok ? '만들기(true)' : '취소(false)'}`);
                    }}
                  >
                    Confirm 열기
                  </Button>

                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={async () => {
                      const ok = await dialog.confirm({
                        title: "'박대리' 외부인을 삭제할까요?",
                        description: '앞으로 실사용자 선택 목록에서 숨겨져요.',
                        notice: '이미 기록된 지출·회수 내역의 이름은 그대로 보존돼요.',
                        confirmText: '삭제',
                        variant: 'destructive'
                      });
                      setDialogResult(`Danger: ${ok ? '삭제(true)' : '취소(false)'}`);
                    }}
                  >
                    Danger 열기
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={async () => {
                      const value = await dialog.prompt({
                        title: '미참여 구성원 이름 변경',
                        label: '미참여 구성원 이름',
                        placeholder: '박대리 → 박과장',
                        defaultValue: '박대리',
                        confirmText: '변경',
                        validate: (input) => (input.trim().length === 0 ? '이름을 입력해 주세요.' : null)
                      });
                      setDialogResult(`Prompt: ${value === null ? '취소(null)' : `"${value}"`}`);
                    }}
                  >
                    Prompt 열기
                  </Button>
                </div>

                <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground tabular-nums">마지막 반환값: {dialogResult}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>FilterSingleSelect · FilterMultiSelect · FilterChipGroup</CardTitle>
                <CardDescription>데스크톱 팝오버 필터 &amp; 모바일 시트 토글 칩</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterSingleSelect label="기간" options={samplePeriodOptions} value={periodScope} defaultValue="all" onChange={setPeriodScope} />
                  <FilterMultiSelect label="분류" options={sampleFilterOptions} selected={selectedCategories} onChange={setSelectedCategories} />
                  {periodScope !== 'all' || selectedCategories.size > 0 ? (
                    <FilterResetButton
                      onClick={() => {
                        setPeriodScope('all');
                        setSelectedCategories(new Set());
                      }}
                    />
                  ) : null}
                </div>

                <FilterChipGroup label="모바일 시트용 다중 칩" options={sampleFilterOptions} selected={selectedCategories} onChange={setSelectedCategories} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>EmptyState</CardTitle>
                <CardDescription>0건 목록 · 검색 결과 없음 안내 및 초기화/추가 액션 슬롯</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={<SearchX className="size-5" />}
                  title="조건에 맞는 내역이 없어요"
                  description="검색어나 필터 조건을 변경해 보세요."
                  actions={
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategories(new Set())}>
                      필터 초기화
                    </Button>
                  }
                  className="rounded-lg border border-dashed border-border py-6"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ProfileAvatar &amp; ProfileAvatarColorPicker (이미지 · 12색)</CardTitle>
              <CardDescription>프로필 이미지(src) 우선 표시 및 미설정·로드 실패 시 고정 12색 배경 + WCAG 상대 휘도 기반 글자색 자동 결정</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <ProfileAvatar name="민지" src={sampleAvatarDataUri} color={selectedProfileColor} className="size-8 text-sm" />
                  <span className="text-[11px] font-medium text-muted-foreground">이미지</span>
                  <span className="text-[10px] text-muted-foreground/80">사진 우선</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ProfileAvatar name="박대리" color="indigo" variant="non-member" className="size-8 text-sm" />
                  <span className="text-[11px] font-medium text-muted-foreground">미참여 · 외부인</span>
                  <span className="text-[10px] text-muted-foreground/80">점선 테두리</span>
                </div>
                {PROFILE_AVATAR_COLORS.map((preset) => {
                  const resolved = resolveProfileAvatarPreset(preset.id);
                  return (
                    <div key={preset.id} className="flex flex-col items-center gap-1">
                      <ProfileAvatar name="민지" color={preset.id} className="size-8 text-sm" />
                      <span className="text-[11px] font-medium text-muted-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground/80 tabular-nums">{resolved.textColor === '#FFFFFF' ? '흰 글자' : '어두운 글자'}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <ProfileAvatar
                      name="민지(나)"
                      src={selectedProfileImage}
                      color={selectedProfileColor}
                      showNameOnInteraction
                      onColorChange={setSelectedProfileColor}
                      onImageChange={setSelectedProfileImage}
                      className="size-9 text-sm"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">민지(나)</span>
                      <span className="text-[11px] text-muted-foreground">{selectedProfileImage ? '사진 사용 중' : `배경: ${resolveProfileAvatarPreset(selectedProfileColor).label}`}</span>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedProfileImage((prev) => (prev ? null : sampleAvatarDataUri))} className="text-xs">
                    {selectedProfileImage ? '예시 이미지 해제' : '예시 이미지 적용'}
                  </Button>
                </div>
                <ProfileAvatarColorPicker value={selectedProfileColor} onChange={setSelectedProfileColor} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>SummaryHeroCard (공통 히어로 요약 카드)</CardTitle>
                  <CardDescription>결산·지출·수입·회수금·할부·자산 상단 요약 공통 규격 · 모바일 1열 / 태블릿·PC 세로 구분선 가로 배치</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'hero', label: 'Hero' },
                      { id: 'hero-expense', label: 'Expense' },
                      { id: 'hero-income', label: 'Income' },
                      { id: 'hero-positive', label: 'Positive' }
                    ] as const
                  ).map((option) => (
                    <Button key={option.id} type="button" size="sm" variant={heroDemoVariant === option.id ? 'primary' : 'outline'} onClick={() => setHeroDemoVariant(option.id)}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SummaryHeroCard
                variant={heroDemoVariant}
                title="단일 지표형 요약 (items)"
                helpText="결산·회수금·할부처럼 단일 행 지표를 표시할 때 사용해요. 모바일에서는 구분선 없는 1열, 태블릿·PC에서는 세로 구분선 3단으로 정렬돼요."
                badge={<span className="rounded-full bg-hero-foreground/15 px-2 py-0.5 text-[11px] font-semibold text-hero-foreground">공통 규격</span>}
                action={
                  <button
                    type="button"
                    onClick={() => void dialog.alert({ title: '우측 액션', description: 'SummaryHeroCard의 action 슬롯 예시예요.' })}
                    className="-my-2 inline-flex min-h-9 cursor-pointer items-center gap-0.5 text-xs font-bold text-hero-foreground/90 hover:underline"
                  >
                    상세 이동
                  </button>
                }
                value="1,420,000원"
                items={[
                  { label: '수입', value: '5,950,000원' },
                  { label: '지출', value: '1,417,000원' },
                  { label: '예산 (이월 포함)', value: '12,456,000원' }
                ]}
              />
              <SummaryHeroCard
                variant="hero-expense"
                title="접이식 상세형 요약 (groups + mobileSummary)"
                helpText="지출·수입 내역처럼 세부 항목이 많을 때 모바일에서 핵심 2줄 + 상세 보기 토글을 제공해요."
                value="780,000원"
                mobileSummary={[
                  { label: '실결제 금액', value: '828,000원' },
                  { label: '회수 대상 금액', value: '48,000원' }
                ]}
                groups={[
                  {
                    key: 'g1',
                    items: [
                      { label: '결제 금액', value: '858,000원', helpText: '할인 전 결제 금액 기준 합계예요.' },
                      { label: '승인 금액', value: '1,120,000원' }
                    ]
                  },
                  {
                    key: 'g2',
                    items: [
                      { label: '할인 금액', value: '30,000원' },
                      { label: '회수 대상 금액', value: '48,000원', hideOnMobileDetails: true }
                    ]
                  },
                  {
                    key: 'g3',
                    hideOnMobileDetails: true,
                    items: [{ label: '실결제 금액', value: '828,000원' }]
                  }
                ]}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {showSection('patterns') ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-foreground">4. Domain Patterns &amp; Stress Cases (도메인 패턴 · 엣지 케이스)</h2>

          <Card>
            <CardHeader>
              <CardTitle>CardPerformance / 단계별 상태 5종</CardTitle>
              <CardDescription>미달 · 일부 단계 달성 · 목표 달성 · 확인된 단계 없음 · 일부 조건 확인 필요</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {CARD_PERFORMANCE_STATES.map((item) => (
                <CardPerformanceCard key={item.card.id} stateLabel={item.stateLabel} card={item.card} period={item.period} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TransactionListHeader · TransactionMobileRow</CardTitle>
              <CardDescription>수입·지출 목록에서 공유하는 제목/건수 헤더와 모바일 거래 행</CardDescription>
            </CardHeader>
            <div className="overflow-hidden rounded-b-xl border-t border-border">
              <TransactionListHeader title="수입 목록" count={1} />
              <TransactionMobileRow
                date={<span className="text-xs font-medium text-muted-foreground tabular-nums">11.25</span>}
                category={<Badge variant="income">근로소득</Badge>}
                content={<span className="truncate text-sm font-bold text-foreground">11월 급여</span>}
                amount={<strong className="shrink-0 text-sm font-extrabold text-income tabular-nums">3,250,000원</strong>}
                metadata={<MemberAvatar name="민지 (나)" size="xs" mode="icon-hover" />}
                status={<Badge variant="positive">입금 완료</Badge>}
                onClick={() => void dialog.alert({ title: '수입 내역', description: '거래 행을 눌러 상세를 엽니다.' })}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ActionRow · AmountText · PersonSelector</CardTitle>
                <CardDescription>44px 터치 행, 원화 부호/색상 톤, 구성원/외부인 프로필 아이콘 표기(넓음: 아이콘+이름 / 좁음: 호버 이름)</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="divide-y divide-border rounded-lg border border-border px-3">
                  <button
                    type="button"
                    onClick={() => void dialog.alert({ title: '카드 미지불', description: '미지불 3건의 결제 준비금을 확인합니다.' })}
                    className="flex min-h-control-lg w-full items-center justify-between gap-2 py-2 text-left transition-colors hover:text-primary"
                  >
                    <span className="text-sm font-medium text-foreground">카드 미지불</span>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-primary tabular-nums">
                      <span>3건</span>
                      <ChevronRight className="size-4" />
                    </span>
                  </button>
                  <div className="flex min-h-control-lg items-center justify-between gap-2 py-2">
                    <span className="text-sm font-medium text-foreground">전월 이월 / 초과 지출</span>
                    <div className="flex items-center gap-2 text-sm font-bold tabular-nums">
                      <span className="text-positive">+40,000원</span>
                      <span className="text-destructive">−15,000원</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-foreground">
                    <MemberAvatar name="민지 (나)" size="sm" />
                    <MemberAvatar name="지은" size="sm" />
                    <MemberAvatar name="박대리 (외부인)" size="sm" />
                    <MemberAvatar name="김과장 (외부인)" size="sm" />
                  </div>
                  <div className="flex items-center gap-1 border-l border-border pl-3">
                    <MemberAvatar name="민지 (나)" size="sm" mode="icon-hover" />
                    <MemberAvatar name="지은" size="sm" mode="icon-hover" />
                    <MemberAvatar name="박대리 (외부인)" size="sm" mode="icon-hover" />
                    <MemberAvatar name="김과장 (외부인)" size="sm" mode="icon-hover" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsive 긴 문구 · 대형 금액 검증</CardTitle>
                <CardDescription>320·375px 폭에서 긴 가계부명/메모 줄바꿈 및 고액 금액 정렬</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="truncate text-sm font-bold text-foreground">우리집 공동생활비 · 공과금·관리비·정기구독 장기 테스트 가계부</span>
                    <span className="text-xs leading-relaxed text-muted-foreground break-keep">예산 수정 및 이월 금액이 반영되어도 우측 금액 숫자는 잘리거나 줄바꿈되지 않고 유지됩니다.</span>
                  </div>
                  <span className="shrink-0 text-base font-extrabold text-foreground tabular-nums">999,999,999원</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </div>
  );
};
