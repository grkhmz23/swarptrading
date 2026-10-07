/**
 * Client-side PIN gate.
 *
 * A token obtained from OTP or Google sign-in proves who the user is, but the
 * wallet must stay locked until the wallet PIN has been entered in this tab.
 * The unlock marker lives in sessionStorage (per tab, gone when the tab closes)
 * and is bound to the exact token it was granted for.
 *
 * This is a UI gate only. The backend must refuse wallet operations for a
 * session whose PIN has not been verified (see docs/BACKEND_REQUIREMENTS.md).
 */

import { decodeJwt } from './session';

const UNLOCK_KEY = 'swarp_fd_pin_unlocked';
const FAILURES_KEY = 'swarp_fd_pin_failures';

function fingerprint(token: string): string {
  const payload = decodeJwt(token);
  const sub = typeof payload?.sub === 'string' || typeof payload?.sub === 'number' ? String(payload.sub) : '';
  const iat = typeof payload?.iat === 'number' ? String(payload.iat) : '';
  // Bind to subject + issue time when present, else to the token's signature segment.
  return sub && iat ? `${sub}:${iat}` : token.split('.')[2] ?? token;
}

function session(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function markSessionUnlocked(token: string): void {
  session()?.setItem(UNLOCK_KEY, fingerprint(token));
  session()?.removeItem(FAILURES_KEY);
}

export function isSessionUnlocked(token: string): boolean {
  return session()?.getItem(UNLOCK_KEY) === fingerprint(token);
}

export function lockSession(): void {
  session()?.removeItem(UNLOCK_KEY);
}

interface FailureState {
  count: number;
  lockedUntil: number;
}

function readFailures(): FailureState {
  try {
    const raw = session()?.getItem(FAILURES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.count === 'number' && typeof parsed.lockedUntil === 'number') return parsed;
  } catch {
    // Corrupt value: start over.
  }
  return { count: 0, lockedUntil: 0 };
}

/** Milliseconds until another PIN attempt is allowed (0 when allowed now). */
export function pinRetryDelayMs(now = Date.now()): number {
  return Math.max(0, readFailures().lockedUntil - now);
}

/**
 * Record a wrong PIN. After 3 failures each further failure doubles a wait
 * (30s, 60s, 120s … capped at 15 minutes).
 */
export function recordPinFailure(now = Date.now()): FailureState {
  const current = readFailures();
  const count = current.count + 1;
  const delay = count >= 3 ? Math.min(30_000 * 2 ** (count - 3), 15 * 60_000) : 0;
  const next = { count, lockedUntil: delay ? now + delay : 0 };
  session()?.setItem(FAILURES_KEY, JSON.stringify(next));
  return next;
}

export function clearPinFailures(): void {
  session()?.removeItem(FAILURES_KEY);
}
