'use client';

import { Button, Popover, PopoverContent, PopoverTrigger, Tooltip, TooltipContent, TooltipTrigger, cn } from '@repo/ui-core';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

export const PROFILE_AVATAR_COLORS = [
  { id: 'wine', label: '와인', backgroundColor: '#7D3576' },
  { id: 'rose', label: '로즈', backgroundColor: '#C93B62' },
  { id: 'coral', label: '살구', backgroundColor: '#F4A986' },
  { id: 'amber', label: '버터', backgroundColor: '#F2C94C' },
  { id: 'mint', label: '민트', backgroundColor: '#7ED6BE' },
  { id: 'teal', label: '틸', backgroundColor: '#0F766E' },
  { id: 'sky', label: '스카이', backgroundColor: '#89C4F4' },
  { id: 'indigo', label: '인디고', backgroundColor: '#4F56C2' },
  { id: 'lavender', label: '라벤더', backgroundColor: '#C5A7E0' },
  { id: 'stone', label: '스톤', backgroundColor: '#D8CFCB' },
  { id: 'white', label: '화이트', backgroundColor: '#FFFFFF' },
  { id: 'black', label: '블랙', backgroundColor: '#1C1618' }
] as const;

export type ProfileAvatarColor = (typeof PROFILE_AVATAR_COLORS)[number]['id'];

const DEFAULT_PROFILE_AVATAR_PRESET = PROFILE_AVATAR_COLORS[0];

const toLinearChannel = (hex: string, start: number): number => {
  const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** Computes WCAG relative luminance of a hex background and returns high-contrast foreground text color. */
export const getProfileAvatarContrastColor = (hexBackground: string): '#FFFFFF' | '#1C1618' => {
  const normalized = hexBackground.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return '#FFFFFF';
  }
  const r = toLinearChannel(normalized, 0);
  const g = toLinearChannel(normalized, 2);
  const b = toLinearChannel(normalized, 4);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.2 ? '#1C1618' : '#FFFFFF';
};

export const resolveProfileAvatarPreset = (color?: ProfileAvatarColor): { id: ProfileAvatarColor; label: string; backgroundColor: string; textColor: '#FFFFFF' | '#1C1618' } => {
  const found = PROFILE_AVATAR_COLORS.find((item) => item.id === color) ?? DEFAULT_PROFILE_AVATAR_PRESET;
  return {
    ...found,
    textColor: getProfileAvatarContrastColor(found.backgroundColor)
  };
};

export const ProfileAvatarColorPicker = ({ value, onChange, className }: { value: ProfileAvatarColor; onChange: (color: ProfileAvatarColor) => void; className?: string }) => {
  return (
    <div role="radiogroup" aria-label="프로필 배경색 선택" className={cn('grid grid-cols-4 gap-1', className)}>
      {PROFILE_AVATAR_COLORS.map((option) => {
        const selected = option.id === value;
        const textColor = getProfileAvatarContrastColor(option.backgroundColor);
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${option.label} 배경색`}
            title={option.label}
            onClick={() => onChange(option.id)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-full ring-1 ring-inset ring-foreground/15 transition-transform',
                selected && 'scale-105 ring-2 ring-foreground ring-offset-2 ring-offset-popover'
              )}
              style={{ backgroundColor: option.backgroundColor, color: textColor }}
            >
              {selected ? <Check aria-hidden="true" className="size-4 stroke-[2.5]" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const ProfileAvatar = ({
  name,
  src,
  color = 'wine',
  variant = 'member',
  showNameOnInteraction = false,
  showNameOnHover = false,
  onColorChange,
  onImageChange,
  className
}: {
  name: string;
  src?: string | null;
  color?: ProfileAvatarColor;
  variant?: 'member' | 'non-member';
  showNameOnInteraction?: boolean;
  showNameOnHover?: boolean;
  onColorChange?: (color: ProfileAvatarColor) => void;
  onImageChange?: (src: string | null) => void;
  className?: string;
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const image = src && src !== failedSrc ? src : null;
  const preset = resolveProfileAvatarPreset(color);
  const initial = Array.from(name.trim())[0] || '?';
  const hasSettings = Boolean(onColorChange || onImageChange);
  const isNonMember = variant === 'non-member';
  const nonMemberInkColor = preset.textColor === '#FFFFFF' ? preset.backgroundColor : `color-mix(in srgb, ${preset.backgroundColor} 58%, #1C1618)`;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onImageChange) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFailedSrc(null);
        onImageChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderCircle = (circleClassName?: string) => (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold',
        isNonMember ? 'border-[1.5px] border-dashed' : 'ring-1 ring-inset ring-foreground/15',
        circleClassName
      )}
      style={
        isNonMember
          ? {
              backgroundColor: `color-mix(in srgb, ${preset.backgroundColor} 14%, transparent)`,
              borderColor: nonMemberInkColor,
              color: nonMemberInkColor
            }
          : { backgroundColor: preset.backgroundColor, color: preset.textColor }
      }
      aria-hidden="true"
    >
      {image ? <img src={image} alt="" className="size-full object-cover" onError={() => setFailedSrc(image)} /> : initial}
    </span>
  );

  if (!showNameOnInteraction) {
    if (showNameOnHover) {
      return (
        <Tooltip delayDuration={120}>
          <TooltipTrigger asChild>
            <span role="img" aria-label={name} className="inline-flex shrink-0 align-middle">
              {renderCircle(className)}
            </span>
          </TooltipTrigger>
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <span role="img" aria-label={name} className="inline-flex shrink-0 align-middle">
        {renderCircle(className)}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={120} open={open ? false : undefined}>
      <Popover open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${name} 프로필`}
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {renderCircle(className)}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <PopoverContent align="center" className={cn(hasSettings ? 'w-auto p-3' : 'px-3 py-1.5 text-xs font-medium')} onOpenAutoFocus={(event) => event.preventDefault()}>
          {hasSettings ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                {renderCircle('size-8 text-xs')}
                <div className="min-w-0 flex flex-col">
                  <span className="truncate text-xs font-bold text-foreground">{name}</span>
                  <span className="text-[11px] text-muted-foreground">{image ? '프로필 사진' : `배경색 · ${preset.label}`}</span>
                </div>
              </div>
              {onColorChange ? <ProfileAvatarColorPicker value={preset.id} onChange={onColorChange} /> : null}
              {onImageChange ? (
                <div className="flex items-center gap-1.5 border-t border-border/70 pt-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} aria-label={`${name} 프로필 사진 업로드`} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-1 px-2 text-xs">
                    <ImagePlus className="size-3.5" />
                    <span>{image ? '사진 변경' : '사진 등록'}</span>
                  </Button>
                  {image ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onImageChange(null)} aria-label="프로필 사진 제거" className="gap-1 px-2 text-xs text-muted-foreground">
                      <Trash2 className="size-3.5" />
                      <span>제거</span>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            name
          )}
        </PopoverContent>
      </Popover>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
};
