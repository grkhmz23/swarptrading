import { createHash } from "node:crypto";
import { base58Encode } from "./base58";

/** Deterministic PRNG (mulberry32) so every server instance serves the same sample data. */
export function seededRandom(seed: string): () => number {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-byte base58 string derived from a label (sample addresses; no key exists for them). */
export function derivedAddress(label: string): string {
  return base58Encode(createHash("sha256").update(`swarp-preview:${label}`).digest());
}

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
