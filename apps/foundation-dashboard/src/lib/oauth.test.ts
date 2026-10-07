import { beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

beforeEach(() => {
  vi.stubGlobal("window", { sessionStorage: new MemoryStorage(), location: { href: "https://app.test/?token=t" }, history: { replaceState: vi.fn() } });
  vi.stubGlobal("document", { title: "" });
});

describe("OAuth callback", () => {
  it("rejects a token this tab did not ask for", async () => {
    const { consumeOAuthCallback } = await import("./oauth");
    expect(consumeOAuthCallback("?token=abc").kind).toBe("rejected");
  });

  it("accepts a token after beginOAuthSignIn, once", async () => {
    const { beginOAuthSignIn, consumeOAuthCallback } = await import("./oauth");
    const state = beginOAuthSignIn(1000);
    const result = consumeOAuthCallback(`?token=abc&newUser=true&state=${state}`, 2000);
    expect(result).toEqual({ kind: "accepted", token: "abc", isNewUser: true, user: undefined });
    expect(consumeOAuthCallback("?token=abc", 2000).kind).toBe("rejected");
  });

  it("rejects a mismatched state and stale sign-ins", async () => {
    const { beginOAuthSignIn, consumeOAuthCallback } = await import("./oauth");
    beginOAuthSignIn(0);
    expect(consumeOAuthCallback("?token=abc&state=other", 1).kind).toBe("rejected");
    beginOAuthSignIn(0);
    expect(consumeOAuthCallback("?token=abc", 16 * 60 * 1000).kind).toBe("rejected");
  });

  it("ignores URLs without a token", async () => {
    const { consumeOAuthCallback } = await import("./oauth");
    expect(consumeOAuthCallback("?foo=1").kind).toBe("none");
  });
});
