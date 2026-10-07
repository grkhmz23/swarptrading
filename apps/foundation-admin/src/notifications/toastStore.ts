import type { NotificationProvider, OpenNotificationParams } from "@refinedev/core";

export type ToastType = OpenNotificationParams["type"];

export interface Toast {
  key: string;
  type: ToastType;
  message: string;
  description?: string;
  cancelMutation?: () => void;
  /** Seconds remaining for "progress" (undoable) notifications. */
  undoableTimeout?: number;
}

type Listener = (toasts: readonly Toast[]) => void;

const DISMISS_AFTER_MS: Record<ToastType, number> = {
  success: 4000,
  error: 8000,
  progress: 0, // closed by Refine via close(key) when the undo window ends
};

const MAX_VISIBLE = 5;

let toasts: readonly Toast[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let counter = 0;

const emit = () => {
  for (const listener of listeners) listener(toasts);
};

const clearTimer = (key: string) => {
  const timer = timers.get(key);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(key);
  }
};

export const dismissToast = (key: string): void => {
  clearTimer(key);
  const next = toasts.filter((toast) => toast.key !== key);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
};

export const showToast = (params: OpenNotificationParams): string => {
  const key = params.key ?? `toast-${++counter}`;
  const toast: Toast = {
    key,
    type: params.type,
    message: params.message,
    description: params.description,
    cancelMutation: params.cancelMutation,
    undoableTimeout: params.undoableTimeout,
  };

  // Collapse duplicates: same key, or an identical error already on screen
  // (e.g. several requests failing with the same 403 at once).
  const isDuplicate = (existing: Toast) =>
    existing.key === key ||
    (existing.type === toast.type &&
      existing.type === "error" &&
      (existing.description ?? existing.message) === (toast.description ?? toast.message));

  for (const existing of toasts) {
    if (isDuplicate(existing)) clearTimer(existing.key);
  }
  toasts = [...toasts.filter((existing) => !isDuplicate(existing)), toast].slice(-MAX_VISIBLE);

  const dismissAfter = DISMISS_AFTER_MS[toast.type];
  if (dismissAfter > 0) {
    timers.set(key, setTimeout(() => dismissToast(key), dismissAfter));
  }

  emit();
  return key;
};

export const subscribeToasts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getToasts = (): readonly Toast[] => toasts;

export const notificationProvider: NotificationProvider = {
  open: (params) => {
    showToast(params);
  },
  close: (key) => {
    dismissToast(key);
  },
};
