'use client';

import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, NoticeBox } from '@repo/ui-core';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type SubmitEvent } from 'react';

import { commonDialogStore, type CommonDialogRequest } from './common-dialog-store';

type CommonDialogViewProps = {
  request: CommonDialogRequest;
};

const CommonDialogView = ({ request }: CommonDialogViewProps) => {
  const inputId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const [inputValue, setInputValue] = useState(() => (request.kind === 'prompt' ? request.defaultValue : ''));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (commonDialogStore.getSnapshot() !== null) {
        return;
      }
      queueMicrotask(() => {
        if (request.returnFocus?.isConnected) {
          request.returnFocus.focus();
        }
      });
    };
  }, [request]);

  const finish = (result?: boolean | string | null) => {
    commonDialogStore.respond(request.id, result);
  };

  const handleDismiss = () => {
    if (request.kind === 'alert') {
      finish(undefined);
      return;
    }
    if (request.kind === 'confirm') {
      finish(false);
      return;
    }
    finish(null);
  };

  const handlePromptSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.kind !== 'prompt') {
      return;
    }
    const validationError = request.validate?.(inputValue);
    if (typeof validationError === 'string' && validationError.trim().length > 0) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }
    finish(inputValue);
  };

  const confirmVariant = request.kind === 'confirm' && request.variant === 'destructive' ? 'destructive' : request.kind === 'confirm' && request.primaryAction === 'cancel' ? 'outline' : 'primary';

  const contentBody = (
    <>
      <DialogHeader className="pr-0">
        <DialogTitle className="break-keep">{request.title}</DialogTitle>
      </DialogHeader>

      {request.description || request.kind === 'prompt' || request.notice ? (
        <DialogBody>
          {request.description ? (
            <DialogDescription id={descriptionId} className="whitespace-pre-wrap">
              {request.description}
            </DialogDescription>
          ) : null}

          {request.kind === 'prompt' ? (
            <div>
              <label htmlFor={inputId} className="sr-only">
                {request.label}
              </label>
              <Input
                ref={inputRef}
                id={inputId}
                value={inputValue}
                placeholder={request.placeholder}
                maxLength={request.maxLength}
                error={error ?? undefined}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
              />
            </div>
          ) : null}

          {request.notice ? (
            <NoticeBox variant="info" icon={null}>
              {request.notice}
            </NoticeBox>
          ) : null}
        </DialogBody>
      ) : null}

      <DialogFooter className="w-full">
        {request.kind === 'alert' ? (
          <Button ref={confirmButtonRef} type="button" variant="primary" size="lg" className="flex-1" onClick={() => finish(undefined)}>
            {request.confirmText}
          </Button>
        ) : request.kind === 'confirm' ? (
          <>
            <Button ref={cancelButtonRef} type="button" variant={request.primaryAction === 'cancel' ? 'primary' : 'outline'} size="lg" className="flex-1" onClick={() => finish(false)}>
              {request.cancelText}
            </Button>
            <Button ref={confirmButtonRef} type="button" variant={confirmVariant} size="lg" className="flex-1" onClick={() => finish(true)}>
              {request.confirmText}
            </Button>
          </>
        ) : (
          <>
            <Button ref={cancelButtonRef} type="button" variant="outline" size="lg" className="flex-1" onClick={() => finish(null)}>
              {request.cancelText}
            </Button>
            <Button ref={confirmButtonRef} type="submit" variant={request.variant === 'destructive' ? 'destructive' : 'primary'} size="lg" className="flex-1">
              {request.confirmText}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          handleDismiss();
        }
      }}
    >
      <DialogContent
        role={request.kind === 'alert' ? 'alertdialog' : 'dialog'}
        showCloseButton={false}
        aria-describedby={request.description ? descriptionId : undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (request.kind === 'prompt') {
            inputRef.current?.focus();
            return;
          }
          if (request.kind === 'confirm' && (request.variant === 'destructive' || request.primaryAction === 'cancel')) {
            cancelButtonRef.current?.focus();
            return;
          }
          confirmButtonRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        {request.kind === 'prompt' ? (
          <form onSubmit={handlePromptSubmit} className="flex flex-col gap-3">
            {contentBody}
          </form>
        ) : (
          contentBody
        )}
      </DialogContent>
    </Dialog>
  );
};

export const CommonDialogHost = () => {
  const request = useSyncExternalStore(commonDialogStore.subscribe, commonDialogStore.getSnapshot, commonDialogStore.getServerSnapshot);

  useEffect(() => commonDialogStore.attachHost(), []);

  return request ? <CommonDialogView key={request.id} request={request} /> : null;
};
