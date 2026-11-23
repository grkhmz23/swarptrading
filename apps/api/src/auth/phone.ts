import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export interface NormalizedPhone {
  /** E.164, e.g. +14155550123 */
  e164: string;
  /** ISO 3166-1 alpha-2 of the number's region, when known. */
  country: string | null;
}

/**
 * Parse an international phone number (must start with +). Returns null for
 * anything that is not a valid, dialable number.
 */
export function normalizePhone(input: string): NormalizedPhone | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("+") || trimmed.length > 24) return null;
  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) return null;
  return { e164: parsed.number, country: parsed.country ?? null };
}
