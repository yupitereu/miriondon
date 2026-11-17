'use client';

import { Calendar, DatePicker, EmptyState, FilterChipGroup, FilterMultiSelect, FilterSingleSelect, PeriodPicker, dialog, type PeriodCellStatus, type PeriodMonthValue } from '@repo/ui-composition';
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
  TabsTrigger
} from '@repo/ui-core';
import { ChevronRight, SearchX } from 'lucide-react';
import * as React from 'react';

import { CardPerformanceCard, type CardPerformanceItem } from '@/components/CardPerformanceCard';

const STANDARD_CARD_TIERS = [
  { step: 1, threshold: 300000, benefit: '생활 영역 할인', monthlyLimitText: '월 한도 10,000원' },
  { step: 2, threshold: 600000, benefit: '생활 영역 할인', monthlyLimitText: '월 한도 20,000원' },
  { step: 3, threshold: 1000000, benefit: '생활 영역 할인', monthlyLimitText: '월 한도 30,000원' }
];

const CARD_PERFORMANCE_STATES: Array<{ stateLabel: string; card: CardPerformanceItem }> = [
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
  const [catalogTab, setCatalogTab] = React.useState<CatalogTab>('all');
  const [textValue, setTextValue] = React.useState('식비 · 점심 회식');
  const [amountValue, setAmountValue] = React.useState<number | null>(48000);
  const [selectValue, setSelectValue] = React.useState('shinhan');
  const [checked, setChecked] = React.useState(true);
  const [switched, setSwitched] = React.useState(true);
  const [segmentTab, setSegmentTab] = React.useState('monthly');
  const [underlineTab, setUnderlineTab] = React.useState('pending');
  const [pickedDate, setPickedDate] = React.useState<Date | null>(() => new Date(2026, 10, 15));
  const [calendarDate, setCalendarDate] = React.useState<Date | undefined>(() => new Date(2026, 10, 15));
  const [periodMonth, setPeriodMonth] = React.useState<PeriodMonthValue>({ year: 2026, month: 11 });
  const [periodYear, setPeriodYear] = React.useState(2026);
  const [dialogResult, setDialogResult] = React.useState<string>('대기 중');
  const [searchValue, setSearchValue] = React.useState('점심');
  const [periodScope, setPeriodScope] = React.useState<'all' | 'current' | 'past'>('all');
  const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(() => new Set(['식비']));

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
          <Card variant="hero">
            <CardHeader>
              <CardDescription className="text-hero-foreground/80">11월 남은 생활비 (Hero Card · tabular-nums)</CardDescription>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-hero-foreground tabular-nums">1,420,000원</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-xs text-hero-foreground/85 tabular-nums">
              <span>예산 2,200,000원</span>
              <span>지출 −780,000원</span>
            </CardContent>
          </Card>
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
                    지출 기록
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
                  <Button variant="primary" size="md" disabled>
                    비활성
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="wine">카드 실적</Badge>
                  <Badge variant="positive">회수 완료</Badge>
                  <Badge variant="wine" className="bg-primary text-primary-foreground">
                    준비 필요
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
                  <span className="text-xs font-semibold text-foreground">PeriodPicker (월별 · 연도별)</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <PeriodPicker mode="month" value={periodMonth} onChange={setPeriodMonth} getCellStatus={getSampleMonthStatus} />
                    <PeriodPicker mode="year" value={periodYear} onChange={setPeriodYear} minYear={2022} maxYear={2028} />
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
                        title: "'박대리' 미참여 인물을 삭제할까요?",
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
                        title: '미참여 인물 이름 변경',
                        label: '미참여 인물 이름',
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPeriodScope('all');
                        setSelectedCategories(new Set());
                      }}
                      className="px-2 text-muted-foreground"
                    >
                      필터 초기화
                    </Button>
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
                <CardPerformanceCard key={item.card.id} stateLabel={item.stateLabel} card={item.card} />
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ActionRow · AmountText · PersonSelector</CardTitle>
                <CardDescription>44px 터치 행, 원화 부호/색상 톤, 실사용자/미참여 구분 칩</CardDescription>
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

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-control-sm items-center rounded-full border border-primary bg-primary-tint px-3.5 text-xs font-bold text-primary">민지 (나)</span>
                  <span className="inline-flex min-h-control-sm items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium text-foreground">지은</span>
                  <span className="inline-flex min-h-control-sm items-center rounded-full border border-warning/30 bg-warning-tint px-3.5 text-xs font-semibold text-warning">박대리 (미참여)</span>
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
