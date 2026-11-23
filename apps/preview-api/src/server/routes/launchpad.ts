import type { Ctx, Router } from "../router";
import type { ApiResult, LaunchpadAlert, LaunchpadProject } from "../types";
import { HttpError, disabled, num, queryInt, str } from "../http";
import { round } from "../random";
import { LIMITS, previewState } from "../state";
import { allProjects, findSeed, projectHolders, projectTrades, toProject } from "../data/launchpad";
import { solUsd } from "../data/tokens";
import { LAUNCHPAD_HOLDINGS } from "../data/wallet";

const TRADE_FEE_RATE = 0.01;
const DAY_MS = 86_400_000;

function projectOr404(ctx: Ctx) {
  const seed = findSeed(ctx.params.id);
  if (!seed) throw new HttpError(404, "Project not found.");
  return seed;
}

function watching(ctx: Ctx): Set<string> {
  return ctx.optionalSession() ? previewState().watchlist : new Set();
}

function listProjects(ctx: Ctx, onlyStatus?: "bonding" | "migrated") {
  const q = ctx.url.searchParams;
  const page = queryInt(q, "page", 1, 1000);
  const limit = queryInt(q, "limit", 20, 100);
  const status = onlyStatus ?? q.get("status") ?? "all";
  if (!["bonding", "migrated", "all"].includes(status)) throw new HttpError(400, "status must be bonding, migrated or all.");
  const term = (q.get("search") ?? "").trim().toLowerCase();
  const sortBy = q.get("sortBy") ?? "createdAt";
  const order = q.get("sortOrder") === "asc" ? 1 : -1;
  const value = (p: LaunchpadProject): number =>
    sortBy === "marketCap" ? p.marketCap : sortBy === "priceChange" ? Number(p.priceChange24h) : Date.parse(p.createdAt);
  const projects = allProjects(ctx.origin, watching(ctx))
    .filter((p) => status === "all" || p.status === status)
    .filter((p) => !term || p.name.toLowerCase().includes(term) || p.ticker.toLowerCase().includes(term))
    .sort((a, b) => (value(a) - value(b)) * order);
  return { projects: projects.slice((page - 1) * limit, page * limit), total: projects.length, page, limit };
}

function tradeQuote(ctx: Ctx, side: "buy" | "sell") {
  const seed = projectOr404(ctx);
  const project = toProject(seed, ctx.origin, new Set());
  if (project.status === "migrated") throw new HttpError(400, "This token has graduated; trade it on the open market.");
  const amount = Number(ctx.url.searchParams.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "amount must be greater than 0.");
  const liquidity = project.liquidity ?? 1;
  const price = project.price;
  if (side === "buy") {
    const fee = round(amount * TRADE_FEE_RATE, 9);
    const priceImpact = round(Math.min(30, (amount / liquidity) * 100), 4);
    return { inputAmount: amount, outputAmount: Math.floor(((amount - fee) / price) * (1 - priceImpact / 100)), price, priceImpact, fee };
  }
  const gross = amount * price;
  const priceImpact = round(Math.min(30, (gross / liquidity) * 100), 4);
  const fee = round(gross * TRADE_FEE_RATE, 9);
  return { inputAmount: amount, outputAmount: round(gross * (1 - priceImpact / 100) - fee, 9), price, priceImpact, fee };
}

function portfolio(ctx: Ctx): ApiResult<"getLaunchpadPortfolio"> {
  const s = previewState();
  const now = Date.now();
  const investments = Object.entries(LAUNCHPAD_HOLDINGS).map(([id, h]) => {
    const p = toProject(findSeed(id)!, ctx.origin, s.watchlist, now);
    const value = h.tokens * p.price;
    const costBasis = h.solInvested - h.solReceived;
    const unrealized = value - costBasis;
    return {
      id: `inv-${id}`,
      tokenBalance: String(h.tokens),
      totalSolInvested: h.solInvested.toFixed(4),
      totalSolReceived: h.solReceived.toFixed(4),
      averageBuyPrice: (h.solInvested / (h.tokens + h.solReceived / p.price)).toPrecision(6),
      realizedPnlSol: (h.solReceived > 0 ? h.solReceived * 0.18 : 0).toFixed(4),
      unrealizedPnlSol: unrealized.toFixed(4),
      unrealizedPnlPercent: ((unrealized / costBasis) * 100).toFixed(2),
      currentValueSol: value.toFixed(4),
      tradeCount: h.trades,
      firstInvestmentAt: new Date(now - h.firstDaysAgo * DAY_MS).toISOString(),
      lastTradeAt: new Date(now - (h.firstDaysAgo / 3) * DAY_MS).toISOString(),
      isWatching: s.watchlist.has(id),
      hasAlerts: s.alerts.some((a) => a.projectId === id && a.status === "active"),
      project: {
        id: p.id,
        name: p.name,
        ticker: p.ticker,
        imageUrl: p.imageUrl,
        tokenAddress: p.tokenAddress,
        status: p.status,
        currentPrice: String(p.price),
        priceChange24h: Number(p.priceChange24h),
        marketCap: String(p.marketCap),
      },
    };
  });
  const invested = investments.reduce((sum, i) => sum + Number(i.totalSolInvested), 0);
  const current = investments.reduce((sum, i) => sum + Number(i.currentValueSol), 0);
  const realized = investments.reduce((sum, i) => sum + Number(i.realizedPnlSol), 0);
  const unrealized = investments.reduce((sum, i) => sum + Number(i.unrealizedPnlSol), 0);
  return {
    investments,
    summary: {
      totalInvestmentsSol: invested.toFixed(4),
      totalCurrentValueSol: current.toFixed(4),
      totalRealizedPnlSol: realized.toFixed(4),
      totalUnrealizedPnlSol: unrealized.toFixed(4),
      totalPnlPercent: (((realized + unrealized) / invested) * 100).toFixed(2),
      activeProjectsCount: investments.length,
      totalProjectsCount: investments.length,
    },
    total: investments.length,
    page: 1,
    limit: investments.length,
    totalPages: 1,
  };
}

