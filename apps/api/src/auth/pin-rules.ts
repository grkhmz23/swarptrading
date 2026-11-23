/**
 * Wallet PIN rules. Same rules as the dashboard's `src/lib/pin.ts`; the client
 * check is only for fast feedback, this one is enforced.
 */

export const PIN_LENGTH = 6;

const COMMON_PINS = new Set([
  "121212", "112233", "123123", "696969", "159753", "147258", "258369", "102030", "010203",
  "131313", "212121", "199999", "200000", "123321", "654456", "111222", "000111", "101010",
  "202020", "520520", "520131", "668899", "998877", "778899", "147369", "963852", "741852",
]);

export type PinProblem = "format" | "repeated" | "sequential" | "common";

export function isPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** Null when the PIN is acceptable as a new PIN, otherwise why it is rejected. */
export function checkNewPin(pin: string): PinProblem | null {
  if (!isPinFormat(pin)) return "format";
  if (/^(\d)\1+$/.test(pin)) return "repeated";
  const digits = pin.split("").map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === ((digits[i - 1] ?? 0) + 1) % 10);
  const descending = digits.every((d, i) => i === 0 || d === ((digits[i - 1] ?? 0) + 9) % 10);
  if (ascending || descending) return "sequential";
  if (COMMON_PINS.has(pin)) return "common";
  return null;
}

export function pinProblemMessage(problem: PinProblem): string {
  switch (problem) {
    case "format":
      return `PIN must be exactly ${PIN_LENGTH} digits`;
    case "repeated":
      return "PIN cannot be the same digit repeated";
    case "sequential":
      return "PIN cannot be a sequence like 123456";
    case "common":
      return "This PIN is too common. Choose a less predictable one";
  }
}
