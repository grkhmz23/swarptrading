import { beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload: object) => `${b64({ alg: "HS256" })}.${b64(payload)}.sig-${JSON.stringify(payload).length}`;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("window", { sessionStorage: new MemoryStorage() });
});

describe("PIN gate", () => {
  it("unlocks only the token it was granted for", async () => {
    const { isSessionUnlocked, markSessionUnlocked, lockSession } = await import("./pinGate");
    const a = jwt({ sub: "user-a", iat: 1 });
    const b = jwt({ sub: "user-b", iat: 1 });
    expect(isSessionUnlocked(a)).toBe(false);
    markSessionUnlocked(a);
    expect(isSessionUnlocked(a)).toBe(true);
    expect(isSessionUnlocked(b)).toBe(false);
    lockSession();
    expect(isSessionUnlocked(a)).toBe(false);
  });

  it("backs off after repeated wrong PINs and resets on success", async () => {
    const { clearPinFailures, pinRetryDelayMs, recordPinFailure } = await import("./pinGate");
    recordPinFailure(0);
    recordPinFailure(0);
    expect(pinRetryDelayMs(0)).toBe(0);
    recordPinFailure(0);
    expect(pinRetryDelayMs(0)).toBe(30_000);
    recordPinFailure(0);
    expect(pinRetryDelayMs(0)).toBe(60_000);
    for (let i = 0; i < 10; i++) recordPinFailure(0);
    expect(pinRetryDelayMs(0)).toBe(15 * 60_000);
    clearPinFailures();
    expect(pinRetryDelayMs(0)).toBe(0);
  });
});
