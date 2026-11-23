import React, { useEffect, useRef, useState } from "react";
import {apiService} from "@/services/api";
import { useT } from '@/i18n/I18nProvider';

type Props = {
  isOpen: boolean;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (code: string) => void;
};

export default function ReferralCodeModal({
  isOpen,
  initialValue = "",
  onClose,
  onSubmit,
}: Props) {
  const t = useT();
  const [code, setCode] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
const [checking, setChecking] = useState(false);
const [valid, setValid] = useState<boolean | null>(null);
const [message, setMessage] = useState("");

  // lock scroll while modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // focus input when opening
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);





async function handleSubmit(e?: React.FormEvent) {
  e?.preventDefault();

  const trimmed = code.trim();
  if (!trimmed) return;

  setChecking(true);
  setValid(null); 
  setMessage("");

  try {
    const res = await apiService.checkReferralCode(trimmed);
    setValid(res.valid);
    setMessage(res.message);

    if (res.valid) {
      localStorage.setItem("swarp_fd_inviter_referral_code", trimmed);

      // show success state on button
      setChecking(false);

      // wait 1 second before closing modal
      setTimeout(() => {
        onSubmit(trimmed); // page handles closing after delay
      }, 1000);

      return;
    }
  } catch {
    setValid(false);
    setMessage(t.onboarding?.referralModal?.errors?.generic || "Something went wrong");
  }

  setChecking(false);
}

  if (!isOpen) return null;
  
  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Enter referral code"
      className="fixed inset-0 z-50 flex items-center justify-center px-6" 
    >
      {/* Overlay with subtle radial / vignette effect */}
      <div
        className="absolute inset-0"
        onClick={onClose}
       style={{
              background: "transparent radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 80%)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.03)",
                 backdropFilter: "blur(0.5px)",
            }}
      />

      {/* Modal card */}
      <div
        className="relative w-[435px] max-w-full h-[620px] max-h-[92vh] rounded-2xl overflow-hidden"
        role="document"
      >
        {/* Card background: slightly lighter inside, rounded, inner shadow */}
        <div
          className="h-full rounded-2xl flex flex-col"
          style={{
            background:
              "#131519",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between !px-6 !py-5 border-b border-b-[rgba(255,255,255,0.02)]">
            {/* left: small X icon button */}
            <button
              aria-label="Close"
              onClick={onClose}
              className="!p-1 rounded-full hover:bg-white/3 transition-colors"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {/* small X */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* title centered */}
            <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
              <h3
                className="text-[18px] font-semibold"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                {t.onboarding?.referralModal?.title || 'Enter referral code'}
              </h3>
            </div>

            {/* right spacer to keep title centered */}
            <div style={{ width: 36 }} aria-hidden />
          </div>

          {/* Body */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 !px-6 !pt-7 !pb-6 flex flex-col"
          >
            {/* Input box */}
            <div className="max-w-full">
              <label className="block">
       <input
  ref={inputRef}
  value={code}
   onChange={(e) => {
    setCode(e.target.value);
    setValid(null);      
    setMessage("");
  }}
  placeholder={t.onboarding?.referralModal?.placeholder || "Referral code"}
  className="w-full !py-4 !px-5 rounded-lg text-[14px] placeholder:opacity-40 outline-none transition-all duration-200"
  style={{
    background: "rgba(255,255,255,0.01)",
    border:
      valid === false
        ? "1px solid rgba(255,0,0,0.6)"       
        : valid === true
        ? "1px solid rgba(0,255,180,0.6)"      
        : "1px solid rgba(255,255,255,0.03)",  
    color: "rgba(255,255,255,0.9)",
  }}
/>

{valid === true && (
  <p className="text-green-400 mt-2 text-sm">{message}</p>
)}

{valid === false && (
  <p className="text-red-400 mt-2 text-sm">{message}</p>
)}

              </label>
            </div>

            {/* big flexible empty area to match the visible negative space */}
            <div className="flex-1" />

            {/* Footer - large teal button */}
            <div className="!pt-4 !pb-6">
<button
  type="submit"
  className="w-full !py-4 rounded-full text-[14px] font-bold transition-transform active:scale-[0.996]"
  style={{
    background: "#40E0D0",
    color: "#090A11",
    cursor: checking || valid === false ? "not-allowed" : "pointer",
    opacity: checking || valid === false ? 0.5 : 1,
  }}
>
  {checking
    ? (t.onboarding?.referralModal?.checking || "Checking...")
    : valid === true
    ? (t.onboarding?.referralModal?.valid || "Valid!")
    : (t.onboarding?.referralModal?.continue || "Continue")}
</button>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
