import { verify } from "@node-rs/argon2";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { SignJWT } from "jose";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, FakeOtpProvider, resetDatabase, testConfig, testDatabaseUrl } from "./helpers.js";

const otp = new FakeOtpProvider();
let app: NestFastifyApplication;
let db: pg.Pool;
let ipCounter = 0;

interface CallOptions {
  token?: string;
  body?: unknown;
  rawBody?: string;
  cookie?: string;
  ip?: string;
  headers?: Record<string, string>;
}

async function call(method: "GET" | "POST" | "DELETE" | "OPTIONS", url: string, options: CallOptions = {}) {
  const headers: Record<string, string> = { ...options.headers };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined || options.rawBody !== undefined) headers["content-type"] = "application/json";
  return app.getHttpAdapter().getInstance().inject({
    method,
    url,
    headers,
    payload: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    remoteAddress: options.ip ?? "203.0.113.1",
  });
}

/** A unique, valid UK mobile number per call. */
let phoneCounter = 0;
function newPhone(): string {
  phoneCounter += 1;
  return `+447400${String(phoneCounter).padStart(6, "0")}`;
}

async function signIn(phone = newPhone()) {
  const ip = `198.51.100.${++ipCounter}`;
  otp.setCode(phone, "246810");
  const sent = await call("POST", "/auth/continue-with-phone", { body: { phoneNumber: phone }, ip });
  expect(sent.statusCode).toBe(200);
  const res = await call("POST", "/auth/verify-otp", { body: { phoneNumber: phone, otp: "246810" }, ip });
  expect(res.statusCode).toBe(200);
  const refresh = res.cookies.find((c) => c.name === "swarp_rt");
  const body = res.json() as { token: string; user: { id: string } };
  return { phone, token: body.token, userId: body.user.id, refreshCookie: `swarp_rt=${refresh?.value}`, refresh, ip };
}

async function signInWithPin(pin = "482913") {
  const session = await signIn();
  const res = await call("POST", "/auth/set-wallet-pin", { token: session.token, body: { pin } });
  expect(res.statusCode).toBe(200);
  return session;
}

beforeAll(async () => {
  await resetDatabase();
  app = await createTestApp(testConfig({ OTP_MAX_PER_IP_HOUR: "1000" }), otp);
  db = new pg.Pool({ connectionString: testDatabaseUrl(), max: 2 });
});

afterAll(async () => {
  await app?.close();
  await db?.end();
});

