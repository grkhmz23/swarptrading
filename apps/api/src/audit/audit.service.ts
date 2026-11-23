import { Inject, Injectable } from "@nestjs/common";
import type { RequestMeta } from "../common/request-meta.js";
import { DB, type Database } from "../db/database.js";
import { auditEvents } from "../db/schema.js";

export type AuditEventType =
  | "otp.sent"
  | "otp.send_failed"
  | "otp.throttled"
  | "auth.login"
  | "auth.otp_rejected"
  | "auth.refresh"
  | "auth.logout"
  | "session.revoked"
  | "pin.set"
  | "pin.verified"
  | "pin.failed"
  | "pin.locked"
  | "pin.changed"
  | "profile.country_updated";

export interface AuditInput {
  userId?: string | null;
  meta?: RequestMeta;
  /** Non-secret details only: never PINs, codes or tokens. */
  metadata?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async record(type: AuditEventType, input: AuditInput = {}): Promise<void> {
    await this.db.insert(auditEvents).values({
      type,
      userId: input.userId ?? null,
      ip: input.meta?.ip ?? null,
      userAgent: input.meta?.userAgent ?? null,
      metadata: input.metadata ?? {},
    });
  }
}
