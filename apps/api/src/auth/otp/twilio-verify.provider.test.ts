import { describe, expect, it, vi } from "vitest";
import { OtpDeliveryError } from "./otp.provider.js";
import { TwilioVerifyProvider } from "./twilio-verify.provider.js";

const config = {
  TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "secret-token-value-123",
  TWILIO_VERIFY_SERVICE_SID: `VA${"b".repeat(32)}`,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("TwilioVerifyProvider", () => {
  it("starts an SMS verification with basic auth and a form body", async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => json(201, { status: "pending" }));
    await new TwilioVerifyProvider(config, fetchFn as typeof fetch).send("+14155552671");

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(`https://verify.twilio.com/v2/Services/${config.TWILIO_VERIFY_SERVICE_SID}/Verifications`);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString("base64")}`);
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(new URLSearchParams(init?.body as string).get("To")).toBe("+14155552671");
    expect(new URLSearchParams(init?.body as string).get("Channel")).toBe("sms");
  });

  it.each([
    [400, { code: 60200 }, "invalid_number"],
    [429, { code: 60203 }, "rate_limited"],
    [403, { code: 60410 }, "blocked"],
    [500, {}, "unavailable"],
  ])("maps a %s / %j send failure to %s", async (status, body, reason) => {
    const provider = new TwilioVerifyProvider(config, (async () => json(status, body)) as typeof fetch);
    const error = await provider.send("+14155552671").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OtpDeliveryError);
    expect((error as OtpDeliveryError).reason).toBe(reason);
  });

  it("reports network failures as unavailable", async () => {
    const provider = new TwilioVerifyProvider(config, (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch);
    await expect(provider.send("+14155552671")).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("checks codes", async () => {
    const calls: string[] = [];
    const respond = [json(200, { status: "approved" }), json(200, { status: "pending" }), json(404, { code: 20404 }), json(429, { code: 60202 })];
    const provider = new TwilioVerifyProvider(config, (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${String(url)} ${String(init?.body)}`);
      return respond.shift()!;
    }) as typeof fetch);

    expect(await provider.check("+14155552671", "123456")).toBe("approved");
    expect(await provider.check("+14155552671", "000000")).toBe("invalid");
    expect(await provider.check("+14155552671", "123456")).toBe("expired");
    expect(await provider.check("+14155552671", "123456")).toBe("expired");
    expect(calls[0]).toContain("/VerificationCheck");
    expect(calls[0]).toContain("Code=123456");
  });
});
