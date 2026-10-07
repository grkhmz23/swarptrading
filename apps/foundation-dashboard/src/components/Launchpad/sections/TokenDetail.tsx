"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiService, LaunchpadProject } from "@/services/api";
import { Toast } from "@/components/ui/Toast";
import { useT } from "@/i18n/I18nProvider";
import dynamic from "next/dynamic";
import { getAccessToken } from '@/lib/session';
import { ApiError, errorMessage, newIdempotencyKey } from '@/lib/http';
import { floorToDecimals, fractionOfSpendable, isAmountInput, parseAmount, SOL_FEE_RESERVE } from '@/lib/amount';
import { NATIVE_SOL_DECIMALS } from '@/lib/solana';
import { PinConfirmModal } from '@/components/ui/PinConfirmModal';

// Dynamic import for TradingViewChart to avoid SSR issues with lightweight-charts
const TradingViewChart = dynamic(
  () => import("@/components/Launchpad/TradingViewChart"),
  { ssr: false, loading: () => <div className="w-full h-[435px] bg-[#1A1B23] animate-pulse rounded-lg" /> }
);

// Typography styles from Figma
const typography = {
  "H2/Semibold": {
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "28px",
    fontWeight: 600,
    lineHeight: "1.3em",
  },
  "P1/Semibold": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "1.4em",
    letterSpacing: "-0.3px",
  },
  "P1/Medium": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "16px",
    fontWeight: 500,
    lineHeight: "1.4em",
    letterSpacing: "-0.3px",
  },
  "P1/Regular": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "16px",
    fontWeight: 400,
    lineHeight: "1.4em",
    letterSpacing: "-0.3px",
  },
  "P2/Bold": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "1.4em",
    letterSpacing: "-0.3px",
  },
  "P2/Semibold": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "1.4em",
    letterSpacing: "-0.3px",
  },
  "P2/Medium": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "1.4em",
    letterSpacing: "-0.3px",
  },
  "P2/Regular": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "1.4em",
    letterSpacing: "-0.3px",
  },
  "Caption/Semibold": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: "1.5em",
    letterSpacing: "-0.3px",
  },
  "Caption/Medium": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "1.5em",
    letterSpacing: "-0.3px",
  },
  "Caption/Regular": {
    fontFamily: "'Inter Variable', Inter, sans-serif",
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: "1.5em",
    letterSpacing: "-0.3px",
  },
};

// Colors from Figma
const colors = {
  "Neutral/600": "#090A11",
  "Neutral/500": "#131519",
  "Neutral/400": "#2B2D30",
  "Neutral/200": "#636466",
  "Neutral/100": "#B3B5B6",
  "Neutral/50": "#FFFFFF",
  "White": "#FFFFFF",
  "Primary/Main": "#40E0D0",
  "Primary/Shade4": "#0E151A",
  "Success": "#27AE60",
  "Danger": "#EB5757",
};

interface TokenDetailProps {
  projectId: string;
  onBack: () => void;
}

// Tab types
type TabType = "chart" | "comments" | "trades" | "holders";

/** Launchpad tokens accept up to 9 decimals in input; the backend rejects finer amounts. */
const LAUNCHPAD_INPUT_DECIMALS = 9;
const SLIPPAGE_OPTIONS = [0.5, 1, 2, 5];

interface TradeQuote {
  mode: "buy" | "sell";
  /** Normalised amount text the quote was fetched for. */
  inputText: string;
  outputAmount: number;
  fee: number;
  priceImpact: number;
  fetchedAt: number;
}

interface PendingTrade {
  mode: "buy" | "sell";
  amount: number;
  amountText: string;
  expectedOutput: number;
  minimumOutput: number;
  slippage: number;
  priceImpact: number;
}

// Format helpers
const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return "0 SOL";
  if (typeof price === "string") {
    if (price.includes("$") || price.includes("SOL")) return price;
    const parsed = parseFloat(price.replace(/[^0-9.-]/g, ""));
    if (isNaN(parsed)) return "0 SOL";
    price = parsed;
  }
  if (typeof price !== "number" || isNaN(price)) return "0 SOL";
  // Show more decimals for very small values (typical bonding curve prices)
  if (price < 0.00000001) return `${price.toExponential(2)} SOL`;
  if (price < 0.0000001) return `${price.toFixed(10)} SOL`;
  if (price < 0.000001) return `${price.toFixed(9)} SOL`;
  if (price < 0.0001) return `${price.toFixed(8)} SOL`;
  if (price < 0.01) return `${price.toFixed(6)} SOL`;
  if (price < 1) return `${price.toFixed(4)} SOL`;
  return `${price.toFixed(2)} SOL`;
};


const formatPriceChange = (change: number | string | undefined | null): string => {
  if (change === undefined || change === null) return "0.00%";
  const numValue = typeof change === "string" ? parseFloat(change) : change;
  if (isNaN(numValue)) return "0.00%";
  return `${Math.abs(numValue).toFixed(2)}%`;
};

const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatTokenAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  return amount.toFixed(2);
};

const formatSolVolume = (solAmount: number): string => {
  if (solAmount >= 1000) return `${(solAmount / 1000).toFixed(1)}K SOL`;
  if (solAmount >= 1) return `${solAmount.toFixed(2)} SOL`;
  return `${solAmount.toFixed(4)} SOL`;
};

const formatLiquiditySol = (liquidity: number | string | undefined | null): string => {
  if (liquidity === undefined || liquidity === null) return "0 SOL";
  const value = typeof liquidity === "string" ? parseFloat(liquidity) : liquidity;
  if (isNaN(value)) return "0 SOL";
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M SOL`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K SOL`;
  if (value >= 1) return `${value.toFixed(2)} SOL`;
  if (value >= 0.01) return `${value.toFixed(4)} SOL`;
  return `${value.toFixed(6)} SOL`;
};

const formatSmallMarketCap = (marketCap: number | string | undefined | null): string => {
  if (marketCap === undefined || marketCap === null) return "$0";
  const value = typeof marketCap === "string" ? parseFloat(marketCap) : marketCap;
  if (isNaN(value)) return "$0";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
};

// Custom CSS for 1440px breakpoint (not available in default Tailwind)
const responsiveStyles = `
  @media (min-width: 1440px) {
    .token-detail-container {
      flex-direction: row !important;
    }
    .token-detail-sidebar {
      width: 418px !important;
      border-top: none !important;
      border-left: 0.2px solid #2B2D30 !important;
    }
  }
`;

