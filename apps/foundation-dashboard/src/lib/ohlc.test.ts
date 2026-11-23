import { describe, expect, it } from "vitest";
import { tradesToOHLC } from "./ohlc";

const t = (iso: string, price: string, sol = "1", type = "buy") => ({ id: iso, type, solAmount: sol, tokenAmount: "1", pricePerToken: price, createdAt: iso });

describe("tradesToOHLC", () => {
  it("returns no candles when there are no priced trades (no simulated data)", () => {
    expect(tradesToOHLC([], "1m", 0.001)).toEqual({ candles: [], volume: [] });
    expect(tradesToOHLC([t("2026-01-01T00:00:00Z", "undefined")], "1m").candles).toEqual([]);
  });

  it("groups trades into buckets with correct OHLC and volume", () => {
    const { candles, volume } = tradesToOHLC(
      [t("2026-01-01T00:00:10Z", "2", "1"), t("2026-01-01T00:00:50Z", "1", "2"), t("2026-01-01T00:00:30Z", "5", "3"), t("2026-01-01T00:01:05Z", "4")],
      "1m"
    );
    expect(candles).toEqual([
      { time: Date.parse("2026-01-01T00:00:00Z") / 1000, open: 2, high: 5, low: 1, close: 1 },
      { time: Date.parse("2026-01-01T00:01:00Z") / 1000, open: 4, high: 4, low: 4, close: 4 },
    ]);
    expect(volume[0]).toEqual({ time: candles[0].time, value: 6, up: false });
  });

  it("puts the current price in the bucket that contains now", () => {
    const now = Date.parse("2026-01-01T00:01:30Z");
    const sameBucket = tradesToOHLC([t("2026-01-01T00:01:05Z", "4")], "1m", 6, now);
    expect(sameBucket.candles).toHaveLength(1);
    expect(sameBucket.candles[0]).toMatchObject({ close: 6, high: 6 });

    const later = tradesToOHLC([t("2026-01-01T00:00:05Z", "4")], "1m", 3, now);
    expect(later.candles.map((c) => c.time)).toEqual([Date.parse("2026-01-01T00:00:00Z") / 1000, Date.parse("2026-01-01T00:01:00Z") / 1000]);
    expect(later.candles[1]).toMatchObject({ open: 4, close: 3, low: 3 });
  });

  it("ignores trades with invalid timestamps", () => {
    expect(tradesToOHLC([t("not-a-date", "1")], "1m").candles).toEqual([]);
  });
});
