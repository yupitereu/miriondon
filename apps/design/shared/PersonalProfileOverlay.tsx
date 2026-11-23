'use client';

import {
  ProfileAvatar,
  ProfileAvatarColorPicker,
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  type ProfileAvatarColor
} from '@repo/ui-composition';
import { Button, Input, useIsMobileView } from '@repo/ui-core';
import { ImagePlus, Pencil, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';

import { MemberTaxSettings, useMemberBusinessSubView } from '@/shared/MemberTaxSettings';
import { DESIGN_PROFILE_NAME, updatePersonalProfile, usePersonalProfile } from '@/shared/design-personal-businesses';

export const PersonalProfileOverlay = ({ onClose }: { onClose: () => void }) => {
  const isMobile = useIsMobileView();
  const [open, setOpen] = useState(true);
  const businessSubView = useMemberBusinessSubView(DESIGN_PROFILE_NAME);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);
  const handleMobileClose = () => {
    if (!open) return;
    setOpen(false);
    closeTimerRef.current = setTimeout(onClose, 220);
  };

  const profile = usePersonalProfile();
  const [profileEditor, setProfileEditor] = useState<{ name: string; email: string; avatarColor: ProfileAvatarColor; avatarSrc: string | null } | null>(null);
  const [profileError, setProfileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const profileNameId = useId();
  const profileEmailId = useId();
  const profileSectionId = useId();

  const openProfileEdit = () => {
    setProfileError('');
    setEmailError('');
    setProfileEditor({ name: profile.name, email: profile.email, avatarColor: profile.avatarColor, avatarSrc: profile.avatarSrc });
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profileEditor) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileEditor((prev) => (prev ? { ...prev, avatarSrc: reader.result as string } : prev));
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!profileEditor) return;
    const trimmedName = profileEditor.name.trim();
    if (!trimmedName) return setProfileError('이름을 입력해 주세요.');
    const trimmedEmail = profileEditor.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setEmailError('올바른 이메일 주소를 입력해 주세요.');
    updatePersonalProfile((current) => ({
      ...current,
      name: trimmedName,
      email: trimmedEmail,
      avatarColor: profileEditor.avatarColor,
      avatarSrc: profileEditor.avatarSrc
    }));
    setProfileError('');
    setEmailError('');
    setProfileEditor(null);
  };

  const previewName = (profileEditor?.name ?? profile.name) || profile.name;
  const previewSrc = profileEditor ? profileEditor.avatarSrc : profile.avatarSrc;
  const previewColor = profileEditor ? profileEditor.avatarColor : profile.avatarColor;

  const content = (
    <div className="grid min-w-0 gap-4">
      <section aria-labelledby={profileSectionId} className="grid min-w-0 gap-2.5">
        {profileEditor ? (
          <form
            className="grid min-w-0 gap-2.5 rounded-lg border border-border bg-background p-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile();
            }}
          >
            <h3 id={profileSectionId} className="text-sm font-bold">
              프로필 수정
            </h3>

            <div className="flex justify-center">
              <div className="relative shrink-0">
                <input ref={avatarFileRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarFileChange} aria-label="프로필 사진 업로드" />
                <button
                  type="button"
                  aria-label={profileEditor.avatarSrc ? '프로필 사진 변경' : '프로필 사진 선택'}
                  onClick={() => avatarFileRef.current?.click()}
                  className="group relative inline-flex cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ProfileAvatar name={previewName} src={previewSrc} color={previewColor} className="size-14 text-base" />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <ImagePlus className="size-4.5" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-0.5 -bottom-0.5 inline-flex size-5 items-center justify-center rounded-full border border-border-strong bg-surface-elevated text-foreground shadow-sm"
                  >
                    <ImagePlus className="size-3" />
                  </span>
                </button>
                {profileEditor.avatarSrc ? (
                  <button
                    type="button"
                    aria-label="사진 제거"
                    onClick={() => setProfileEditor({ ...profileEditor, avatarSrc: null })}
                    className="absolute -top-0.5 -right-0.5 inline-flex size-5 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface-elevated text-foreground shadow-sm transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-semibold">프로필 색상</span>
              <ProfileAvatarColorPicker value={profileEditor.avatarColor} onChange={(avatarColor) => setProfileEditor({ ...profileEditor, avatarColor, avatarSrc: null })} />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor={profileNameId} className="text-xs font-semibold">
                내 이름
              </label>
              <Input
                id={profileNameId}
                required
                maxLength={30}
                value={profileEditor.name}
                error={profileError || undefined}
                onChange={(event) => {
                  if (profileError) setProfileError('');
                  setProfileEditor({ ...profileEditor, name: event.target.value });
                }}
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor={profileEmailId} className="text-xs font-semibold">
                이메일
              </label>
              <Input
                id={profileEmailId}
                type="email"
                required
                maxLength={120}
                value={profileEditor.email}
                error={emailError || undefined}
                onChange={(event) => {
                  if (emailError) setEmailError('');
                  setProfileEditor({ ...profileEditor, email: event.target.value });
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setProfileError('');
                  setEmailError('');
                  setProfileEditor(null);
                }}
              >
                취소
              </Button>
              <Button type="submit" size="sm">
                저장
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ProfileAvatar name={previewName} src={previewSrc} color={previewColor} className="size-10 shrink-0 text-sm" />
              <div className="min-w-0">
                <h3 id={profileSectionId} className="truncate text-sm font-bold text-foreground">
                  {previewName}
                </h3>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={openProfileEdit}>
              <Pencil className="size-3.5" /> 프로필 수정
            </Button>
          </div>
        )}
      </section>

      <MemberTaxSettings owner={DESIGN_PROFILE_NAME} onAddBusiness={businessSubView.openAdd} onEditBusiness={businessSubView.openEdit} />
    </div>
  );

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (isMobile) handleMobileClose();
          else onClose();
        }
      }}
    >
      <ResponsiveOverlayContent aria-describedby={undefined}>
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>{businessSubView.editing ? businessSubView.titleContent : '내 정보'}</ResponsiveOverlayTitle>
        </ResponsiveOverlayHeader>
        <ResponsiveOverlayBody dialogClassName="max-h-[calc(100dvh-11rem)]">{businessSubView.editing ? businessSubView.bodyContent : content}</ResponsiveOverlayBody>
        {businessSubView.editing ? <ResponsiveOverlayFooter sheetClassName="flex-wrap">{businessSubView.footerContent}</ResponsiveOverlayFooter> : null}
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
};
