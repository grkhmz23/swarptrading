/**
 * Single source of truth for public runtime configuration.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so every variable
 * must be referenced literally here. `next.config.ts` refuses to run a
 * production build when a required value is missing, so the localhost
 * defaults below can only ever apply to `next dev`.
 */

export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

function parseCluster(value: string | undefined): SolanaCluster {
  if (value === 'mainnet' || value === 'mainnet-beta') return 'mainnet-beta';
  if (value === 'testnet') return 'testnet';
  return 'devnet';
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const API_BASE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
);

export const SOLANA_CLUSTER: SolanaCluster = parseCluster(process.env.NEXT_PUBLIC_SOLANA_NETWORK);

export const IS_MAINNET = SOLANA_CLUSTER === 'mainnet-beta';

/** Human-readable network label shown in the UI. */
export const NETWORK_LABEL = IS_MAINNET ? 'Mainnet' : SOLANA_CLUSTER === 'testnet' ? 'Testnet' : 'Devnet';

export const SWARP_TOKEN_MINT =
  process.env.NEXT_PUBLIC_SWARP_TOKEN_MINT || 'SWRP2DA2zGT9q6MvSGanDiTMoiJqqcgmDnbkPJekp3e';

/** Published SWARP presale price in USD (shown on the SWARP token card); hidden when unset. */
export const SWARP_PRESALE_PRICE_USD: number | null = (() => {
  const n = Number(process.env.NEXT_PUBLIC_SWARP_PRESALE_PRICE_USD);
  return process.env.NEXT_PUBLIC_SWARP_PRESALE_PRICE_USD && Number.isFinite(n) && n > 0 ? n : null;
})();

export const MOONPAY_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY || '';

/** Public marketing / legal site. Legal pages live there, not in this app. */
export const LEGAL_SITE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_LEGAL_SITE_URL || 'https://www.swarpfoundation.com'
);

export const TERMS_URL = `${LEGAL_SITE_URL}/terms`;
export const PRIVACY_URL = `${LEGAL_SITE_URL}/privacy`;

/**
 * Optional notice shown on every page, e.g. "Preview — sample data" for a
 * build pointed at the preview API. Empty in production builds.
 */
export const ENVIRONMENT_BANNER = (process.env.NEXT_PUBLIC_ENVIRONMENT_BANNER || '').trim().slice(0, 120);

/** Solana Explorer link for a transaction signature or address on the configured cluster. */
export function explorerUrl(kind: 'tx' | 'address', value: string): string {
  const base = `https://explorer.solana.com/${kind}/${encodeURIComponent(value)}`;
  return IS_MAINNET ? base : `${base}?cluster=${SOLANA_CLUSTER}`;
}
