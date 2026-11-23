import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { APP_CONFIG, type AppConfig } from "../../config/config.js";
import { DB, type Database } from "../../db/database.js";
import { otpRequests } from "../../db/schema.js";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Database-backed limits on SMS code requests, so they hold across API
 * instances. Twilio Verify applies its own limits and Fraud Guard on top.
 */
@Injectable()
export class OtpThrottleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OtpThrottleService.name);
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Records the request and returns true when it is within limits. */
  async reserve(phoneE164: string, ip: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Serialise requests for the same number so parallel calls cannot both pass the count.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`otp:${phoneE164}`}))`);
      const result = await tx.execute<{ phone_10m: string; phone_day: string; ip_hour: string }>(sql`
        select
          count(*) filter (where phone_e164 = ${phoneE164} and created_at > now() - interval '10 minutes') as phone_10m,
          count(*) filter (where phone_e164 = ${phoneE164}) as phone_day,
          count(*) filter (where ip = ${ip} and created_at > now() - interval '1 hour') as ip_hour
        from otp_requests
        where (phone_e164 = ${phoneE164} or ip = ${ip}) and created_at > now() - interval '1 day'
      `);
      const counts = result.rows[0];
      const withinLimits =
        Number(counts?.phone_10m ?? 0) < this.config.OTP_MAX_PER_PHONE_10_MIN &&
        Number(counts?.phone_day ?? 0) < this.config.OTP_MAX_PER_PHONE_DAY &&
        Number(counts?.ip_hour ?? 0) < this.config.OTP_MAX_PER_IP_HOUR;
      if (withinLimits) {
        await tx.insert(otpRequests).values({ phoneE164, ip });
      }
      return withinLimits;
    });
  }

  /** Rows older than the longest window are no longer needed. */
  async deleteExpired(): Promise<number> {
    const result = await this.db.execute(sql`delete from otp_requests where created_at < now() - interval '2 days'`);
    return result.rowCount ?? 0;
  }

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => {
      this.deleteExpired().catch((error: unknown) => this.logger.warn(`otp_requests cleanup failed: ${String(error)}`));
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
}
