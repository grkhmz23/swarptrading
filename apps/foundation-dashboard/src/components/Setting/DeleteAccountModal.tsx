"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
};

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: Props) {
  const t = useT();
  const [isDeleted, setIsDeleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // After deletion success, redirect after short delay
  useEffect(() => {
    if (isDeleted) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDeleted, router]);

  if (!isOpen) return null;
const handleConfirm = async () => {
  setErrorMessage(""); // clear previous errors

  try {
    await onConfirm();
    setIsDeleted(true);
    // SECURITY: Replaced broad clear with targeted cleanup
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('swarp_fd_'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : (t.modals?.deleteAccount?.failedToDelete || 'Failed to delete account');
    setErrorMessage(message);
  }
};


  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        onClick={!isDeleted ? onClose : undefined}
        style={{ background: "rgba(0, 0, 0, 0.4)" }}
      />

      {/* Modal Card */}
      <div
        className="relative w-[335px] sm:max-w-[335px] md:min-w-[400px] lg:min-w-[435px] max-w-full h-[300px] max-h-[90vh] rounded-2xl overflow-hidden"
        role="document"
      >
        <div
          className="h-full rounded-2xl flex flex-col items-center justify-center text-center px-6"
          style={{
            background: "#131519",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          {/* If deleted, show success message */}
          {isDeleted ? (
            <>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#40E0D0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h3
                className="text-[18px] font-semibold text-white mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t.modals?.deleteAccount?.successTitle || 'Account Deleted'}
              </h3>
              <p className="text-white/70 text-[14px]">
                {t.modals?.deleteAccount?.successMessage || 'Your account has been successfully deleted.'}
                <br />
                {t.modals?.deleteAccount?.redirecting || 'Redirecting...'}
              </p>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between !px-6 !py-5 border-b border-b-[rgba(255,255,255,0.02)]">
                <button
                  aria-label="Close"
                  onClick={onClose}
                  className="!p-1 rounded-full hover:bg-white/5 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="absolute left-0 right-0 flex  justify-center pointer-events-none">
                  <h3
                    className="text-[18px]  font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {t.modals?.deleteAccount?.title || 'Delete Account'}
                  </h3>
                </div>

                <div style={{ width: 36 }} aria-hidden />
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col justify-center items-center text-center mt-5">
                <p
                  className="text-white/80 text-[15px] leading-[22px]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {t.modals?.deleteAccount?.warning || 'Are you sure you want to delete your account?'}
                  <br />
                  <span className="text-[#40E0D0] font-medium">
                    {t.modals?.deleteAccount?.cannotUndo || 'This action cannot be undone.'}
                  </span>

                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-between gap-3 !px-6 !pb-6 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 !py-3 rounded-full cursor-pointer text-[14px] font-bold transition-transform active:scale-[0.996]"
                  style={{
                    background: "#2B2D30",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {t.modals?.deleteAccount?.cancelButton || 'Cancel'}
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 !py-3 rounded-full cursor-pointer text-[14px] font-bold transition-transform active:scale-[0.996]"
                  style={{
                    background: "#40E0D0",
                    color: "#090A11",
                    opacity: isLoading ? 0.8 : 1,
                  }}
                >
                  {isLoading ? (t.modals?.deleteAccount?.deleting || 'Deleting...') : (t.modals?.deleteAccount?.confirmButton || 'Delete')}
                </button>
              </div>
              {errorMessage && (
  <p className="text-red-500 text-[14px] mt-3">
    {errorMessage}
  </p>
)}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
