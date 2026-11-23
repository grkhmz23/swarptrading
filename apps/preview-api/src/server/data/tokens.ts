/**
 * Sample market snapshot. Mint addresses are the real mainnet mints so links
 * and icons line up; prices and volumes are fixed sample values, not live data.
 */
export interface SampleToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  usdPrice: number;
  priceChange24h: number;
  mcap: number;
  liquidity: number;
  volume24h: number;
  holderCount: number;
  isVerified: boolean;
}

const BASE: Omit<SampleToken, "address">[] = [
  { symbol: "SOL", name: "Solana", decimals: 9, usdPrice: 152.4, priceChange24h: 2.31, mcap: 72_400_000_000, liquidity: 610_000_000, volume24h: 2_840_000_000, holderCount: 9_800_000, isVerified: true },
  { symbol: "USDC", name: "USD Coin", decimals: 6, usdPrice: 1, priceChange24h: 0.01, mcap: 9_100_000_000, liquidity: 420_000_000, volume24h: 1_260_000_000, holderCount: 4_300_000, isVerified: true },
  { symbol: "USDT", name: "Tether USD", decimals: 6, usdPrice: 1, priceChange24h: -0.02, mcap: 2_400_000_000, liquidity: 160_000_000, volume24h: 310_000_000, holderCount: 1_900_000, isVerified: true },
  { symbol: "SWARP", name: "Swarp", decimals: 9, usdPrice: 0.0124, priceChange24h: 5.8, mcap: 12_400_000, liquidity: 840_000, volume24h: 1_120_000, holderCount: 18_400, isVerified: true },
  { symbol: "JUP", name: "Jupiter", decimals: 6, usdPrice: 0.47, priceChange24h: -1.42, mcap: 1_420_000_000, liquidity: 38_000_000, volume24h: 96_000_000, holderCount: 820_000, isVerified: true },
  { symbol: "BONK", name: "Bonk", decimals: 5, usdPrice: 0.0000187, priceChange24h: 4.6, mcap: 1_390_000_000, liquidity: 29_000_000, volume24h: 142_000_000, holderCount: 940_000, isVerified: true },
  { symbol: "RAY", name: "Raydium", decimals: 6, usdPrice: 2.14, priceChange24h: 1.08, mcap: 570_000_000, liquidity: 21_000_000, volume24h: 48_000_000, holderCount: 310_000, isVerified: true },
  { symbol: "WIF", name: "dogwifhat", decimals: 6, usdPrice: 0.86, priceChange24h: -3.9, mcap: 860_000_000, liquidity: 24_000_000, volume24h: 131_000_000, holderCount: 220_000, isVerified: true },
  { symbol: "PYTH", name: "Pyth Network", decimals: 6, usdPrice: 0.142, priceChange24h: 0.74, mcap: 820_000_000, liquidity: 9_400_000, volume24h: 31_000_000, holderCount: 160_000, isVerified: true },
  { symbol: "JTO", name: "Jito", decimals: 9, usdPrice: 1.93, priceChange24h: 2.95, mcap: 640_000_000, liquidity: 11_200_000, volume24h: 37_000_000, holderCount: 120_000, isVerified: true },
];

const MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
};

let swarpMint = "SWRP2DA2zGT9q6MvSGanDiTMoiJqqcgmDnbkPJekp3e";

/** Set from PREVIEW_SWARP_MINT on each request (see app.ts). */
export function setSwarpMint(mint: string): void {
  swarpMint = mint;
}

export function sampleTokens(): SampleToken[] {
  return BASE.map((t) => ({ ...t, address: t.symbol === "SWARP" ? swarpMint : MINTS[t.symbol] }));
}

export function tokenBySymbol(symbol: string): SampleToken | undefined {
  const upper = symbol.trim().toUpperCase();
  return sampleTokens().find((t) => t.symbol === upper);
}

export function tokenByMint(mint: string): SampleToken | undefined {
  return sampleTokens().find((t) => t.address === mint.trim());
}

export function solUsd(): number {
  return BASE[0].usdPrice;
}

/** Token icon served by this API (`/preview-assets/token/<SYMBOL>.svg`). */
export function tokenIcon(origin: string, symbol: string): string {
  return `${origin}/preview-assets/token/${encodeURIComponent(symbol)}.svg`;
}