/** The trade-history screen also reads `status` (see TradeHistory.tsx). */
type UserTrade = ApiResult<"getLaunchpadUserTradeHistory">["trades"][number] & { status: string };

function userTrades(ctx: Ctx): UserTrade[] {
  const now = Date.now();
  const rows: UserTrade[] = [];
  for (const [id, h] of Object.entries(LAUNCHPAD_HOLDINGS)) {
    const p = toProject(findSeed(id)!, ctx.origin, new Set(), now);
    const sells = h.solReceived > 0 ? 1 : 0;
    const buys = h.trades - sells;
    for (let i = 0; i < h.trades; i++) {
      const type = i < buys ? "buy" : "sell";
      const sol = type === "buy" ? h.solInvested / buys : h.solReceived;
      const price = p.price * (type === "buy" ? 0.7 + i * 0.08 : 1.1);
      rows.push({
        id: `ut-${id}-${i}`,
        type,
        walletAddress: ctx.cfg.walletAddress,
        status: "confirmed",
        solAmount: sol.toFixed(4),
        tokenAmount: String(Math.round(sol / price)),
        pricePerToken: price.toPrecision(6),
        usdValue: (sol * solUsd()).toFixed(2),
        createdAt: new Date(now - h.firstDaysAgo * DAY_MS + i * 9 * 3_600_000).toISOString(),
        project: { id: p.id, name: p.name, ticker: p.ticker, imageUrl: p.imageUrl, tokenAddress: p.tokenAddress },
      });
    }
  }
  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function alertInput(body: Record<string, unknown>, partial: boolean) {
  const out: Partial<Pick<LaunchpadAlert, "condition" | "targetPrice" | "currency" | "note" | "status">> = {};
  if (!partial || body.condition !== undefined) {
    const condition = str(body, "condition", { max: 20 });
    if (condition !== "goes_over" && condition !== "goes_under") throw new HttpError(400, "condition must be goes_over or goes_under.");
    out.condition = condition;
  }
  if (!partial || body.targetPrice !== undefined) {
    const price = num(body, "targetPrice");
    if (price <= 0) throw new HttpError(400, "targetPrice must be greater than 0.");
    out.targetPrice = String(price);
  }
  if (body.currency !== undefined) {
    const currency = str(body, "currency", { max: 3 });
    if (currency !== "USD" && currency !== "SOL") throw new HttpError(400, "currency must be USD or SOL.");
    out.currency = currency;
  } else if (!partial) {
    out.currency = "SOL";
  }
  if (body.note !== undefined) out.note = str(body, "note", { optional: true, max: 200 }) || undefined;
  if (partial && body.status !== undefined) {
    const status = str(body, "status", { max: 20 });
    if (!["active", "triggered", "expired", "cancelled"].includes(status)) throw new HttpError(400, "Invalid status.");
    out.status = status as LaunchpadAlert["status"];
  }
  return out;
}

export function launchpadRoutes(r: Router): void {
  r.get("/launchpad/projects/featured", (ctx): ApiResult<"getLaunchpadFeaturedProjects"> => ({
    projects: allProjects(ctx.origin, watching(ctx)).filter((p) => p.isFeatured),
  }));

  r.get("/launchpad/projects/live", (ctx): ApiResult<"getLaunchpadLiveProjects"> => listProjects(ctx, "bonding"));
  r.get("/launchpad/projects", (ctx): ApiResult<"getLaunchpadProjects"> => listProjects(ctx));

  r.get("/launchpad/projects/:id", (ctx): ApiResult<"getLaunchpadProject"> => toProject(projectOr404(ctx), ctx.origin, watching(ctx)));

  r.get("/launchpad/projects/:id/quote/buy", (ctx): ApiResult<"getLaunchpadBuyQuote"> => tradeQuote(ctx, "buy"));
  r.get("/launchpad/projects/:id/quote/sell", (ctx): ApiResult<"getLaunchpadSellQuote"> => tradeQuote(ctx, "sell"));

  r.get("/launchpad/projects/:id/balance", (ctx): ApiResult<"getLaunchpadTokenBalance"> => {
    ctx.session();
    const seed = projectOr404(ctx);
    return { balance: LAUNCHPAD_HOLDINGS[seed.id]?.tokens ?? 0, tokenAddress: toProject(seed, ctx.origin, new Set()).tokenAddress ?? "" };
  });

  r.get("/launchpad/projects/:id/trades", (ctx): ApiResult<"getLaunchpadProjectTrades"> => {
    const limit = queryInt(ctx.url.searchParams, "limit", 50, 60);
    return { trades: projectTrades(projectOr404(ctx)).slice(0, limit) };
  });

  r.get("/launchpad/projects/:id/holders", (ctx): ApiResult<"getLaunchpadHolders"> => {
    const seed = projectOr404(ctx);
    const limit = queryInt(ctx.url.searchParams, "limit", 50, 100);
    return { holders: projectHolders(seed, ctx.cfg.walletAddress, LAUNCHPAD_HOLDINGS[seed.id]?.tokens ?? 0).slice(0, limit) };
  });

  r.post("/launchpad/projects/:id/watchlist", (ctx): ApiResult<"toggleLaunchpadWatchlist"> => {
    ctx.session();
    const seed = projectOr404(ctx);
    const list = previewState().watchlist;
    const isWatching = !list.has(seed.id);
    if (isWatching) list.add(seed.id);
    else list.delete(seed.id);
    return { isWatching, message: isWatching ? "Added to watchlist" : "Removed from watchlist" };
  });

  r.get("/launchpad/watchlist", (ctx): ApiResult<"getLaunchpadWatchlist"> => {
    ctx.session();
    const list = previewState().watchlist;
    return { projects: allProjects(ctx.origin, list).filter((p) => list.has(p.id)) };
  });

  r.get("/launchpad/portfolio", (ctx): ApiResult<"getLaunchpadPortfolio"> => {
    ctx.session();
    return portfolio(ctx);
  });

  r.get("/launchpad/trades/history", (ctx): ApiResult<"getLaunchpadUserTradeHistory"> => {
    ctx.session();
    const q = ctx.url.searchParams;
    const page = queryInt(q, "page", 1, 1000);
    const limit = queryInt(q, "limit", 20, 100);
    const type = q.get("type");
    const trades = userTrades(ctx).filter((t) => !type || t.type === type);
    return {
      trades: trades.slice((page - 1) * limit, page * limit),
      total: trades.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(trades.length / limit)),
    };
  });

  r.get("/launchpad/alerts", (ctx): ApiResult<"getLaunchpadAlerts"> => {
    ctx.session();
    const alerts = previewState().alerts;
    return { success: true, alerts, total: alerts.length };
  });

  r.post("/launchpad/alerts", async (ctx): Promise<ApiResult<"createLaunchpadAlert">> => {
    ctx.session();
    const body = await ctx.body();
    const seed = findSeed(str(body, "projectId", { max: 64 }));
    if (!seed) throw new HttpError(404, "Project not found.");
    const s = previewState();
    if (s.alerts.length >= LIMITS.alerts) throw new HttpError(400, "You have reached the alert limit.");
    const input = alertInput(body, false);
    const now = new Date().toISOString();
    const alert: LaunchpadAlert = {
      id: `alert-new-${s.nextId++}`,
      projectId: seed.id,
      projectName: seed.name,
      projectTicker: seed.ticker,
      projectImageUrl: toProject(seed, ctx.origin, new Set()).imageUrl,
      condition: input.condition!,
      targetPrice: input.targetPrice!,
      currency: input.currency!,
      ...(input.note ? { note: input.note } : {}),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    s.alerts.unshift(alert);
    return { success: true, alert };
  });

  r.patch("/launchpad/alerts/:id", async (ctx): Promise<ApiResult<"updateLaunchpadAlert">> => {
    ctx.session();
    const alert = previewState().alerts.find((a) => a.id === ctx.params.id);
    if (!alert) throw new HttpError(404, "Alert not found.");
    Object.assign(alert, alertInput(await ctx.body(), true), { updatedAt: new Date().toISOString() });
    return { success: true, alert };
  });

  r.delete("/launchpad/alerts/:id", (ctx): ApiResult<"deleteLaunchpadAlert"> => {
    ctx.session();
    const s = previewState();
    const before = s.alerts.length;
    s.alerts = s.alerts.filter((a) => a.id !== ctx.params.id);
    if (s.alerts.length === before) throw new HttpError(404, "Alert not found.");
    return { success: true, message: "Alert deleted" };
  });

  r.post("/launchpad/upload-image", (ctx) => {
    ctx.session();
    disabled();
  });

  r.post("/launchpad/custodial/create-token", (ctx) => {
    ctx.session();
    disabled();
  });

  r.post("/launchpad/projects/:id/custodial/buy", (ctx) => {
    ctx.session();
    projectOr404(ctx);
    disabled();
  });

  r.post("/launchpad/projects/:id/custodial/sell", (ctx) => {
    ctx.session();
    projectOr404(ctx);
    disabled();
  });
}
