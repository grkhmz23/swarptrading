import { seededRandom, round } from "../random";
import { solUsd, tokenBySymbol } from "./tokens";

const PERIODS: Record<string, { spanMs: number; points: number; volatility: number }> = {
  "1H": { spanMs: 60 * 60_000, points: 60, volatility: 0.0015 },
  "1D": { spanMs: 24 * 60 * 60_000, points: 96, volatility: 0.004 },
  "1W": { spanMs: 7 * 24 * 60 * 60_000, points: 168, volatility: 0.008 },
  "1M": { spanMs: 30 * 24 * 60 * 60_000, points: 120, volatility: 0.015 },
  "1Y": { spanMs: 365 * 24 * 60 * 60_000, points: 180, volatility: 0.035 },
  ALL: { spanMs: 4 * 365 * 24 * 60 * 60_000, points: 200, volatility: 0.06 },
};

/**
 * Sample SOL price path ending at the snapshot price. The walk is seeded by
 * period and the current hour so the chart stays stable between refreshes.
 */
export function solHistory(period: string, now = Date.now()): { timestamp: number; price: number }[] {
  const spec = PERIODS[period.toUpperCase()] ?? PERIODS["1D"];
  const hour = Math.floor(now / 3_600_000);
  const rand = seededRandom(`sol-history:${period}:${hour}`);
  const prices: number[] = [solUsd()];
  for (let i = 1; i < spec.points; i++) {
    const prev = prices[i - 1];
    // Walk backwards from the current price; mean-revert gently so long periods stay plausible.
    const drift = (solUsd() - prev) / solUsd() * 0.02;
    prices.push(Math.max(1, prev * (1 + (rand() - 0.5) * 2 * spec.volatility - drift)));
  }
  prices.reverse();
  const step = spec.spanMs / (spec.points - 1);
  return prices.map((price, i) => ({ timestamp: Math.round(now - spec.spanMs + i * step), price: round(price, 4) }));
}

export function solQuote(now = Date.now()) {
  const prices = solHistory("1D", now).map((p) => p.price);
  const sol = tokenBySymbol("SOL");
  const price = solUsd();
  const changePercent = sol?.priceChange24h ?? 0;
  return {
    symbol: "SOL",
    price,
    change: round(price - price / (1 + changePercent / 100), 4),
    changePercent,
    high: Math.max(...prices),
    low: Math.min(...prices),
    volume: 2_840_000_000,
    timestamp: now,
  };
}
