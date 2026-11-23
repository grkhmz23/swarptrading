"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/http";

const CONFIRM_WORD = "DELETE";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Verifies the PIN, checks balances and deletes the account. Throws with a user-facing message on failure. */
  onConfirm: (pin: string) => Promise<void>;
  /** Runs after the success message has been shown (clear the session and leave). */
  onDeleted: () => void;
  isLoading?: boolean;
};

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, onDeleted, isLoading }: Props) {
  const t = useT();
  const [isDeleted, setIsDeleted] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setPin("");
      setTyped("");
      setError("");
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isDeleted) return;
    const timer = setTimeout(onDeleted, 2000);
    return () => clearTimeout(timer);
  }, [isDeleted, onDeleted]);

  if (!isOpen) return null;

  const canConfirm = /^\d{6}$/.test(pin) && typed.trim().toUpperCase() === CONFIRM_WORD && !isLoading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setError("");
    try {
      await onConfirm(pin);
      setIsDeleted(true);
    } catch (err) {
      setPin("");
      setError(errorMessage(err, t.modals?.deleteAccount?.failedToDelete || "Failed to delete account"));
    }
  };

  return (
    <div aria-modal="true" role="dialog" aria-labelledby="delete-account-title" className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0"
        onClick={!isDeleted && !isLoading ? onClose : undefined}
        style={{ background: "rgba(0, 0, 0, 0.4)" }}
      />

      <div className="relative w-[335px] sm:max-w-[335px] md:min-w-[400px] lg:min-w-[435px] max-w-full max-h-[90vh] overflow-y-auto rounded-2xl">
        <div
          className="rounded-2xl flex flex-col items-center text-center !px-6 !py-6"
          style={{
            background: "#131519",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          {isDeleted ? (
            <>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h3 id="delete-account-title" className="text-[18px] font-semibold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                {t.modals?.deleteAccount?.successTitle || "Account Deleted"}
              </h3>
              <p className="text-white/70 text-[14px]">
                {t.modals?.deleteAccount?.successMessage || "Your account has been successfully deleted."}
                <br />
                {t.modals?.deleteAccount?.redirecting || "Redirecting..."}
              </p>
            </>
          ) : (
            <>
              <div className="w-full flex items-center justify-between !pb-4 border-b border-b-[rgba(255,255,255,0.04)]">
                <button aria-label="Close" onClick={onClose} disabled={isLoading} className="!p-1 rounded-full hover:bg-white/5 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <h3 id="delete-account-title" className="text-[18px] font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  {t.modals?.deleteAccount?.title || "Delete Account"}
                </h3>
                <div style={{ width: 28 }} aria-hidden />
              </div>

              <p className="text-white/80 text-[15px] leading-[22px] !mt-5" style={{ fontFamily: "var(--font-body)" }}>
                {t.modals?.deleteAccount?.warning || "Are you sure you want to delete your account?"}
                <br />
                <span className="text-[#40E0D0] font-medium">
                  {t.modals?.deleteAccount?.cannotUndo || "This action cannot be undone."}
                </span>
              </p>
              <p className="text-white/50 text-[13px] !mt-2">
                Your wallet must be empty. Withdraw all funds before deleting your account.
              </p>

              <label className="w-full text-left text-white/70 text-sm !mt-5">
                Wallet passcode
                <input
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={6}
                  disabled={isLoading}
                  className="w-full !py-3 !px-4 mt-2 rounded-lg text-[14px] outline-none text-white/90"
                  style={{ background: "#131519", border: "0.5px solid #2B2D30" }}
                />
              </label>

              <label className="w-full text-left text-white/70 text-sm !mt-4">
                Type <span className="font-mono text-white">{CONFIRM_WORD}</span> to confirm
                <input
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setError("");
                  }}
                  autoComplete="off"
                  disabled={isLoading}
                  className="w-full !py-3 !px-4 mt-2 rounded-lg text-[14px] outline-none text-white/90"
                  style={{ background: "#131519", border: "0.5px solid #2B2D30" }}
                />
              </label>

              {error && (
                <p className="text-red-500 text-[14px] !mt-3" role="alert">
                  {error}
                </p>
              )}

              <div className="flex justify-between gap-3 w-full !mt-6">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 !py-3 rounded-full cursor-pointer text-[14px] font-bold transition-transform active:scale-[0.996]"
                  style={{ background: "#2B2D30", color: "rgba(255,255,255,0.9)" }}
                >
                  {t.modals?.deleteAccount?.cancelButton || "Cancel"}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="flex-1 !py-3 rounded-full text-[14px] font-bold transition-transform active:scale-[0.996] bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? t.modals?.deleteAccount?.deleting || "Deleting..." : t.modals?.deleteAccount?.confirmButton || "Delete"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
