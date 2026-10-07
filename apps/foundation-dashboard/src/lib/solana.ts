/** Solana address and amount helpers shared across the dashboard. */

export const NATIVE_SOL_DECIMALS = 9;
/** Wrapped SOL mint. Sending to this mint is an SPL transfer, not a native SOL transfer. */
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Cheap syntactic check for a base58 Solana public key (32–44 chars, base58 alphabet). */
export function isLikelySolanaAddress(value: string): boolean {
  return BASE58_ADDRESS.test(value.trim());
}

/** Normalise a mint: wrapped SOL and empty values mean native SOL (returned as undefined). */
export function normalizeMint(mint: string | null | undefined): string | undefined {
  if (!mint || mint === WRAPPED_SOL_MINT) return undefined;
  return mint;
}
