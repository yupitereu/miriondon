'use client';

import { dialog } from '@repo/ui-composition';
import { Popover, PopoverContent, PopoverTrigger, Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle, cn } from '@repo/ui-core';
import { BookOpen, Check, ChevronDown, ChevronRight, ChevronsUpDown, Landmark, LayoutGrid, List, Menu, Plus, Settings, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export type AppNavKey = 'settlement' | 'expenses' | 'income' | 'assets' | 'settings';

export const DESIGN_LEDGERS = [
  { id: 'home', name: '우리집 가계부', shortName: '우리집', role: '공동 · 소유자' },
  { id: 'personal', name: '민지 개인 가계부', shortName: '개인', role: '개인 · 소유자' }
] as const;

type NavItem = {
  key: AppNavKey;
  pcLabel: string;
  compactLabel: string;
  description: string;
  icon: typeof LayoutGrid;
  href?: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'settlement', pcLabel: '결산', compactLabel: '결산', description: '월별·연간 예산 및 지출 결산', icon: LayoutGrid, href: '/preview/settlement' },
  { key: 'expenses', pcLabel: '지출 내역', compactLabel: '지출', description: '월별 지출 내역·분할·할부 관리', icon: List, href: '/preview/expenses' },
  { key: 'income', pcLabel: '수입 내역', compactLabel: '수입', description: '월급·상여·기타 수입 기록 및 공제 확인', icon: Wallet },
  { key: 'assets', pcLabel: '자산 현황', compactLabel: '자산', description: '계좌·현금·저축·부채 보유금 갱신 및 대조', icon: Landmark, href: '/preview/assets' },
  { key: 'settings', pcLabel: '가계부 설정', compactLabel: '설정', description: '카드·분류·고정 거래·구성원 관리', icon: Settings }
];

const MOBILE_PRIMARY_NAV_KEYS: AppNavKey[] = ['settlement', 'expenses', 'income'];
const MOBILE_OVERFLOW_NAV_KEYS: AppNavKey[] = ['assets', 'settings'];

type DesignAppShellProps = {
  activeNav: AppNavKey;
  onAddExpense: () => void;
  ledgerId?: string;
  onLedgerChange?: (ledgerId: string) => void;
  mobileHeaderLeft?: React.ReactNode;
  mobileHeaderRight?: React.ReactNode;
  mobileHeaderBottom?: React.ReactNode;
  desktopHeaderLeft?: React.ReactNode;
  desktopHeaderRight?: React.ReactNode;
  mainClassName?: string;
  children: React.ReactNode;
};

