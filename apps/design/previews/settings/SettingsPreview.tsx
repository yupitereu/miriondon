'use client';

import { ResponsiveOverlay, ResponsiveOverlayBody, ResponsiveOverlayContent, ResponsiveOverlayFooter, ResponsiveOverlayHeader, ResponsiveOverlayTitle, dialog } from '@repo/ui-composition';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
  useIsMobileView
} from '@repo/ui-core';
import { Check, ChevronDown, ChevronRight, CircleHelp, Plus } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { DesignAppShell } from '@/shared/DesignAppShell';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { MemberTaxSettings, useMemberBusinessSubView, type MemberBusinessSubView } from '@/shared/MemberTaxSettings';
import { setTaxRecordingEnabled, useTaxRecordingEnabled } from '@/shared/design-ledger-settings';
import { DESIGN_PROFILE_NAME, normalizeMemberBaseName, renameMemberTaxOwner, useAllMemberTaxStatuses, usePersonalBusinesses, usePersonalProfile } from '@/shared/design-personal-businesses';

type Role = '소유자' | '관리자' | '구성원';
type Member = { id: string; name: string; email: string; role: Role; pending?: boolean; linkedOutsider?: string };
type OutsiderLinkMode = 'member' | 'pending' | 'invite';
const initialMembers: Member[] = [
  { id: 'me', name: '민지(나)', email: 'minji@example.com', role: '소유자' },
  { id: 'two', name: '준호', email: 'junho@example.com', role: '관리자' },
  { id: 'three', name: '서연', email: 'seoyeon@example.com', role: '구성원' },
  { id: 'four', name: '초대 대기', email: 'family@example.com', role: '구성원', pending: true }
];
const sectionClass = 'rounded-xl border border-border bg-card p-4 sm:p-5';
const labelClass = 'text-sm font-semibold text-foreground';
const settingMenus = [
  { value: 'assets', label: '자산 · 카드' },
  { value: 'budget', label: '분류 · 예산' },
  { value: 'fixed', label: '고정 수입 · 지출' },
  { value: 'ledger', label: '가계부 관리' }
] as const;

