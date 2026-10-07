/**
 * Google sign-in hand-off.
 *
 * The backend redirects back to this app with the session token in the query
 * string. To stop "login CSRF" (an attacker sending a link that signs the
 * victim into the attacker's account), a callback is only accepted when this
 * browser tab started the sign-in within the last 15 minutes. A random `state`
 * value is sent along; when the backend echoes it back it must match.
 */

import { newIdempotencyKey } from './http';

const PENDING_KEY = 'swarp_fd_oauth_pending';
const MAX_AGE_MS = 15 * 60 * 1000;
const CALLBACK_PARAMS = ['token', 'newUser', 'user', 'state', 'email', 'firstName', 'lastName', 'error'];

interface PendingSignIn {
  state: string;
  startedAt: number;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Remember that this tab is starting a Google sign-in; returns the state value to send. */
export function beginOAuthSignIn(now = Date.now()): string {
  const state = newIdempotencyKey();
  storage()?.setItem(PENDING_KEY, JSON.stringify({ state, startedAt: now } satisfies PendingSignIn));
  return state;
}

export type OAuthCallbackResult =
  | { kind: 'none' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'accepted'; token: string; isNewUser?: boolean; user?: unknown };

/**
 * Read and validate an OAuth callback from the current URL query. Always strips
 * the callback parameters from the address bar and history.
 */
export function consumeOAuthCallback(search: string, now = Date.now()): OAuthCallbackResult {
  const params = new URLSearchParams(search);
  const token = params.get('token');
  if (!token) return { kind: 'none' };

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    CALLBACK_PARAMS.forEach((p) => url.searchParams.delete(p));
    window.history.replaceState(null, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  const raw = storage()?.getItem(PENDING_KEY);
  storage()?.removeItem(PENDING_KEY);
  let pending: PendingSignIn | null = null;
  try {
    pending = raw ? (JSON.parse(raw) as PendingSignIn) : null;
  } catch {
    pending = null;
  }

  if (!pending || typeof pending.state !== 'string' || now - pending.startedAt > MAX_AGE_MS) {
    return {
      kind: 'rejected',
      reason: 'This sign-in link was not started from this browser. Please sign in again.',
    };
  }
  const returnedState = params.get('state');
  if (returnedState !== null && returnedState !== pending.state) {
    return { kind: 'rejected', reason: 'Sign-in could not be verified. Please try again.' };
  }

  const newUserParam = params.get('newUser');
  let user: unknown;
  const userParam = params.get('user');
  if (userParam) {
    try {
      user = JSON.parse(userParam);
    } catch {
      user = undefined;
    }
  }
  return {
    kind: 'accepted',
    token,
    isNewUser: newUserParam === null ? undefined : newUserParam === 'true' || newUserParam === '1',
    user,
  };
}
