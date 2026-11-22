import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { SignJWT, errors as joseErrors, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import type { RequestMeta } from "../common/request-meta.js";
import { DB, type Database } from "../db/database.js";
import { sessions, users } from "../db/schema.js";

/** What a verified access token resolves to. */
export interface AuthContext {
  userId: string;
  sessionId: string;
  pinVerifiedAt: Date | null;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface SessionSummary {
  id: string;
  current: boolean;
  createdAt: string;
  lastUsedAt: string;
  ip: string | null;
  userAgent: string | null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Sessions are rows in `sessions`. The access token is a short-lived HS256 JWT
 * (`sub` = user, `sid` = session) checked against the row on every request, so
 * sign-out and revocation take effect immediately. The refresh token is an
 * opaque random value stored only as a hash and rotated on every use.
 */
@Injectable()
export class SessionService {
  private readonly key: Uint8Array;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    this.key = new TextEncoder().encode(config.JWT_SECRET);
  }

  async create(userId: string, meta: RequestMeta): Promise<IssuedTokens & { sessionId: string }> {
    const refreshToken = newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + this.config.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    const [row] = await this.db
      .insert(sessions)
      .values({
        userId,
        refreshTokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
      .returning({ id: sessions.id });
    if (!row) throw new Error("Session insert returned no row");
    return { sessionId: row.id, accessToken: await this.sign(userId, row.id), refreshToken, refreshExpiresAt };
  }

  /** Verifies the JWT and that its session is live and its user active. Null when not. */
  async authenticate(accessToken: string): Promise<AuthContext | null> {
    let subject: string;
    let sessionId: string;
    try {
      const { payload } = await jwtVerify(accessToken, this.key, {
        issuer: this.config.JWT_ISSUER,
        audience: this.config.JWT_AUDIENCE,
        algorithms: ["HS256"],
      });
      if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
      subject = payload.sub;
      sessionId = payload.sid;
    } catch (error) {
      if (error instanceof joseErrors.JOSEError) return null;
      throw error;
    }
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;

    const [row] = await this.db
      .select({ userId: sessions.userId, pinVerifiedAt: sessions.pinVerifiedAt })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, subject),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`now()`),
          eq(users.status, "active"),
        ),
      );
    if (!row) return null;
    return { userId: row.userId, sessionId, pinVerifiedAt: row.pinVerifiedAt };
  }

  /** Rotates the refresh token. Null when it is unknown, expired, revoked, or the user is disabled. */
  async refresh(refreshToken: string): Promise<(IssuedTokens & { userId: string; sessionId: string }) | null> {
    const next = newRefreshToken();
    const [row] = await this.db
      .update(sessions)
      .set({ refreshTokenHash: sha256(next), lastUsedAt: sql`now()` })
      .where(
        and(
          eq(sessions.refreshTokenHash, sha256(refreshToken)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`now()`),
          sql`exists (select 1 from ${users} where ${users.id} = ${sessions.userId} and ${users.status} = 'active')`,
        ),
      )
      .returning({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt });
    if (!row) return null;
    return {
      userId: row.userId,
      sessionId: row.id,
      accessToken: await this.sign(row.userId, row.id),
      refreshToken: next,
      refreshExpiresAt: row.expiresAt,
    };
  }

  async markPinVerified(sessionId: string): Promise<void> {
    await this.db.update(sessions).set({ pinVerifiedAt: sql`now()`, lastUsedAt: sql`now()` }).where(eq(sessions.id, sessionId));
  }

  async revoke(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return result.length > 0;
  }

  /** Signs out every other device, e.g. after a PIN change. Returns how many were revoked. */
  async revokeOthers(userId: string, keepSessionId: string): Promise<number> {
    const result = await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return result.length;
  }

  async listActive(userId: string, currentSessionId: string): Promise<SessionSummary[]> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`now()`)))
      .orderBy(desc(sessions.lastUsedAt));
    return rows.map((row) => ({
      id: row.id,
      current: row.id === currentSessionId,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt.toISOString(),
      ip: row.ip,
      userAgent: row.userAgent,
    }));
  }

  private sign(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(userId)
      .setIssuer(this.config.JWT_ISSUER)
      .setAudience(this.config.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${this.config.ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.key);
  }
}