export const DesignAppShell = ({
  activeNav,
  onAddExpense,
  ledgerId: controlledLedgerId,
  onLedgerChange,
  mobileHeaderLeft,
  mobileHeaderRight,
  mobileHeaderBottom,
  desktopHeaderLeft,
  desktopHeaderRight,
  mainClassName,
  children
}: DesignAppShellProps) => {
  const router = useRouter();
  const [internalLedgerId, setInternalLedgerId] = React.useState<string>('home');
  const [railLedgerMenuOpen, setRailLedgerMenuOpen] = React.useState(false);
  const [sidebarLedgerMenuOpen, setSidebarLedgerMenuOpen] = React.useState(false);
  const [sheetLedgerMenuOpen, setSheetLedgerMenuOpen] = React.useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);

  const ledgerId = controlledLedgerId ?? internalLedgerId;
  const currentLedger = DESIGN_LEDGERS.find((item) => item.id === ledgerId) ?? DESIGN_LEDGERS[0];

  const handleSelectLedger = (nextId: string) => {
    if (onLedgerChange) {
      onLedgerChange(nextId);
    } else {
      setInternalLedgerId(nextId);
    }
    setRailLedgerMenuOpen(false);
    setSidebarLedgerMenuOpen(false);
    setSheetLedgerMenuOpen(false);
  };

  const handleNavClick = async (key: AppNavKey) => {
    setMobileMoreOpen(false);
    const item = NAV_ITEMS.find((entry) => entry.key === key);
    if (key === activeNav && (!item?.href || window.location.pathname === item.href)) {
      return;
    }

    if (item?.href) {
      const params = new URLSearchParams(window.location.search);
      const query = params.toString();
      router.push(query ? `${item.href}?${query}` : item.href);
      return;
    }

    await dialog.alert({
      title: `${item?.pcLabel ?? ''} 화면 시안`,
      description: `"${item?.pcLabel ?? ''}" 화면 시안은 다음 단계에서 추가할 수 있습니다.`
    });
  };

  const renderLedgerOptions = () => (
    <div className="flex flex-col gap-1">
      {DESIGN_LEDGERS.map((ledger) => {
        const selected = ledger.id === ledgerId;
        return (
          <button
            key={ledger.id}
            type="button"
            onClick={() => handleSelectLedger(ledger.id)}
            className={cn('flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent', selected && 'bg-primary-tint text-primary')}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{ledger.name}</span>
              <span className="text-[11px] text-muted-foreground">{ledger.role}</span>
            </div>
            {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
          </button>
        );
      })}
    </div>
  );

  const renderLedgerSwitcher = (mode: 'rail' | 'full') => {
    const open = mode === 'rail' ? railLedgerMenuOpen : sidebarLedgerMenuOpen;
    const setOpen = mode === 'rail' ? setRailLedgerMenuOpen : setSidebarLedgerMenuOpen;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {mode === 'rail' ? (
            <button
              type="button"
              aria-label={`가계부 변경 (${currentLedger.name})`}
              title={`${currentLedger.name} · 가계부 변경`}
              className="flex w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-border-strong bg-card px-1 py-1.5 text-[10px] font-bold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <BookOpen className="size-4 shrink-0 text-primary" />
              <span className="inline-flex max-w-full items-center gap-0.5 leading-tight">
                <span className="truncate">{currentLedger.shortName}</span>
                <ChevronsUpDown className="size-2.5 shrink-0 text-muted-foreground" />
              </span>
            </button>
          ) : (
            <button
              type="button"
              aria-label={`가계부 변경 (${currentLedger.name})`}
              className="inline-flex min-h-control-md w-full items-center justify-between gap-1.5 rounded-md border border-border-strong bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <span className="truncate">{currentLedger.name}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent side={mode === 'rail' ? 'right' : 'bottom'} align="start" sideOffset={mode === 'rail' ? 8 : 4} className="w-56 p-1.5">
          {renderLedgerOptions()}
        </PopoverContent>
      </Popover>
    );
  };

  const mobileLeftItems = NAV_ITEMS.filter((item) => MOBILE_PRIMARY_NAV_KEYS.slice(0, 2).includes(item.key));
  const mobileRightItem = NAV_ITEMS.find((item) => item.key === MOBILE_PRIMARY_NAV_KEYS[2]);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Tablet Icon Rail (768px ~ 1023px): 2-char compact labels */}
      <aside className="sticky top-0 hidden h-dvh w-sidebar-rail shrink-0 flex-col items-center justify-between border-r border-sidebar-border bg-sidebar py-4 md:flex lg:hidden">
        <div className="flex w-full flex-col items-center gap-3">
          <span className="text-xl font-extrabold tracking-tight text-primary">M</span>

          <div className="w-full px-2">{renderLedgerSwitcher('rail')}</div>

          <nav aria-label="주 메뉴" className="flex w-full flex-col items-center gap-1.5 px-2 pt-1">
            {NAV_ITEMS.map((item) => {
              const NavIcon = item.icon;
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => void handleNavClick(item.key)}
                  className={cn(
                    'flex w-full flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors',
                    active ? 'bg-sidebar-accent font-bold text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <NavIcon className="size-5" />
                  <span>{item.compactLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="inline-flex size-9 items-center justify-center rounded-full bg-primary-tint text-xs font-bold text-primary">민지</div>
      </aside>

      {/* PC Full Sidebar (>= 1024px): full descriptive labels */}
      <aside className="sticky top-0 hidden h-dvh w-sidebar-full shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1 py-1">
            <span className="text-xl font-extrabold tracking-tight text-primary">M</span>
            <span className="text-base font-extrabold tracking-tight text-sidebar-foreground">미리온돈</span>
          </div>

          {renderLedgerSwitcher('full')}

          <nav aria-label="주 메뉴" className="flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map((item) => {
              const NavIcon = item.icon;
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => void handleNavClick(item.key)}
                  className={cn(
                    'flex min-h-control-md items-center gap-3 rounded-lg px-3.5 text-sm font-medium transition-colors',
                    active ? 'bg-sidebar-accent font-bold text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                  )}
                >
                  <NavIcon className="size-5 shrink-0" />
                  <span>{item.pcLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-bold text-primary">민지</span>
          <div className="min-w-0 flex flex-col">
            <span className="truncate text-xs font-bold text-sidebar-foreground">예시 민지 (나)</span>
            <span className="text-[11px] text-muted-foreground">소유자</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {/* Mobile Header (< 768px) */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:hidden">
          <div className="flex h-header-mobile items-center justify-between gap-1.5 px-page-mobile">
            <div className="min-w-0 flex-1">{mobileHeaderLeft}</div>
            {mobileHeaderRight ? <div className="flex shrink-0 items-center gap-1.5">{mobileHeaderRight}</div> : null}
          </div>
          {mobileHeaderBottom ? <div className="px-page-mobile pb-2.5">{mobileHeaderBottom}</div> : null}
        </header>

        {/* Tablet & PC Header (>= 768px) — 사이드바(236px) + 본문(1684px) = 1920px(FHD 100% · UHD 50%) */}
        <header className="sticky top-0 z-30 hidden h-header-desktop border-b border-border bg-card/95 backdrop-blur md:block">
          <div className="flex h-full w-full max-w-[1684px] items-center justify-between gap-4 px-page-tablet lg:px-page-desktop">
            <div className="flex min-w-0 items-center gap-4">{desktopHeaderLeft}</div>
            {desktopHeaderRight ? <div className="flex shrink-0 items-center gap-2">{desktopHeaderRight}</div> : null}
          </div>
        </header>

        <main className={cn('flex w-full max-w-[1684px] flex-1 flex-col gap-stack-mobile p-page-mobile md:p-page-tablet lg:gap-stack-desktop lg:p-page-desktop', mainClassName)}>{children}</main>
      </div>

      {/* Mobile Bottom Navigation (< 768px): 결산 · 지출 · [+ 지출 추가] · 수입 · 전체 */}
      <nav aria-label="하단 탭바" className="fixed inset-x-0 bottom-0 z-30 flex h-bottom-nav items-center justify-around gap-0.5 border-t border-border bg-card/95 px-1.5 backdrop-blur md:hidden">
        {mobileLeftItems.map((item) => {
          const NavIcon = item.icon;
          const active = activeNav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => void handleNavClick(item.key)}
              className={cn('flex min-w-11 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium', active ? 'font-bold text-primary' : 'text-muted-foreground')}
            >
              <NavIcon className="size-5" />
              <span>{item.compactLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddExpense}
          className="group flex min-h-control-lg min-w-12 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors group-hover:bg-primary/90">
            <Plus className="size-4" />
          </span>
          <span className="whitespace-nowrap">지출 추가</span>
        </button>

        {mobileRightItem ? (
          <button
            type="button"
            onClick={() => void handleNavClick(mobileRightItem.key)}
            className={cn(
              'flex min-w-11 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium',
              activeNav === mobileRightItem.key ? 'font-bold text-primary' : 'text-muted-foreground'
            )}
          >
            <mobileRightItem.icon className="size-5" />
            <span>{mobileRightItem.compactLabel}</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={cn(
            'flex min-w-11 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium',
            MOBILE_OVERFLOW_NAV_KEYS.includes(activeNav) ? 'font-bold text-primary' : 'text-muted-foreground'
          )}
        >
          <Menu className="size-5" />
          <span>전체</span>
        </button>
      </nav>

      {/* Mobile Whole Menu Sheet (5개 전체 메뉴) */}
      <Sheet
        open={mobileMoreOpen}
        onOpenChange={(open) => {
          setMobileMoreOpen(open);
          if (!open) {
            setSheetLedgerMenuOpen(false);
          }
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>전체 메뉴</SheetTitle>
            <SheetDescription>{currentLedger.name}의 모든 화면으로 바로 이동할 수 있어요.</SheetDescription>
          </SheetHeader>
          <SheetBody className="max-h-[70dvh] gap-3 overflow-y-auto pb-1">
            <div className="flex flex-col gap-1.5">
              <span className="px-0.5 text-[11px] font-bold text-muted-foreground">가계부 선택</span>
              <button
                type="button"
                aria-expanded={sheetLedgerMenuOpen}
                aria-label={`가계부 변경 (${currentLedger.name})`}
                onClick={() => setSheetLedgerMenuOpen((prev) => !prev)}
                className="inline-flex min-h-control-md w-full items-center justify-between gap-2 rounded-lg border border-border-strong bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <BookOpen className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{currentLedger.name}</span>
                </span>
                <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', sheetLedgerMenuOpen && 'rotate-180')} />
              </button>
              {sheetLedgerMenuOpen ? <div className="max-h-52 overflow-y-auto rounded-lg border border-border-strong bg-card p-1.5 shadow-sm">{renderLedgerOptions()}</div> : null}
            </div>

            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const NavIcon = item.icon;
                const active = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => void handleNavClick(item.key)}
                    className={cn(
                      'flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                      active ? 'border-primary bg-primary-tint/50' : 'border-border bg-card hover:border-border-strong hover:bg-accent/40'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-primary-tint text-primary')}>
                        <NavIcon className="size-4" />
                      </span>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-foreground">{item.pcLabel}</span>
                        <span className="text-xs text-muted-foreground break-keep">{item.description}</span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
};
