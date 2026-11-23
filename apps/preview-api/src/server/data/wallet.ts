import type { ApiResult } from "../types";
import { derivedAddress, round } from "../random";
import { sampleTokens, tokenBySymbol } from "./tokens";

export const WALLET_ID = "preview-wallet";
export const USER_ID = "preview-user";

/** Sample holdings of the shared preview account. */
const HOLDINGS: Record<string, number> = {
  SOL: 12.4836,
  USDC: 1250.4,
  SWARP: 85_000,
  JUP: 420.5,
  BONK: 15_250_000,
};

export function walletBalances(): ApiResult<"getTokenBalances"> {
  const balances = sampleTokens()
    .filter((t) => HOLDINGS[t.symbol] !== undefined)
    .map((t) => {
      const balance = HOLDINGS[t.symbol];
      return {
        symbol: t.symbol,
        mint: t.address,
        balance,
        formattedBalance: balance.toLocaleString("en-US", { maximumFractionDigits: Math.min(t.decimals, 6) }),
        usdValue: round(balance * t.usdPrice, 2),
      };
    });
  return { balances, portfolioValue: round(balances.reduce((sum, b) => sum + b.usdValue, 0), 2) };
}

export function solBalance(): number {
  return HOLDINGS.SOL;
}

export function walletRecord(address: string, now = Date.now()) {
  return {
    id: WALLET_ID,
    publicKey: address,
    name: "Main wallet",
    description: "Preview wallet (sample data)",
    status: "ACTIVE" as const,
    balance: HOLDINGS.SOL,
    isInitialized: true,
    createdAt: new Date(now - 40 * 86_400_000).toISOString(),
    lastActivityAt: new Date(now - 2 * 3_600_000).toISOString(),
  };
}

type Transaction = ApiResult<"getTransactionHistory">["transactions"][number] & {
  tokenMint?: string;
  tokenSymbol?: string;
};

const TX_PLAN: { type: "SEND" | "RECEIVE"; symbol: string; amount: number; hoursAgo: number; status?: "FAILED" | "PENDING" }[] = [
  { type: "RECEIVE", symbol: "SOL", amount: 2.5, hoursAgo: 2 },
  { type: "SEND", symbol: "USDC", amount: 75, hoursAgo: 9 },
  { type: "RECEIVE", symbol: "SWARP", amount: 25_000, hoursAgo: 26 },
  { type: "SEND", symbol: "SOL", amount: 0.8, hoursAgo: 49, status: "FAILED" },
  { type: "SEND", symbol: "SOL", amount: 0.35, hoursAgo: 50 },
  { type: "RECEIVE", symbol: "USDC", amount: 500, hoursAgo: 96 },
  { type: "RECEIVE", symbol: "JUP", amount: 120.5, hoursAgo: 140 },
  { type: "SEND", symbol: "BONK", amount: 2_000_000, hoursAgo: 210 },
  { type: "RECEIVE", symbol: "SOL", amount: 10, hoursAgo: 400 },
  { type: "RECEIVE", symbol: "SWARP", amount: 60_000, hoursAgo: 620 },
];

/** Sample history. Signatures are empty so the UI shows no explorer link for them. */
export function walletTransactions(address: string, now = Date.now()): { transactions: Transaction[]; total: number } {
  const hour = Math.floor(now / 3_600_000) * 3_600_000;
  const transactions = TX_PLAN.map((tx, i): Transaction => {
    const token = tokenBySymbol(tx.symbol);
    const counterparty = derivedAddress(`counterparty:${i}`);
    return {
      id: `preview-tx-${i}`,
      signature: "",
      type: tx.type,
      amount: tx.amount,
      fromAddress: tx.type === "SEND" ? address : counterparty,
      toAddress: tx.type === "SEND" ? counterparty : address,
      fee: 0.000005,
      status: tx.status ?? "CONFIRMED",
      timestamp: new Date(hour - tx.hoursAgo * 3_600_000).toISOString(),
      ...(tx.status === "FAILED" ? { errorMessage: "Insufficient funds for fee" } : {}),
      ...(tx.symbol !== "SOL" && token ? { tokenMint: token.address, tokenSymbol: token.symbol } : {}),
    };
  });
  return { transactions, total: transactions.length };
}

export function swapHistory(now = Date.now()): ApiResult<"getSwapHistory">["swaps"] {
  const hour = Math.floor(now / 3_600_000) * 3_600_000;
  const plan = [
    { from: "SOL", to: "USDC", amount: 1.5, hoursAgo: 5 },
    { from: "USDC", to: "SWARP", amount: 200, hoursAgo: 30 },
    { from: "SOL", to: "JUP", amount: 0.4, hoursAgo: 74 },
    { from: "BONK", to: "SOL", amount: 3_000_000, hoursAgo: 150, failed: true },
    { from: "SOL", to: "BONK", amount: 0.25, hoursAgo: 300 },
  ];
  return plan.map((p, i) => {
    const inT = tokenBySymbol(p.from)!;
    const outT = tokenBySymbol(p.to)!;
    const out = round((p.amount * inT.usdPrice) / outT.usdPrice * 0.997, outT.decimals > 6 ? 6 : outT.decimals);
    const created = new Date(hour - p.hoursAgo * 3_600_000).toISOString();
    return {
      id: `preview-swap-${i}`,
      inputToken: p.from,
      outputToken: p.to,
      inputAmount: p.amount,
      outputAmount: out,
      ...(p.failed ? {} : { actualOutputAmount: out, confirmedAt: created }),
      status: p.failed ? ("FAILED" as const) : ("COMPLETED" as const),
      priceImpact: 0.08,
      swapFee: round(p.amount * 0.0025, 6),
      networkFee: 0.000005,
      dexUsed: "Jupiter",
      createdAt: created,
    };
  });
}

/** Launchpad positions held by the preview account (token units). */
export const LAUNCHPAD_HOLDINGS: Record<string, { tokens: number; solInvested: number; solReceived: number; trades: number; firstDaysAgo: number }> = {
  "orbit-cats": { tokens: 245_000, solInvested: 8.5, solReceived: 0, trades: 3, firstDaysAgo: 2 },
  "solar-sprout": { tokens: 510_000, solInvested: 16, solReceived: 2.2, trades: 4, firstDaysAgo: 4 },
  "echo-finch": { tokens: 82_000, solInvested: 3, solReceived: 0, trades: 1, firstDaysAgo: 6 },
};
