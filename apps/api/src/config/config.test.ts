import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.js";

const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  CORS_ORIGINS: "https://app.swarppay.com, http://localhost:3000",
  JWT_SECRET: "j".repeat(32),
  PIN_PEPPER: "p".repeat(32),
  TWILIO_ACCOUNT_SID: `AC${"1".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "t".repeat(32),
  TWILIO_VERIFY_SERVICE_SID: `VA${"2".repeat(32)}`,
};

describe("loadConfig", () => {
  it("parses a valid environment with defaults", () => {
    const config = loadConfig(valid);
    expect(config.CORS_ORIGINS).toEqual(["https://app.swarppay.com", "http://localhost:3000"]);
    expect(config.PORT).toBe(3001);
    expect(config.COOKIE_SECURE).toBe(true);
    expect(config.OTP_ALLOWED_COUNTRIES).toEqual([]);
  });

  it("lists every problem at once", () => {
    const error = (() => {
      try {
        loadConfig({ ...valid, JWT_SECRET: "short", TWILIO_ACCOUNT_SID: "nope", CORS_ORIGINS: "app.swarppay.com" });
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(ConfigError);
    expect(String(error)).toMatch(/JWT_SECRET/);
    expect(String(error)).toMatch(/TWILIO_ACCOUNT_SID/);
    expect(String(error)).toMatch(/CORS_ORIGINS/);
  });

  it("refuses insecure cookies in production and a reused secret", () => {
    expect(() => loadConfig({ ...valid, NODE_ENV: "production", COOKIE_SECURE: "false" })).toThrow(/COOKIE_SECURE/);
    expect(() => loadConfig({ ...valid, PIN_PEPPER: valid.JWT_SECRET })).toThrow(/PIN_PEPPER/);
  });

  it("normalises the SMS country allow-list", () => {
    expect(loadConfig({ ...valid, OTP_ALLOWED_COUNTRIES: "az, tr,GE" }).OTP_ALLOWED_COUNTRIES).toEqual(["AZ", "TR", "GE"]);
    expect(() => loadConfig({ ...valid, OTP_ALLOWED_COUNTRIES: "AZE" })).toThrow(/OTP_ALLOWED_COUNTRIES/);
  });
});
