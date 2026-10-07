const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INDEX = new Map([...ALPHABET].map((c, i) => [c, i]));

export function base58Encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  return "1".repeat(zeros) + digits.reverse().map((d) => ALPHABET[d]).join("");
}

/** Decode base58; returns null for characters outside the alphabet. */
export function base58Decode(text: string): Uint8Array | null {
  let zeros = 0;
  while (zeros < text.length && text[zeros] === "1") zeros++;
  const bytes: number[] = [];
  for (let i = zeros; i < text.length; i++) {
    const value = INDEX.get(text[i]);
    if (value === undefined) return null;
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  return Uint8Array.from([...new Array<number>(zeros).fill(0), ...bytes.reverse()]);
}

/** A Solana public key is 32 bytes, base58-encoded. */
export function isSolanaAddress(text: string): boolean {
  if (text.length < 32 || text.length > 44) return false;
  return base58Decode(text)?.length === 32;
}
