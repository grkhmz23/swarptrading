import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/config";

/**
 * Client-side session helpers. Everything here is advisory: the token and the
 * stored user live in localStorage and can be read or altered by anything
 * running on this origin. The backend must enforce authentication and roles on
 * every /admin-api route; the client only uses this to avoid offering actions
 * the server will refuse.
 */

export type AdminRole = "superadmin" | "admin" | "viewer";

export interface AdminIdentity {
  id?: string | number;
  email?: string;
  name?: string;
  role: AdminRole;
}

type JwtPayload = Record<string, unknown> & { exp?: unknown };

const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage unavailable: nothing to clear.
    }
  },
};

export const getToken = (): string | null => safeStorage.get(TOKEN_STORAGE_KEY);

export const saveSession = (token: string, user: unknown): void => {
  safeStorage.set(TOKEN_STORAGE_KEY, token);
  const userObject = user !== null && typeof user === "object" ? user : {};
  safeStorage.set(USER_STORAGE_KEY, JSON.stringify(userObject));
};

export const clearSession = (): void => {
  safeStorage.remove(TOKEN_STORAGE_KEY);
  safeStorage.remove(USER_STORAGE_KEY);
};

/** Parsed stored user, or null when missing or not valid JSON. */
export const getStoredUser = (): Record<string, unknown> | null => {
  const raw = safeStorage.get(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

/** Decodes a JWT payload (base64url, unpadded). Returns null for anything malformed. */
export const decodeJwtPayload = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const payload: unknown = JSON.parse(json);
    return payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as JwtPayload)
      : null;
  } catch {
    return null;
  }
};

export type TokenState = "valid" | "expired" | "malformed" | "missing";

/** Checks structure and the `exp` claim (with a small clock-skew allowance). */
export const getTokenState = (token: string | null, nowMs: number = Date.now()): TokenState => {
  if (!token) return "missing";
  const payload = decodeJwtPayload(token);
  if (!payload) return "malformed";

  if (payload.exp !== undefined) {
    const exp = Number(payload.exp);
    if (!Number.isFinite(exp)) return "malformed";
    const clockSkewMs = 30_000;
    if (exp * 1000 <= nowMs - clockSkewMs) return "expired";
  }
  return "valid";
};

const ROLE_RANK: Record<AdminRole, number> = { viewer: 0, admin: 1, superadmin: 2 };

const normalizeRole = (value: unknown): AdminRole | null => {
  const name =
    typeof value === "string"
      ? value
      : value !== null && typeof value === "object" && typeof (value as { name?: unknown }).name === "string"
        ? (value as { name: string }).name
        : null;
  if (!name) return null;

  const key = name.toLowerCase().replace(/[\s_-]/g, "");
  if (key === "superadmin") return "superadmin";
  if (key === "admin") return "admin";
  return "viewer";
};

const highestRole = (candidates: unknown[]): AdminRole | null => {
  let best: AdminRole | null = null;
  for (const candidate of candidates) {
    const role = normalizeRole(candidate);
    if (role && (best === null || ROLE_RANK[role] > ROLE_RANK[best])) best = role;
  }
  return best;
};

const roleFromClaims = (source: Record<string, unknown> | null): AdminRole | null => {
  if (!source) return null;
  const candidates: unknown[] = [];
  if (source.role !== undefined) candidates.push(source.role);
  if (Array.isArray(source.roles)) candidates.push(...source.roles);
  else if (source.roles !== undefined) candidates.push(source.roles);
  return highestRole(candidates);
};

/**
 * Role of the current session: `role` / `roles` on the login response user,
 * falling back to the same claims in the JWT. Anything missing or unrecognised
 * is treated as the least-privileged `viewer` (read-only).
 */
export const getCurrentRole = (): AdminRole => {
  const fromUser = roleFromClaims(getStoredUser());
  if (fromUser) return fromUser;

  const token = getToken();
  const fromToken = token ? roleFromClaims(decodeJwtPayload(token)) : null;
  return fromToken ?? "viewer";
};

export const canWrite = (role: AdminRole): boolean => role === "admin" || role === "superadmin";

export const getIdentity = (): AdminIdentity | null => {
  const user = getStoredUser();
  if (!user) return null;

  const id = typeof user.id === "string" || typeof user.id === "number" ? user.id : undefined;
  const email = typeof user.email === "string" ? user.email : undefined;
  const name = typeof user.name === "string" ? user.name : undefined;
  return { id, email, name, role: getCurrentRole() };
};
