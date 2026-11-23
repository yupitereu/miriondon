'use client';

import { ProfileAvatar, type ProfileAvatarColor } from '@repo/ui-composition';
import { cn } from '@repo/ui-core';

import { resolveMemberAvatarSpec, usePersonalProfile } from '@/shared/design-personal-businesses';

const AVATAR_SIZE_CLASS = {
  xs: 'size-4 text-[9px]',
  sm: 'size-5 text-[10px]',
  md: 'size-6 text-xs'
} as const;

export type MemberAvatarSize = keyof typeof AVATAR_SIZE_CLASS;
export type MemberAvatarMode = 'icon-label' | 'icon-hover' | 'icon-interactive';

export const MemberAvatar = ({
  name,
  label,
  size = 'sm',
  mode = 'icon-label',
  colorOverride,
  srcOverride,
  onColorChange,
  onImageChange,
  className,
  labelClassName
}: {
  name: string;
  label?: string;
  size?: MemberAvatarSize;
  mode?: MemberAvatarMode;
  colorOverride?: ProfileAvatarColor;
  srcOverride?: string | null;
  onColorChange?: (color: ProfileAvatarColor) => void;
  onImageChange?: (src: string | null) => void;
  className?: string;
  labelClassName?: string;
}) => {
  const profile = usePersonalProfile();
  const spec = resolveMemberAvatarSpec(name, profile);
  const displayLabel = label ?? spec.displayName;
  const color = colorOverride ?? spec.color;
  const src = srcOverride !== undefined ? srcOverride : spec.src;
  const sizeClass = AVATAR_SIZE_CLASS[size];
  const variant = spec.isNonMember ? 'non-member' : 'member';

  if (mode === 'icon-hover') {
    return <ProfileAvatar name={displayLabel} src={src} color={color} variant={variant} showNameOnHover className={cn(sizeClass, className)} />;
  }

  if (mode === 'icon-interactive') {
    return (
      <ProfileAvatar
        name={displayLabel}
        src={src}
        color={color}
        variant={variant}
        showNameOnInteraction
        onColorChange={onColorChange}
        onImageChange={onImageChange}
        className={cn(sizeClass, className)}
      />
    );
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <ProfileAvatar name={spec.avatarName} src={src} color={color} variant={variant} className={sizeClass} />
      <span className={cn('min-w-0 truncate', labelClassName)}>{displayLabel}</span>
    </span>
  );
};

export const MemberAvatarGroup = ({ names, size = 'sm', className }: { names: readonly string[]; size?: MemberAvatarSize; className?: string }) => (
  <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
    {names.map((person) => (
      <MemberAvatar key={person} name={person} size={size} mode="icon-hover" />
    ))}
  </span>
);