export default function TokenDetail({ projectId, onBack }: TokenDetailProps) {
  const t = useT();
  const [project, setProject] = useState<LaunchpadProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [tokenAmount, setTokenAmount] = useState("");
  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [slippage, setSlippage] = useState(1);
  /** SOL in the custodial wallet; null when it could not be loaded. */
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  /** This token held by the user; null when it could not be loaded. */
  const [userTokenBalance, setUserTokenBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<PendingTrade | null>(null);
  const tradeKeyRef = useRef<string | null>(null);
  const quoteSeqRef = useRef(0);
  const [trades, setTrades] = useState<Array<{
    id: string;
    type: 'buy' | 'sell';
    solAmount: string;
    tokenAmount: string;
    pricePerToken?: string;
    walletAddress: string;
    user?: {
      id: string;
      username?: string;
      profilePicture?: string;
    };
    createdAt: string;
    transactionHash?: string;
  }>>([]);
  const [holders, setHolders] = useState<Array<{
    rank: number;
    walletAddress: string;
    tokenAmount: string;
    percentage: string;
    user?: {
      id: string;
      username?: string;
      profilePicture?: string;
    };
  }>>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);

  const [isWatching, setIsWatching] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);

  // Refs for scroll-to-section navigation
  const chartRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const tradesRef = useRef<HTMLDivElement>(null);
  const holdersRef = useRef<HTMLDivElement>(null);

  // Scroll to section when tab is clicked
  const scrollToSection = (tab: TabType) => {
    setActiveTab(tab);
    const refs: Record<TabType, React.RefObject<HTMLDivElement | null>> = {
      chart: chartRef,
      comments: commentsRef,
      trades: tradesRef,
      holders: holdersRef,
    };
    refs[tab]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const fetchWalletBalance = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setWalletBalance(null);
      return;
    }
    try {
      const wallets = await apiService.getUserWallets(accessToken);
      const balance = Number(wallets?.[0]?.balance);
      setWalletBalance(Number.isFinite(balance) ? balance : null);
    } catch {
      setWalletBalance(null);
    }
  }, []);

  const fetchTokenBalance = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setUserTokenBalance(null);
      return;
    }
    try {
      const response = await apiService.getLaunchpadTokenBalance(projectId, accessToken);
      const balance = Number(response?.balance);
      setUserTokenBalance(Number.isFinite(balance) ? balance : 0);
    } catch {
      setUserTokenBalance(null);
    }
  }, [projectId]);

  /** Initial load shows the skeleton; later refreshes keep the page (and chart) mounted. */
  const fetchProject = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true);
    else {
      setIsLoading(true);
      setError(null);
    }
    try {
      const accessToken = getAccessToken();
      const response = await apiService.getLaunchpadProject(projectId, accessToken);
      setProject(response);
    } catch {
      if (!background) setError(t.launchpad?.tokenDetail?.status?.failedToLoad || "Failed to load token details");
    } finally {
      if (background) setIsRefreshing(false);
      else setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- translations only affect the error text
  }, [projectId]);

  const fetchTrades = useCallback(async () => {
    setIsLoadingTrades(true);
    try {
      const response = await apiService.getLaunchpadProjectTrades(projectId, { limit: 50 });
      setTrades(response.trades.map((trade) => ({
        id: trade.id,
        type: String(trade.type).toLowerCase() === "sell" ? "sell" : "buy",
        solAmount: String(trade.amount),
        tokenAmount: String(trade.tokenAmount),
        pricePerToken: String(trade.price),
        walletAddress: trade.trader,
        user: trade.traderAvatar
          ? { id: trade.trader, profilePicture: trade.traderAvatar }
          : undefined,
        createdAt: trade.timestamp,
        transactionHash: trade.signature,
      })));
    } catch {
      setTrades([]);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [projectId]);

  const fetchHolders = useCallback(async () => {
    setIsLoadingHolders(true);
    try {
      const response = await apiService.getLaunchpadHolders(projectId, { limit: 50 });
      setHolders(response.holders.map((holder, index) => ({
        rank: index + 1,
        walletAddress: holder.address,
        tokenAmount: String(holder.balance),
        percentage: String(holder.percentage),
        user: holder.username || holder.avatar
          ? { id: holder.address, username: holder.username, profilePicture: holder.avatar }
          : undefined,
      })));
    } catch {
      setHolders([]);
    } finally {
      setIsLoadingHolders(false);
    }
  }, [projectId]);

  const fetchWatchlistStatus = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setIsWatching(false);
        return;
      }

      const response = await apiService.getLaunchpadWatchlist(accessToken);
      const isInWatchlist = response.projects?.some(
        (p: { id: string }) => p.id === projectId
      ) || false;
      setIsWatching(isInWatchlist);
    } catch {
      setIsWatching(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchWalletBalance();
    fetchTokenBalance();
    fetchTrades();
    fetchHolders();
    fetchWatchlistStatus();
  }, [fetchProject, fetchWalletBalance, fetchTokenBalance, fetchTrades, fetchHolders, fetchWatchlistStatus]);

  const handleToggleWatchlist = async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setTradeError(t.launchpad?.tokenDetail?.toast?.loginToAddWatchlist || "Please log in to add to watchlist");
      setShowToast(true);
      return;
    }

    setIsTogglingWatchlist(true);
    try {
      const response = await apiService.toggleLaunchpadWatchlist(projectId, accessToken);
      setIsWatching(response.isWatching);
    } catch (err) {
      setTradeError(errorMessage(err, t.launchpad?.tokenDetail?.toast?.failedToUpdateWatchlist || "Failed to update watchlist"));
      setShowToast(true);
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  // Calculate trade stats from trades data
  const tradeStats = useMemo(() => {
    const buyTrades = trades.filter(t => t.type === 'buy');
    const sellTrades = trades.filter(t => t.type === 'sell');

    const buyVolume = buyTrades.reduce((sum, t) => sum + parseFloat(t.solAmount || '0'), 0);
    const sellVolume = sellTrades.reduce((sum, t) => sum + parseFloat(t.solAmount || '0'), 0);

    return {
      totalTxns: trades.length,
      buys: buyTrades.length,
      sells: sellTrades.length,
      buyVolume,
      sellVolume,
      totalVolume: buyVolume + sellVolume,
    };
  }, [trades]);

  const isBuy = tradeMode === "buy";
  const isMigrated = project?.status === "migrated";
  const inputDecimals = isBuy ? NATIVE_SOL_DECIMALS : LAUNCHPAD_INPUT_DECIMALS;
  const spendable = isBuy
    ? walletBalance === null ? null : Math.max(0, walletBalance - SOL_FEE_RESERVE)
    : userTokenBalance;
  const parsedInput = parseAmount(tokenAmount, inputDecimals);

  /** Fetch a quote for the current amount; stale responses are ignored. */
  const getQuote = useCallback(async () => {
    const seq = ++quoteSeqRef.current;
    const parsed = parseAmount(tokenAmount, tradeMode === "buy" ? NATIVE_SOL_DECIMALS : LAUNCHPAD_INPUT_DECIMALS);
    if (!project || !parsed.ok) {
      setQuote(null);
      setIsGettingQuote(false);
      return;
    }
    setIsGettingQuote(true);
    try {
      const response = tradeMode === "buy"
        ? await apiService.getLaunchpadBuyQuote(project.id, parsed.value)
        : await apiService.getLaunchpadSellQuote(project.id, parsed.value);
      if (seq !== quoteSeqRef.current) return;
      setQuote({
        mode: tradeMode,
        inputText: parsed.text,
        outputAmount: Number(response.outputAmount),
        fee: Number(response.fee),
        priceImpact: Number(response.priceImpact),
        fetchedAt: Date.now(),
      });
    } catch {
      if (seq === quoteSeqRef.current) setQuote(null);
    } finally {
      if (seq === quoteSeqRef.current) setIsGettingQuote(false);
    }
  }, [project, tradeMode, tokenAmount]);

  // Debounce while typing, then keep the quote fresh every 10s.
  useEffect(() => {
    setQuote(null);
    const timer = setTimeout(getQuote, 400);
    const refresh = setInterval(() => {
      if (document.visibilityState === "visible") getQuote();
    }, 10_000);
    return () => {
      clearTimeout(timer);
      clearInterval(refresh);
    };
  }, [getQuote]);

  const switchMode = (mode: "buy" | "sell") => {
    if (mode === tradeMode) return;
    setTradeMode(mode);
    setTokenAmount("");
    setQuote(null);
    tradeKeyRef.current = null;
  };

  const setPercent = (percent: number) => {
    if (isBuy) {
      if (walletBalance === null) return;
      setTokenAmount(fractionOfSpendable(walletBalance, percent / 100, NATIVE_SOL_DECIMALS, true));
    } else {
      if (userTokenBalance === null) return;
      // "Max" sells exactly the reported balance; fractions round down.
      setTokenAmount(percent === 100 ? String(userTokenBalance) : floorToDecimals((userTokenBalance * percent) / 100, LAUNCHPAD_INPUT_DECIMALS));
    }
  };

  const showError = (message: string) => {
    setTradeSuccess(null);
    setTradeError(message);
    setShowToast(true);
  };

  /** Validate and open the review + PIN step. */
  const handleTrade = () => {
    if (!project || isTrading) return;
    if (isMigrated) {
      showError("This token has graduated from the bonding curve. Trade it on a DEX instead.");
      return;
    }
    if (spendable === null) {
      showError("Your balance could not be loaded. Please refresh and try again.");
      return;
    }
    const parsed = parseAmount(tokenAmount, inputDecimals, spendable);
    if (!parsed.ok) {
      if (parsed.problem === "insufficient") {
        showError(isBuy
          ? (t.launchpad?.tokenDetail?.toast?.insufficientSol || `Insufficient SOL. Keep at least ${SOL_FEE_RESERVE} SOL for network fees.`)
          : (t.launchpad?.tokenDetail?.toast?.insufficientTokens?.replace('{{ticker}}', project.ticker) || `Insufficient ${project.ticker} balance.`));
      } else {
        showError(parsed.message);
      }
      return;
    }
    if (!quote || quote.mode !== tradeMode || quote.inputText !== parsed.text || !(quote.outputAmount > 0)) {
      showError("Waiting for a price quote. Please try again in a moment.");
      return;
    }
    const minimumOutput = quote.outputAmount * (1 - slippage / 100);
    const same = pendingTrade && pendingTrade.mode === tradeMode && pendingTrade.amountText === parsed.text;
    if (!same || !tradeKeyRef.current) tradeKeyRef.current = newIdempotencyKey();
    setPendingTrade({ mode: tradeMode, amount: parsed.value, amountText: parsed.text, expectedOutput: quote.outputAmount, minimumOutput, slippage, priceImpact: quote.priceImpact });
  };

  /** PIN verified: submit exactly what was reviewed. */
  const executeTrade = async () => {
    if (!project || !pendingTrade || !tradeKeyRef.current) return;
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error(t.launchpad?.tokenDetail?.toast?.loginRequired || "Please log in to trade.");

    setIsTrading(true);
    setTradeError(null);
    setTradeSuccess(null);
    setShowToast(false);
    try {
      const response = pendingTrade.mode === "buy"
        ? await apiService.buyLaunchpadTokensCustodial(project.id, pendingTrade.amount, accessToken, pendingTrade.slippage, tradeKeyRef.current, pendingTrade.minimumOutput)
        : await apiService.sellLaunchpadTokensCustodial(project.id, pendingTrade.amount, accessToken, pendingTrade.slippage, tradeKeyRef.current, pendingTrade.minimumOutput);

      if (!response?.success) {
        throw new ApiError(response?.message || "Trade was rejected.", 400, "Trade Rejected");
      }
      tradeKeyRef.current = null;
      setPendingTrade(null);

      if (pendingTrade.mode === "buy") {
        const tokensReceived = Number(response.trade?.tokenAmount);
        const amountText = Number.isFinite(tokensReceived) ? tokensReceived.toLocaleString() : "your";
        setTradeSuccess(
          t.launchpad?.tokenDetail?.toast?.successfullyBought?.replace('{{amount}}', amountText)?.replace('{{ticker}}', project.ticker) ||
          `Successfully bought ${amountText} ${project.ticker}!`
        );
      } else {
        const solReceived = Number(response.trade?.solAmount);
        const solText = Number.isFinite(solReceived) ? solReceived.toFixed(4) : "—";
        setTradeSuccess(
          t.launchpad?.tokenDetail?.toast?.successfullySold?.replace('{{amount}}', pendingTrade.amountText)?.replace('{{ticker}}', project.ticker)?.replace('{{solAmount}}', solText) ||
          `Successfully sold ${pendingTrade.amountText} ${project.ticker} for ${solText} SOL!`
        );
      }
      setShowToast(true);
      setTokenAmount("");
      setQuote(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 0) {
        // The request may have been executed. Keep the idempotency key so a retry cannot trade twice.
        setPendingTrade(null);
        showError("Network error: the trade status is unknown. Check Trade History before trying again.");
        return;
      }
      const message = err instanceof ApiError && /slippage/i.test(err.message)
        ? (t.launchpad?.tokenDetail?.toast?.slippageError || "Price moved more than your slippage setting. Get a new quote and try again.")
        : errorMessage(err, t.launchpad?.tokenDetail?.toast?.tradeFailed || "Trade failed. Please try again.");
      throw new Error(message);
    } finally {
      setIsTrading(false);
      // Refresh everything in the background, whatever the outcome.
      fetchProject(true);
      fetchWalletBalance();
      fetchTokenBalance();
      fetchTrades();
      fetchHolders();
    }
  };

  if (isLoading) {
    return (
      <>
        <style>{responsiveStyles}</style>
        <div className="token-detail-container flex flex-col h-full overflow-hidden" style={{ backgroundColor: colors["Neutral/600"] }}>
          {/* Main Content Area Skeleton - Left Side */}
          <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Tab Navigation Skeleton */}
          <div className="flex items-center gap-6" style={{ padding: "28px 28px 0px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 w-16 bg-[#1A1B23] animate-pulse rounded" style={{ marginBottom: "8px" }} />
            ))}
          </div>

          {/* Chart Section Skeleton */}
          <div
            className="flex flex-col gap-6"
            style={{
              padding: "28px",
              borderTop: `0.2px solid ${colors["Neutral/400"]}`,
              borderBottom: `0.2px solid ${colors["Neutral/400"]}`,
            }}
          >
            {/* Timeframe controls skeleton */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 w-6 bg-[#1A1B23] animate-pulse rounded" />
                ))}
                <div className="h-3 w-3 bg-[#1A1B23] animate-pulse rounded" />
              </div>
              <div className="w-px h-5 bg-[#2B2D30]" />
              <div className="h-5 w-5 bg-[#1A1B23] animate-pulse rounded" />
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-[#1A1B23] animate-pulse rounded" />
              </div>
            </div>
            {/* Chart placeholder - matches 435px height */}
            <div className="w-full h-[435px] bg-[#1A1B23] animate-pulse rounded-lg" />
          </div>

          {/* Comments Section Skeleton */}
          <div className="flex flex-col gap-4 !p-7" style={{ borderBottom: `0.2px solid ${colors["Neutral/400"]}` }}>
            <div className="h-5 w-24 bg-[#1A1B23] animate-pulse rounded" />
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A1B23] animate-pulse" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 w-24 bg-[#1A1B23] animate-pulse rounded" />
                    <div className="h-4 w-3/4 bg-[#1A1B23] animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trades Section Skeleton */}
          <div className="flex flex-col gap-4 !p-7" style={{ borderBottom: `0.2px solid ${colors["Neutral/400"]}` }}>
            <div className="h-5 w-16 bg-[#1A1B23] animate-pulse rounded" />
            <div className="flex flex-col gap-3">
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-3" style={{ borderBottom: `0.5px solid ${colors["Neutral/400"]}`, paddingBottom: "12px" }}>
                <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[117px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[146px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[160px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[52px] h-4 bg-[#1A1B23] animate-pulse rounded" />
              </div>
              {/* Trade Rows Skeleton */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[117px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[146px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[160px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[52px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Holders Section Skeleton */}
          <div className="flex flex-col gap-4 !p-7" style={{ borderBottom: `0.2px solid ${colors["Neutral/400"]}` }}>
            <div className="h-5 w-24 bg-[#1A1B23] animate-pulse rounded" />
            <div className="flex flex-col gap-3">
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-3" style={{ borderBottom: `0.5px solid ${colors["Neutral/400"]}`, paddingBottom: "12px" }}>
                <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[161px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[144px] h-4 bg-[#1A1B23] animate-pulse rounded" />
              </div>
              {/* Holder Rows Skeleton */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[161px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[144px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Skeleton */}
        <div
          className="token-detail-sidebar w-full overflow-y-auto flex-shrink-0"
          style={{
            borderTop: `0.2px solid ${colors["Neutral/400"]}`,
          }}
        >
          {/* Token Info Section Skeleton */}
          <div className="flex flex-col gap-5" style={{ padding: "28px" }}>
            {/* Token Header Skeleton */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1A1B23] animate-pulse" />
                <div className="h-5 w-24 bg-[#1A1B23] animate-pulse rounded" />
                <div className="h-4 w-12 bg-[#1A1B23] animate-pulse rounded" />
                <div className="h-6 w-12 bg-[#1A1B23] animate-pulse rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 bg-[#1A1B23] animate-pulse rounded" />
                <div className="h-4 w-16 bg-[#1A1B23] animate-pulse rounded" />
              </div>
            </div>

            {/* Stats Row Skeleton */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col items-center gap-1 rounded-xl p-3 border border-[#2B2D30]">
                <div className="h-3 w-16 bg-[#1A1B23] animate-pulse rounded" />
                <div className="h-5 w-14 bg-[#1A1B23] animate-pulse rounded" />
              </div>
              <div className="flex-1 flex flex-col items-center gap-1 rounded-lg p-3 border border-[#2B2D30]">
                <div className="h-3 w-16 bg-[#1A1B23] animate-pulse rounded" />
                <div className="h-5 w-14 bg-[#1A1B23] animate-pulse rounded" />
              </div>
            </div>

            {/* Price Change Grid Skeleton */}
            <div className="flex flex-col rounded-[14px] border border-[#2B2D30]">
              <div className="flex">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 p-3">
                    <div className="h-3 w-8 bg-[#1A1B23] animate-pulse rounded" />
                    <div className="h-4 w-12 bg-[#1A1B23] animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <div className="flex p-4 border-t border-[#2B2D30]">
                <div className="flex flex-col gap-4 pr-8 border-r border-[#2B2D30]">
                  <div className="flex flex-col gap-1">
                    <div className="h-3 w-10 bg-[#1A1B23] animate-pulse rounded" />
                    <div className="h-4 w-8 bg-[#1A1B23] animate-pulse rounded" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-3 w-12 bg-[#1A1B23] animate-pulse rounded" />
                    <div className="h-4 w-10 bg-[#1A1B23] animate-pulse rounded" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-4 px-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-8 bg-[#1A1B23] animate-pulse rounded" />
                      <div className="h-3 w-8 bg-[#1A1B23] animate-pulse rounded" />
                    </div>
                    <div className="h-2 w-full bg-[#1A1B23] animate-pulse rounded-full" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-8 bg-[#1A1B23] animate-pulse rounded" />
                      <div className="h-3 w-8 bg-[#1A1B23] animate-pulse rounded" />
                    </div>
                    <div className="h-2 w-full bg-[#1A1B23] animate-pulse rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Panel Skeleton */}
            <div className="flex flex-col gap-4 p-4 rounded-xl border border-[#2B2D30]">
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-[#1A1B23] animate-pulse rounded-full" />
                <div className="flex-1 h-10 bg-[#1A1B23] animate-pulse rounded-full" />
              </div>
              <div className="h-12 w-full bg-[#1A1B23] animate-pulse rounded-xl" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-1 h-8 bg-[#1A1B23] animate-pulse rounded-full" />
                ))}
              </div>
              <div className="h-12 w-full bg-[#1A1B23] animate-pulse rounded-full" />
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }

  const currentPriceSol = project ? Number(project.currentPrice ?? project.price) || 0 : 0;
  const socialLinks = project
    ? ([
        { label: "Website", href: project.websiteUrl },
        { label: "X", href: project.twitterUrl },
        { label: "Telegram", href: project.telegramUrl },
        { label: "Discord", href: project.discordUrl },
      ].filter((link): link is { label: string; href: string } => typeof link.href === "string" && /^https:\/\/[^\s]+$/i.test(link.href)))
    : [];

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p style={{ ...typography["P1/Regular"], color: colors.Danger }}>{error || (t.launchpad?.tokenDetail?.status?.tokenNotFound || "Token not found")}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-full"
          style={{ backgroundColor: colors["Primary/Main"], ...typography["P2/Bold"], color: colors["Neutral/600"] }}
        >
          {t.launchpad?.tokenDetail?.buttons?.goBack || "Go Back"}
        </button>
      </div>
    );
  }

  const priceChange24hNum = typeof project.priceChange24h === "string" ? parseFloat(project.priceChange24h) : (project.priceChange24h || 0);
  const isPositiveChange = !isNaN(priceChange24hNum) && priceChange24hNum >= 0;

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="token-detail-container flex flex-col h-full overflow-hidden" style={{ backgroundColor: colors["Neutral/600"] }}>
        {/* Main Content Area - Left Side */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Tab Navigation - Sticky */}
        <div
          className="flex items-center gap-6 sticky top-0 z-10"
          style={{ padding: "28px 28px 0px", backgroundColor: colors["Neutral/600"] }}
        >
          {(["chart", "comments", "trades", "holders"] as TabType[]).map((tab) => {
            const tabLabels = {
              chart: t.launchpad?.tokenDetail?.tabs?.chart || "Chart",
              comments: t.launchpad?.tokenDetail?.tabs?.comments || "Comments",
              trades: t.launchpad?.tokenDetail?.tabs?.trades || "Trades",
              holders: t.launchpad?.tokenDetail?.tabs?.holders || "Holders",
            };
            return (
              <button
                key={tab}
                onClick={() => scrollToSection(tab)}
                className="flex justify-center items-center gap-2.5 cursor-pointer"
                style={{
                  padding: "0px 12px 8px",
                  borderBottom: activeTab === tab ? `1.5px solid ${colors["Primary/Main"]}` : "none",
                }}
              >
                <span
                  style={{
                    ...typography[activeTab === tab ? "P2/Semibold" : "P2/Medium"],
                    color: activeTab === tab ? colors["Primary/Main"] : colors["Neutral/50"],
                  }}
                >
                  {tabLabels[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chart Section */}
        <div
          ref={chartRef}
          id="chart-section"
          style={{
            padding: "28px",
            borderTop: `0.2px solid ${colors["Neutral/400"]}`,
            borderBottom: `0.2px solid ${colors["Neutral/400"]}`,
          }}
        >
          <TradingViewChart
            trades={trades}
            currentPrice={parseFloat(String(project.currentPrice || project.price || 0))}
            tokenSymbol={project.ticker}
            height={435}
          />
        </div>

        {/* Comments Section */}
        {/* <div
          ref={commentsRef}
          id="comments-section"
          className="flex flex-col gap-4 p-7"
          style={{ borderBottom: `0.2px solid ${colors["Neutral/400"]}` }}
        >
          <span style={{ ...typography["P1/Semibold"], color: colors["Neutral/50"] }}>
            Comments
          </span>
          <div className="flex items-center justify-center" style={{ minHeight: "100px" }}>
            <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
              No comments yet
            </span>
          </div>
        </div> */}

        {/* Trades Section */}
        <div
          ref={tradesRef}
          id="trades-section"
          className="flex flex-col gap-4 !p-7"
          style={{ borderBottom: `0.2px solid ${colors["Neutral/400"]}` }}
        >
          <div className="flex items-center gap-1.5">
            <span style={{ ...typography["P1/Semibold"], color: colors["White"] }}>
              {t.launchpad?.tokenDetail?.tabs?.trades || "Trades"}
            </span>
            <img src="/icons/info-icon.svg" alt="info" style={{ width: 14, height: 14 }} />
          </div>
          {isLoadingTrades ? (
            <div className="flex flex-col gap-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-3" style={{ borderBottom: `0.5px solid ${colors["Neutral/400"]}`, paddingBottom: "12px" }}>
                <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[117px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[146px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[160px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[52px] h-4 bg-[#1A1B23] animate-pulse rounded" />
              </div>
              {/* Trade Rows Skeleton */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{
                    padding: "12px 0 16px",
                    borderBottom: i < 5 ? `0.2px solid ${colors["Neutral/400"]}` : "none"
                  }}
                >
                  <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[117px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[146px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[160px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[52px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : trades.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: "100px" }}>
              <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                {t.launchpad?.tokenDetail?.status?.noTradesYet || "No trades yet"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {/* Table Header */}
              <div className="flex items-center gap-3" style={{ borderBottom: `0.5px solid ${colors["Neutral/400"]}`, paddingBottom: "12px" }}>
                <span style={{ width: "32px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>#</span>
                <span style={{ width: "210px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.walletAddress || "Wallet address"}</span>
                <span style={{ width: "117px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.type || "Type"}</span>
                <span style={{ width: "146px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.amountSol || "Amount (SOL)"}</span>
                <span style={{ width: "160px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.amountToken?.replace('{{ticker}}', project?.ticker || 'Token') || `Amount (${project?.ticker || 'Token'})`}</span>
                <span style={{ width: "52px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.time || "Time"}</span>
              </div>
              {/* Trade Rows */}
              {trades.map((trade, index) => (
                <div
                  key={trade.id}
                  className="flex items-center gap-3 hover:bg-[#131519] transition-colors cursor-pointer rounded-lg"
                  style={{
                    padding: "12px 0 16px",
                    borderBottom: index < trades.length - 1 ? `0.2px solid ${colors["Neutral/400"]}` : "none"
                  }}
                >
                  <span style={{ width: "32px", ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                    {index + 1}
                  </span>
                  <div style={{ width: "210px" }} className="flex items-center gap-1.5">
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                      {formatAddress(trade.walletAddress)}
                    </span>
                  </div>
                  <span style={{ width: "117px", ...typography["P2/Regular"], color: trade.type === 'buy' ? colors["Success"] : colors["Danger"] }}>
                    {trade.type === 'buy' ? (t.launchpad?.tokenDetail?.trading?.buy || 'Buy') : (t.launchpad?.tokenDetail?.trading?.sell || 'Sell')}
                  </span>
                  <span style={{ width: "146px", ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                    {parseFloat(trade.solAmount || '0').toFixed(3)}
                  </span>
                  <span style={{ width: "160px", ...typography["P2/Regular"], color: trade.type === 'buy' ? colors["Success"] : colors["Danger"] }}>
                    {formatTokenAmount(parseFloat(trade.tokenAmount || '0'))}
                  </span>
                  <span style={{ width: "52px", ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                    {formatTimeAgo(trade.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Holders Section */}
        <div
          ref={holdersRef}
          id="holders-section"
          className="flex flex-col gap-4 !p-7"
          style={{ borderBottom: `0.2px solid ${colors["Neutral/400"]}` }}
        >
          <div className="flex items-center gap-1.5">
            <span style={{ ...typography["P1/Semibold"], color: colors["White"] }}>
             {t.launchpad?.tokenDetail?.table?.topHolders || "Top holders"}
            </span>
            <img src="/icons/info-icon.svg" alt="info" style={{ width: 14, height: 14 }} />
          </div>
          {isLoadingHolders ? (
            <div className="flex flex-col gap-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-3" style={{ borderBottom: `0.5px solid ${colors["Neutral/400"]}`, paddingBottom: "12px" }}>
                <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[161px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                <div className="w-[144px] h-4 bg-[#1A1B23] animate-pulse rounded" />
              </div>
              {/* Holder Rows Skeleton */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{
                    padding: "12px 0 16px",
                    borderBottom: i < 5 ? `0.2px solid ${colors["Neutral/400"]}` : "none"
                  }}
                >
                  <div className="w-8 h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[210px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[161px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                  <div className="w-[144px] h-4 bg-[#1A1B23] animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : holders.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: "100px" }}>
              <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                {t.launchpad?.tokenDetail?.status?.noHoldersYet || "No holders yet"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {/* Table Header */}
              <div className="flex items-center gap-3" style={{ borderBottom: `0.5px solid ${colors["Neutral/400"]}`, paddingBottom: "12px" }}>
                <span style={{ width: "32px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>#</span>
                <span style={{ width: "210px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.walletAddress || "Wallet address"}</span>
                <span style={{ width: "161px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.amountToken?.replace('{{ticker}}', project?.ticker || 'Token') || `Amount (${project?.ticker || 'Token'})`}</span>
                <span style={{ width: "144px", ...typography["P2/Regular"], color: colors["Neutral/50"] }}>{t.launchpad?.tokenDetail?.table?.valueSol || "Value (SOL)"}</span>
              </div>
              {/* Holder Rows */}
              {holders.map((holder, index) => (
                <div
                  key={holder.walletAddress}
                  className="flex items-center gap-3 hover:bg-[#131519] transition-colors rounded-lg"
                  style={{
                    padding: "12px 0 16px",
                    borderBottom: index < holders.length - 1 ? `0.2px solid ${colors["Neutral/400"]}` : "none"
                  }}
                >
                  <span style={{ width: "32px", ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                    {holder.rank}
                  </span>
                  <div style={{ width: "210px" }} className="flex items-center gap-1.5">
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                      {formatAddress(holder.walletAddress)}
                    </span>
                  </div>
                  <span style={{ width: "161px", ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                    {formatTokenAmount(parseFloat(holder.tokenAmount || '0'))}
                  </span>
                  <span style={{ width: "144px", ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                    {currentPriceSol > 0
                      ? (() => {
                          const value = (Number(holder.tokenAmount) || 0) * currentPriceSol;
                          return value < 0.01 ? value.toFixed(6) : value.toFixed(4);
                        })()
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Right Sidebar - Token Info & Trading Panel */}
        <div
          className="token-detail-sidebar w-full overflow-y-auto flex-shrink-0"
          style={{
            borderTop: `0.2px solid ${colors["Neutral/400"]}`,
          }}
        >
          {/* Token Info Section */}
          <div className="flex flex-col gap-5" style={{ padding: "28px 28px 28px" }}>
          {/* Token Header */}
          <div className="flex flex-col gap-2">
            {/* Token Name & Badge Row */}
            <div className="flex items-center gap-2" style={{ width: "204px" }}>
              <div
                className="w-7 h-7 rounded-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${project.imageUrl || '/figma-assets/token-detail/token-placeholder.png'})`,
                }}
              />
              <div className="flex items-center gap-1.5">
                <span style={{ ...typography["P1/Semibold"], color: colors["Neutral/50"] }}>
                  {project.name}
                </span>
                <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                  {project.ticker}
                </span>
              </div>
            </div>

            {/* Price & Change */}
            <div className="flex items-center gap-2">
              <span style={{ ...typography["H2/Semibold"], color: colors["White"] }}>
                {formatPrice(project.currentPrice || project.price || 0)}
              </span>
              {isRefreshing && (
                <span className="animate-pulse" style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>
                  updating…
                </span>
              )}
              <div className="flex justify-center items-center gap-0.5">
                <img
                  src="/figma-assets/token-detail/price-down-arrow.svg"
                  alt=""
                  className={`w-3.5 h-3.5 ${isPositiveChange ? 'rotate-180' : ''}`}
                  style={{ filter: isPositiveChange ? 'hue-rotate(100deg) saturate(2)' : 'none' }}
                />
                <span
                  style={{
                    ...typography["Caption/Medium"],
                    color: isPositiveChange ? colors["Success"] : colors["Danger"],
                  }}
                >
                  {formatPriceChange(project.priceChange24h || 0)} (24h)
                </span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-3">
            {/* Liquidity Card */}
            <div
              className="flex-1 flex flex-col items-center gap-0.5 rounded-xl"
              style={{
                padding: "10px 16px",
                border: `0.2px solid ${colors["Neutral/400"]}`,
              }}
            >
              <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>
                {t.launchpad?.tokenDetail?.stats?.liquidity || "Liquidity"}
              </span>
              <span style={{ ...typography["P1/Medium"], color: colors["White"] }}>
                {formatLiquiditySol(project.liquidity || 0)}
              </span>
            </div>

            {/* Market Cap Card */}
            <div
              className="flex-1 flex flex-col items-center gap-0.5 rounded-lg"
              style={{
                padding: "10px 16px",
                border: `0.2px solid ${colors["Neutral/400"]}`,
              }}
            >
              <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>
                {t.launchpad?.tokenDetail?.stats?.mktCap || "MKT Cap"}
              </span>
              <span style={{ ...typography["P1/Medium"], color: colors["White"] }}>
                {formatSmallMarketCap(project.marketCap || 0)}
              </span>
            </div>
          </div>

          {/* Price Change Grid */}
          <div className="flex flex-col rounded-[14px]">
            {/* Top Row - Timeframes */}
            <div
              className="flex"
              style={{
                border: `0.2px solid ${colors["Neutral/400"]}`,
                borderRadius: "14px 14px 0px 0px",
              }}
            >
              {[
                { label: "5M", value: project.priceChange5m, selected: false },
                { label: "1H", value: project.priceChange1h, selected: false },
                { label: "6H", value: project.priceChange6h, selected: false },
                { label: "24H", value: project.priceChange24h, selected: false },
              ].map((item, index) => {
                const numValue = typeof item.value === "string" ? parseFloat(item.value) : (item.value || 0);
                const isPositive = !isNaN(numValue) && numValue >= 0;
                return (
                  <div
                    key={item.label}
                    className="flex-1 flex flex-col items-center gap-0.5"
                    style={{
                      padding: "10px 16px",
                      backgroundColor: item.selected ? colors["Primary/Shade4"] : "transparent",
                      borderRight: index < 3 ? `0.2px solid ${colors["Neutral/400"]}` : "none",
                      borderRadius: index === 0 ? "14px 0px 0px 0px" : index === 3 ? "0px 14px 0px 0px" : "0px",
                    }}
                  >
                    <span
                      style={{
                        ...typography["Caption/Regular"],
                        color: item.selected ? colors["White"] : colors["Neutral/200"],
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        ...typography["P1/Medium"],
                        color: isPositive ? colors["Success"] : colors["Danger"],
                      }}
                    >
                      {isPositive ? "+" : "-"}{formatPriceChange(item.value)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Row - TXNS, Volume, Buys/Sells */}
            <div
              className="flex"
              style={{
                borderLeft: `0.2px solid ${colors["Neutral/400"]}`,
                borderRight: `0.2px solid ${colors["Neutral/400"]}`,
                borderBottom: `0.2px solid ${colors["Neutral/400"]}`,
                borderRadius: "0px 0px 14px 14px",
                padding: "16px 0px 20px 0px",
              }}
            >
              {/* TXNS & Volume */}
              <div
                className="flex flex-col gap-6"
                style={{
                  padding: "0px 32px 0px 16px",
                  borderRight: `0.2px solid ${colors["Neutral/400"]}`,
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.txns || "TXNS"}</span>
                  <span style={{ ...typography["P1/Medium"], color: colors["White"] }}>{tradeStats.totalTxns}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.volume || "Volume"}</span>
                  <span style={{ ...typography["P1/Medium"], color: colors["White"] }}>
                    {formatSolVolume(tradeStats.totalVolume)}
                  </span>
                </div>
              </div>

              {/* Buys/Sells with Progress Bars */}
              <div className="flex-1 flex flex-col gap-4 !px-4">
                {/* Buys/Sells */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <div className="flex flex-col">
                      <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.buys || "Buys"}</span>
                      <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>{tradeStats.buys}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.sells || "Sells"}</span>
                      <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>{tradeStats.sells}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-[5px]">
                    <div className={`rounded-full`} style={{ flex: tradeStats.buys || 1, backgroundColor: colors["Success"] }} />
                    <div className={`rounded-full`} style={{ flex: tradeStats.sells || 1, backgroundColor: colors["Danger"] }} />
                  </div>
                </div>

                {/* Buy Vol/Sell Vol */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <div className="flex flex-col">
                      <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.buyVol || "Buy Vol"}</span>
                      <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>{formatSolVolume(tradeStats.buyVolume)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.sellVol || "Sell Vol"}</span>
                      <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>{formatSolVolume(tradeStats.sellVolume)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-[5px]">
                    <div className={`rounded-full`} style={{ flex: tradeStats.buyVolume || 1, backgroundColor: colors["Success"] }} />
                    <div className={`rounded-full`} style={{ flex: tradeStats.sellVolume || 1, backgroundColor: colors["Danger"] }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Watchlist Button */}
          <button
            onClick={handleToggleWatchlist}
            disabled={isTogglingWatchlist}
            className="w-full flex justify-center items-center gap-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              padding: "10px 18px",
              backgroundColor: colors["Neutral/500"],
            }}
          >
            {isTogglingWatchlist ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill={isWatching ? colors["Primary/Main"] : "none"} xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1.33334L10.06 5.50668L14.6667 6.18001L11.3333 9.42668L12.12 14.0133L8 11.8467L3.88 14.0133L4.66667 9.42668L1.33334 6.18001L5.94 5.50668L8 1.33334Z" stroke={isWatching ? colors["Primary/Main"] : colors["White"]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            <span style={{ ...typography["P2/Medium"], color: colors["White"] }}>
              {isTogglingWatchlist ? (t.launchpad?.tokenDetail?.status?.updating || "Updating...") : (t.launchpad?.tokenDetail?.buttons?.watchlist || "Watchlist")}
            </span>
          </button>

          {/* Buy/Sell Panel */}
          <div className="flex flex-col rounded-[14px]">
            {/* Buy/Sell Tabs */}
            <div
              className="flex"
              style={{
                border: `0.2px solid ${colors["Neutral/400"]}`,
                borderRadius: "14px 14px 0px 0px",
              }}
            >
              <button
                onClick={() => switchMode("buy")}
                className="flex-1 flex justify-center items-center gap-1.5 cursor-pointer"
                style={{
                  padding: "12px 16px",
                  backgroundColor: tradeMode === "buy" ? colors["Primary/Shade4"] : "transparent",
                  borderRight: `0.2px solid ${colors["Neutral/400"]}`,
                  borderRadius: "14px 0px 0px 0px",
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: colors["Success"] }}
                />
                <span style={{ ...typography["P2/Medium"], color: colors["White"] }}>{t.launchpad?.tokenDetail?.trading?.buy || "Buy"}</span>
              </button>
              <button
                onClick={() => switchMode("sell")}
                className="flex-1 flex justify-center items-center gap-1.5 cursor-pointer"
                style={{
                  padding: "12px 16px",
                  backgroundColor: tradeMode === "sell" ? colors["Primary/Shade4"] : "transparent",
                  borderRadius: "0px 14px 0px 0px",
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: colors["Danger"] }}
                />
                <span style={{ ...typography["P2/Medium"], color: colors["White"] }}>{t.launchpad?.tokenDetail?.trading?.sell || "Sell"}</span>
              </button>
            </div>

            {/* Trade Form */}
            <div
              className="flex flex-col gap-5"
              style={{
                padding: "20px 16px",
                borderLeft: `0.2px solid ${colors["Neutral/400"]}`,
                borderRight: `0.2px solid ${colors["Neutral/400"]}`,
                borderBottom: `0.2px solid ${colors["Neutral/400"]}`,
                borderRadius: "0px 0px 14px 14px",
              }}
            >
              <div className="flex flex-col gap-[18px]">
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-2.5">
                    {/* Amount Input */}
                    <div
                      className="flex items-center justify-between rounded-xl"
                      style={{
                        padding: "10px 16px",
                        backgroundColor: colors["Neutral/500"],
                        border: `0.5px solid ${colors["Neutral/400"]}`,
                        height: "48px",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={tradeMode === "buy" ? "/figma-assets/token-detail/solana-icon.svg" : project.imageUrl}
                          alt={tradeMode === "buy" ? "SOL" : project.ticker}
                          className="w-5 h-5"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={tokenAmount}
                          onChange={(e) => {
                            if (isAmountInput(e.target.value)) setTokenAmount(e.target.value);
                          }}
                          placeholder={tradeMode === "buy" ? (t.launchpad?.tokenDetail?.trading?.enterSolAmount || "Enter SOL amount") : (t.launchpad?.tokenDetail?.trading?.enterTokenAmount?.replace('{{ticker}}', project.ticker) || `Enter ${project.ticker} amount`)}
                          className="bg-transparent outline-none flex-1"
                          style={{ ...typography["P2/Medium"], color: colors["White"] }}
                        />
                      </div>
                      <span style={{ ...typography["P2/Medium"], color: colors["Neutral/200"] }}>
                        {tradeMode === "buy" ? "SOL" : project.ticker}
                      </span>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2">
                      {[25, 50, 75, 100].map((percent) => (
                        <button
                          key={percent}
                          onClick={() => setPercent(percent)}
                          className="flex-1 py-1.5 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: colors["Neutral/500"],
                            border: `0.5px solid ${colors["Neutral/400"]}`,
                            ...typography["Caption/Medium"],
                            color: colors["Neutral/100"],
                          }}
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>

                  </div>

                  {/* Pay with Section */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex justify-between items-center w-full">
                      <span
                        style={{ ...typography["Caption/Medium"], color: colors["Neutral/200"] }}
                      >
                        {tradeMode === "buy" ? (t.launchpad?.tokenDetail?.trading?.payWith || "Pay with") : (t.launchpad?.tokenDetail?.trading?.youHave || "You have")}
                      </span>
                      <span
                        style={{ ...typography["Caption/Medium"], color: colors["Primary/Main"] }}
                      >
                        {t.launchpad?.tokenDetail?.trading?.balance || "Balance"}: {isBuy
                          ? walletBalance === null ? "unavailable" : `${floorToDecimals(walletBalance, 4)} SOL`
                          : userTokenBalance === null ? "unavailable" : `${userTokenBalance.toLocaleString()} ${project.ticker}`
                        }
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between w-full rounded-[14px]"
                      style={{
                        padding: "14px 12px 14px 16px",
                        backgroundColor: colors["Neutral/500"],
                        border: `0.5px solid ${colors["Neutral/400"]}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src="/figma-assets/token-detail/solana-icon.svg" alt="" className="w-8 h-8" />
                        <div className="flex flex-col">
                          <span style={{ ...typography["P2/Semibold"], color: colors["White"] }}>{t.launchpad?.tokenDetail?.trading?.solana || "Solana"}</span>
                          <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>
                            {t.launchpad?.tokenDetail?.trading?.solanaSol || "Solana (SOL)"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                       
                        <img src="/figma-assets/token-detail/chevron-down.svg" alt="" className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-3" style={{ padding: "0px 4px" }}>
                  <div className="flex justify-between items-center">
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/100"] }}>
                      {tradeMode === "buy" ? (t.launchpad?.tokenDetail?.trading?.youPay || "You pay") : (t.launchpad?.tokenDetail?.trading?.youSell || "You sell")}
                    </span>
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                      {tokenAmount || "0"} {tradeMode === "buy" ? "SOL" : project.ticker}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span style={{ ...typography["P2/Regular"], color: colors["Neutral/100"] }}>{t.launchpad?.tokenDetail?.trading?.fee || "Fee"}</span>
                      <img src="/figma-assets/token-detail/info-icon.svg" alt="" className="w-3.5 h-3.5" />
                    </div>
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                      {isGettingQuote ? "..." : quote && Number.isFinite(quote.fee) ? `${quote.fee.toFixed(6)} SOL` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>
                      {tradeMode === "buy" ? (t.launchpad?.tokenDetail?.trading?.youReceive || "You receive") : (t.launchpad?.tokenDetail?.trading?.youGet || "You get")}
                    </span>
                    <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>
                      {isGettingQuote && !quote ? "..." : !quote ? "—" : isBuy
                        ? `${quote.outputAmount.toLocaleString()} ${project.ticker}`
                        : `${quote.outputAmount.toFixed(6)} SOL`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/100"] }}>Price impact</span>
                    <span style={{ ...typography["P2/Regular"], color: quote && quote.priceImpact > 5 ? colors["Danger"] : colors["Neutral/200"] }}>
                      {quote && Number.isFinite(quote.priceImpact) ? `${quote.priceImpact.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/100"] }}>Max slippage</span>
                    <div className="flex items-center gap-1.5">
                      {SLIPPAGE_OPTIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSlippage(value)}
                          className="rounded-md px-2 py-0.5 cursor-pointer"
                          style={{
                            ...typography["Caption/Medium"],
                            border: `0.5px solid ${slippage === value ? colors["Primary/Main"] : colors["Neutral/400"]}`,
                            color: slippage === value ? colors["Primary/Main"] : colors["Neutral/100"],
                          }}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                  {quote && (
                    <div className="flex justify-between items-center">
                      <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>Minimum received</span>
                      <span style={{ ...typography["Caption/Regular"], color: colors["Neutral/200"] }}>
                        {isBuy
                          ? `${(quote.outputAmount * (1 - slippage / 100)).toLocaleString()} ${project.ticker}`
                          : `${(quote.outputAmount * (1 - slippage / 100)).toFixed(6)} SOL`}
                      </span>
                    </div>
                  )}
                  {isMigrated && (
                    <p style={{ ...typography["Caption/Regular"], color: colors["Danger"] }}>
                      This token has graduated from the bonding curve and can no longer be traded here.
                    </p>
                  )}
                </div>
              </div>

              {/* Buy/Sell Button */}
              <button
                onClick={handleTrade}
                disabled={isTrading || isMigrated || !parsedInput.ok || !quote || isGettingQuote && !quote}
                className="flex justify-center items-center w-full rounded-full cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  padding: "14px 32px",
                  backgroundColor: colors["White"],
                }}
              >
                {isTrading ? (
                  <div className="w-5 h-5 border-2 border-[#090A11] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span style={{ ...typography["P2/Bold"], color: colors["Neutral/600"] }}>
                    {tradeMode === "buy"
                      ? (t.launchpad?.tokenDetail?.buttons?.buyToken?.replace('{{name}}', project.name) || `Buy ${project.name}`)
                      : (t.launchpad?.tokenDetail?.buttons?.sellToken?.replace('{{name}}', project.name) || `Sell ${project.name}`)
                    }
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Socials Section */}
          {socialLinks.length > 0 && (
            <div className="flex justify-between items-center">
              <span style={{ ...typography["P2/Medium"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.socials || "Socials"}</span>
              <div className="flex items-center gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="hover:opacity-80 transition-opacity"
                    style={{ ...typography["Caption/Medium"], color: colors["Primary/Main"] }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Token Holdings */}
          <div
            className="flex flex-col justify-center gap-3 rounded-xl"
            style={{
              padding: "12px 0px",
              backgroundColor: colors["Neutral/500"],
              border: `0.5px solid ${colors["Neutral/400"]}`,
            }}
          >
            <div className="flex justify-between items-center" style={{ padding: "0px 16px" }}>
              <span style={{ ...typography["P2/Medium"], color: colors["Neutral/200"] }}>Your {project.ticker}</span>
              <span style={{ ...typography["P2/Medium"], color: colors["White"] }}>
                {userTokenBalance === null ? "—" : userTokenBalance.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-px" style={{ backgroundColor: colors["Neutral/400"] }} />
            <div className="flex justify-between items-center" style={{ padding: "0px 16px" }}>
              <span style={{ ...typography["P2/Medium"], color: colors["Neutral/200"] }}>Value (SOL)</span>
              <span style={{ ...typography["P2/Medium"], color: colors["White"] }}>
                {userTokenBalance === null || !currentPriceSol ? "—" : `${(userTokenBalance * currentPriceSol).toFixed(6)} SOL`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <PinConfirmModal
        isOpen={pendingTrade !== null}
        title={pendingTrade?.mode === "sell" ? `Confirm sell` : `Confirm buy`}
        confirmLabel={pendingTrade?.mode === "sell" ? "Sell" : "Buy"}
        summary={
          pendingTrade
            ? [
                { label: pendingTrade.mode === "buy" ? "You pay" : "You sell", value: `${pendingTrade.amountText} ${pendingTrade.mode === "buy" ? "SOL" : project.ticker}` },
                {
                  label: "Minimum received",
                  value: pendingTrade.mode === "buy"
                    ? `${pendingTrade.minimumOutput.toLocaleString()} ${project.ticker}`
                    : `${pendingTrade.minimumOutput.toFixed(6)} SOL`,
                },
                { label: "Max slippage", value: `${pendingTrade.slippage}%` },
                { label: "Price impact", value: Number.isFinite(pendingTrade.priceImpact) ? `${pendingTrade.priceImpact.toFixed(2)}%` : "—" },
              ]
            : []
        }
        onCancel={() => setPendingTrade(null)}
        onConfirmed={executeTrade}
      />

      {/* Toast Notification */}
        {showToast && (tradeSuccess || tradeError) && (
          <Toast
            message={tradeSuccess || tradeError || ""}
            type={tradeSuccess ? "success" : "error"}
            isVisible={showToast}
            onClose={() => {
              setShowToast(false);
              setTradeSuccess(null);
              setTradeError(null);
            }}
            duration={4000}
            position="top-right"
          />
        )}
      </div>
    </>
  );
}
