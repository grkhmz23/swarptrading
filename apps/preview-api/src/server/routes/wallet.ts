import type { Ctx, Router } from "../router";
import type { ApiResult } from "../types";
import { isSolanaAddress } from "../base58";
import { HttpError, disabled, num, queryInt, str } from "../http";
import { round } from "../random";
import { tokenByMint, tokenBySymbol, type SampleToken } from "../data/tokens";
import { STAKING_POOLS, stakingPositions } from "../data/account";
import { WALLET_ID, swapHistory, walletBalances, walletRecord, walletTransactions } from "../data/wallet";

const QUOTE_TTL_MS = 30_000;
const SWAP_FEE_RATE = 0.0025;
const NETWORK_FEE_SOL = 0.000005;

function walletFor(ctx: Ctx): void {
  ctx.session();
  if (ctx.params.id !== WALLET_ID) throw new HttpError(404, "Wallet not found.");
}

function resolveToken(mint: string, symbol: string, label: string): SampleToken {
  const token = (mint && tokenByMint(mint)) || (symbol && tokenBySymbol(symbol));
  if (!token) throw new HttpError(400, `${label} token is not available in the preview.`);
  return token;
}

export function swapQuote(body: Record<string, unknown>, now = Date.now()): ApiResult<"getSwapQuote"> {
  const input = resolveToken(str(body, "inputMint", { optional: true, max: 44 }), str(body, "inputToken", { optional: true, max: 20 }), "Input");
  const output = resolveToken(str(body, "outputMint", { optional: true, max: 44 }), str(body, "outputToken", { optional: true, max: 20 }), "Output");
  if (input.address === output.address) throw new HttpError(400, "Choose two different tokens.");
  const amount = num(body, "amount");
  if (amount <= 0) throw new HttpError(400, "amount must be greater than 0.");
  const slippageRaw = num(body, "slippageTolerance", { optional: true });
  const slippage = Number.isNaN(slippageRaw) ? 0.5 : slippageRaw;
  if (slippage < 0.01 || slippage > 50) throw new HttpError(400, "slippageTolerance must be between 0.01 and 50.");

  const inputUsd = amount * input.usdPrice;
  const priceImpact = round(Math.min(15, (inputUsd / Math.min(input.liquidity, output.liquidity)) * 50), 4);
  const outDecimals = Math.min(output.decimals, 9);
  const outputAmount = round(((inputUsd * (1 - SWAP_FEE_RATE)) / output.usdPrice) * (1 - priceImpact / 100), outDecimals);
  const jupiterFee = round(amount * SWAP_FEE_RATE, Math.min(input.decimals, 9));
  return {
    inputToken: input.symbol,
    outputToken: output.symbol,
    inputAmount: amount,
    outputAmount,
    minimumOutputAmount: round(outputAmount * (1 - slippage / 100), outDecimals),
    priceImpact,
    fees: { jupiterFee, networkFee: NETWORK_FEE_SOL, total: round(jupiterFee + (input.symbol === "SOL" ? NETWORK_FEE_SOL : 0), 9) },
    validUntil: now + QUOTE_TTL_MS,
    route: { source: "preview-sample", hops: [input.symbol, output.symbol] },
  };
}

export function walletRoutes(r: Router): void {
  r.post("/wallet", (ctx): ApiResult<"createWallet"> => {
    ctx.session();
    return { wallet: walletRecord(ctx.cfg.walletAddress), message: "Wallet ready" };
  });

  r.get("/wallet", (ctx): ApiResult<"getUserWallets"> => {
    ctx.session();
    return [walletRecord(ctx.cfg.walletAddress)];
  });

  r.post("/wallet/validate-address", async (ctx): Promise<ApiResult<"validateSolanaAddress">> => {
    ctx.session();
    const address = str(await ctx.body(), "address", { max: 64 });
    const valid = isSolanaAddress(address);
    return { valid, address, message: valid ? "Valid Solana address" : "Not a valid Solana address" };
  });

  r.post("/wallet/:id/initialize", (ctx) => {
    walletFor(ctx);
    disabled();
  });

  r.post("/wallet/:id/send-transaction", (ctx) => {
    walletFor(ctx);
    disabled();
  });

  r.post("/wallet/:id/swap/execute", (ctx) => {
    walletFor(ctx);
    disabled();
  });

  r.post("/wallet/:id/generate-transak-url", (ctx) => {
    walletFor(ctx);
    disabled();
  });

  r.get("/wallet/:id/transactions", (ctx): ApiResult<"getTransactionHistory"> => {
    walletFor(ctx);
    return walletTransactions(ctx.cfg.walletAddress);
  });

  r.post("/wallet/:id/swap/quote", async (ctx): Promise<ApiResult<"getSwapQuote">> => {
    walletFor(ctx);
    return swapQuote(await ctx.body());
  });

  r.get("/wallet/:id/swap/history", (ctx): ApiResult<"getSwapHistory"> => {
    walletFor(ctx);
    const q = ctx.url.searchParams;
    const page = queryInt(q, "page", 1, 1000);
    const limit = queryInt(q, "limit", 20, 100);
    const status = q.get("status");
    const swaps = swapHistory().filter(
      (s) =>
        (!status || s.status === status) &&
        (!q.get("inputToken") || s.inputToken === q.get("inputToken")) &&
        (!q.get("outputToken") || s.outputToken === q.get("outputToken"))
    );
    return { swaps: swaps.slice((page - 1) * limit, page * limit), total: swaps.length, page, limit };
  });

  r.get("/wallet/:id/swap/tokens/balances", (ctx): ApiResult<"getTokenBalances"> => {
    walletFor(ctx);
    return walletBalances();
  });

  r.get("/staking/pools", (ctx) => {
    ctx.session();
    return STAKING_POOLS;
  });

  r.get("/staking/positions", (ctx) => {
    ctx.session();
    return stakingPositions();
  });

  r.get("/staking/summary", (ctx) => {
    ctx.session();
    const positions = stakingPositions();
    const swarp = walletBalances().balances.find((b) => b.symbol === "SWARP");
    return {
      totalStaked: positions.reduce((sum, p) => sum + p.amount, 0),
      totalEarned: round(positions.reduce((sum, p) => sum + p.earnedRewards, 0), 2),
      activePositions: positions.filter((p) => p.status === "ACTIVE").length,
      availableBalance: swarp?.balance ?? 0,
    };
  });

  r.post("/staking/stake", (ctx) => {
    ctx.session();
    disabled();
  });

  r.post("/staking/withdraw/:id", (ctx) => {
    ctx.session();
    disabled();
  });

  r.post("/veriff/session", (ctx) => {
    ctx.session();
    disabled();
  });
}
