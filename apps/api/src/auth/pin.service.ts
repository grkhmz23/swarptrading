import { BadRequestException, ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";
import { eq, sql } from "drizzle-orm";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { DB, type Database } from "../db/database.js";
import { walletPins } from "../db/schema.js";
import { checkNewPin, isPinFormat, pinProblemMessage } from "./pin-rules.js";

/** OWASP minimum for Argon2id: 19 MiB memory, 2 iterations, 1 lane. The library defaults to Argon2id. */
const ARGON2_COST = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
const MAX_LOCK_MINUTES = 24 * 60;

export type PinCheck =
  | { outcome: "ok" }
  | { outcome: "wrong"; attemptsLeft: number }
  | { outcome: "locked"; retryAfterSeconds: number; newlyLocked: boolean };

export class PinLockedException extends HttpException {
  constructor(retryAfterSeconds: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    super(
      { message: `Too many incorrect PIN attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, error: "PIN Locked", retryAfterSeconds },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Wallet PIN storage and checking. A 6-digit PIN has only 10^6 values, so the
 * hash alone cannot protect it: the real controls are the server-side pepper
 * (an Argon2 secret held outside the database) and the attempt lockout.
 */
@Injectable()
export class PinService {
  private readonly pepper: Buffer;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    this.pepper = Buffer.from(config.PIN_PEPPER, "utf8");
  }

  async hasPin(userId: string): Promise<boolean> {
    const [row] = await this.db.select({ userId: walletPins.userId }).from(walletPins).where(eq(walletPins.userId, userId));
    return Boolean(row);
  }

  /** Sets the first PIN. 409 when one exists: changing requires the old PIN. */
  async setInitial(userId: string, pin: string): Promise<void> {
    this.assertAcceptable(pin);
    const pinHash = await this.hash(pin);
    const inserted = await this.db
      .insert(walletPins)
      .values({ userId, pinHash })
      .onConflictDoNothing({ target: walletPins.userId })
      .returning({ userId: walletPins.userId });
    if (inserted.length === 0) throw new ConflictException("A wallet PIN is already set. Use change PIN instead.");
  }

  /**
   * Checks a PIN and records the result atomically. The row is locked for the
   * duration of the check, so parallel guesses are serialised.
   */
  async check(userId: string, pin: string): Promise<PinCheck> {
    if (!isPinFormat(pin)) throw new BadRequestException("PIN must be exactly 6 digits");
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(walletPins).where(eq(walletPins.userId, userId)).for("update");
      if (!row) throw new NotFoundException("No wallet PIN is set for this account.");

      const now = Date.now();
      if (row.lockedUntil && row.lockedUntil.getTime() > now) {
        return { outcome: "locked", retryAfterSeconds: Math.ceil((row.lockedUntil.getTime() - now) / 1000), newlyLocked: false } as const;
      }

      if (await verify(row.pinHash, pin, { secret: this.pepper })) {
        await tx
          .update(walletPins)
          .set({ failedAttempts: 0, lockoutLevel: 0, lockedUntil: null, updatedAt: sql`now()` })
          .where(eq(walletPins.userId, userId));
        return { outcome: "ok" } as const;
      }

      const failures = row.failedAttempts + 1;
      if (failures >= this.config.PIN_MAX_ATTEMPTS) {
        const minutes = Math.min(this.config.PIN_LOCKOUT_BASE_MINUTES * 2 ** row.lockoutLevel, MAX_LOCK_MINUTES);
        await tx
          .update(walletPins)
          .set({
            failedAttempts: 0,
            lockoutLevel: row.lockoutLevel + 1,
            lockedUntil: new Date(now + minutes * 60_000),
            updatedAt: sql`now()`,
          })
          .where(eq(walletPins.userId, userId));
        return { outcome: "locked", retryAfterSeconds: minutes * 60, newlyLocked: true } as const;
      }
      await tx.update(walletPins).set({ failedAttempts: failures, updatedAt: sql`now()` }).where(eq(walletPins.userId, userId));
      return { outcome: "wrong", attemptsLeft: this.config.PIN_MAX_ATTEMPTS - failures } as const;
    });
  }

  /** Throws the HTTP error for a failed check (after the failure has been committed). */
  static throwFor(result: Exclude<PinCheck, { outcome: "ok" }>): never {
    if (result.outcome === "locked") throw new PinLockedException(result.retryAfterSeconds);
    throw new UnauthorizedException(
      `Incorrect PIN. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} left before a temporary lock.`,
    );
  }

  async replace(userId: string, newPin: string): Promise<void> {
    this.assertAcceptable(newPin);
    const pinHash = await this.hash(newPin);
    await this.db
      .update(walletPins)
      .set({ pinHash, failedAttempts: 0, lockoutLevel: 0, lockedUntil: null, updatedAt: sql`now()` })
      .where(eq(walletPins.userId, userId));
  }

  private assertAcceptable(pin: string): void {
    const problem = checkNewPin(pin);
    if (problem) throw new BadRequestException(pinProblemMessage(problem));
  }

  private hash(pin: string): Promise<string> {
    return hash(pin, { ...ARGON2_COST, secret: this.pepper });
  }
}
