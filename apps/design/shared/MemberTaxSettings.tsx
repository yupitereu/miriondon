'use client';

import { dialog } from '@repo/ui-composition';
import { Badge, Button, Input, Popover, PopoverContent, PopoverTrigger, Switch, cn } from '@repo/ui-core';
import { ArrowLeft, Building2, CircleHelp, Plus } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import {
  formatBusinessNumber,
  updateMemberTaxStatus,
  updatePersonalBusinesses,
  useMemberTaxStatus,
  usePersonalBusinesses,
  type PersonalBusiness,
  type PersonalTaxStatus
} from '@/shared/design-personal-businesses';
import { showValidationAlert } from '@/shared/design-validation';

export interface MemberBusinessSubView {
  editing: boolean;
  openAdd: () => void;
  openEdit: (business: PersonalBusiness) => void;
  reset: () => void;
  titleContent: ReactNode;
  bodyContent: ReactNode;
  footerContent: ReactNode;
}

export const useMemberBusinessSubView = (owner: string | null): MemberBusinessSubView => {
  const targetOwner = owner ?? '';
  const taxStatus = useMemberTaxStatus(targetOwner);
  const businesses = usePersonalBusinesses().filter((item) => item.owner === targetOwner);
  const [editor, setEditor] = useState<{ id?: string; name: string; businessNumber: string; active: boolean } | null>(null);
  const [prevOwner, setPrevOwner] = useState(owner);
  const [invalidName, setInvalidName] = useState(false);
  const [invalidNumber, setInvalidNumber] = useState(false);
  const formId = useId();
  const nameId = useId();
  const businessNumberId = useId();

  if (prevOwner !== owner) {
    setPrevOwner(owner);
    setEditor(null);
    setInvalidName(false);
    setInvalidNumber(false);
  }

  const openEditor = (next: typeof editor) => {
    setInvalidName(false);
    setInvalidNumber(false);
    setEditor(next);
  };
  const reset = () => openEditor(null);
  const openAdd = () => openEditor({ name: '', businessNumber: '', active: true });
  const openEdit = (business: PersonalBusiness) => openEditor({ id: business.id, name: business.name, businessNumber: business.businessNumber ?? '', active: business.active });

  const save = () => {
    if (!editor || !owner) return;
    const name = editor.name.trim();
    const digits = editor.businessNumber.replace(/\D/g, '');
    const businessNumber = formatBusinessNumber(digits);
    const nameError = !name ? '사업자명을 입력해 주세요.' : businesses.some((item) => item.id !== editor.id && item.name.toLowerCase() === name.toLowerCase()) ? '같은 이름의 사업자가 있어요.' : '';
    const numberError =
      digits.length !== 10 ? '사업자 번호 10자리를 입력해 주세요.' : businesses.some((item) => item.id !== editor.id && item.businessNumber === businessNumber) ? '같은 사업자 번호가 있어요.' : '';
    if (nameError || numberError) {
      setInvalidName(Boolean(nameError));
      setInvalidNumber(Boolean(numberError));
      void showValidationAlert([nameError, numberError].filter(Boolean));
      return;
    }
    updatePersonalBusinesses((items) =>
      editor.id
        ? items.map((item) => (item.id === editor.id && item.owner === owner ? { ...item, name, businessNumber, active: editor.active } : item))
        : [...items, { id: crypto.randomUUID(), owner, name, businessNumber, active: true }]
    );
    if ((!editor.id || editor.active) && taxStatus === 'dependent') updateMemberTaxStatus(owner, 'none');
    reset();
  };

  const removeBusiness = async (business: PersonalBusiness) => {
    if (!owner) return;
    const confirmed = await dialog.confirm({
      title: '사업자 정보를 삭제할까요?',
      description: `${business.name}${business.businessNumber ? ` (${business.businessNumber})` : ''} 정보를 영구 삭제해요.`,
      notice: '이미 연결된 수입 내역이 있으면 사업자 지정이 해제돼요.',
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'destructive'
    });
    if (!confirmed) return;
    if (editor?.id === business.id) reset();
    updatePersonalBusinesses((items) => items.filter((item) => !(item.id === business.id && item.owner === owner)));
  };

  const editingBusiness = editor?.id ? businesses.find((item) => item.id === editor.id) : undefined;
  const titleContent = (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="돌아가기"
        className="-ml-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={reset}
      >
        <ArrowLeft className="size-4" />
      </button>
      <span>{editingBusiness ? '개인사업자 수정' : '개인사업자 등록'}</span>
    </span>
  );
  const bodyContent = editor ? (
    <form
      id={formId}
      className="grid min-w-0 gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="grid gap-1.5">
        <label htmlFor={nameId} className="text-xs font-semibold">
          사업자명
        </label>
        <Input
          id={nameId}
          maxLength={80}
          invalid={invalidName}
          value={editor.name}
          onChange={(event) => {
            setInvalidName(false);
            setEditor({ ...editor, name: event.target.value });
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={businessNumberId} className="text-xs font-semibold">
          사업자 번호
        </label>
        <Input
          id={businessNumberId}
          inputMode="numeric"
          maxLength={12}
          placeholder="000-00-00000"
          value={editor.businessNumber}
          invalid={invalidNumber}
          className="tabular-nums"
          onChange={(event) => {
            setInvalidNumber(false);
            setEditor({ ...editor, businessNumber: formatBusinessNumber(event.target.value) });
          }}
        />
      </div>
      {editingBusiness ? <Switch checked={editor.active} onCheckedChange={(active) => setEditor({ ...editor, active })} label={editor.active ? '사용 중' : '사용 중지'} /> : null}
    </form>
  ) : null;
  const footerContent = editor ? (
    <>
      {editingBusiness ? (
        <Button type="button" variant="ghost" className="mr-auto text-destructive hover:bg-destructive-tint hover:text-destructive" onClick={() => void removeBusiness(editingBusiness)}>
          삭제
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={reset}>
        취소
      </Button>
      <Button type="submit" form={formId}>
        저장
      </Button>
    </>
  ) : null;

  return {
    editing: Boolean(editor),
    openAdd,
    openEdit,
    reset,
    titleContent,
    bodyContent,
    footerContent
  };
};

export const MemberTaxSettings = ({ owner, onAddBusiness, onEditBusiness }: { owner: string; onAddBusiness: () => void; onEditBusiness: (business: PersonalBusiness) => void }) => {
  const taxStatus = useMemberTaxStatus(owner);
  const businesses = usePersonalBusinesses().filter((item) => item.owner === owner);
  const sectionId = useId();
  const taxProfileSectionId = useId();

  return (
    <section className="grid min-w-0 gap-3 border-t border-border pt-3">
      <h3 className="text-sm font-bold text-foreground">세무 기록 설정</h3>
      <div className="grid min-w-0 gap-3.5 rounded-xl border border-border bg-muted/30 p-3.5">
        <section aria-labelledby={taxProfileSectionId} className="grid min-w-0 gap-2">
          <div className="flex items-center gap-1">
            <h4 id={taxProfileSectionId} className="text-xs font-semibold">
              근로자 · 부양가족 구분
            </h4>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="근로자 · 부양가족 구분 안내"
                  className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                >
                  <CircleHelp className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(19rem,calc(100vw-2rem))] space-y-2 p-3 text-xs leading-relaxed break-keep">
                <p>
                  <strong>근로자</strong>: 올해 본인의 근로소득이 있는 경우예요.
                </p>
                <div className="space-y-1">
                  <p>
                    <strong>근로자의 부양가족</strong>: 연 소득금액 100만 원 이하(근로소득만 있으면 총급여 500만 원 이하)이면서 근로자의 가족이에요.
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                    <li>배우자 · 장애인: 나이 제한 없음</li>
                    <li>직계존속(부모 등): 만 60세 이상</li>
                    <li>직계비속·형제자매(자녀 등): 만 20세 이하</li>
                  </ul>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div role="radiogroup" aria-labelledby={taxProfileSectionId} className="grid gap-1.5">
            {(
              [
                { value: 'none', label: '해당 없음' },
                { value: 'worker', label: '근로자' },
                ...(businesses.some((item) => item.active) ? [] : [{ value: 'dependent' as const, label: '근로자의 부양가족' }])
              ] satisfies readonly { value: PersonalTaxStatus; label: string }[]
            ).map((option) => {
              const selected = taxStatus === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updateMemberTaxStatus(owner, option.value)}
                  className={cn(
                    'flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    selected ? 'border-primary bg-primary-tint/45' : 'border-border bg-card hover:bg-accent/50'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary' : 'border-border-strong bg-background')}
                    >
                      {selected ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
                    </span>
                    <span className="min-w-0 text-sm font-medium text-foreground">{option.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby={sectionId} className="grid min-w-0 gap-2.5 border-t border-border pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <h4 id={sectionId} className="text-xs font-semibold">
              개인사업자
            </h4>
            <Button type="button" size="sm" variant="outline" onClick={onAddBusiness}>
              <Plus className="size-4" /> 사업자 정보 추가
            </Button>
          </div>
          {businesses.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {businesses.map((business) => (
                <li key={business.id} className="flex min-w-0 items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {!business.active ? (
                      <Badge variant="neutral" className="w-fit">
                        사용 중지
                      </Badge>
                    ) : null}
                    <span className="min-w-0 text-sm font-medium wrap-anywhere">{business.name}</span>
                    {business.businessNumber ? <span className="text-xs text-muted-foreground tabular-nums">{business.businessNumber}</span> : null}
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="shrink-0" aria-label={`${business.name} 수정`} onClick={() => onEditBusiness(business)}>
                    수정
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-w-0 items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-background/70 px-3 py-3 text-center">
              <Building2 className="size-4 shrink-0 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">등록된 사업자가 없어요</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};
