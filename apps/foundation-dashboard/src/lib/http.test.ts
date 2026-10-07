import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, enc, errorMessage, query, request, setUnauthorizedHandler } from "./http";

function mockFetch(status: number, body: unknown, contentType = "application/json") {
  const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(status === 204 ? null : text, { status, headers: { "content-type": contentType } }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe("request", () => {
  it("keeps default headers when the caller passes its own", async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await request("/x", { method: "POST", body: JSON.stringify({ a: 1 }), headers: { Authorization: "Bearer t" } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer t");
    expect(headers["User-Agent"]).toBeUndefined();
  });

  it("does not set Content-Type for FormData bodies", async () => {
    const fetchMock = mockFetch(200, { ok: true });
    const form = new FormData();
    form.append("f", "v");
    await request("/upload", { method: "POST", body: form, headers: { Authorization: "Bearer t" } });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch(204, undefined);
    await expect(request("/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("throws ApiError with the server message and status", async () => {
    mockFetch(400, { message: "Slippage exceeded", error: "Bad Request" });
    const err = (await request("/x").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Slippage exceeded");
    expect(err.statusCode).toBe(400);
  });

  it("joins validation message arrays", async () => {
    mockFetch(400, { message: ["amount must be positive", "mint is required"] });
    const err = (await request("/x").catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe("amount must be positive, mint is required");
  });

  it("calls the unauthorized handler on 401 for authenticated calls only", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { message: "Unauthorized" });
    await request("/x", { headers: { Authorization: "Bearer t" } }).catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);

    await request("/login").catch(() => undefined);
    await request("/pin", { headers: { Authorization: "Bearer t" }, skipSessionExpiry: true }).catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("maps network failures to a status-0 ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Load failed"); }));
    const err = (await request("/x").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(0);
  });
});

describe("helpers", () => {
  it("enc encodes path segments and rejects empty ones", () => {
    expect(enc("a/b?c")).toBe("a%2Fb%3Fc");
    expect(() => enc("")).toThrow(ApiError);
  });

  it("query skips empty values and encodes the rest", () => {
    expect(query({ a: 1, b: undefined, c: "", d: "x&y" })).toBe("?a=1&d=x%26y");
    expect(query({})).toBe("");
  });

  it("errorMessage reads Error, plain objects and falls back", () => {
    expect(errorMessage(new Error("boom"), "f")).toBe("boom");
    expect(errorMessage({ message: "plain" }, "f")).toBe("plain");
    expect(errorMessage(null, "fallback")).toBe("fallback");
  });
});
