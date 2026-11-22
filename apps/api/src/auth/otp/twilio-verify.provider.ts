import type { AppConfig } from "../../config/config.js";
import { type OtpCheckResult, OtpDeliveryError, type OtpProvider } from "./otp.provider.js";

const BASE_URL = "https://verify.twilio.com/v2";
const TIMEOUT_MS = 10_000;

/** Twilio error codes we map explicitly (https://www.twilio.com/docs/api/errors). */
const INVALID_NUMBER_CODES = new Set([60200, 21211, 21614, 60205]);
const RATE_LIMIT_CODES = new Set([60203, 20429]);
const BLOCKED_CODES = new Set([60410, 60605]);
const CHECK_EXHAUSTED_CODES = new Set([60202, 20404]);

type FetchFn = typeof fetch;

interface TwilioErrorBody {
  code?: number;
  message?: string;
}

/**
 * Twilio Verify v2: `POST /Services/{sid}/Verifications` starts an SMS
 * verification, `POST /Services/{sid}/VerificationCheck` checks the code.
 * Twilio generates, stores, expires (10 min) and rate-limits the codes.
 * Built by a factory in AuthModule (the optional fetch argument is for tests).
 */
export class TwilioVerifyProvider implements OtpProvider {
  private readonly authHeader: string;
  private readonly serviceUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(
    config: Pick<AppConfig, "TWILIO_ACCOUNT_SID" | "TWILIO_AUTH_TOKEN" | "TWILIO_VERIFY_SERVICE_SID">,
    fetchFn?: FetchFn,
  ) {
    this.authHeader = `Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString("base64")}`;
    this.serviceUrl = `${BASE_URL}/Services/${encodeURIComponent(config.TWILIO_VERIFY_SERVICE_SID)}`;
    this.fetchFn = fetchFn ?? fetch;
  }

  async send(phoneE164: string): Promise<void> {
    const response = await this.post("/Verifications", { To: phoneE164, Channel: "sms" });
    if (response.ok) return;
    const error = await readError(response);
    if (INVALID_NUMBER_CODES.has(error.code ?? -1)) {
      throw new OtpDeliveryError("invalid_number", "This phone number cannot receive SMS codes.");
    }
    if (response.status === 429 || RATE_LIMIT_CODES.has(error.code ?? -1)) {
      throw new OtpDeliveryError("rate_limited", "Too many codes requested. Try again later.");
    }
    if (BLOCKED_CODES.has(error.code ?? -1)) {
      throw new OtpDeliveryError("blocked", "SMS codes cannot be sent to this number.");
    }
    throw new OtpDeliveryError("unavailable", `Twilio Verify returned ${response.status} (code ${error.code ?? "none"})`);
  }

  async check(phoneE164: string, code: string): Promise<OtpCheckResult> {
    const response = await this.post("/VerificationCheck", { To: phoneE164, Code: code });
    if (response.ok) {
      const body = (await response.json()) as { status?: string };
      return body.status === "approved" ? "approved" : "invalid";
    }
    // 404: no pending verification (expired, already approved, or cancelled).
    if (response.status === 404) return "expired";
    const error = await readError(response);
    if (response.status === 429 || CHECK_EXHAUSTED_CODES.has(error.code ?? -1)) return "expired";
    throw new OtpDeliveryError("unavailable", `Twilio Verify check returned ${response.status} (code ${error.code ?? "none"})`);
  }

  private async post(path: string, form: Record<string, string>): Promise<Response> {
    try {
      return await this.fetchFn(`${this.serviceUrl}${path}`, {
        method: "POST",
        headers: { Authorization: this.authHeader, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(form).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      throw new OtpDeliveryError("unavailable", `Twilio Verify unreachable: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }
}

async function readError(response: Response): Promise<TwilioErrorBody> {
  try {
    return (await response.json()) as TwilioErrorBody;
  } catch {
    return {};
  }
}
