import { ApiError, enc, request } from '@/lib/http';
import { isLikelySolanaAddress } from '@/lib/solana';

/** Market data for a Solana token, as returned by `GET /tokens/detail/:address`. */
export interface TokenData {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  /** USD price, or null when the backend has no price for this token. */
  price: number | null;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  fdv: number;
  holderCount: number;
  isVerified?: boolean;
}

interface TokenDetailResponse {
  token?: Partial<Record<keyof TokenData, unknown>> | null;
}

function num(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/**
 * Fetch token details. Resolves to null when the backend does not know the
 * token (404 or empty body); throws ApiError for other failures.
 */
export async function fetchTokenDetail(address: string, signal?: AbortSignal): Promise<TokenData | null> {
  if (!isLikelySolanaAddress(address)) {
    throw new ApiError('Invalid token address', 400, 'Bad Request');
  }
  try {
    const data = await request<TokenDetailResponse>(`/tokens/detail/${enc(address)}`, { signal });
    const t = data?.token;
    if (!t) return null;
    const rawPrice = typeof t.price === 'string' ? Number(t.price) : t.price;
    return {
      address: str(t.address, address),
      symbol: str(t.symbol, '?'),
      name: str(t.name, 'Unknown token'),
      logoURI: typeof t.logoURI === 'string' && /^https:\/\//.test(t.logoURI) ? t.logoURI.trim() : undefined,
      price: typeof rawPrice === 'number' && Number.isFinite(rawPrice) ? rawPrice : null,
      priceChange24h: num(t.priceChange24h),
      volume24h: num(t.volume24h),
      marketCap: num(t.marketCap),
      liquidity: num(t.liquidity),
      fdv: num(t.fdv),
      holderCount: num(t.holderCount),
      isVerified: t.isVerified === true,
    };
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}
