"use client";

import React, { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/I18nProvider";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { oldPasscode: string; newPasscode: string }) => Promise<void>;
};

export default function ChangePasscodeModal({ isOpen, onClose, onSubmit }: Props) {
  const t = useT();
  const [oldPasscode, setOldPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [oldPasscodeError, setOldPasscodeError] = useState<string | null>(null);
  const [newPasscodeError, setNewPasscodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Lock scroll + autofocus
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      document.body.style.overflow = "";
      setOldPasscode("");
      setNewPasscode("");
      setOldPasscodeError(null);
      setNewPasscodeError(null);
      setSubmitError(null);
      setStatus("idle");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    let hasValidationError = false;

    if (!/^\d{6}$/.test(oldPasscode)) {
      setOldPasscodeError(t.modals?.changePasscode?.errors?.oldMustBe6Digits || 'Old passcode must be 6 digits');
      hasValidationError = true;
    }

    if (!/^\d{6}$/.test(newPasscode)) {
      setNewPasscodeError(t.modals?.changePasscode?.errors?.newMustBe6Digits || 'New passcode must be 6 digits');
      hasValidationError = true;
    }

    if (hasValidationError) return;

    try {
      setOldPasscodeError(null);
      setNewPasscodeError(null);
      setSubmitError(null);
      setStatus("loading");

      await onSubmit({ oldPasscode, newPasscode });

      setStatus("success");
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      setStatus("idle");
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
        setSubmitError((err as { message: string }).message);
      } else if (typeof err === "string") {
        setSubmitError(err);
      } else {
        setSubmitError(t.modals?.changePasscode?.errors?.failedToUpdate || 'Failed to update passcode');
      }
    }
  }

  const handleOldPasscodeChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (numeric.length > 6) {
      setOldPasscodeError(t.modals?.changePasscode?.errors?.oldCanOnlyBe6Digits || 'Passcode can only be 6 digits');
    } else {
      setOldPasscodeError(null);
    }
    setSubmitError(null);
    setOldPasscode(numeric.slice(0, 6));
  };

  const handleNewPasscodeChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (numeric.length > 6) {
      setNewPasscodeError(t.modals?.changePasscode?.errors?.newCanOnlyBe6Digits || 'Passcode can only be 6 digits');
    } else {
      setNewPasscodeError(null);
    }
    setSubmitError(null);
    setNewPasscode(numeric.slice(0, 6));
  };
  if (!isOpen) return null;

  return (
    <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{ background: "rgba(0, 0, 0, 0.4)" }}
      />

      {/* Modal Card */}
      <div
        className="relative w-[335px] sm:max-w-[335px] md:min-w-[400px] lg:min-w-[435px] max-w-full h-[420px] max-h-[90vh] rounded-2xl overflow-hidden"
        role="document"
      >
        <div
          className="h-full rounded-2xl flex flex-col"
          style={{
            background: "#131519",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between !px-6 !py-5 border-b border-b-[rgba(255,255,255,0.02)]">
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

            <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
              <h3 className="text-[18px] font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                {t.modals?.changePasscode?.title || 'Change Passcode'}
              </h3>
            </div>

            <div style={{ width: 36 }} aria-hidden />
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 !px-6 !pt-7 !pb-6 flex flex-col gap-4">
            {/* Old Passcode */}
            <label className="block text-white/70 text-sm">
              <input
                ref={inputRef}
                value={oldPasscode}
                onChange={(e) => handleOldPasscodeChange(e.target.value)}
                maxLength={6}
                placeholder={t.modals?.changePasscode?.oldPasscodePlaceholder || 'Old Passcode'}
                type="password"
                inputMode="numeric"
                className={`w-full !py-3 !px-4 mt-2 rounded-lg text-[14px] font-[400] placeholder:opacity-40 outline-none ${
                  oldPasscodeError ? "border-red-500" : ""
                }`}
                style={{
                  background: "#131519",
                  border: oldPasscodeError ? "1px solid #ef4444" : "0.5px solid #2B2D30",
                  color: "rgba(255,255,255,0.9)",
                }}
              />
              {oldPasscodeError && (
                <p className="text-red-500 text-[12px] mt-1 font-medium">{oldPasscodeError}</p>
              )}
            </label>

            {/* New Passcode */}
            <label className="block text-white/70 text-sm">
              <input
                value={newPasscode}
                onChange={(e) => handleNewPasscodeChange(e.target.value)}
                maxLength={6}
                placeholder={t.modals?.changePasscode?.newPasscodePlaceholder || 'New Passcode'}
                type="password"
                inputMode="numeric"
                className={`w-full !py-3 !px-4 mt-2 rounded-lg text-[14px] font-[400] placeholder:opacity-40 outline-none ${
                  newPasscodeError ? "border-red-500" : ""
                }`}
                style={{
                  background: "#131519",
                  border: newPasscodeError ? "1px solid #ef4444" : "0.5px solid #2B2D30",
                  color: "rgba(255,255,255,0.9)",
                }}
              />
              {newPasscodeError && (
                <p className="text-red-500 text-[12px] mt-1 font-medium">{newPasscodeError}</p>
              )}
            </label>

            {submitError && (
              <p className="text-red-500 text-sm font-medium">{submitError}</p>
            )}

            <div className="flex-1" />

            {/* Save Button */}
            <div className="!pt-3">
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="w-full !py-3 rounded-full cursor-pointer text-[14px] font-bold transition-transform active:scale-[0.996]"
                style={{
                  background: status === "success" ? "#22c55e" : "#40E0D0",
                  color: "#090A11",
                  opacity: status === "loading" ? 0.8 : 1,
                }}
              >
                {status === "loading"
                  ? (t.modals?.changePasscode?.updating || 'Updating...')
                  : status === "success"
                  ? (t.modals?.changePasscode?.success || 'Success!')
                  : (t.modals?.changePasscode?.submitButton || 'Save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