describe("platform", () => {
  it("reports health", async () => {
    const res = await call("GET", "/health");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("uses the { statusCode, message, error } error shape", async () => {
    const missing = await call("GET", "/nope");
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ statusCode: 404, error: "Not Found" });

    const malformed = await call("POST", "/auth/continue-with-phone", { rawBody: "{not json" });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toMatchObject({ statusCode: 400, error: "Bad Request" });
    expect(typeof malformed.json().message).toBe("string");
  });

  it("rate-limits sign-in routes per IP with the same error shape", async () => {
    const statuses: number[] = [];
    let last;
    for (let i = 0; i < 11; i++) {
      last = await call("POST", "/auth/refresh", { ip: "192.0.2.200" });
      statuses.push(last.statusCode);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(last?.json()).toMatchObject({ statusCode: 429, error: "Too Many Requests" });
  });

  it("answers CORS preflight only for configured origins, allowing Idempotency-Key", async () => {
    const preflight = (origin: string) =>
      call("OPTIONS", "/auth/verify-otp", {
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type,idempotency-key,authorization",
        },
      });
    const allowed = await preflight("https://app.example.test");
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://app.example.test");
    expect(String(allowed.headers["access-control-allow-headers"]).toLowerCase()).toContain("idempotency-key");
    const denied = await preflight("https://evil.example");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("SMS sign-in", () => {
  it("validates numbers and returns the same response for new and existing accounts", async () => {
    expect((await call("POST", "/auth/continue-with-phone", { body: { phoneNumber: "07700 900123" } })).statusCode).toBe(400);
    expect((await call("POST", "/auth/continue-with-phone", { body: {} })).statusCode).toBe(400);

    const existing = await signIn();
    const fresh = newPhone();
    const forExisting = await call("POST", "/auth/continue-with-phone", { body: { phoneNumber: existing.phone }, ip: "192.0.2.10" });
    const forFresh = await call("POST", "/auth/continue-with-phone", { body: { phoneNumber: fresh }, ip: "192.0.2.11" });
    expect(forExisting.statusCode).toBe(200);
    expect(forExisting.json()).toEqual(forFresh.json());
    expect(otp.sent).toContain(fresh);
  });

  it("limits code requests per number", async () => {
    const phone = newPhone();
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await call("POST", "/auth/continue-with-phone", { body: { phoneNumber: phone }, ip: `192.0.2.${20 + i}` })).statusCode);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
    const audit = await db.query("select count(*)::int as n from audit_events where type = 'otp.throttled'");
    expect(audit.rows[0].n).toBeGreaterThanOrEqual(1);
  });

  it("rejects wrong and expired codes, then signs in with a PIN-pending session", async () => {
    const phone = newPhone();
    otp.setCode(phone, "135790");
    const wrong = await call("POST", "/auth/verify-otp", { body: { phoneNumber: phone, otp: "111111" } });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json().message).toMatch(/invalid code/i);

    otp.expire(phone);
    const expired = await call("POST", "/auth/verify-otp", { body: { phoneNumber: phone, otp: "135790" } });
    expect(expired.statusCode).toBe(401);
    expect(expired.json().message).toMatch(/expired/i);

    const first = await signIn(phone);
    expect(first.token.split(".")).toHaveLength(3);
    expect(first.refresh).toMatchObject({ httpOnly: true, sameSite: "Strict", path: "/auth" });

    const again = await signIn(phone);
    expect(again.userId).toBe(first.userId);

    // PIN-pending: profile and PIN endpoints work, wallet-level routes do not.
    expect((await call("GET", "/auth/profile", { token: first.token })).json()).toMatchObject({ id: first.userId, phoneNumber: phone });
    expect((await call("GET", "/auth/has-wallet-pin", { token: first.token })).json()).toEqual({ hasPIN: false });
    const locked = await call("GET", "/auth/sessions", { token: first.token });
    expect(locked.statusCode).toBe(403);
    expect(locked.json()).toMatchObject({ error: "PIN Required" });
  });

  it("rejects missing, malformed, forged and revoked tokens", async () => {
    const session = await signIn();
    expect((await call("GET", "/auth/profile")).statusCode).toBe(401);
    expect((await call("GET", "/auth/profile", { token: "not.a.jwt" })).statusCode).toBe(401);

    const forged = await new SignJWT({ sid: "00000000-0000-4000-8000-000000000000" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(session.userId)
      .setIssuer("swarp-api")
      .setAudience("swarp-app")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("another-secret-another-secret-another-secret"));
    expect((await call("GET", "/auth/profile", { token: forged })).statusCode).toBe(401);

    expect((await call("POST", "/auth/logout", { token: session.token })).statusCode).toBe(200);
    expect((await call("GET", "/auth/profile", { token: session.token })).statusCode).toBe(401);
  });
});

describe("wallet PIN", () => {
  it("enforces PIN rules, refuses to overwrite, and stores a peppered Argon2id hash", async () => {
    const session = await signIn();
    const weak = await call("POST", "/auth/set-wallet-pin", { token: session.token, body: { pin: "123456" } });
    expect(weak.statusCode).toBe(400);
    expect(weak.json().message).toMatch(/sequence/);

    expect((await call("POST", "/auth/set-wallet-pin", { token: session.token, body: { pin: "482913" } })).statusCode).toBe(200);
    expect((await call("GET", "/auth/has-wallet-pin", { token: session.token })).json()).toEqual({ hasPIN: true });
    expect((await call("GET", "/auth/sessions", { token: session.token })).statusCode).toBe(200);
    expect((await call("POST", "/auth/set-wallet-pin", { token: session.token, body: { pin: "739104" } })).statusCode).toBe(409);

    const stored = await db.query("select pin_hash from wallet_pins where user_id = $1", [session.userId]);
    const pinHash: string = stored.rows[0].pin_hash;
    expect(pinHash.startsWith("$argon2id$")).toBe(true);
    expect(pinHash).not.toContain("482913");
    // Without the server-side pepper the hash does not verify.
    expect(await verify(pinHash, "482913")).toBe(false);
  });

  it("unlocks with the right PIN and locks after repeated wrong ones", async () => {
    const owner = await signInWithPin("482913");
    const device = await signIn(owner.phone);
    expect((await call("GET", "/auth/sessions", { token: device.token })).statusCode).toBe(403);

    const first = await call("POST", "/auth/verify-wallet-pin", { token: device.token, body: { pin: "000001" } });
    expect(first.statusCode).toBe(401);
    expect(first.json().message).toMatch(/4 attempts left/);
    for (let i = 0; i < 3; i++) {
      expect((await call("POST", "/auth/verify-wallet-pin", { token: device.token, body: { pin: "000001" } })).statusCode).toBe(401);
    }
    const lock = await call("POST", "/auth/verify-wallet-pin", { token: device.token, body: { pin: "000001" } });
    expect(lock.statusCode).toBe(429);
    expect(lock.json()).toMatchObject({ error: "PIN Locked" });
    expect(lock.json().message).toMatch(/15 minutes/);

    // Even the right PIN is refused while locked.
    expect((await call("POST", "/auth/verify-wallet-pin", { token: device.token, body: { pin: "482913" } })).statusCode).toBe(429);

    await db.query("update wallet_pins set locked_until = now() - interval '1 second' where user_id = $1", [owner.userId]);
    const ok = await call("POST", "/auth/verify-wallet-pin", { token: device.token, body: { pin: "482913" } });
    expect(ok.statusCode).toBe(200);
    expect((await call("GET", "/auth/sessions", { token: device.token })).statusCode).toBe(200);
    const row = await db.query("select failed_attempts, lockout_level, locked_until from wallet_pins where user_id = $1", [owner.userId]);
    expect(row.rows[0]).toMatchObject({ failed_attempts: 0, lockout_level: 0, locked_until: null });

    const types = await db.query("select type from audit_events where user_id = $1", [owner.userId]);
    expect(types.rows.map((r: { type: string }) => r.type)).toEqual(expect.arrayContaining(["pin.failed", "pin.locked", "pin.verified"]));
    const leaked = await db.query("select count(*)::int as n from audit_events where metadata::text like '%482913%' or metadata::text like '%246810%'");
    expect(leaked.rows[0].n).toBe(0);
  });

  it("changes the PIN with the old one and signs out other devices", async () => {
    const phone = newPhone();
    const main = await signIn(phone);
    await call("POST", "/auth/set-wallet-pin", { token: main.token, body: { pin: "482913" } });
    const other = await signIn(phone);
    expect((await call("GET", "/auth/profile", { token: other.token })).statusCode).toBe(200);

    expect((await call("POST", "/auth/change-passcode", { token: main.token, body: { oldPasscode: "000001", newPasscode: "739104" } })).statusCode).toBe(401);
    expect((await call("POST", "/auth/change-passcode", { token: main.token, body: { oldPasscode: "482913", newPasscode: "111111" } })).statusCode).toBe(400);
    expect((await call("POST", "/auth/change-passcode", { token: main.token, body: { oldPasscode: "482913", newPasscode: "482913" } })).statusCode).toBe(400);

    const changed = await call("POST", "/auth/change-passcode", { token: main.token, body: { oldPasscode: "482913", newPasscode: "739104" } });
    expect(changed.statusCode).toBe(200);
    expect((await call("GET", "/auth/profile", { token: other.token })).statusCode).toBe(401);
    expect((await call("GET", "/auth/sessions", { token: main.token })).statusCode).toBe(200);
    expect((await call("POST", "/auth/verify-wallet-pin", { token: main.token, body: { pin: "739104" } })).statusCode).toBe(200);
  });
});

describe("sessions", () => {
  it("rotates the refresh cookie and rejects the old one", async () => {
    const session = await signIn();
    const refreshed = await call("POST", "/auth/refresh", { cookie: session.refreshCookie });
    expect(refreshed.statusCode).toBe(200);
    const newToken = refreshed.json().token as string;
    expect((await call("GET", "/auth/profile", { token: newToken })).statusCode).toBe(200);
    const rotated = refreshed.cookies.find((c) => c.name === "swarp_rt");
    expect(rotated?.value).toBeTruthy();
    expect(rotated?.value).not.toBe(session.refresh?.value);

    expect((await call("POST", "/auth/refresh", { cookie: session.refreshCookie })).statusCode).toBe(401);
    expect((await call("POST", "/auth/refresh")).statusCode).toBe(401);
    expect((await call("POST", "/auth/refresh", { cookie: `swarp_rt=${rotated?.value}` })).statusCode).toBe(200);
  });

  it("lists devices and signs one out", async () => {
    const main = await signInWithPin();
    const other = await signIn(main.phone);
    const list = await call("GET", "/auth/sessions", { token: main.token });
    const sessions = list.json().sessions as { id: string; current: boolean }[];
    expect(sessions).toHaveLength(2);
    const otherId = sessions.find((s) => !s.current)?.id;

    expect((await call("DELETE", "/auth/sessions/not-a-uuid", { token: main.token })).statusCode).toBe(400);
    expect((await call("DELETE", "/auth/sessions/00000000-0000-4000-8000-000000000000", { token: main.token })).statusCode).toBe(404);
    expect((await call("DELETE", `/auth/sessions/${otherId}`, { token: main.token })).statusCode).toBe(200);
    expect((await call("GET", "/auth/profile", { token: other.token })).statusCode).toBe(401);
  });

  it("saves the country from the token, ignoring identity fields in the body", async () => {
    const session = await signIn();
    const someoneElse = await signIn();
    expect((await call("POST", "/auth/update-country", { token: session.token, body: { country: "USA" } })).statusCode).toBe(400);
    const ok = await call("POST", "/auth/update-country", {
      token: session.token,
      body: { country: "az", phoneNumber: someoneElse.phone },
    });
    expect(ok.statusCode).toBe(200);
    expect((await call("GET", "/auth/profile", { token: session.token })).json().country).toBe("AZ");
    expect((await call("GET", "/auth/profile", { token: someoneElse.token })).json().country).toBeNull();
  });
});
