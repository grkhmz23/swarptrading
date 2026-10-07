import type { LaunchpadProject } from "../types";
import { derivedAddress, round, seededRandom } from "../random";
import { solUsd, tokenIcon } from "./tokens";

/** Sample launchpad projects. Names, prices and trades are invented for the preview. */
interface ProjectSeed {
  id: string;
  name: string;
  ticker: string;
  description: string;
  creator: string;
  status: "bonding" | "migrated";
  /** Price in SOL per token. */
  price: number;
  bondingProgress: number;
  ageDays: number;
  featured?: boolean;
  website?: boolean;
}

const SEEDS: ProjectSeed[] = [
  { id: "orbit-cats", name: "Orbit Cats", ticker: "ORCAT", description: "Community token for a collective of space-themed pixel artists.", creator: "nova_lab", status: "bonding", price: 0.0000412, bondingProgress: 78.4, ageDays: 3, featured: true, website: true },
  { id: "solar-sprout", name: "Solar Sprout", ticker: "SPROUT", description: "Funds rooftop solar pilots for community gardens.", creator: "greenledger", status: "bonding", price: 0.0000268, bondingProgress: 61.2, ageDays: 5, featured: true, website: true },
  { id: "deep-reef", name: "Deep Reef", ticker: "REEF", description: "Ocean-cleanup bounty pool governed by holders.", creator: "tidepool", status: "bonding", price: 0.0000189, bondingProgress: 44.9, ageDays: 2, featured: true },
  { id: "pixel-forge", name: "Pixel Forge", ticker: "PXF", description: "Indie game studio token with in-game cosmetics.", creator: "forge_dev", status: "bonding", price: 0.0000097, bondingProgress: 27.5, ageDays: 1 },
  { id: "neon-llama", name: "Neon Llama", ticker: "NLMA", description: "Music collective splitting streaming revenue on-chain.", creator: "llamabeats", status: "bonding", price: 0.0000154, bondingProgress: 38.1, ageDays: 6, website: true },
  { id: "quantum-kiwi", name: "Quantum Kiwi", ticker: "QKIWI", description: "Education DAO for open quantum-computing courses.", creator: "qbit_school", status: "bonding", price: 0.0000063, bondingProgress: 12.8, ageDays: 1 },
  { id: "lunar-ferry", name: "Lunar Ferry", ticker: "LFRY", description: "Rewards for a peer-to-peer ride-sharing pilot.", creator: "ferryman", status: "bonding", price: 0.0000221, bondingProgress: 52.6, ageDays: 8 },
  { id: "byte-bison", name: "Byte Bison", ticker: "BYSN", description: "Hackathon prize pool for Solana builders.", creator: "bisonhq", status: "bonding", price: 0.0000348, bondingProgress: 70.3, ageDays: 4 },
  { id: "coral-code", name: "Coral Code", ticker: "CORAL", description: "Open-source maintainers' tip jar.", creator: "coral_oss", status: "bonding", price: 0.0000049, bondingProgress: 6.4, ageDays: 0 },
  { id: "echo-finch", name: "Echo Finch", ticker: "FINCH", description: "Podcast network sharing ad revenue with listeners.", creator: "echo_fm", status: "bonding", price: 0.0000476, bondingProgress: 91.7, ageDays: 9, website: true },
  { id: "glacier-glow", name: "Glacier Glow", ticker: "GLOW", description: "Graduated: climate data bounties.", creator: "polar_dao", status: "migrated", price: 0.000094, bondingProgress: 100, ageDays: 21, website: true },
  { id: "maple-mint", name: "Maple Mint", ticker: "MAPLE", description: "Graduated: local merchant loyalty points.", creator: "maple_pay", status: "migrated", price: 0.000071, bondingProgress: 100, ageDays: 34 },
];

export const TOTAL_SUPPLY = 1_000_000_000;
const DAY_MS = 86_400_000;

