import { describe, expect, it } from "vitest";
import { base64UrlDecode, decodeJwt, isTokenExpired } from "./session";

function b64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jwt(payload: object): string {
  return `${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify(payload))}.sig`;
}

describe("base64UrlDecode", () => {
  it("decodes base64url segments that plain atob would reject", () => {
    const text = "subjects?>~ünïcode";
    expect(base64UrlDecode(b64url(text))).toBe(text);
  });
});

describe("decodeJwt", () => {
  it("returns the payload", () => {
    expect(decodeJwt(jwt({ sub: "u1", exp: 10 }))).toEqual({ sub: "u1", exp: 10 });
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("a.%%%.c")).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("treats tokens within the skew window as expired", () => {
    expect(isTokenExpired(jwt({ exp: 1000 }), 990, 30)).toBe(true);
    expect(isTokenExpired(jwt({ exp: 1000 }), 900, 30)).toBe(false);
  });

  it("treats malformed tokens as expired and tokens without exp as valid", () => {
    expect(isTokenExpired("garbage")).toBe(true);
    expect(isTokenExpired(jwt({ sub: "x" }))).toBe(false);
  });
});
