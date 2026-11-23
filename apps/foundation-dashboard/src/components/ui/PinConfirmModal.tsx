'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiService } from '@/services/api';
import { getAccessToken } from '@/lib/session';
import { ApiError, errorMessage } from '@/lib/http';
import { clearPinFailures, pinRetryDelayMs, recordPinFailure } from '@/lib/pinGate';
import { CodeInput, emptyCode, type CodeInputHandle } from './CodeInput';

export interface PinConfirmSummaryRow {
  label: string;
  value: string;
}

interface PinConfirmModalProps {
  isOpen: boolean;
  title: string;
  /** What the user is about to authorise, shown above the PIN boxes. */
  summary: PinConfirmSummaryRow[];
  confirmLabel?: string;
  onCancel: () => void;
  /**
   * Called with the verified PIN. Runs the actual operation; throw to show an
   * error and keep the modal open.
   */
  onConfirmed: (pin: string) => Promise<void>;
}

/**
 * Step-up confirmation for value-moving actions: the user reviews the action
 * and re-enters the wallet PIN, which is checked with the backend before the
 * operation runs. The backend must also require the PIN on the operation
 * itself; this step makes sure the person at the keyboard knows it.
 */
export function PinConfirmModal({ isOpen, title, summary, confirmLabel = 'Confirm', onCancel, onConfirmed }: PinConfirmModalProps) {
  const [pin, setPin] = useState<string[]>(emptyCode());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<CodeInputHandle>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setPin(emptyCode());
      setError('');
      setBusy(false);
      busyRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async (code: string) => {
    if (busyRef.current) return;
    const wait = pinRetryDelayMs();
    if (wait > 0) {
      setError(`Too many attempts. Try again in ${Math.ceil(wait / 1000)}s.`);
      setPin(emptyCode());
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      try {
        await apiService.verifyWalletPIN(code, token);
      } catch (err) {
        if (err instanceof ApiError && [400, 401, 403].includes(err.statusCode)) {
          const state = recordPinFailure();
          const seconds = Math.ceil(Math.max(0, state.lockedUntil - Date.now()) / 1000);
          throw new Error(seconds > 0 ? `Incorrect passcode. Try again in ${seconds}s.` : 'Incorrect passcode.');
        }
        throw err;
      }
      clearPinFailures();
      await onConfirmed(code);
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Please try again.'));
      setPin(emptyCode());
      inputRef.current?.focus();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 !p-4" role="dialog" aria-modal="true" aria-labelledby="pin-confirm-title">
      <div className="w-full max-w-sm rounded-3xl bg-[#1A1B23] !p-6 flex flex-col gap-5">
        <h2 id="pin-confirm-title" className="text-white text-lg font-semibold text-center">
          {title}
        </h2>

        <dl className="rounded-2xl bg-[#131519] border border-[#2B2D30] !p-4 flex flex-col gap-2">
          {summary.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 text-sm">
              <dt className="text-[#636466]">{row.label}</dt>
              <dd className="text-white text-right break-all">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col items-center gap-3">
          <p className="text-[#9CA3AF] text-sm">Enter your wallet passcode to {confirmLabel.toLowerCase()}</p>
          <CodeInput
            ref={inputRef}
            value={pin}
            onChange={(digits) => {
              setPin(digits);
              if (error) setError('');
            }}
            onComplete={submit}
            secret
            autoFocus
            disabled={busy}
            invalid={Boolean(error)}
            ariaLabel="Wallet passcode"
            boxClassName="w-11 h-11 text-center text-white text-lg font-semibold bg-[#131519] border rounded-xl focus:outline-none transition-colors"
          />
          {error && (
            <p className="text-red-500 text-sm text-center" role="alert">
              {error}
            </p>
          )}
          {busy && <p className="text-[#40E0D0] text-sm">Processing…</p>}
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-full !py-3 rounded-full bg-[#2B2D30] text-white text-sm font-semibold disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
