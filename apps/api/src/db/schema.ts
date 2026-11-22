import { sql } from "drizzle-orm";
import { bigserial, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** E.164, e.g. +14155550123. Unique: one account per phone number. */
  phoneE164: text("phone_e164").unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  /** ISO 3166-1 alpha-2 citizenship chosen during onboarding. */
  country: text("country"),
  status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
  ...timestamps,
});

/**
 * One row per signed-in device. The access JWT carries the session id, so a
 * revoked or expired row invalidates the token immediately.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 of the current refresh token; the token itself is never stored. */
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),
    /** Last successful PIN entry in this session; null means "PIN pending". */
    pinVerifiedAt: timestamp("pin_verified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const walletPins = pgTable("wallet_pins", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Argon2id PHC string, computed with the server-side pepper. */
  pinHash: text("pin_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  /** Number of lockouts since the last correct PIN; each one doubles the lock period. */
  lockoutLevel: integer("lockout_level").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  ...timestamps,
});

/** Log of SMS code requests, used for per-phone and per-IP throttling. */
export const otpRequests = pgTable(
  "otp_requests",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    phoneE164: text("phone_e164").notNull(),
    ip: text("ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("otp_requests_phone_created_idx").on(table.phoneE164, table.createdAt),
    index("otp_requests_ip_created_idx").on(table.ip, table.createdAt),
  ],
);

/** Security-relevant events (sign-in, PIN changes, lockouts). Never contains secrets. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_user_created_idx").on(table.userId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
