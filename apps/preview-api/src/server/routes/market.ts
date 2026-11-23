import type { Router } from "../router";
import type { ApiResult } from "../types";
import { HttpError, queryInt } from "../http";
import { previewState } from "../state";
import { solHistory, solQuote } from "../data/market";
import { sampleTokens, tokenByMint, tokenIcon, type SampleToken } from "../data/tokens";

function search(tokens: SampleToken[], term: string | null): SampleToken[] {
  const q = (term ?? "").trim().toLowerCase();
  if (!q) return tokens;
  return tokens.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.address === term?.trim());
}

export function marketRoutes(r: Router): void {
  r.get("/market-data/solana", (): ApiResult<"getSolanaPrice"> => solQuote());

  r.get("/market-data/solana/historical", (ctx): ApiResult<"getSolanaHistoricalData"> => solHistory(ctx.url.searchParams.get("period") ?? "1D"));

  r.get("/exchange-rate/from-db", (): ApiResult<"getExchangeRates"> => ({
    success: true,
    message: "Sample rates (preview)",
    data: { base: "USD", rates: { EUR: 0.92, GBP: 0.79 }, fetchedAt: new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString() },
  }));

  // No server-side translations in the preview: the dashboard falls back to its built-in English strings.
  r.get("/translations/:locale", () => {
    throw new HttpError(404, "Translations are not served by the preview API.");
  });

  r.get("/tokens/prices", (ctx): ApiResult<"getTokenPrices"> => {
    const wanted = (ctx.url.searchParams.get("symbols") ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const prices: ApiResult<"getTokenPrices">["prices"] = {};
    for (const t of sampleTokens()) {
      if (wanted.length === 0 || wanted.includes(t.symbol)) prices[t.symbol] = { price: t.usdPrice, priceChange24h: t.priceChange24h };
    }
    return { prices, timestamp: Date.now() };
  });

  r.get("/tokens/all", (ctx): ApiResult<"getAllJupiterTokens"> => {
    const limit = queryInt(ctx.url.searchParams, "limit", 100, 1000);
    const tokens = search(sampleTokens(), ctx.url.searchParams.get("search"));
    const now = Date.now();
    return {
      tokens: tokens.slice(0, limit).map((t) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoURI: tokenIcon(ctx.origin, t.symbol),
        isVerified: t.isVerified,
        usdPrice: t.usdPrice,
        mcap: t.mcap,
        liquidity: t.liquidity,
      })),
      total: tokens.length,
      cacheInfo: { tokenCount: sampleTokens().length, lastUpdated: now, cacheAge: 0 },
    };
  });

  r.get("/tokens/with-volume", (ctx): ApiResult<"getTokensWithVolume"> => {
    const limit = queryInt(ctx.url.searchParams, "limit", 100, 1000);
    const tokens = search(sampleTokens(), ctx.url.searchParams.get("search"));
    return {
      tokens: tokens.slice(0, limit).map((t) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoURI: tokenIcon(ctx.origin, t.symbol),
        isVerified: t.isVerified,
        usdPrice: t.usdPrice,
        mcap: t.mcap,
        fdv: t.mcap,
        liquidity: t.liquidity,
        holderCount: t.holderCount,
        volume24h: t.volume24h,
        volume6h: Math.round(t.volume24h * 0.27),
        volume1h: Math.round(t.volume24h * 0.045),
        priceChange24h: t.priceChange24h,
        txns24h: Math.round(t.volume24h / 900),
      })),
      total: tokens.length,
      volumeDataSource: "preview-sample",
      cacheStats: { size: sampleTokens().length, lastUpdated: Date.now(), age: 0 },
    };
  });

  r.get("/tokens/detail/:address", (ctx) => {
    const t = tokenByMint(ctx.params.address);
    if (!t) throw new HttpError(404, "Token not found.");
    return {
      token: {
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        logoURI: tokenIcon(ctx.origin, t.symbol),
        price: t.usdPrice,
        priceChange24h: t.priceChange24h,
        volume24h: t.volume24h,
        marketCap: t.mcap,
        liquidity: t.liquidity,
        fdv: t.mcap,
        holderCount: t.holderCount,
        isVerified: t.isVerified,
      },
    };
  });

  r.get("/notifications", (ctx): ApiResult<"getNotifications"> => {
    ctx.session();
    const q = ctx.url.searchParams;
    const limit = queryInt(q, "limit", 20, 100);
    const offsetRaw = Number(q.get("offset") ?? 0);
    const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
    const all = previewState().notifications;
    const filtered = all.filter((n) => (q.get("unreadOnly") !== "true" || !n.isRead) && (!q.get("type") || n.type === q.get("type")));
    return {
      notifications: filtered.slice(offset, offset + limit),
      total: filtered.length,
      unread: all.filter((n) => !n.isRead).length,
    };
  });

  r.put("/notifications/:id/read", (ctx): ApiResult<"markNotificationAsRead"> => {
    ctx.session();
    const n = previewState().notifications.find((x) => x.id === ctx.params.id);
    if (!n) throw new HttpError(404, "Notification not found.");
    n.isRead = true;
    return { id: n.id, isRead: true, readAt: new Date().toISOString() };
  });
}
