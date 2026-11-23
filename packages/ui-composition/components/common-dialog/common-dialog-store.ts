export type AlertDialogOptions = {
  title?: string;
  description: string;
  notice?: string;
  confirmText?: string;
};

export type ConfirmDialogOptions = {
  title?: string;
  description: string;
  notice?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  primaryAction?: 'confirm' | 'cancel';
};

export type PromptDialogOptions = {
  title: string;
  description?: string;
  notice?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  validate?: (value: string) => string | null | undefined | void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
};

export type CommonDialogRequest =
  | {
      id: number;
      kind: 'alert';
      title: string;
      description: string;
      notice?: string;
      confirmText: string;
      returnFocus: HTMLElement | null;
      resolve: () => void;
    }
  | {
      id: number;
      kind: 'confirm';
      title: string;
      description: string;
      notice?: string;
      confirmText: string;
      cancelText: string;
      variant: 'default' | 'destructive';
      primaryAction: 'confirm' | 'cancel';
      returnFocus: HTMLElement | null;
      resolve: (confirmed: boolean) => void;
    }
  | {
      id: number;
      kind: 'prompt';
      title: string;
      description?: string;
      notice?: string;
      label: string;
      placeholder?: string;
      defaultValue: string;
      maxLength?: number;
      validate?: (value: string) => string | null | undefined | void;
      confirmText: string;
      cancelText: string;
      variant: 'default' | 'destructive';
      returnFocus: HTMLElement | null;
      resolve: (value: string | null) => void;
    };

const queue: CommonDialogRequest[] = [];
const listeners = new Set<() => void>();
let nextId = 0;
let hostCount = 0;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const getReturnFocusTarget = (): HTMLElement | null => {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (active?.closest('[role="dialog"], [role="alertdialog"], dialog')) {
    return queue[0]?.returnFocus ?? null;
  }
  return active;
};

const resolveRequest = (request: CommonDialogRequest, result: boolean | string | null | undefined) => {
  if (request.kind === 'alert') {
    request.resolve();
    return;
  }
  if (request.kind === 'confirm') {
    request.resolve(Boolean(result));
    return;
  }
  request.resolve(typeof result === 'string' ? result : null);
};

/** 클라이언트 이벤트에서 호출하며, 확인을 누르거나 닫힌 뒤 완료됩니다. */
export const alertDialog = (input: string | AlertDialogOptions): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('다이얼로그는 클라이언트에서 호출해 주세요.'));
  }
  const options: AlertDialogOptions = typeof input === 'string' ? { description: input } : input;
  const returnFocus = getReturnFocusTarget();

  return new Promise<void>((resolve) => {
    queue.push({
      id: ++nextId,
      kind: 'alert',
      title: options.title?.trim() || '알림',
      description: options.description,
      notice: options.notice?.trim() || undefined,
      confirmText: options.confirmText?.trim() || '확인',
      returnFocus,
      resolve
    });
    notify();
  });
};

/** 확인은 true, 취소·Escape·호스트 언마운트는 false를 반환합니다. */
export const confirmDialog = (input: string | ConfirmDialogOptions): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('다이얼로그는 클라이언트에서 호출해 주세요.'));
  }
  const options: ConfirmDialogOptions = typeof input === 'string' ? { description: input } : input;
  const returnFocus = getReturnFocusTarget();

  return new Promise<boolean>((resolve) => {
    queue.push({
      id: ++nextId,
      kind: 'confirm',
      title: options.title?.trim() || '확인',
      description: options.description,
      notice: options.notice?.trim() || undefined,
      confirmText: options.confirmText?.trim() || '확인',
      cancelText: options.cancelText?.trim() || '취소',
      variant: options.variant ?? 'default',
      primaryAction: options.primaryAction ?? 'confirm',
      returnFocus,
      resolve
    });
    notify();
  });
};

/** 제출은 입력 문자열, 취소·Escape·호스트 언마운트는 null을 반환합니다. */
export const promptDialog = (options: PromptDialogOptions): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('다이얼로그는 클라이언트에서 호출해 주세요.'));
  }
  const returnFocus = getReturnFocusTarget();
  const title = options.title.trim();

  return new Promise<string | null>((resolve) => {
    queue.push({
      id: ++nextId,
      kind: 'prompt',
      title,
      description: options.description?.trim() || undefined,
      notice: options.notice?.trim() || undefined,
      label: options.label?.trim() || title,
      placeholder: options.placeholder,
      defaultValue: options.defaultValue ?? '',
      maxLength: options.maxLength,
      validate: options.validate,
      confirmText: options.confirmText?.trim() || '확인',
      cancelText: options.cancelText?.trim() || '취소',
      variant: options.variant ?? 'default',
      returnFocus,
      resolve
    });
    notify();
  });
};

export const dialog = {
  alert: alertDialog,
  confirm: confirmDialog,
  prompt: promptDialog
};

export const commonDialogStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): CommonDialogRequest | null => queue[0] ?? null,
  getServerSnapshot: (): CommonDialogRequest | null => null,
  respond: (id: number, result?: boolean | string | null) => {
    if (queue[0]?.id !== id) {
      return;
    }
    const request = queue.shift()!;
    notify();
    resolveRequest(request, result);
  },
  attachHost: () => {
    hostCount += 1;
    return () => {
      hostCount -= 1;
      // React StrictMode의 일시적 cleanup·재마운트에서 대기 중인 요청을 취소하지 않습니다.
      queueMicrotask(() => {
        if (hostCount > 0) {
          return;
        }
        const pending = queue.splice(0);
        if (pending.length === 0) {
          return;
        }
        notify();
        pending.forEach((request) => resolveRequest(request, null));
      });
    };
  }
};
