/**
 * Build candlestick (OHLC) and volume series from launchpad trades.
 * Pure functions so the aggregation can be tested without a browser.
 */

export type Timeframe = "1s" | "5s" | "15s" | "30s" | "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface ChartTrade {
  id: string;
  type: "buy" | "sell" | string;
  solAmount: string;
  tokenAmount: string;
  pricePerToken?: string;
  createdAt: string;
}

export interface Candle {
  /** Bucket start, Unix seconds. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeBar {
  time: number;
  value: number;
  up: boolean;
}

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1s": 1_000,
  "5s": 5_000,
  "15s": 15_000,
  "30s": 30_000,
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

function positive(text: string | undefined): number | null {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Aggregate trades into candles. With no priced trades there is no chart
 * (empty arrays) — nothing is simulated. `currentPrice`, when given, extends or
 * updates the bucket that contains `nowMs` so the last candle reflects it.
 */
export function tradesToOHLC(
  trades: ChartTrade[],
  timeframe: Timeframe,
  currentPrice?: number,
  nowMs: number = Date.now()
): { candles: Candle[]; volume: VolumeBar[] } {
  const intervalMs = TIMEFRAME_MS[timeframe];
  const buckets = new Map<number, { open: number; high: number; low: number; close: number; volume: number }>();

  const priced = trades
    .map((trade) => ({ trade, time: new Date(trade.createdAt).getTime(), price: positive(trade.pricePerToken) }))
    .filter((entry): entry is { trade: ChartTrade; time: number; price: number } => Number.isFinite(entry.time) && entry.price !== null)
    .sort((a, b) => a.time - b.time);

  for (const { trade, time, price } of priced) {
    const start = Math.floor(time / intervalMs) * intervalMs;
    const volume = positive(trade.solAmount) ?? 0;
    const bucket = buckets.get(start);
    if (!bucket) {
      buckets.set(start, { open: price, high: price, low: price, close: price, volume });
    } else {
      bucket.high = Math.max(bucket.high, price);
      bucket.low = Math.min(bucket.low, price);
      bucket.close = price;
      bucket.volume += volume;
    }
  }

  if (buckets.size === 0) return { candles: [], volume: [] };

  if (currentPrice !== undefined && Number.isFinite(currentPrice) && currentPrice > 0) {
    const nowBucket = Math.floor(nowMs / intervalMs) * intervalMs;
    const existing = buckets.get(nowBucket);
    if (existing) {
      existing.close = currentPrice;
      existing.high = Math.max(existing.high, currentPrice);
      existing.low = Math.min(existing.low, currentPrice);
    } else {
      const lastStart = Math.max(...buckets.keys());
      if (nowBucket > lastStart) {
        const lastClose = buckets.get(lastStart)!.close;
        buckets.set(nowBucket, {
          open: lastClose,
          high: Math.max(lastClose, currentPrice),
          low: Math.min(lastClose, currentPrice),
          close: currentPrice,
          volume: 0,
        });
      }
    }
  }

  const candles: Candle[] = [];
  const volume: VolumeBar[] = [];
  for (const start of Array.from(buckets.keys()).sort((a, b) => a - b)) {
    const b = buckets.get(start)!;
    const time = Math.floor(start / 1000);
    candles.push({ time, open: b.open, high: b.high, low: b.low, close: b.close });
    volume.push({ time, value: b.volume, up: b.close >= b.open });
  }
  return { candles, volume };
}
