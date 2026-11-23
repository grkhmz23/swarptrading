import { isSolanaAddress } from "./base58";
import { derivedAddress } from "./random";

export interface PreviewConfig {
  jwtSecret: string;
  accessCode: string;
  allowedOrigins: RegExp[];
  walletAddress: string;
  swarpMint: string;
}

export class ConfigError extends Error {}

const DEFAULT_SWARP_MINT = "SWRP2DA2zGT9q6MvSGanDiTMoiJqqcgmDnbkPJekp3e";

/** `https://app-*.vercel.app` -> regex; `*` matches letters, digits and hyphens within one label. */
export function originPattern(entry: string): RegExp {
  const trimmed = entry.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[a-z0-9.*:-]+$/i.test(trimmed)) {
    throw new ConfigError(`PREVIEW_ALLOWED_ORIGINS: "${entry}" is not an origin (scheme://host[:port]).`);
  }
  if (trimmed.startsWith("http://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(trimmed)) {
    throw new ConfigError(`PREVIEW_ALLOWED_ORIGINS: "${entry}" must use https (http is allowed for localhost only).`);
  }
  if ((trimmed.match(/\*/g) ?? []).length > 1) {
    throw new ConfigError(`PREVIEW_ALLOWED_ORIGINS: "${entry}" may contain at most one "*".`);
  }
  const source = trimmed
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[a-z0-9-]+");
  return new RegExp(`^${source}$`, "i");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PreviewConfig {
  const jwtSecret = env.PREVIEW_JWT_SECRET ?? "";
  if (jwtSecret.length < 32) {
    throw new ConfigError("PREVIEW_JWT_SECRET must be set to at least 32 characters (e.g. `openssl rand -hex 32`).");
  }
  const accessCode = (env.PREVIEW_ACCESS_CODE ?? "").trim();
  if (!/^\d{6}$/.test(accessCode)) {
    throw new ConfigError("PREVIEW_ACCESS_CODE must be set to 6 digits.");
  }
  const origins = (env.PREVIEW_ALLOWED_ORIGINS ?? "").split(",").filter((o) => o.trim());
  if (origins.length === 0) {
    throw new ConfigError("PREVIEW_ALLOWED_ORIGINS must list the dashboard origin(s).");
  }
  const walletAddress = (env.PREVIEW_WALLET_ADDRESS ?? "").trim() || derivedAddress("wallet");
  if (!isSolanaAddress(walletAddress)) {
    throw new ConfigError("PREVIEW_WALLET_ADDRESS is not a Solana address.");
  }
  const swarpMint = (env.PREVIEW_SWARP_MINT ?? "").trim() || DEFAULT_SWARP_MINT;
  if (!isSolanaAddress(swarpMint)) {
    throw new ConfigError("PREVIEW_SWARP_MINT is not a Solana address.");
  }
  return { jwtSecret, accessCode, allowedOrigins: origins.map(originPattern), walletAddress, swarpMint };
}

let cached: PreviewConfig | null = null;

export function config(): PreviewConfig {
  cached ??= loadConfig();
  return cached;
}
