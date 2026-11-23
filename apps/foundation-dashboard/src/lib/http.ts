/**
 * Low-level HTTP client for the SwarpPay backend.
 *
 * - Throws `ApiError` (a real `Error`) for every failure, carrying the HTTP
 *   status and the server's message.
 * - Treats a 401 on an authenticated request as an expired session: it clears
 *   client state and notifies the registered handler, unless the call opted out
 *   (endpoints where 401 means "wrong PIN", not "logged out").
 * - Never logs request bodies, tokens or response payloads.
 */

import { API_BASE_URL } from '@/config/env';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly details: unknown;

  constructor(message: string, statusCode: number, error = 'API Error', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Best user-facing message for any thrown value. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) return message.join(', ');
  }
  return fallback;
}

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Do not treat a 401 from this call as session expiry (PIN/passcode checks). */
  skipSessionExpiry?: boolean;
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Register what happens when the backend rejects the session (called once at app start). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/** encodeURIComponent for path segments, rejecting empty values. */
export function enc(segment: string | number): string {
  const value = String(segment);
  if (!value) throw new ApiError('Missing identifier in request path', 0, 'Client Error');
  return encodeURIComponent(value);
}

/** Build a `?a=1&b=2` query string, skipping undefined/null/empty values. */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
    if (Array.isArray(message) && message.length > 0) return message.map(String).join(', ');
  }
  return fallback;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') || /^[\s]*[[{]/.test(text)) {
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError('The server returned an invalid response.', response.status, 'Invalid Response Format');
    }
  }
  return text;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { headers: callerHeaders = {}, skipSessionExpiry = false, ...init } = options;
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...callerHeaders,
  };
  if (isFormData) delete headers['Content-Type'];

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      mode: 'cors',
      cache: 'no-store',
      ...init,
      headers,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError('Unable to connect to the server. Please check your connection.', 0, 'Network Error');
  }

  const body = await readBody(response);

  if (!response.ok) {
    const hasBearer = Object.keys(headers).some((h) => h.toLowerCase() === 'authorization');
    if (response.status === 401 && hasBearer && !skipSessionExpiry) {
      unauthorizedHandler?.();
    }
    throw new ApiError(
      messageFromBody(body, response.statusText || 'Request failed'),
      response.status,
      (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : undefined) ?? 'API Error',
      body
    );
  }

  return body as T;
}

/** A fresh idempotency key for one user-initiated, value-moving action. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
