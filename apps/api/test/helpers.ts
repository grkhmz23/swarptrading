import "reflect-metadata";
import { Test } from "@nestjs/testing";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import pg from "pg";
import { AppModule } from "../src/app.module.js";
import { configureApp, createAdapter } from "../src/bootstrap.js";
import { type AppConfig, loadConfig } from "../src/config/config.js";
import { createDatabase, runMigrations } from "../src/db/database.js";
import { OTP_PROVIDER, type OtpCheckResult, type OtpProvider } from "../src/auth/otp/otp.provider.js";

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL (a disposable database whose name ends in _test) to run integration tests.");
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`Refusing to reset database "${name}": its name must end in _test.`);
  return url;
}

export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: testDatabaseUrl(),
    CORS_ORIGINS: "https://app.example.test",
    JWT_SECRET: "test-jwt-secret-0123456789abcdef0123456789",
    PIN_PEPPER: "test-pin-pepper-0123456789abcdef0123456789",
    COOKIE_SECURE: "false",
    TWILIO_ACCOUNT_SID: `AC${"0".repeat(32)}`,
    TWILIO_AUTH_TOKEN: "0123456789abcdef0123456789abcdef",
    TWILIO_VERIFY_SERVICE_SID: `VA${"0".repeat(32)}`,
    ...overrides,
  });
}

/** Drops and recreates the schema, then applies migrations. Only ever touches *_test databases. */
export async function resetDatabase(): Promise<void> {
  const pool = new pg.Pool({ connectionString: testDatabaseUrl(), max: 1 });
  try {
    await pool.query("drop schema if exists drizzle cascade; drop schema public cascade; create schema public;");
    await runMigrations(createDatabase(pool));
  } finally {
    await pool.end();
  }
}

/** Test double for the SMS provider: records sends, approves the code set per number. */
export class FakeOtpProvider implements OtpProvider {
  readonly sent: string[] = [];
  private readonly codes = new Map<string, string>();
  private readonly expired = new Set<string>();

  async send(phoneE164: string): Promise<void> {
    this.sent.push(phoneE164);
  }

  setCode(phoneE164: string, code: string): void {
    this.codes.set(phoneE164, code);
    this.expired.delete(phoneE164);
  }

  expire(phoneE164: string): void {
    this.expired.add(phoneE164);
  }

  async check(phoneE164: string, code: string): Promise<OtpCheckResult> {
    if (this.expired.has(phoneE164)) return "expired";
    return this.codes.get(phoneE164) === code ? "approved" : "invalid";
  }
}

export async function createTestApp(config: AppConfig, otp: OtpProvider): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] })
    .overrideProvider(OTP_PROVIDER)
    .useValue(otp)
    .compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(createAdapter(config, { logger: false }), { logger: false });
  await configureApp(app, config);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
