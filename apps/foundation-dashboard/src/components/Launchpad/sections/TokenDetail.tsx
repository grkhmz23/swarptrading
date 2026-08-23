"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiService, LaunchpadProject } from "@/services/api";
import { Toast } from "@/components/ui/Toast";
import { useT } from "@/i18n/I18nProvider";
import dynamic from "next/dynamic";

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
  const [quote, setQuote] = useState<{ outputAmount?: number; fee?: number } | null>(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(0);
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
    valueUsd: string;
    percentage: string;
    user?: {
      id: string;
      username?: string;
      profilePicture?: string;
    };
  }>>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);

  // Portfolio state - user's investment in this specific project
  const [_userInvestment, setUserInvestment] = useState<{
    tokenBalance: string;
    totalSolInvested: string;
    averageBuyPrice: string;
    currentValueSol: string;
    unrealizedPnlSol: string;
    unrealizedPnlPercent: string;
    tradeCount: number;
  } | null>(null);
  const [_isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  // User's trade history for this project
  const [_userTradeHistory, setUserTradeHistory] = useState<Array<{
    id: string;
    type: 'buy' | 'sell';
    solAmount: string;
    tokenAmount: string;
    pricePerToken?: string;
    createdAt: string;
    transactionHash?: string;
  }>>([]);
  const [_isLoadingTradeHistory, setIsLoadingTradeHistory] = useState(false);
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
    try {
      const accessToken = localStorage.getItem("swarp_fd_access_token");
      if (!accessToken) return;

      const wallets = await apiService.getUserWallets(accessToken);
      if (wallets && wallets.length > 0) {
        setWalletBalance(wallets[0].balance || 0);
      }
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
    }
  }, []);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessToken = localStorage.getItem("swarp_fd_access_token");
      const response = await apiService.getLaunchpadProject(projectId, accessToken);
      setProject(response);
    } catch (err) {
      console.error("Failed to fetch project:", err);
      setError(t.launchpad?.tokenDetail?.status?.failedToLoad || "Failed to load token details");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchTrades = useCallback(async () => {
    setIsLoadingTrades(true);
    try {
      const response = await apiService.getLaunchpadProjectTrades(projectId, { limit: 50 });
      setTrades(response.trades.map((trade) => ({
        id: trade.id,
        type: trade.type,
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
    } catch (err) {
      console.error("Failed to fetch trades:", err);
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
        valueUsd: "0",
        percentage: String(holder.percentage),
        user: holder.username || holder.avatar
          ? { id: holder.address, username: holder.username, profilePicture: holder.avatar }
          : undefined,
      })));
    } catch (err) {
      console.error("Failed to fetch holders:", err);
      setHolders([]);
    } finally {
      setIsLoadingHolders(false);
    }
  }, [projectId]);

  const fetchUserPortfolio = useCallback(async () => {
    setIsLoadingPortfolio(true);
    try {
      const accessToken = localStorage.getItem("swarp_fd_access_token");
      if (!accessToken) {
        setUserInvestment(null);
        return;
      }

      const response = await apiService.getLaunchpadPortfolio(accessToken);
      // Find the investment for this specific project
      const projectInvestment = response.investments?.find(
        (inv: { project?: { id: string } }) => inv.project?.id === projectId
      );

      if (projectInvestment) {
        setUserInvestment({
          tokenBalance: projectInvestment.tokenBalance,
          totalSolInvested: projectInvestment.totalSolInvested,
          averageBuyPrice: projectInvestment.averageBuyPrice,
          currentValueSol: projectInvestment.currentValueSol,
          unrealizedPnlSol: projectInvestment.unrealizedPnlSol,
          unrealizedPnlPercent: projectInvestment.unrealizedPnlPercent,
          tradeCount: projectInvestment.tradeCount,
        });
        // Also update userTokenBalance for sell functionality
        setUserTokenBalance(parseFloat(projectInvestment.tokenBalance) || 0);
      } else {
        setUserInvestment(null);
      }
    } catch (err) {
      console.error("Failed to fetch user portfolio:", err);
      setUserInvestment(null);
    } finally {
      setIsLoadingPortfolio(false);
    }
  }, [projectId]);

  const fetchUserTradeHistory = useCallback(async () => {
    setIsLoadingTradeHistory(true);
    try {
      const accessToken = localStorage.getItem("swarp_fd_access_token");
      if (!accessToken) {
        setUserTradeHistory([]);
        return;
      }

      const response = await apiService.getLaunchpadUserTradeHistory(accessToken, { limit: 20 });
      // Filter trades for this specific project
      const projectTrades = response.trades?.filter(
        (trade) => trade.project?.id === projectId
      ) || [];

      setUserTradeHistory(projectTrades.map(t => ({
        id: t.id,
        type: t.type,
        solAmount: t.solAmount,
        tokenAmount: t.tokenAmount,
        pricePerToken: t.pricePerToken,
        createdAt: t.createdAt,
        transactionHash: t.transactionHash,
      })));
    } catch (err) {
      console.error("Failed to fetch user trade history:", err);
      setUserTradeHistory([]);
    } finally {
      setIsLoadingTradeHistory(false);
    }
  }, [projectId]);

  const fetchWatchlistStatus = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem("swarp_fd_access_token");
      if (!accessToken) {
        setIsWatching(false);
        return;
      }

      const response = await apiService.getLaunchpadWatchlist(accessToken);
      const isInWatchlist = response.projects?.some(
        (p: { id: string }) => p.id === projectId
      ) || false;
      setIsWatching(isInWatchlist);
    } catch (err) {
      console.error("Failed to fetch watchlist status:", err);
      setIsWatching(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchWalletBalance();
    // Fetch trades and holders on initial load (all sections are visible)
    fetchTrades();
    fetchHolders();
    fetchUserPortfolio();
    fetchUserTradeHistory();
    fetchWatchlistStatus();
  }, [fetchProject, fetchWalletBalance, fetchTrades, fetchHolders, fetchUserPortfolio, fetchUserTradeHistory, fetchWatchlistStatus]);

  const handleToggleWatchlist = async () => {
    const accessToken = localStorage.getItem("swarp_fd_access_token");
    if (!accessToken) {
      setTradeError(t.launchpad?.tokenDetail?.toast?.loginToAddWatchlist || "Please log in to add to watchlist");
      return;
    }

    setIsTogglingWatchlist(true);
    try {
      const response = await apiService.toggleLaunchpadWatchlist(projectId, accessToken);
      setIsWatching(response.isWatching);
    } catch (err) {
      console.error("Failed to toggle watchlist:", err);
      setTradeError(t.launchpad?.tokenDetail?.toast?.failedToUpdateWatchlist || "Failed to update watchlist");
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

  // Get quote when amount changes
  const getQuote = useCallback(async (amount: string) => {
    if (!amount || !project || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    setIsGettingQuote(true);
    try {
      const numAmount = parseFloat(amount);
      if (tradeMode === "buy") {
        // For buy, amount is in SOL
        const response = await apiService.getLaunchpadBuyQuote(project.id, numAmount);
        setQuote({ outputAmount: response.outputAmount, fee: response.fee });
      } else {
        // For sell, amount is in tokens
        const response = await apiService.getLaunchpadSellQuote(project.id, numAmount);
        setQuote({ outputAmount: response.outputAmount, fee: response.fee });
      }
    } catch (err) {
      console.error("Failed to get quote:", err);
      setQuote(null);
    } finally {
      setIsGettingQuote(false);
    }
  }, [project, tradeMode]);

  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      getQuote(tokenAmount);
    }, 500);
    return () => clearTimeout(timer);
  }, [tokenAmount, getQuote]);

  const handleTrade = async () => {
    if (!project || !tokenAmount || parseFloat(tokenAmount) <= 0) {
      setTradeError(t.launchpad?.tokenDetail?.toast?.enterValidAmount || "Please enter a valid amount");
      setShowToast(true);
      return;
    }

    const amount = parseFloat(tokenAmount);

    if (tradeMode === "buy") {
      if (amount > walletBalance) {
        setTradeError(t.launchpad?.tokenDetail?.toast?.insufficientSol || `Insufficient SOL balance. You have ${walletBalance.toFixed(4)} SOL but trying to spend ${amount.toFixed(4)} SOL.`);
        setShowToast(true);
        return;
      }
    } else {
      // Sell mode - check token balance
      if (amount > userTokenBalance) {
        setTradeError(t.launchpad?.tokenDetail?.toast?.insufficientTokens?.replace('{{ticker}}', project.ticker) || `Insufficient ${project.ticker} balance. You have ${userTokenBalance.toLocaleString()} ${project.ticker} but trying to sell ${amount.toLocaleString()}.`);
        setShowToast(true);
        return;
      }
    }

    setIsTrading(true);
    setTradeError(null);
    setTradeSuccess(null);
    setShowToast(false);

    try {
      const accessToken = localStorage.getItem("swarp_fd_access_token") || "";

      const slippageValue = 5; // Default 5% slippage tolerance

      if (tradeMode === "buy") {
        // Use custodial buy (server signs with Swarp Foundation wallet)
        const response = await apiService.buyLaunchpadTokensCustodial(
          project.id,
          amount,
          accessToken,
          slippageValue
        );
        const tokensReceived = parseFloat(response.trade.tokenAmount);
        setTradeSuccess(
          t.launchpad?.tokenDetail?.toast?.successfullyBought
            ?.replace('{{amount}}', tokensReceived.toLocaleString())
            ?.replace('{{ticker}}', project.ticker) ||
          `Successfully bought ${tokensReceived.toLocaleString()} ${project.ticker}!`
        );
      } else {
        // Use custodial sell
        const response = await apiService.sellLaunchpadTokensCustodial(
          project.id,
          amount,
          accessToken,
          slippageValue
        );
        const solReceived = parseFloat(response.trade.solAmount);
        setTradeSuccess(
          t.launchpad?.tokenDetail?.toast?.successfullySold
            ?.replace('{{amount}}', amount.toLocaleString())
            ?.replace('{{ticker}}', project.ticker)
            ?.replace('{{solAmount}}', solReceived.toFixed(4)) ||
          `Successfully sold ${amount.toLocaleString()} ${project.ticker} for ${solReceived.toFixed(4)} SOL!`
        );
      }

      // Show success toast
      setShowToast(true);

      // Clear input and refresh project data, wallet balance, and trades
      setTokenAmount("");
      setQuote(null);
      fetchProject();
      fetchWalletBalance();
      fetchTrades(); // Refresh trades list after successful trade
      fetchHolders(); // Refresh holders list after successful trade
      fetchUserPortfolio(); // Refresh portfolio to update token balance
    } catch (err: unknown) {
      console.error("Trade failed:", err);
      let errorMessage = t.launchpad?.tokenDetail?.toast?.tradeFailed || "Trade failed. Please try again.";

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('insufficient') && msg.includes('sol')) {
          errorMessage = t.launchpad?.tokenDetail?.toast?.insufficientSol || `Insufficient SOL balance. You need more SOL to complete this trade.`;
        } else if (msg.includes('insufficient') && (msg.includes('token') || msg.includes('balance'))) {
          errorMessage = t.launchpad?.tokenDetail?.toast?.insufficientTokens?.replace('{{ticker}}', project.ticker) || `Insufficient ${project.ticker} balance to complete this sale.`;
        } else if (msg.includes('slippage')) {
          errorMessage = t.launchpad?.tokenDetail?.toast?.slippageError || "Price changed too much. Please try again.";
        } else if (msg.includes('unauthorized') || msg.includes('401')) {
          errorMessage = t.launchpad?.tokenDetail?.toast?.loginRequired || "Please log in to trade.";
        } else {
          errorMessage = err.message;
        }
      }

      setTradeError(errorMessage);
      setShowToast(true);
    } finally {
      setIsTrading(false);
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
                    {parseFloat(holder.valueUsd || '0') < 0.01
                      ? parseFloat(holder.valueUsd || '0').toFixed(6)
                      : parseFloat(holder.valueUsd || '0').toFixed(4)}
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
              <div
                className="flex justify-center items-center gap-1.5 rounded-full"
                style={{
                  padding: "4px 12px",
                  backgroundColor: colors["Neutral/500"],
                }}
              >
                <span style={{ ...typography["Caption/Medium"], color: colors["Neutral/200"] }}>
                  #47
                </span>
              </div>
            </div>

            {/* Price & Change */}
            <div className="flex items-center gap-2">
              <span style={{ ...typography["H2/Semibold"], color: colors["White"] }}>
                {formatPrice(project.currentPrice || project.price || 0)}
              </span>
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
                { label: "5M", value: project.priceChange5m, selected: true },
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
                onClick={() => setTradeMode("buy")}
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
                onClick={() => setTradeMode("sell")}
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
                            const value = e.target.value;
                            // Allow only numbers and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setTokenAmount(value);
                            }
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
                          onClick={() => {
                            if (tradeMode === "buy") {
                              // For buy mode, calculate percentage of SOL balance
                              const amount = (walletBalance * percent) / 100;
                              setTokenAmount(amount.toFixed(6));
                            } else {
                              // For sell mode, calculate percentage of token balance
                              const amount = (userTokenBalance * percent) / 100;
                              setTokenAmount(amount.toFixed(0));
                            }
                          }}
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
                        {t.launchpad?.tokenDetail?.trading?.balance || "Balance"}: {tradeMode === "buy"
                          ? `${walletBalance.toFixed(4)} SOL`
                          : `${userTokenBalance.toLocaleString()} ${project.ticker}`
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
                      <span style={{ ...typography["P2/Regular"], color: colors["Neutral/100"] }}>{t.launchpad?.tokenDetail?.trading?.fee || "Fee (1%)"}</span>
                      <img src="/figma-assets/token-detail/info-icon.svg" alt="" className="w-3.5 h-3.5" />
                    </div>
                    <span style={{ ...typography["P2/Regular"], color: colors["Neutral/200"] }}>
                      {isGettingQuote ? "..." : quote?.fee ? `${quote.fee.toFixed(6)} SOL` : "0 SOL"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>
                      {tradeMode === "buy" ? (t.launchpad?.tokenDetail?.trading?.youReceive || "You receive") : (t.launchpad?.tokenDetail?.trading?.youGet || "You get")}
                    </span>
                    <span style={{ ...typography["P1/Regular"], color: colors["White"] }}>
                      {isGettingQuote ? "..." : tradeMode === "buy"
                        ? `${Number(quote?.outputAmount || 0).toLocaleString()} ${project.ticker}`
                        : `${Number(quote?.outputAmount || 0).toFixed(6)} SOL`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Buy/Sell Button */}
              <button
                onClick={handleTrade}
                disabled={isTrading || !tokenAmount || parseFloat(tokenAmount) <= 0}
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
          <div className="flex justify-between items-center">
            <span style={{ ...typography["P2/Medium"], color: colors["Neutral/200"] }}>{t.launchpad?.tokenDetail?.stats?.socials || "Socials"}</span>
            <img
              src="/figma-assets/token-detail/socials-icons.svg"
              alt="Social links"
              className="h-[30px] cursor-pointer hover:opacity-80 transition-opacity"
            />
          </div>

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
              <span style={{ ...typography["P2/Medium"], color: colors["Neutral/200"] }}>{project.name}</span>
              <span style={{ ...typography["P2/Medium"], color: colors["White"] }}>1</span>
            </div>
            <div className="w-full h-px" style={{ backgroundColor: colors["Neutral/400"] }} />
            <div className="flex justify-between items-center" style={{ padding: "0px 16px" }}>
              <span style={{ ...typography["P2/Medium"], color: colors["Neutral/200"] }}>SOL</span>
              <span style={{ ...typography["P2/Medium"], color: colors["White"] }}>
                {project.currentPrice ? parseFloat(String(project.currentPrice)).toFixed(10) : "0.0000000000"}
              </span>
            </div>
          </div>
        </div>
      </div>

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
