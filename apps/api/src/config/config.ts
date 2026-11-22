import { z } from "zod";

/** Injection token for the validated configuration object. */
export const APP_CONFIG = Symbol("APP_CONFIG");

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const originList = z
  .string()
  .min(1)
  .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
  .pipe(
    z
      .array(
        z
          .string()
          .regex(/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i, "must be an origin such as https://app.example.com"),
      )
      .min(1),
  );

const countryList = z
  .string()
  .transform((value) => value.split(",").map((code) => code.trim().toUpperCase()).filter(Boolean))
  .pipe(z.array(z.string().regex(/^[A-Z]{2}$/, "must be ISO 3166-1 alpha-2 codes")));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  /** Set when running behind a load balancer so client IPs come from X-Forwarded-For. */
  TRUST_PROXY: booleanString.default(false),

  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "must be a postgres:// URL"),
  DATABASE_SSL: booleanString.default(false),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  /** Browser origins allowed to call the API (the dashboard and admin console). */
  CORS_ORIGINS: originList,

  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_ISSUER: z.string().min(1).default("swarp-api"),
  JWT_AUDIENCE: z.string().min(1).default("swarp-app"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3_600),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  /** Cookie flags for the refresh token. Secure must stay on outside local HTTP development. */
  COOKIE_SECURE: booleanString.default(true),
  COOKIE_DOMAIN: z.string().optional(),

  /** Server-side secret mixed into every PIN hash (Argon2 "secret"). Keep it out of the database. */
  PIN_PEPPER: z.string().min(32, "must be at least 32 characters"),
  /** How long a PIN unlock keeps a session able to use wallet features. */
  SESSION_UNLOCK_TTL_SECONDS: z.coerce.number().int().min(60).default(43_200),
  /** How recently the PIN must have been entered for value-moving actions. */
  PIN_STEP_UP_TTL_SECONDS: z.coerce.number().int().min(30).max(3_600).default(300),
  PIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  PIN_LOCKOUT_BASE_MINUTES: z.coerce.number().int().min(1).default(15),

  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[0-9a-f]{32}$/i, "must be a Twilio Account SID (AC…)"),
  TWILIO_AUTH_TOKEN: z.string().min(16),
  TWILIO_VERIFY_SERVICE_SID: z.string().regex(/^VA[0-9a-f]{32}$/i, "must be a Twilio Verify Service SID (VA…)"),

  OTP_MAX_PER_PHONE_10_MIN: z.coerce.number().int().min(1).default(3),
  OTP_MAX_PER_PHONE_DAY: z.coerce.number().int().min(1).default(10),
  OTP_MAX_PER_IP_HOUR: z.coerce.number().int().min(1).default(20),
  /** Countries SMS codes may be sent to. Empty allows all; restricting it is the main SMS-pumping defence. */
  OTP_ALLOWED_COUNTRIES: countryList.default([]),
});

export type AppConfig = z.output<typeof schema>;

export class ConfigError extends Error {}

/** Parse and validate configuration; throws ConfigError listing every problem. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    throw new ConfigError(`Invalid configuration:\n${problems.join("\n")}`);
  }
  const config = result.data;
  if (config.NODE_ENV === "production" && !config.COOKIE_SECURE) {
    throw new ConfigError("Invalid configuration:\n  COOKIE_SECURE: must be true in production");
  }
  if (config.JWT_SECRET === config.PIN_PEPPER) {
    throw new ConfigError("Invalid configuration:\n  PIN_PEPPER: must differ from JWT_SECRET");
  }
  return config;
}