function startOfDay(now: number): number {
  return Math.floor(now / DAY_MS) * DAY_MS;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function stats(seed: ProjectSeed) {
  const rand = seededRandom(`project-stats:${seed.id}`);
  const change = (spread: number) => round((rand() - 0.42) * spread, 2);
  const marketCapUsd = seed.price * TOTAL_SUPPLY * solUsd();
  const circulating = Math.round(TOTAL_SUPPLY * (0.2 + (seed.bondingProgress / 100) * 0.6));
  return {
    marketCapUsd,
    circulating,
    holders: Math.round(40 + seed.bondingProgress * 9 + rand() * 120),
    volume24hUsd: Math.round(marketCapUsd * (0.08 + rand() * 0.3)),
    liquiditySol: round(2 + (seed.bondingProgress / 100) * 78 + rand() * 4, 2),
    change5m: change(4),
    change1h: change(10),
    change6h: change(24),
    change24h: change(60),
  };
}

export function projectIds(): string[] {
  return SEEDS.map((s) => s.id);
}

export function findSeed(id: string): ProjectSeed | undefined {
  return SEEDS.find((s) => s.id === id || derivedAddress(`mint:${s.id}`) === id);
}

export function toProject(seed: ProjectSeed, origin: string, watching: Set<string>, now = Date.now()): LaunchpadProject {
  const s = stats(seed);
  return {
    id: seed.id,
    name: seed.name,
    ticker: seed.ticker,
    description: seed.description,
    imageUrl: tokenIcon(origin, seed.ticker),
    status: seed.status,
    creator: { id: derivedAddress(`creator:${seed.creator}`), username: seed.creator },
    createdAt: new Date(startOfDay(now) - seed.ageDays * DAY_MS + 9 * 3_600_000).toISOString(),
    marketCap: Math.round(s.marketCapUsd),
    marketCapFormatted: formatUsd(s.marketCapUsd),
    price: seed.price,
    currentPrice: seed.price,
    priceChange24h: s.change24h,
    priceChange5m: s.change5m,
    priceChange1h: s.change1h,
    priceChange6h: s.change6h,
    bondingProgress: seed.bondingProgress,
    tokenAddress: derivedAddress(`mint:${seed.id}`),
    totalSupply: TOTAL_SUPPLY,
    circulatingSupply: s.circulating,
    holders: s.holders,
    holderCount: s.holders,
    volume24h: s.volume24hUsd,
    liquidity: s.liquiditySol,
    websiteUrl: seed.website ? "https://www.swarpfoundation.com" : undefined,
    isFeatured: seed.featured === true,
    isWatching: watching.has(seed.id),
  };
}

export function allProjects(origin: string, watching: Set<string>, now = Date.now()): LaunchpadProject[] {
  return SEEDS.map((seed) => toProject(seed, origin, watching, now));
}

export interface SampleTrade {
  id: string;
  type: "buy" | "sell";
  /** SOL */
  amount: number;
  tokenAmount: number;
  /** SOL per token */
  price: number;
  trader: string;
  timestamp: string;
}

/**
 * Sample trade tape (60 trades) over the last 48 hours, newest first, ending at the
 * project's current price. Anchored to 5-minute buckets so it stays stable
 * between refreshes.
 */
export function projectTrades(seed: ProjectSeed, now = Date.now(), count = 60): SampleTrade[] {
  const bucket = Math.floor(now / 300_000) * 300_000;
  const rand = seededRandom(`trades:${seed.id}:${bucket}`);
  const traders = Array.from({ length: 24 }, (_, i) => derivedAddress(`trader:${seed.id}:${i}`));
  const spanMs = 48 * 3_600_000;
  const trades: SampleTrade[] = [];
  let price = seed.price;
  for (let i = 0; i < count; i++) {
    const type = rand() < 0.58 ? "buy" : "sell";
    const amount = round(0.05 + rand() ** 2 * 4.5, 4);
    trades.push({
      id: `${seed.id}-t${bucket}-${i}`,
      type,
      amount,
      tokenAmount: Math.round(amount / price),
      price,
      trader: traders[Math.floor(rand() * traders.length)],
      timestamp: new Date(bucket - Math.round((i / count) * spanMs + rand() * (spanMs / count))).toISOString(),
    });
    // Walk backwards: a buy pushed the price up, so before it the price was lower.
    const move = 1 + (0.004 + rand() * 0.02) * (type === "buy" ? -1 : 1);
    price = Number((price * move).toPrecision(6));
  }
  return trades;
}

export function projectHolders(seed: ProjectSeed, walletAddress: string, userBalance: number) {
  const rand = seededRandom(`holders:${seed.id}`);
  const s = stats(seed);
  const rows: { address: string; balance: number; percentage: number; username?: string }[] = [];
  // Holders share the circulating supply; the bonding curve holds the rest.
  let remaining = (s.circulating / TOTAL_SUPPLY) * 100 * 0.85;
  rows.push({ address: derivedAddress(`curve:${seed.id}`), balance: 0, percentage: 0, username: "Bonding curve" });
  for (let i = 0; i < 19; i++) {
    const share = remaining * (0.12 + rand() * 0.18);
    remaining -= share;
    rows.push({ address: derivedAddress(`holder:${seed.id}:${i}`), balance: 0, percentage: share });
  }
  rows[0].percentage = 100 - (s.circulating / TOTAL_SUPPLY) * 100;
  if (userBalance > 0) {
    rows.push({ address: walletAddress, balance: userBalance, percentage: (userBalance / TOTAL_SUPPLY) * 100, username: "You" });
  }
  return rows
    .map((r) => ({
      ...r,
      balance: r.balance || Math.round((r.percentage / 100) * TOTAL_SUPPLY),
      percentage: round(r.percentage, 3),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
