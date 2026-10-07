import { useSyncExternalStore } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { dismissToast, getToasts, subscribeToasts, type Toast } from "./toastStore";

const typeStyles: Record<Toast["type"], string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-900",
  progress: "border-slate-300 bg-white text-slate-900",
};

const TypeIcon = ({ type }: { type: Toast["type"] }) => {
  if (type === "success") return <CheckCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />;
  if (type === "error") return <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />;
  return <ArrowPathIcon className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />;
};

export const Toaster = () => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.key}
          role={toast.type === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-md border p-4 shadow-lg",
            typeStyles[toast.type],
          )}
        >
          <TypeIcon type={toast.type} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{toast.message}</p>
            {toast.description && <p className="mt-1 break-words text-sm opacity-90">{toast.description}</p>}
            {toast.type === "progress" && toast.cancelMutation && (
              <button
                type="button"
                className="mt-2 text-sm font-medium underline"
                onClick={() => {
                  toast.cancelMutation?.();
                  dismissToast(toast.key);
                }}
              >
                Undo{toast.undoableTimeout !== undefined ? ` (${toast.undoableTimeout}s)` : ""}
              </button>
            )}
          </div>
          <button
            type="button"
            className="rounded p-0.5 opacity-70 hover:opacity-100"
            onClick={() => dismissToast(toast.key)}
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
