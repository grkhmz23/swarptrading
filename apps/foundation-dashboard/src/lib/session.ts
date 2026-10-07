/**
 * Browser session storage for the SwarpPay dashboard.
 *
 * All reads and writes of the access token go through this module so the
 * storage mechanism can be swapped (e.g. for an httpOnly cookie issued by the
 * backend) in one place.
 */

export const ACCESS_TOKEN_KEY = 'swarp_fd_access_token';
const KEY_PREFIX = 'swarp_fd_';

/** sessionStorage keys written during onboarding that must not outlive a session. */
const SESSION_KEYS = [
  'swarp_fd_temp_passcode',
  'lastOtp',
  'otpTimestamp',
  'swarp_fd_pin_unlocked',
  'swarp_fd_pin_failures',
  'swarp_fd_oauth_pending',
];

export interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Decode a base64url string (JWT segment) to UTF-8 text. */
export function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Decode a JWT payload without verifying it. Returns null for malformed tokens. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload && typeof payload === 'object' ? (payload as JwtPayload) : null;
  } catch {
    return null;
  }
}

/** True when the token is malformed or its `exp` is within `skewSeconds` of now. */
export function isTokenExpired(token: string, nowSeconds = Date.now() / 1000, skewSeconds = 30): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp <= nowSeconds + skewSeconds;
}

export function getAccessToken(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Returns the stored token only if it is present and not expired. */
export function getValidAccessToken(): string | null {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) return null;
  return token;
}

export function setAccessToken(token: string): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

type SessionListener = () => void;
const clearListeners = new Set<SessionListener>();

/** Register a callback run whenever the session is cleared (e.g. to reset Redux). */
export function onSessionCleared(listener: SessionListener): () => void {
  clearListeners.add(listener);
  return () => clearListeners.delete(listener);
}

/**
 * Remove every piece of client-side session state: the token, cached user and
 * wallet data in localStorage, and onboarding values in sessionStorage.
 * UI preferences (language, currency) are kept.
 */
export function clearSession(): void {
  if (!hasStorage()) return;
  const preserved = new Set(['swarp_fd_language', 'swarp_fd_currency', 'swarp_fd_network', 'swarp_fd_settings']);
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(KEY_PREFIX) && !preserved.has(key))
    .forEach((key) => window.localStorage.removeItem(key));
  try {
    SESSION_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // sessionStorage can be unavailable in some privacy modes.
  }
  clearListeners.forEach((listener) => listener());
}
