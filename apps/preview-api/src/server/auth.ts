import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";

/** Preview sessions last 8 hours. */
export const SESSION_SECONDS = 8 * 60 * 60;

export interface SessionClaims {
  sub: string;
  /** Phone or email the visitor signed in with; shown on their profile. */
  login: string;
  iat: number;
  exp: number;
}

function b64url(data: Buffer | string): string {
  return Buffer.from(data).toString("base64url");
}

function sign(input: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(input).digest();
}

export function issueToken(secret: string, sub: string, login: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims: SessionClaims = { sub, login, iat: nowSeconds, exp: nowSeconds + SESSION_SECONDS };
  const payload = b64url(JSON.stringify(claims));
  return `${header}.${payload}.${b64url(sign(`${header}.${payload}`, secret))}`;
}

/** Verify signature and expiry; returns null for anything invalid. */
export function verifyToken(secret: string, token: string, nowSeconds = Math.floor(Date.now() / 1000)): SessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  const expected = sign(`${header}.${payload}`, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SessionClaims>;
    if (typeof claims.sub !== "string" || typeof claims.exp !== "number" || typeof claims.iat !== "number") return null;
    if (claims.exp <= nowSeconds) return null;
    return { sub: claims.sub, login: typeof claims.login === "string" ? claims.login : "", iat: claims.iat, exp: claims.exp };
  } catch {
    return null;
  }
}

/** Claims from `Authorization: Bearer <token>`, or a 401. */
export function requireSession(req: Request, secret: string): SessionClaims {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const claims = match ? verifyToken(secret, match[1]) : null;
  if (!claims) throw new HttpError(401, "Session expired. Please sign in again.");
  return claims;
}

/** Constant-time comparison for the shared access code. */
export function codeMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
