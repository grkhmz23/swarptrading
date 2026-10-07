  "use client";

  import React, { useEffect, useRef, useState } from "react";
  import { useT } from "@/i18n/I18nProvider";
  import { isLikelySolanaAddress } from "@/lib/solana";
  import { errorMessage } from "@/lib/http";

  type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { nickname: string; address: string }) => Promise<void>;
    initialData?: { nickname?: string; address?: string };
    externalError?: string | null; // ✅ new prop
  };

  export default function AddContactModal({
    isOpen,
    onClose,
    onSubmit,
    initialData = {},
    externalError,
  }: Props) {
    const t = useT();
    const [nickname, setNickname] = useState(initialData.nickname || "");
    const [address, setAddress] = useState(initialData.address || "");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Show redux error automatically (with translation)
    useEffect(() => {
      if (externalError) {
        // Translate known API error messages
        if (externalError === 'Username or wallet address not found') {
          setError(t.modals?.addContact?.errors?.userNotFound || externalError);
        } else {
          setError(externalError);
        }
      }
    }, [externalError, t.modals?.addContact?.errors?.userNotFound]);

    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden";
        setTimeout(() => inputRef.current?.focus(), 120);
        setError(null);
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
  setError(null);
  const name = nickname.trim();
  const target = address.trim();
  if (!name || !target) {
    setError(t.modals?.addContact?.errors?.fillBothFields || 'Please fill both fields');
    return;
  }
  if (name.length > 40) {
    setError('Nickname must be 40 characters or fewer');
    return;
  }
  // The second field takes either a Solana address or a SwarpPay username.
  if (!isLikelySolanaAddress(target) && !/^@?[A-Za-z0-9_.]{3,30}$/.test(target)) {
    setError('Enter a valid Solana address or username');
    return;
  }

  try {
    setLoading(true);
    await onSubmit({ nickname: name, address: target });
  } catch (err: unknown) {
    let message = errorMessage(err, t.modals?.addContact?.errors?.failedToAdd || 'Failed to add contact');
    // Translate known API error messages
    if (message === 'Username or wallet address not found') {
      message = t.modals?.addContact?.errors?.userNotFound || message;
    }
    setError(message);
  } finally {
    setLoading(false);
  }
}


    if (!isOpen) return null;

    return (
      <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="absolute inset-0" onClick={onClose} style={{ background: "rgba(0,0,0,0.4)" }} />

        <div
          className="relative w-[335px] sm:max-w-[335px] md:min-w-[400px] lg:min-w-[435px] max-w-full h-[620px] max-h-[90vh] rounded-2xl overflow-hidden"
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
              <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
                <h3 className="text-[18px] font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  {t.modals?.addContact?.title || 'Add Contact'}
                </h3>
              </div>
              <div style={{ width: 36 }} aria-hidden />
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 !px-6 !pt-7 !pb-6 flex flex-col gap-4">
           

              <label className="block text-white/70 text-sm">
                <input
                  ref={inputRef}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t.modals?.addContact?.nicknamePlaceholder || 'Nickname'}
                  className="w-full !py-3 !px-4 mt-2 rounded-lg text-[14px] font-[400] placeholder:opacity-40 outline-none"
                  style={{
                    background: "#131519",
                    border: "0.5px solid #2B2D30",
                    color: "rgba(255,255,255,0.9)",
                  }}
                />
              </label>

              <label className="block text-white/70 text-sm">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t.modals?.addContact?.addressPlaceholder || 'Wallet Address'}
                  className="w-full !py-[18px] !px-4 mt-2 rounded-lg text-[14px] font-[400] placeholder:opacity-40 outline-none"
                  style={{
                    background: "#131519",
                    border: "0.5px solid #2B2D30",
                    color: "rgba(255,255,255,0.9)",
                  }}
                />
              </label>
   {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex-1" />

              <div className="!pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full !py-3 rounded-full text-[14px] cursor-pointer font-bold transition-transform active:scale-[0.996]"
                  style={{
                    background: "#40E0D0",
                    color: "#090A11",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (t.modals?.addContact?.saving || 'Saving...') : (t.modals?.addContact?.submitButton || 'Add Contact')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
