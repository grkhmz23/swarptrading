import { beforeEach, describe, expect, it } from "vitest";
import { handle } from "./app";
import { loadConfig, ConfigError, type PreviewConfig } from "./config";
import { issueToken, verifyToken } from "./auth";
import { base58Decode, base58Encode, isSolanaAddress } from "./base58";
import { resetPreviewState } from "./state";
import { PREVIEW_DISABLED } from "./http";

const ENV = {
  PREVIEW_JWT_SECRET: "x".repeat(40),
  PREVIEW_ACCESS_CODE: "482913",
  PREVIEW_ALLOWED_ORIGINS: "http://localhost:3000,https://swarp-dash-*.vercel.app",
} as unknown as NodeJS.ProcessEnv;

const cfg: PreviewConfig = loadConfig(ENV);
const API = "https://preview.example.test";

async function call(method: string, path: string, opts: { body?: unknown; token?: string; origin?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.origin) headers.Origin = opts.origin;
  const res = await handle(
    new Request(`${API}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }),
    cfg
  );
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : undefined };
}

async function signIn(): Promise<string> {
  const res = await call("POST", "/auth/login-with-passcode", { body: { phoneNumber: "+15550100", passcode: "482913" } });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

beforeEach(() => resetPreviewState());

describe("config", () => {
  it("requires the secret, access code and origins", () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(ConfigError);
    expect(() => loadConfig({ ...ENV, PREVIEW_ACCESS_CODE: "12345" })).toThrow(/6 digits/);
    expect(() => loadConfig({ ...ENV, PREVIEW_ALLOWED_ORIGINS: "http://evil.example" })).toThrow(/https/);
  });

  it("derives a valid wallet address when none is configured", () => {
    expect(isSolanaAddress(cfg.walletAddress)).toBe(true);
  });
});

describe("base58", () => {
  it("round-trips 32-byte keys and recognises real mints", () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, i) => (i * 37) & 0xff);
    expect(base58Decode(base58Encode(bytes))).toEqual(bytes);
    expect(isSolanaAddress("So11111111111111111111111111111111111111112")).toBe(true);
    expect(isSolanaAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(true);
    expect(isSolanaAddress("not-an-address-0OIl")).toBe(false);
  });
});

describe("tokens", () => {
  it("rejects tampered and expired tokens", () => {
    const token = issueToken(cfg.jwtSecret, "u1", "+1555", 1_000);
    expect(verifyToken(cfg.jwtSecret, token, 1_001)?.sub).toBe("u1");
    expect(verifyToken(cfg.jwtSecret, token, 1_000 + 9 * 3600)).toBeNull();
    expect(verifyToken("y".repeat(40), token, 1_001)).toBeNull();
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", iat: 1000, exp: 99999999999 })).toString("base64url");
    expect(verifyToken(cfg.jwtSecret, `${h}.${forged}.${s}`, 1_001)).toBeNull();
  });
});

describe("sign-in", () => {
  it("routes an existing phone user to passcode login", async () => {
    const res = await call("POST", "/auth/continue-with-phone", { body: { phoneNumber: "+15550100" } });
    expect(res.body).toMatchObject({ isNewUser: false, requiresOnboarding: false, hasWalletPIN: true });
  });

  it("accepts only the access code", async () => {
    expect((await call("POST", "/auth/login-with-passcode", { body: { phoneNumber: "+15550100", passcode: "000000" } })).status).toBe(401);
    expect((await call("POST", "/auth/verify-otp", { body: { phoneNumber: "+15550100", otp: "111111" } })).status).toBe(400);
    const otp = await call("POST", "/auth/verify-otp", { body: { phoneNumber: "+15550100", otp: "482913" } });
    expect(otp.status).toBe(200);
    expect(otp.body.user.phoneNumber).toBe("+15550100");
  });

  it("checks the wallet PIN and refuses to overwrite it", async () => {
    const token = await signIn();
    expect((await call("POST", "/auth/verify-wallet-pin", { token, body: { pin: "482913" } })).status).toBe(200);
    expect((await call("POST", "/auth/verify-wallet-pin", { token, body: { pin: "123456" } })).status).toBe(401);
    expect((await call("POST", "/auth/set-wallet-pin", { token, body: { pin: "135790" } })).status).toBe(409);
  });

  it("requires a session for account data", async () => {
    expect((await call("GET", "/auth/profile")).status).toBe(401);
    expect((await call("GET", "/auth/profile", { token: "a.b.c" })).status).toBe(401);
    const res = await call("GET", "/auth/profile", { token: await signIn() });
    expect(res.body).toMatchObject({ phoneNumber: "+15550100", username: "swarp_preview" });
  });
});

describe("money actions are disabled", () => {
  it.each([
    ["POST", "/wallet/preview-wallet/send-transaction"],
    ["POST", "/wallet/preview-wallet/swap/execute"],
    ["POST", "/launchpad/projects/orbit-cats/custodial/buy"],
    ["POST", "/launchpad/projects/orbit-cats/custodial/sell"],
    ["POST", "/launchpad/custodial/create-token"],
    ["POST", "/staking/stake"],
    ["POST", "/staking/withdraw/stake-1"],
    ["DELETE", "/auth/delete-account"],
    ["POST", "/auth/change-passcode"],
  ])("%s %s", async (method, path) => {
    const res = await call(method, path, { token: await signIn(), body: {} });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(PREVIEW_DISABLED);
  });
});

describe("wallet and market", () => {
  it("quotes swaps by mint with slippage applied", async () => {
    const token = await signIn();
    const res = await call("POST", "/wallet/preview-wallet/swap/quote", {
      token,
      body: { inputToken: "SOL", outputToken: "USDC", inputMint: "So11111111111111111111111111111111111111112", outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: 1, slippageTolerance: 1 },
    });
    expect(res.status).toBe(200);
    expect(res.body.outputAmount).toBeGreaterThan(140);
    expect(res.body.minimumOutputAmount).toBeCloseTo(res.body.outputAmount * 0.99, 4);
    expect(res.body.validUntil).toBeGreaterThan(Date.now());
  });

  it("only serves the preview wallet", async () => {
    const res = await call("GET", "/wallet/other/transactions", { token: await signIn() });
    expect(res.status).toBe(404);
  });
});

describe("launchpad", () => {
  it("lists, filters and paginates projects", async () => {
    const all = await call("GET", "/launchpad/projects?status=all&limit=5&sortBy=marketCap&sortOrder=desc");
    expect(all.body.total).toBe(12);
    expect(all.body.projects).toHaveLength(5);
    const caps = all.body.projects.map((p: { marketCap: number }) => p.marketCap);
    expect([...caps].sort((a: number, b: number) => b - a)).toEqual(caps);
    const live = await call("GET", "/launchpad/projects/live?limit=50");
    expect(live.body.projects.every((p: { status: string }) => p.status === "bonding")).toBe(true);
  });

  it("returns a trade tape ending at the current price", async () => {
    const project = await call("GET", "/launchpad/projects/orbit-cats");
    const trades = await call("GET", "/launchpad/projects/orbit-cats/trades?limit=50");
    expect(trades.body.trades).toHaveLength(50);
    expect(trades.body.trades[0].price).toBe(project.body.price);
  });

  it("toggles the watchlist and manages alerts", async () => {
    const token = await signIn();
    const toggled = await call("POST", "/launchpad/projects/pixel-forge/watchlist", { token });
    expect(toggled.body.isWatching).toBe(true);
    const created = await call("POST", "/launchpad/alerts", { token, body: { projectId: "pixel-forge", condition: "goes_over", targetPrice: 0.00002 } });
    expect(created.status).toBe(200);
    const id = created.body.alert.id;
    expect((await call("PATCH", `/launchpad/alerts/${id}`, { token, body: { status: "cancelled" } })).body.alert.status).toBe("cancelled");
    expect((await call("DELETE", `/launchpad/alerts/${id}`, { token })).status).toBe(200);
    expect((await call("POST", "/launchpad/alerts", { token, body: { projectId: "pixel-forge", condition: "sideways", targetPrice: 1 } })).status).toBe(400);
  });

  it("refuses quotes on graduated tokens", async () => {
    expect((await call("GET", "/launchpad/projects/glacier-glow/quote/buy?amount=1")).status).toBe(400);
  });
});

describe("http", () => {
  it("answers CORS preflight only for allowed origins", async () => {
    const ok = await call("OPTIONS", "/wallet", { origin: "https://swarp-dash-git-main-team.vercel.app" });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-origin")).toBe("https://swarp-dash-git-main-team.vercel.app");
    expect(ok.headers.get("access-control-allow-headers")).toContain("Idempotency-Key");
    const blocked = await call("OPTIONS", "/wallet", { origin: "https://evil.example" });
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("returns 404 and 405 in the dashboard's error shape", async () => {
    const missing = await call("GET", "/nope");
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ statusCode: 404, error: "Not Found" });
    expect((await call("DELETE", "/launchpad/watchlist")).status).toBe(405);
  });

  it("rejects malformed JSON", async () => {
    const res = await handle(new Request(`${API}/auth/continue-with-phone`, { method: "POST", body: "{oops" }), cfg);
    expect(res.status).toBe(400);
  });
});
