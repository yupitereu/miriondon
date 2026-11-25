'use client';

import { ProfileAvatar, dialog } from '@repo/ui-composition';
import { Button, Popover, PopoverContent, PopoverTrigger, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, cn } from '@repo/ui-core';
import { ArrowLeft, Check, ClipboardCheck, ChevronDown, ChevronRight, Landmark, LayoutGrid, List, Menu, Plus, Settings, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { IncomeEditor } from '@/previews/income/IncomeEditor';
import { createIncome, netIncome, type IncomeRecord } from '@/previews/income/income-model';
import { MiriondonSymbol, MiriondonWordmark } from '@/shared/BrandLogo';
import { PersonalProfileOverlay } from '@/shared/PersonalProfileOverlay';
import { TransactionConfirmationModal } from '@/shared/TransactionConfirmationModal';
import { formatWon } from '@/shared/design-format';
import { LedgerIcon, findDesignLedger, setActiveLedgerId, useActiveLedgerId, useDesignLedgers } from '@/shared/design-ledger-settings';
import { usePersonalProfile } from '@/shared/design-personal-businesses';
import { useConfirmationItems } from '@/shared/design-transaction-confirmation';
import { ExpenseFormOverlay, computeExpensePreview, createEmptyExpensePreset, type ExpenseDraft } from '@/shared/expense-form/ExpenseFormView';

export type AppNavKey = 'settlement' | 'expenses' | 'income' | 'assets' | 'settings';

type NavItem = {
  key: AppNavKey;
  pcLabel: string;
  compactLabel: string;
  icon: typeof LayoutGrid;
  href?: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'settlement', pcLabel: '결산', compactLabel: '결산', icon: LayoutGrid, href: '/preview/settlement' },
  { key: 'expenses', pcLabel: '지출 내역', compactLabel: '지출', icon: List, href: '/preview/expenses' },
  { key: 'income', pcLabel: '수입 내역', compactLabel: '수입', icon: Wallet, href: '/preview/income' },
  { key: 'assets', pcLabel: '자산 현황', compactLabel: '자산', icon: Landmark, href: '/preview/assets' },
  { key: 'settings', pcLabel: '가계부 설정', compactLabel: '설정', icon: Settings, href: '/preview/settings/assets' }
];

const MOBILE_PRIMARY_NAV_KEYS: AppNavKey[] = ['settlement', 'expenses', 'income'];
const MOBILE_OVERFLOW_NAV_KEYS: AppNavKey[] = ['assets', 'settings'];

type DesignAppShellMobilePrimaryAction = {
  label: string;
  tone?: 'primary' | 'expense' | 'income';
  onClick: () => void;
};

const MOBILE_PRIMARY_ACTION_TONE_CLASSES = {
  primary: { text: 'text-primary', circle: 'bg-primary text-primary-foreground group-hover:bg-primary/90' },
  expense: { text: 'text-expense', circle: 'bg-expense text-expense-foreground group-hover:bg-expense/90' },
  income: { text: 'text-income', circle: 'bg-income text-income-foreground group-hover:bg-income/90' }
} as const;

const MOBILE_NAV_ACTIVE_TEXT_CLASS: Partial<Record<AppNavKey, string>> = {
  expenses: 'font-bold text-expense',
  income: 'font-bold text-income'
};

const getMobileNavTextClass = (key: AppNavKey, active: boolean) => (active ? (MOBILE_NAV_ACTIVE_TEXT_CLASS[key] ?? 'font-bold text-primary') : 'text-muted-foreground');

const ConfirmationCountBadge = ({ count, placement = 'inline' }: { count: number; placement?: 'inline' | 'compact' | 'header' }) =>
  count > 0 ? (
    <span
      className={cn(
        'pointer-events-none inline-flex items-center justify-center rounded-full bg-primary font-bold leading-none text-primary-foreground tabular-nums',
        placement === 'compact'
          ? 'absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 text-[10px]'
          : placement === 'header'
            ? 'absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]'
            : 'h-5 min-w-5 px-1.5 text-[11px]'
      )}
    >
      {count}
    </span>
  ) : null;