export const SettingsPreview = () => {
  const isMobile = useIsMobileView();
  const [tab, setTab] = useState('ledger');
  const [menuOpen, setMenuOpen] = useState(false);
  const membersSectionRef = useRef<HTMLElement>(null);
  const [name, setName] = useState('우리집 가계부');
  const [draftName, setDraftName] = useState(name);
  const [editName, setEditName] = useState(false);
  const taxEnabled = useTaxRecordingEnabled();
  const personalProfile = usePersonalProfile();
  const memberTaxStatuses = useAllMemberTaxStatuses();
  const allBusinesses = usePersonalBusinesses();
  const [members, setMembers] = useState(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingInvitesOpen, setPendingInvitesOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('구성원');
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [draftRole, setDraftRole] = useState('구성원');
  const [outsiders, setOutsiders] = useState(['지은']);
  const [outsiderOpen, setOutsiderOpen] = useState(false);
  const [outsiderName, setOutsiderName] = useState('');
  const [editOutsider, setEditOutsider] = useState<string | null>(null);
  const [draftOutsiderName, setDraftOutsiderName] = useState('');
  const [linkOutsider, setLinkOutsider] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<OutsiderLinkMode>('member');
  const [selectedLinkMemberId, setSelectedLinkMemberId] = useState('');
  const [selectedLinkPendingId, setSelectedLinkPendingId] = useState('');
  const [linkInviteEmail, setLinkInviteEmail] = useState('');
  const [linkInviteRole, setLinkInviteRole] = useState<Role>('구성원');
  const participants = members.filter((member) => !member.pending);
  const pending = members.filter((member) => member.pending);

  const transfer = async (member: Member) => {
    const ok = await dialog.confirm({ title: '소유권을 이전할까요?', description: `${member.name}님이 소유자가 되고, 내 역할은 관리자로 변경돼요.`, confirmText: '소유권 이전' });
    if (ok) {
      setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, role: '소유자' } : item.role === '소유자' ? { ...item, role: '관리자' } : item)));
      setEditMember(null);
    }
  };
  const removeMember = async (member: Member) => {
    const ok = await dialog.confirm({ title: `${member.name}님을 내보낼까요?`, description: '가계부 접근은 종료되며 기존 기록은 유지돼요.', confirmText: '내보내기' });
    if (ok) setMembers((prev) => prev.filter((item) => item.id !== member.id));
    setEditMember(null);
  };
  const isOwner = members.find((item) => item.id === 'me')?.role === '소유자';

  const renderTaxBadges = (ownerName: string) => {
    if (!taxEnabled) return null;
    const taxStatus = ownerName === DESIGN_PROFILE_NAME ? personalProfile.taxStatus : (memberTaxStatuses[ownerName] ?? memberTaxStatuses[normalizeMemberBaseName(ownerName)] ?? 'none');
    const activeBusinessCount = allBusinesses.filter((business) => business.owner === ownerName && business.active).length;

    if (taxStatus === 'none' && activeBusinessCount === 0) {
      return (
        <Badge variant="neutral" className="opacity-70">
          미설정
        </Badge>
      );
    }

    return (
      <>
        {taxStatus === 'worker' ? <Badge variant="positive">근로자</Badge> : null}
        {taxStatus === 'dependent' ? <Badge variant="income">부양가족</Badge> : null}
        {activeBusinessCount > 0 ? <Badge variant="wine">{activeBusinessCount > 1 ? `사업자 ${activeBusinessCount}` : '사업자'}</Badge> : null}
      </>
    );
  };
  const memberManageOwner = editMember ? (editMember.id === 'me' ? DESIGN_PROFILE_NAME : editMember.name) : null;
  const memberBusinessSubView = useMemberBusinessSubView(memberManageOwner);
  const memberManageTitle = editMember ? `${editMember.name} 관리` : '구성원 관리';
  const memberManageBody = editMember ? (
    <>
      <div className="flex items-center gap-3">
        <MemberAvatar name={editMember.name} size="md" mode="icon-hover" className="!size-9 !text-sm" />
        <div>
          <p className="text-sm font-bold">{editMember.name}</p>
          <p className="text-xs text-muted-foreground">{editMember.email}</p>
        </div>
      </div>
      {editMember.id !== 'me' && editMember.role !== '소유자' ? (
        <div>
          <span className={labelClass}>역할</span>
          <Select value={draftRole} onValueChange={setDraftRole}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="구성원">구성원</SelectItem>
              <SelectItem value="관리자">관리자</SelectItem>
              {isOwner ? <SelectItem value="소유자">소유자</SelectItem> : null}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {taxEnabled && memberManageOwner ? <MemberTaxSettings owner={memberManageOwner} onAddBusiness={memberBusinessSubView.openAdd} onEditBusiness={memberBusinessSubView.openEdit} /> : null}
    </>
  ) : null;
  const memberManageFooter = (
    <>
      {editMember && editMember.id !== 'me' && editMember.role !== '소유자' && (isOwner || editMember.role === '구성원') ? (
        <Button variant="ghost" className="mr-auto text-destructive" onClick={() => void removeMember(editMember)}>
          내보내기
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => setEditMember(null)}>
        닫기
      </Button>
      {editMember && editMember.id !== 'me' && editMember.role !== '소유자' ? (
        <Button
          onClick={() => {
            if (draftRole === '소유자') {
              void transfer(editMember);
              return;
            }
            setMembers((prev) => prev.map((item) => (item.id === editMember.id ? { ...item, role: draftRole as Role } : item)));
            setEditMember(null);
          }}
        >
          역할 저장
        </Button>
      ) : null}
    </>
  );
  const openLinkOverlay = (person: string) => {
    const existingPending = pending.find((item) => item.linkedOutsider === person);
    const availablePending = pending.filter((item) => !item.linkedOutsider || item.linkedOutsider === person);
    setLinkOutsider(person);
    setLinkMode(existingPending ? 'pending' : 'member');
    setSelectedLinkMemberId(participants[0]?.id ?? '');
    setSelectedLinkPendingId(existingPending?.id ?? availablePending[0]?.id ?? '');
    setLinkInviteEmail('');
    setLinkInviteRole('구성원');
  };
  const trimmedOutsiderName = draftOutsiderName.trim();
  const isDuplicateOutsiderName = Boolean(editOutsider && trimmedOutsiderName && outsiders.some((person) => person !== editOutsider && person === trimmedOutsiderName));
  const outsiderBusinessSubView = useMemberBusinessSubView(editOutsider);
  const linkedPendingForEditOutsider = editOutsider ? pending.find((item) => item.linkedOutsider === editOutsider) : undefined;
  const outsiderManageTitle = editOutsider ? `${editOutsider} 관리` : '미참여 구성원 관리';
  const outsiderManageBody = editOutsider ? (
    <>
      <div>
        <label className={labelClass} htmlFor="edit-outsider-name">
          이름
        </label>
        <Input
          id="edit-outsider-name"
          className="mt-2"
          maxLength={30}
          value={draftOutsiderName}
          error={isDuplicateOutsiderName ? '같은 이름의 미참여 구성원이 있어요.' : undefined}
          onChange={(event) => setDraftOutsiderName(event.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">계정 연결</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {linkedPendingForEditOutsider ? `${linkedPendingForEditOutsider.email} 수락 시 연결 예정` : '가입 계정과 기존 기록을 합쳐요.'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => {
            const target = editOutsider;
            setEditOutsider(null);
            openLinkOverlay(target);
          }}
        >
          {linkedPendingForEditOutsider ? '연결 관리' : '연결하기'}
        </Button>
      </div>
      {taxEnabled ? <MemberTaxSettings owner={editOutsider} onAddBusiness={outsiderBusinessSubView.openAdd} onEditBusiness={outsiderBusinessSubView.openEdit} /> : null}
    </>
  ) : null;
  const outsiderManageFooter = (
    <>
      {editOutsider ? (
        <Button
          variant="ghost"
          className="mr-auto text-destructive"
          onClick={async () => {
            const target = editOutsider;
            if (await dialog.confirm({ title: `${target}님을 삭제할까요?`, description: '기존 거래 내역은 유지돼요.', confirmText: '삭제' })) {
              setOutsiders((prev) => prev.filter((item) => item !== target));
              setMembers((prev) => prev.map((item) => (item.linkedOutsider === target ? { ...item, linkedOutsider: undefined } : item)));
              setEditOutsider(null);
            }
          }}
        >
          삭제
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => setEditOutsider(null)}>
        닫기
      </Button>
      <Button
        disabled={!trimmedOutsiderName || isDuplicateOutsiderName}
        onClick={() => {
          if (!editOutsider) return;
          if (trimmedOutsiderName !== editOutsider) {
            renameMemberTaxOwner(editOutsider, trimmedOutsiderName);
            setOutsiders((prev) => prev.map((item) => (item === editOutsider ? trimmedOutsiderName : item)));
            setMembers((prev) => prev.map((item) => (item.linkedOutsider === editOutsider ? { ...item, linkedOutsider: trimmedOutsiderName } : item)));
          }
          setEditOutsider(null);
        }}
      >
        저장
      </Button>
    </>
  );

  const currentLinkedPending = linkOutsider ? (pending.find((item) => item.linkedOutsider === linkOutsider) ?? null) : null;
  const selectablePendingForLink = pending.filter((item) => !item.linkedOutsider || item.linkedOutsider === linkOutsider);

  const handleConfirmOutsiderLink = async () => {
    if (!linkOutsider) return;
    if (linkMode === 'member') {
      const targetMember = participants.find((item) => item.id === selectedLinkMemberId);
      if (!targetMember) return;
      const confirmed = await dialog.confirm({
        title: `${linkOutsider}님을 ${targetMember.name} 계정에 연결할까요?`,
        description: `기존 ${linkOutsider}님의 거래·자산·회수금·세무 기록이 ${targetMember.name}님으로 합쳐지며 되돌릴 수 없어요.`,
        confirmText: '연결'
      });
      if (!confirmed) return;
      setOutsiders((prev) => prev.filter((item) => item !== linkOutsider));
      setMembers((prev) => prev.map((item) => (item.linkedOutsider === linkOutsider ? { ...item, linkedOutsider: undefined } : item)));
      setLinkOutsider(null);
      return;
    }

    if (linkMode === 'pending') {
      const targetPending = selectablePendingForLink.find((item) => item.id === selectedLinkPendingId);
      if (!targetPending) return;
      const targetPerson = linkOutsider;
      setMembers((prev) =>
        prev.map((item) => {
          if (item.id === targetPending.id) return { ...item, linkedOutsider: targetPerson };
          if (item.linkedOutsider === targetPerson) return { ...item, linkedOutsider: undefined };
          return item;
        })
      );
      setLinkOutsider(null);
      return;
    }

    const email = linkInviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const targetPerson = linkOutsider;
    setMembers((prev) => [
      ...prev.map((item) => (item.linkedOutsider === targetPerson ? { ...item, linkedOutsider: undefined } : item)),
      { id: `invite-${Date.now()}`, name: '초대 대기', email, role: linkInviteRole, pending: true, linkedOutsider: targetPerson }
    ]);
    setLinkOutsider(null);
  };

  const isLinkConfirmDisabled =
    !linkOutsider ||
    (linkMode === 'member' && !participants.some((item) => item.id === selectedLinkMemberId)) ||
    (linkMode === 'pending' && !selectablePendingForLink.some((item) => item.id === selectedLinkPendingId)) ||
    (linkMode === 'invite' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(linkInviteEmail.trim()));

  const outsiderLinkBody = linkOutsider ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <MemberAvatar name={`${linkOutsider} (미참여)`} size="md" mode="icon-hover" className="!size-8 !text-xs" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{linkOutsider}</p>
          <p className="text-xs text-muted-foreground">{currentLinkedPending ? `${currentLinkedPending.email} 수락 시 자동 연결 예정` : '구성원 계정 연결 또는 초대'}</p>
        </div>
      </div>

      <Tabs variant="segment" value={linkMode} onValueChange={(next) => setLinkMode(next as OutsiderLinkMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="member" className="flex-1 text-xs sm:text-sm">
            기존 구성원
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 text-xs sm:text-sm">
            초대 대기
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex-1 text-xs sm:text-sm">
            새로 초대
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {linkMode === 'member' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground break-keep">이미 참여한 구성원을 선택하면 기존 기록이 즉시 해당 계정으로 합쳐져요.</p>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {participants.map((member) => {
              const active = selectedLinkMemberId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedLinkMemberId(member.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary-tint/45' : 'hover:bg-muted/35'}`}
                >
                  <MemberAvatar name={member.name} size="sm" mode="icon-hover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  {active ? <Check aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {linkMode === 'pending' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground break-keep">초대 대기 계정에 연결을 예약해 두면 상대가 수락할 때 자동으로 합쳐져요.</p>
          {selectablePendingForLink.length > 0 ? (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {selectablePendingForLink.map((member) => {
                const active = selectedLinkPendingId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedLinkPendingId(member.id)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary-tint/45' : 'hover:bg-muted/35'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    {active ? <Check aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-xs text-muted-foreground">
              연결할 수 있는 초대 대기 계정이 없어요. 새로 초대를 이용해 보세요.
            </p>
          )}
        </div>
      ) : null}

      {linkMode === 'invite' ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground break-keep">이메일로 초대를 보내면 초대 대기 상태에 연결이 함께 예약돼요.</p>
          <div>
            <label className={labelClass} htmlFor="link-invite-email">
              이메일
            </label>
            <Input id="link-invite-email" className="mt-1.5" type="email" placeholder="이메일 주소" value={linkInviteEmail} onChange={(event) => setLinkInviteEmail(event.target.value)} />
          </div>
          <div>
            <span className={labelClass}>역할</span>
            <Select value={linkInviteRole} onValueChange={(value) => setLinkInviteRole(value as Role)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="구성원">구성원</SelectItem>
                <SelectItem value="관리자">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  const outsiderLinkFooter = (
    <>
      {currentLinkedPending ? (
        <Button
          variant="ghost"
          className="mr-auto text-destructive"
          onClick={() => {
            const target = linkOutsider;
            setMembers((prev) => prev.map((item) => (item.linkedOutsider === target ? { ...item, linkedOutsider: undefined } : item)));
            setLinkOutsider(null);
          }}
        >
          예약 해제
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => setLinkOutsider(null)}>
        취소
      </Button>
      <Button disabled={isLinkConfirmDisabled} onClick={() => void handleConfirmOutsiderLink()}>
        {linkMode === 'member' ? '연결하기' : linkMode === 'pending' ? '연결 예약' : '초대 및 연결 예약'}
      </Button>
    </>
  );
  const renderResponsiveOverlay = ({
    open,
    onClose,
    title,
    body,
    footer,
    subView
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    body: ReactNode;
    footer: ReactNode;
    subView?: MemberBusinessSubView;
  }) => (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          subView?.reset();
          onClose();
        }
      }}
    >
      <ResponsiveOverlayContent aria-describedby={undefined}>
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>{subView?.editing ? subView.titleContent : title}</ResponsiveOverlayTitle>
        </ResponsiveOverlayHeader>
        <ResponsiveOverlayBody sheetClassName="gap-4 pr-0.5" dialogClassName="flex max-h-[calc(100dvh-11rem)] flex-col gap-4">
          {subView?.editing ? subView.bodyContent : body}
        </ResponsiveOverlayBody>
        <ResponsiveOverlayFooter sheetClassName="flex-wrap">{subView?.editing ? subView.footerContent : footer}</ResponsiveOverlayFooter>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
  const renderManageRow = ({
    rowKey,
    label,
    canManage = true,
    onManage,
    className,
    children
  }: {
    rowKey: string;
    label: string;
    canManage?: boolean;
    onManage: () => void;
    className: string;
    children: (action: ReactNode) => ReactNode;
  }) => {
    const action = canManage ? (
      isMobile ? (
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      ) : (
        <Button size="sm" variant="outline" onClick={onManage}>
          관리
        </Button>
      )
    ) : null;

    if (isMobile && canManage) {
      return (
        <button
          key={rowKey}
          type="button"
          aria-label={`${label} 관리`}
          onClick={onManage}
          className={cn(
            className,
            'w-full cursor-pointer text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 active:bg-muted/50'
          )}
        >
          {children(action)}
        </button>
      );
    }

    return (
      <div key={rowKey} className={className}>
        {children(action)}
      </div>
    );
  };
  return (
    <DesignAppShell
      activeNav="settings"
      title="가계부 설정"
      mobileActions={
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={`설정 메뉴 선택, 현재 ${settingMenus.find((menu) => menu.value === tab)?.label}`}
          aria-haspopup="dialog"
          className="-mr-2 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-tint/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {settingMenus.find((menu) => menu.value === tab)?.label}
          <ChevronDown className="size-4 text-primary" />
        </button>
      }
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <Tabs variant="underline" value={tab} onValueChange={setTab} className="hidden md:block">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="assets" className="flex-none">
              자산 · 카드
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex-none">
              분류 · 예산
            </TabsTrigger>
            <TabsTrigger value="fixed" className="flex-none">
              고정 수입 · 지출
            </TabsTrigger>
            <TabsTrigger value="ledger" className="flex-none">
              가계부 관리
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {tab !== 'ledger' ? (
          <div className={`${sectionClass} py-16 text-center text-sm text-muted-foreground`}>이 메뉴의 시안은 준비 중이에요.</div>
        ) : (
          <>
            <section className={sectionClass}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">기본 정보</h2>
                {isOwner ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraftName(name);
                      setEditName(true);
                    }}
                  >
                    수정
                  </Button>
                ) : null}
              </div>
              <dl className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-muted-foreground">가계부 이름</dt>
                  <dd className="font-semibold">{name}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <span>시작 기준월</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="시작 기준월 변경 불가 안내"
                          className="-my-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <CircleHelp aria-hidden="true" className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[min(17rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                        첫 기록이나 초기 이월금이 등록된 뒤에는 기준월을 변경할 수 없어요.
                      </PopoverContent>
                    </Popover>
                  </dt>
                  <dd className="font-semibold tabular-nums">2026.01</dd>
                </div>
              </dl>
              <div className="mt-2 border-t border-border pt-3">
                <Checkbox
                  label="세무정보 기록하기"
                  description="추후 업데이트 예정인 연말정산·종합소득세 신고 기능에서 활용할 정보를 미리 기록해 둘 수 있어요."
                  checked={taxEnabled}
                  disabled={!isOwner}
                  onCheckedChange={(checked) => {
                    const nextEnabled = checked === true;
                    setTaxRecordingEnabled(nextEnabled);
                    if (nextEnabled) {
                      void dialog
                        .alert({
                          title: '구성원별 세무 기록을 설정해 주세요',
                          description: '아래 참여 구성원·미참여 구성원 관리에서 근로자·부양가족·사업자 여부를 등록하면 알맞은 세무 항목이 열려요.'
                        })
                        .then(() => {
                          membersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    }
                  }}
                />
              </div>
            </section>
            <section ref={membersSectionRef} className={sectionClass}>
              <h2 className="mb-3 text-base font-bold">구성원</h2>
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="text-sm font-semibold whitespace-nowrap">
                      참여 구성원 <span className="text-primary tabular-nums">{participants.length}</span>
                    </h3>
                    {pending.length ? (
                      <button
                        type="button"
                        onClick={() => setPendingInvitesOpen(true)}
                        aria-label={`초대 대기 ${pending.length}명 보기`}
                        className="inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border-strong bg-muted/45 px-2 text-xs font-medium whitespace-nowrap text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <span>대기</span>
                        <span className="font-semibold text-primary tabular-nums">{pending.length}</span>
                      </button>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setInviteEmail('');
                      setInviteRole('구성원');
                      setInviteOpen(true);
                    }}
                  >
                    <Plus /> 초대
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <div
                    className={cn(
                      'hidden items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground md:grid',
                      taxEnabled ? 'md:grid-cols-[minmax(0,1fr)_5rem_10.5rem_4.25rem]' : 'md:grid-cols-[minmax(0,1fr)_5rem_4.25rem]'
                    )}
                  >
                    <span>구성원</span>
                    <span className="text-center">권한</span>
                    {taxEnabled ? <span className="text-center">세무 설정</span> : null}
                    <span className="sr-only">관리</span>
                  </div>
                  <div className="divide-y divide-border">
                    {participants.map((member) =>
                      renderManageRow({
                        rowKey: member.id,
                        label: member.name,
                        canManage: taxEnabled || (member.id !== 'me' && member.role !== '소유자'),
                        onManage: () => {
                          setEditMember(member);
                          setDraftRole(member.role);
                        },
                        className: cn(
                          'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 px-3 py-3',
                          taxEnabled ? 'md:grid-cols-[minmax(0,1fr)_5rem_10.5rem_4.25rem] md:gap-x-3' : 'md:grid-cols-[minmax(0,1fr)_5rem_4.25rem] md:gap-x-3'
                        ),
                        children: (action) => (
                          <>
                            <span className="flex min-w-0 items-center gap-3">
                              <MemberAvatar name={member.name} size="md" mode="icon-hover" className="!size-9 !text-sm" />
                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-sm">{member.name}</strong>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{member.email}</span>
                              </span>
                            </span>
                            <span className="col-span-full grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-2.5 md:contents">
                              <span className="text-[11px] font-medium whitespace-nowrap text-muted-foreground md:hidden">권한</span>
                              <span className="text-xs font-medium text-foreground md:text-center">{member.role}</span>
                              {taxEnabled ? (
                                <>
                                  <span className="text-[11px] font-medium whitespace-nowrap text-muted-foreground md:hidden">세무</span>
                                  <span className="flex flex-wrap items-center gap-1.5 md:justify-center">{renderTaxBadges(member.id === 'me' ? DESIGN_PROFILE_NAME : member.name)}</span>
                                </>
                              ) : null}
                            </span>
                            <span className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto">{action}</span>
                          </>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    미참여 구성원 <span className="text-muted-foreground tabular-nums">{outsiders.length}</span>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOutsiderName('');
                      setOutsiderOpen(true);
                    }}
                  >
                    <Plus /> 추가
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <div
                    className={cn(
                      'hidden items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground md:grid',
                      taxEnabled ? 'md:grid-cols-[minmax(0,1fr)_10.5rem_4.25rem]' : 'md:grid-cols-[minmax(0,1fr)_4.25rem]'
                    )}
                  >
                    <span>구성원</span>
                    {taxEnabled ? <span className="text-center">세무 설정</span> : null}
                    <span className="sr-only">관리</span>
                  </div>
                  <div className="divide-y divide-border">
                    {outsiders.map((person) => {
                      const linkedPending = pending.find((item) => item.linkedOutsider === person);
                      return renderManageRow({
                        rowKey: person,
                        label: person,
                        onManage: () => {
                          setEditOutsider(person);
                          setDraftOutsiderName(person);
                        },
                        className: cn(
                          'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 px-3 py-3',
                          taxEnabled ? 'md:grid-cols-[minmax(0,1fr)_10.5rem_4.25rem] md:gap-x-3' : 'md:grid-cols-[minmax(0,1fr)_4.25rem] md:gap-x-3'
                        ),
                        children: (action) => (
                          <>
                            <span className="flex min-w-0 items-center gap-3">
                              <MemberAvatar name={`${person} (미참여)`} size="md" mode="icon-hover" className="!size-9 !text-sm" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{person}</span>
                                {linkedPending ? <span className="block truncate text-xs text-primary">{linkedPending.email} 수락 시 연결 예정</span> : null}
                              </span>
                            </span>
                            {taxEnabled ? (
                              <span className="col-span-full grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 border-t border-border/60 pt-2.5 md:contents">
                                <span className="text-[11px] font-medium whitespace-nowrap text-muted-foreground md:hidden">세무</span>
                                <span className="flex flex-wrap items-center gap-1.5 md:justify-center">{renderTaxBadges(person)}</span>
                              </span>
                            ) : null}
                            <span className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto">{action}</span>
                          </>
                        )
                      });
                    })}
                  </div>
                </div>
              </div>
            </section>
            {isOwner ? (
              <section className={sectionClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold">가계부 삭제</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      const expectedPhrase = `${name} 삭제`;
                      const confirmedPhrase = await dialog.prompt({
                        title: '가계부를 삭제할까요?',
                        description: `확인을 위해 아래에 '${expectedPhrase}'를 입력해 주세요.`,
                        notice: '삭제한 가계부는 30일 이내에 복구를 요청할 수 있어요.',
                        label: '삭제 확인 문구',
                        placeholder: expectedPhrase,
                        confirmText: '삭제',
                        variant: 'destructive',
                        validate: (value) => (value.trim() === expectedPhrase ? null : `'${expectedPhrase}'를 정확히 입력해 주세요.`)
                      });
                      if (confirmedPhrase !== null) {
                        void dialog.alert({
                          title: '가계부가 삭제되었어요',
                          description: `${name} 가계부 삭제가 완료되었어요.`
                        });
                      }
                    }}
                  >
                    삭제
                  </Button>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>설정 메뉴</SheetTitle>
          </SheetHeader>
          <SheetBody className="gap-1 pb-3">
            {settingMenus.map((menu) => (
              <button
                key={menu.value}
                type="button"
                onClick={() => {
                  setTab(menu.value);
                  setMenuOpen(false);
                }}
                aria-current={tab === menu.value ? 'page' : undefined}
                className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <span className={tab === menu.value ? 'text-primary' : 'text-foreground'}>{menu.label}</span>
                {tab === menu.value ? <Check className="size-4 text-primary" aria-label="선택됨" /> : null}
              </button>
            ))}
          </SheetBody>
        </SheetContent>
      </Sheet>
      <Dialog open={editName} onOpenChange={setEditName}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>가계부 이름 수정</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <label className={labelClass} htmlFor="ledger-name">
              가계부 이름
            </label>
            <Input id="ledger-name" className="mt-2" maxLength={30} value={draftName} onChange={(event) => setDraftName(event.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditName(false)}>
              취소
            </Button>
            <Button
              disabled={!draftName.trim()}
              onClick={() => {
                setName(draftName.trim());
                setEditName(false);
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>구성원 초대</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div>
              <label className={labelClass} htmlFor="invite-email">
                이메일
              </label>
              <Input id="invite-email" className="mt-2" type="email" placeholder="이메일 주소" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
            </div>
            <div>
              <span className={labelClass}>역할</span>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="구성원">구성원</SelectItem>
                  <SelectItem value="관리자">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              취소
            </Button>
            <Button
              disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)}
              onClick={() => {
                setMembers((prev) => [...prev, { id: `invite-${Date.now()}`, name: '초대 대기', email: inviteEmail.trim(), role: inviteRole as Role, pending: true }]);
                setInviteOpen(false);
              }}
            >
              초대
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {renderResponsiveOverlay({
        open: Boolean(editMember),
        onClose: () => setEditMember(null),
        title: memberManageTitle,
        body: memberManageBody,
        footer: memberManageFooter,
        subView: memberBusinessSubView
      })}
      {renderResponsiveOverlay({
        open: Boolean(editOutsider),
        onClose: () => setEditOutsider(null),
        title: outsiderManageTitle,
        body: outsiderManageBody,
        footer: outsiderManageFooter,
        subView: outsiderBusinessSubView
      })}
      {renderResponsiveOverlay({
        open: pendingInvitesOpen,
        onClose: () => setPendingInvitesOpen(false),
        title: `초대 대기 ${pending.length}`,
        body: pending.length ? (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {pending.map((member) => (
              <div key={member.id} className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{member.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs text-muted-foreground">{member.role}</span>
                    {member.linkedOutsider ? <Badge variant="wine">{member.linkedOutsider} 연결 예정</Badge> : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:bg-destructive-tint hover:text-destructive"
                  onClick={() => {
                    setMembers((prev) => prev.filter((item) => item.id !== member.id));
                    if (pending.length <= 1) setPendingInvitesOpen(false);
                  }}
                >
                  초대 취소
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">대기 중인 초대가 없어요.</p>
        ),
        footer: (
          <Button variant="outline" onClick={() => setPendingInvitesOpen(false)}>
            닫기
          </Button>
        )
      })}
      {renderResponsiveOverlay({
        open: Boolean(linkOutsider),
        onClose: () => setLinkOutsider(null),
        title: linkOutsider ? `${linkOutsider} 계정 연결` : '계정 연결',
        body: outsiderLinkBody,
        footer: outsiderLinkFooter
      })}
      <Dialog open={outsiderOpen} onOpenChange={setOutsiderOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>미참여 구성원 추가</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <label className={labelClass} htmlFor="outsider-name">
              이름
            </label>
            <Input className="mt-2" id="outsider-name" value={outsiderName} onChange={(event) => setOutsiderName(event.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutsiderOpen(false)}>
              취소
            </Button>
            <Button
              disabled={!outsiderName.trim() || outsiders.includes(outsiderName.trim())}
              onClick={() => {
                setOutsiders((prev) => [...prev, outsiderName.trim()]);
                setOutsiderOpen(false);
              }}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DesignAppShell>
  );
};
