/** Sends and checks one-time SMS codes. Implemented by TwilioVerifyProvider. */
export interface OtpProvider {
  send(phoneE164: string): Promise<void>;
  /**
   * `approved`: correct code. `invalid`: wrong code, may retry.
   * `expired`: no pending verification (expired, used, or too many attempts) — request a new code.
   */
  check(phoneE164: string, code: string): Promise<OtpCheckResult>;
}

export type OtpCheckResult = "approved" | "invalid" | "expired";

export const OTP_PROVIDER = Symbol("OTP_PROVIDER");

export type OtpFailureReason = "invalid_number" | "rate_limited" | "blocked" | "unavailable";

export class OtpDeliveryError extends Error {
  constructor(
    readonly reason: OtpFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "OtpDeliveryError";
  }
}