export type DesignAppShellBackAction = {
  label: string;
  ariaLabel?: string;
  onClick: () => void;
};

type DesignAppShellProps = {
  activeNav: AppNavKey;
  title: string;
  back?: DesignAppShellBackAction;
  topNotice?: ReactNode;
  periodControl?: ReactNode;
  mobilePeriodInTitle?: boolean;
  mobilePeriodRight?: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
  desktopActions?: ReactNode;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  mobilePrimaryAction?: DesignAppShellMobilePrimaryAction;
  ledgerId?: string;
  onLedgerChange?: (ledgerId: string) => void;
  mainClassName?: string;
  children: ReactNode;
};

export const DesignAppShell = ({
  activeNav,
  title,
  back,
  topNotice,
  periodControl,
  mobilePeriodInTitle = false,
  mobilePeriodRight,
  actions,
  mobileActions,
  desktopActions,
  onAddExpense,
  onAddIncome,
  mobilePrimaryAction,
  ledgerId: controlledLedgerId,
  onLedgerChange,
  mainClassName,
  children
}: DesignAppShellProps) => {
  const router = useRouter();
  const ledgers = useDesignLedgers();
  const activeLedgerId = useActiveLedgerId();
  const [railLedgerMenuOpen, setRailLedgerMenuOpen] = useState(false);
  const [sidebarLedgerMenuOpen, setSidebarLedgerMenuOpen] = useState(false);
  const [sheetLedgerMenuOpen, setSheetLedgerMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [draftIncome, setDraftIncome] = useState<IncomeRecord | null>(null);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() => createEmptyExpensePreset());
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const profile = usePersonalProfile();
  const confirmationItems = useConfirmationItems();

  useEffect(() => {
    if (!addMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAddMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addMenuOpen]);

  const ledgerId = controlledLedgerId ?? activeLedgerId;
  const currentLedger = findDesignLedger(ledgers, ledgerId);

  const handleSelectLedger = (nextId: string) => {
    if (onLedgerChange) {
      onLedgerChange(nextId);
    } else {
      setActiveLedgerId(nextId);
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
      params.delete('tab');
      params.delete('openBudget');
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
      {ledgers.map((ledger) => {
        const selected = ledger.id === ledgerId;
        return (
          <button
            key={ledger.id}
            type="button"
            onClick={() => handleSelectLedger(ledger.id)}
            className={cn('flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent', selected && 'bg-primary-tint text-primary')}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-md', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                <LedgerIcon iconKey={ledger.iconKey} className="size-3.5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{ledger.name}</span>
                <span className="text-[11px] text-muted-foreground">{ledger.role}</span>
              </div>
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
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-border-strong bg-card px-1.5 py-1.5 text-center text-[10px] font-bold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <LedgerIcon iconKey={currentLedger.iconKey} className="size-4 shrink-0 text-primary" />
              <span className="w-full leading-tight break-keep break-words">{currentLedger.name}</span>
            </button>
          ) : (
            <button
              type="button"
              aria-label={`가계부 변경 (${currentLedger.name})`}
              className="inline-flex min-h-control-md w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <span className="flex min-w-0 items-center gap-2">
                <LedgerIcon iconKey={currentLedger.iconKey} className="size-4 shrink-0 text-primary" />
                <span className="truncate">{currentLedger.name}</span>
              </span>
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
  const handleAddIncome = () => {
    if (onAddIncome) {
      onAddIncome();
      return;
    }
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setDraftIncome(createIncome(monthKey, crypto.randomUUID()));
  };
  const handleSaveFallbackIncome = async (record: IncomeRecord) => {
    setDraftIncome(null);
    await dialog.alert({
      title: '수입 저장 미리보기',
      description: `${record.title || '수입 항목'} · 실수령액 ${formatWon(netIncome(record))}`
    });
  };
  const handleAddExpense = () => {
    if (onAddExpense) {
      onAddExpense();
      return;
    }
    setExpenseDraft(createEmptyExpensePreset());
    setExpenseSheetOpen(true);
  };
  const handleSaveFallbackExpense = async (savedDraft: ExpenseDraft) => {
    const preview = computeExpensePreview(savedDraft);
    setExpenseSheetOpen(false);
    await dialog.alert({
      title: '지출 저장 미리보기',
      description: `${savedDraft.merchant || '사용처 미입력'} · 실결제 ${formatWon(preview.actualPaid)} (생활비 반영 ${formatWon(preview.livingBudgetExpense)})`
    });
  };
  const primaryAction =
    mobilePrimaryAction ??
    (activeNav === 'expenses'
      ? onAddExpense
        ? { label: '지출 추가', tone: 'expense' as const, chooseOnPrimary: false, onClick: onAddExpense }
        : null
      : { label: '내역 추가', tone: 'primary' as const, chooseOnPrimary: true, onClick: handleAddExpense });
  const primaryActionTone = MOBILE_PRIMARY_ACTION_TONE_CLASSES[primaryAction?.tone ?? 'primary'];
  const isSubPage = Boolean(back);
  const resolvedMobileActions = mobileActions ?? actions;
  const resolvedDesktopActions = desktopActions ?? actions;

  const mobileSubPageTitleGroup = (
    <div className="flex min-w-0 items-center gap-1.5">
      {back ? (
        <button
          type="button"
          aria-label={back.ariaLabel ?? `${back.label} 화면으로 돌아가기`}
          onClick={back.onClick}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
      ) : null}
      <h1 className="truncate text-base font-bold tracking-tight text-foreground">{title}</h1>
    </div>
  );

  const mobilePeriodRow =
    periodControl || mobilePeriodRight ? (
      <div className="flex min-h-8 items-center justify-between gap-2">
        <div className="-ml-1.5 flex min-w-0 items-center">{periodControl}</div>
        {mobilePeriodRight ? <div className="flex shrink-0 items-center gap-1.5">{mobilePeriodRight}</div> : null}
      </div>
    ) : null;

  const desktopTitleGroup = (
    <div className={cn('flex min-w-0 items-center', isSubPage ? 'gap-2.5' : 'gap-2 lg:gap-3')}>
      {back ? (
        <Button type="button" variant="ghost" size="sm" onClick={back.onClick} className="gap-1 px-2 text-muted-foreground">
          <ArrowLeft className="size-4" />
          <span>{back.label}</span>
        </Button>
      ) : null}
      <h1 className={cn('text-lg font-bold tracking-tight text-foreground', periodControl ? 'shrink-0 whitespace-nowrap' : 'truncate')}>{title}</h1>
      {periodControl}
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Tablet Icon Rail (768px ~ 1023px): 2-char compact labels */}
      <aside className="sticky top-0 hidden h-dvh w-sidebar-rail shrink-0 flex-col items-center justify-between border-r border-sidebar-border bg-sidebar py-4 md:flex lg:hidden">
        <div className="flex w-full flex-col items-center gap-3">
          <span role="img" aria-label="미리온돈" className="inline-flex items-center justify-center">
            <MiriondonSymbol className="size-8" />
          </span>

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

        <div className="flex w-full flex-col items-center gap-2 px-2">
          {confirmationItems.length > 0 ? (
            <button
              type="button"
              aria-label={`입출금 확인 (${confirmationItems.length}건)`}
              onClick={() => setConfirmationOpen(true)}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="relative inline-flex">
                <ClipboardCheck className="size-5 text-primary" />
                <ConfirmationCountBadge count={confirmationItems.length} placement="compact" />
              </span>
              <span>확인</span>
            </button>
          ) : null}

          <button
            type="button"
            aria-label="내 정보"
            onClick={() => setProfileOpen(true)}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-sidebar-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ProfileAvatar name={profile.name} src={profile.avatarSrc} color={profile.avatarColor} className="size-9 text-sm" />
          </button>
        </div>
      </aside>

      {/* PC Full Sidebar (>= 1024px): full descriptive labels */}
      <aside className="sticky top-0 hidden h-dvh w-sidebar-full shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1 py-1">
            <MiriondonSymbol className="size-7 shrink-0" />
            <MiriondonWordmark size="md" />
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

        <div className="flex flex-col gap-2">
          {confirmationItems.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmationOpen(true)}
              className="flex min-h-control-md cursor-pointer items-center gap-3 rounded-lg px-3.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ClipboardCheck className="size-5 shrink-0 text-primary" />
              <span>입출금 확인</span>
              <span className="ml-auto">
                <ConfirmationCountBadge count={confirmationItems.length} />
              </span>
            </button>
          ) : null}

          <div className="border-t border-sidebar-border/70 pt-2">
            <button
              type="button"
              aria-label="내 정보"
              onClick={() => setProfileOpen(true)}
              className="flex min-h-control-lg w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-sidebar-accent/60"
            >
              <ProfileAvatar name={profile.name} src={profile.avatarSrc} color={profile.avatarColor} className="size-8 shrink-0 text-xs" />
              <span className="min-w-0 flex flex-1 flex-col">
                <span className="truncate text-xs font-bold text-sidebar-foreground">{profile.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">{profile.email}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {/* Mobile Header (< 768px) */}
        {isSubPage ? (
          <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:hidden">
            <div className="flex h-header-mobile items-center justify-between gap-1.5 px-page-mobile">
              <div className="min-w-0 flex-1">{mobileSubPageTitleGroup}</div>
              {(mobilePeriodInTitle && periodControl) || resolvedMobileActions ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  {mobilePeriodInTitle && periodControl ? <div className={cn(!resolvedMobileActions && '-mr-1.5')}>{periodControl}</div> : null}
                  {resolvedMobileActions}
                </div>
              ) : null}
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:hidden">
            <div className="flex h-12 items-center justify-between gap-2 px-page-mobile">
              <div className="flex min-w-0 items-center gap-2">
                <MiriondonWordmark size="sm" className="shrink-0" />
                {currentLedger ? (
                  <div
                    role="group"
                    aria-label={`현재 가계부 ${currentLedger.name}`}
                    className="inline-flex h-8 max-w-[146px] min-w-0 items-center gap-1.5 rounded-full bg-muted/70 px-2.5 text-xs font-semibold text-foreground min-[360px]:max-w-[184px]"
                  >
                    <LedgerIcon iconKey={currentLedger.iconKey} className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">{currentLedger.name}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {confirmationItems.length > 0 ? (
                  <button
                    type="button"
                    aria-label={`입출금 확인 (${confirmationItems.length}건)`}
                    onClick={() => setConfirmationOpen(true)}
                    className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <ClipboardCheck className="size-4.5 text-primary" />
                    <ConfirmationCountBadge count={confirmationItems.length} placement="header" />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="내 정보"
                  onClick={() => setProfileOpen(true)}
                  className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ProfileAvatar name={profile.name} src={profile.avatarSrc} color={profile.avatarColor} className="size-7 text-[11px]" />
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Tablet & PC Header (>= 768px) — 사이드바(236px) + 본문(1684px) = 1920px(FHD 100% · UHD 50%) */}
        <header className="sticky top-0 z-30 hidden h-header-desktop border-b border-border bg-card/95 backdrop-blur md:block">
          <div className="flex h-full w-full max-w-[1684px] items-center justify-between gap-4 px-page-tablet lg:px-page-desktop">
            <div className="flex min-w-0 items-center gap-4">{desktopTitleGroup}</div>
            {resolvedDesktopActions ? <div className="flex shrink-0 items-center gap-2">{resolvedDesktopActions}</div> : null}
          </div>
        </header>

        <main className={cn('flex w-full max-w-[1684px] flex-1 flex-col gap-stack-mobile p-page-mobile md:p-page-tablet lg:gap-stack-desktop lg:p-page-desktop', mainClassName)}>
          {topNotice}
          {isSubPage ? (
            !mobilePeriodInTitle && mobilePeriodRow ? (
              <div className="-mb-1.5 md:hidden">{mobilePeriodRow}</div>
            ) : null
          ) : mobilePeriodInTitle ? (
            <div className="-mb-1 flex flex-col gap-2 md:hidden">
              <div className="flex min-h-9 items-center justify-between gap-2">
                <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground">{title}</h1>
                {periodControl ? <div className="-mr-1.5 flex shrink-0 items-center">{periodControl}</div> : null}
              </div>
              {resolvedMobileActions ? <div className="flex flex-wrap items-center justify-end gap-2">{resolvedMobileActions}</div> : null}
            </div>
          ) : (
            <div className="-mb-1.5 flex flex-col gap-1 md:hidden">
              <div className="flex min-h-9 items-center justify-between gap-2">
                <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground">{title}</h1>
                {resolvedMobileActions ? <div className="flex shrink-0 items-center gap-1.5">{resolvedMobileActions}</div> : null}
              </div>
              {mobilePeriodRow}
            </div>
          )}
          {children}
        </main>
      </div>

      {primaryAction && 'chooseOnPrimary' in primaryAction && primaryAction.chooseOnPrimary ? (
        <div
          aria-hidden="true"
          onClick={() => setAddMenuOpen(false)}
          className={cn(
            'fixed inset-0 z-[35] bg-black/50 backdrop-blur-[1px] transition-opacity duration-200 md:hidden',
            addMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          )}
        />
      ) : null}

      {/* Mobile Bottom Navigation (< 768px): 결산 · 지출 · [+ 지출/내역/수입 추가] · 수입 · 전체 */}
      <nav
        aria-label="하단 탭바"
        className="fixed inset-x-0 bottom-0 z-40 flex h-bottom-nav items-center justify-around gap-0.5 border-t border-border bg-card/95 px-1.5 shadow-[0_-4px_12px_rgb(0_0_0/0.12)] backdrop-blur md:hidden dark:shadow-[0_-4px_12px_rgb(0_0_0/0.35)]"
      >
        {mobileLeftItems.map((item) => {
          const NavIcon = item.icon;
          const active = activeNav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => void handleNavClick(item.key)}
              className={cn('flex min-w-11 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium', getMobileNavTextClass(item.key, active))}
            >
              <NavIcon className="size-5" />
              <span>{item.compactLabel}</span>
            </button>
          );
        })}

        {primaryAction ? (
          'chooseOnPrimary' in primaryAction && primaryAction.chooseOnPrimary ? (
            <div className="relative flex h-full items-center justify-center">
              <div
                role="menu"
                aria-label="추가할 내역 종류"
                aria-hidden={!addMenuOpen}
                className={cn('absolute bottom-full left-1/2 z-0 -translate-x-1/2', addMenuOpen ? 'pointer-events-auto' : 'pointer-events-none')}
              >
                {[
                  {
                    label: '지출',
                    ariaLabel: '지출 추가',
                    icon: List,
                    openTransform: '-translate-x-[calc(50%+44px)] -translate-y-4 scale-100 opacity-100',
                    closedTransform: '-translate-x-1/2 translate-y-10 scale-50 opacity-0',
                    circleClass: 'bg-expense text-expense-foreground group-focus-visible:ring-expense/40',
                    onSelect: primaryAction.onClick
                  },
                  {
                    label: '수입',
                    ariaLabel: '수입 추가',
                    icon: Wallet,
                    openTransform: 'translate-x-[calc(-50%+44px)] -translate-y-4 scale-100 opacity-100 delay-[35ms]',
                    closedTransform: '-translate-x-1/2 translate-y-10 scale-50 opacity-0',
                    circleClass: 'bg-income text-income-foreground group-focus-visible:ring-income/40',
                    onSelect: handleAddIncome
                  }
                ].map((option) => {
                  const OptionIcon = option.icon;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      role="menuitem"
                      tabIndex={addMenuOpen ? 0 : -1}
                      aria-label={option.ariaLabel}
                      onClick={() => {
                        setAddMenuOpen(false);
                        option.onSelect();
                      }}
                      className={cn(
                        'group absolute bottom-0 left-0 rounded-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none',
                        addMenuOpen ? option.openTransform : option.closedTransform
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex size-14 flex-col items-center justify-center gap-0.5 rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-105 group-active:scale-95 group-focus-visible:ring-2',
                          option.circleClass
                        )}
                      >
                        <OptionIcon className="size-4.5" />
                        <span className="text-[11px] leading-none font-bold">{option.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                aria-expanded={addMenuOpen}
                aria-haspopup="menu"
                aria-label={addMenuOpen ? '내역 추가 닫기' : '내역 추가 종류 선택'}
                onClick={() => setAddMenuOpen((prev) => !prev)}
                className={cn(
                  'group relative z-10 flex min-h-control-lg min-w-12 -translate-y-3 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                  primaryActionTone.text
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-full bg-linear-to-b from-white/15 to-black/15 shadow-lg ring-2 ring-card transition-colors',
                    primaryActionTone.circle
                  )}
                >
                  <Plus className={cn('size-5 transition-transform duration-150', addMenuOpen && 'rotate-45')} />
                </span>
                <span className="translate-y-0.5 whitespace-nowrap">{addMenuOpen ? '닫기' : primaryAction.label}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={cn(
                'group flex min-h-control-lg min-w-12 -translate-y-3 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                primaryActionTone.text
              )}
            >
              <span
                className={cn(
                  'inline-flex size-10 items-center justify-center rounded-full bg-linear-to-b from-white/15 to-black/15 shadow-lg ring-2 ring-card transition-colors',
                  primaryActionTone.circle
                )}
              >
                <Plus className="size-5" />
              </span>
              <span className="translate-y-0.5 whitespace-nowrap">{primaryAction.label}</span>
            </button>
          )
        ) : null}

        {mobileRightItem ? (
          <button
            type="button"
            onClick={() => void handleNavClick(mobileRightItem.key)}
            className={cn('flex min-w-11 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium', getMobileNavTextClass(mobileRightItem.key, activeNav === mobileRightItem.key))}
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
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <MiriondonWordmark size="md" />
            </SheetTitle>
          </SheetHeader>
          <SheetBody className="max-h-[70dvh] gap-3 overflow-y-auto pb-1">
            <button
              type="button"
              aria-label="내 정보"
              onClick={() => {
                setMobileMoreOpen(false);
                setSheetLedgerMenuOpen(false);
                setProfileOpen(true);
              }}
              className="flex min-h-control-lg cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-accent"
            >
              <ProfileAvatar name={profile.name} src={profile.avatarSrc} color={profile.avatarColor} className="size-8 shrink-0 text-xs" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{profile.name}</span>
                <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
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
                  <LedgerIcon iconKey={currentLedger.iconKey} className="size-4 shrink-0 text-primary" />
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
                      'flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-left transition-colors',
                      active ? 'border-primary bg-primary-tint/50' : 'border-border bg-card hover:border-border-strong hover:bg-accent/40'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-primary-tint text-primary')}>
                        <NavIcon className="size-4" />
                      </span>
                      <span className="truncate text-sm font-bold text-foreground">{item.pcLabel}</span>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
      {profileOpen ? <PersonalProfileOverlay onClose={() => setProfileOpen(false)} /> : null}
      <TransactionConfirmationModal open={confirmationOpen} onOpenChange={setConfirmationOpen} />
      {draftIncome ? (
        <IncomeEditor
          record={draftIncome}
          existing={false}
          onClose={() => setDraftIncome(null)}
          onSave={(saved) => void handleSaveFallbackIncome(saved)}
          onViewAssets={() => void router.push('/preview/assets')}
        />
      ) : null}
      <ExpenseFormOverlay open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen} draft={expenseDraft} onDraftChange={setExpenseDraft} onSave={(saved) => void handleSaveFallbackExpense(saved)} />
    </div>
  );
};
