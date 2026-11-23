/**
 * Display helpers shared by list and detail views.
 */

/** Keys that must never be rendered (secrets, codes, credential material). */
const SENSITIVE_KEY_PATTERN =
  /pin|password|passcode|secret|private_?key|seed|mnemonic|hash|otp|confirmation_?code|api_?key|access_?token|refresh_?token/i;

/**
 * Reviewed exceptions to SENSITIVE_KEY_PATTERN: flags/counters that reveal no
 * secret, and the on-chain transaction signature, which is public data.
 */
const NON_SECRET_KEYS = new Set(["isPinSet", "incorrectPinAttempts", "transactionHash"]);

export const isSensitiveKey = (key: string): boolean => SENSITIVE_KEY_PATTERN.test(key) && !NON_SECRET_KEYS.has(key);

export const maskEmail = (email: string): string => {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
};

export const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  const prefix = phone.trim().startsWith("+") ? "+" : "";
  return `${prefix}${"*".repeat(Math.min(digits.length - 4, 8))}${digits.slice(-4)}`;
};

export const formatDateTime = (value: unknown, dateOnly = false): string => {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return String(value);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return dateOnly ? date.toLocaleDateString() : date.toLocaleString();
};

export const formatNumber = (value: unknown, maximumFractionDigits = 9): string => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString(undefined, { maximumFractionDigits });
};

export const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const SUMMARY_KEYS = ["name", "ticker", "email", "publicKey", "id"] as const;

/** One-line, human-readable summary of a nested record (never "[object Object]"). */
export const summarizeValue = (value: unknown, maskPii = false): string => {
  if (value === null || value === undefined) return "N/A";
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  if (typeof value !== "object") return String(value);

  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of SUMMARY_KEYS) {
    const part = record[key];
    if (typeof part === "string" || typeof part === "number") {
      const text = String(part);
      parts.push(key === "email" && maskPii ? maskEmail(text) : text);
    }
    if (parts.length === 2) break;
  }
  return parts.length ? parts.join(" · ") : "Record";
};
