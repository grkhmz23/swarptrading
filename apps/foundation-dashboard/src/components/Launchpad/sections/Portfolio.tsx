"use client";

import { useState, useEffect, useCallback } from "react";
import { apiService, LaunchpadProject } from "@/services/api";
import TradeModal from "../TradeModal";
import { useT } from "@/i18n/I18nProvider";
import { getAccessToken } from '@/lib/session';

// Token holding type - now matches API response
interface TokenHolding {
  id: string;
  projectId: string;
  name: string;
  ticker: string;
  image?: string;
  tokenBalance: number;
  currentValueSol: number;
  totalSolInvested: number;
  unrealizedPnlSol: number;
  unrealizedPnlPercent: number;
  priceChange24h: number;
}

// Trade history type
interface TradeHistoryItem {
  id: string;
  type: 'buy' | 'sell';
  solAmount: string;
  tokenAmount: string;
  createdAt: string;
  project?: {
    id: string;
    name: string;
    ticker: string;
    imageUrl?: string;
  };
}

// Active project type (matching LiveProject from LaunchpadHome)
interface ActiveProject {
  id: string;
  name: string;
  ticker: string;
  imageUrl: string;
  status: "bonding" | "migrated";
  creator: string;
  creatorAvatar?: string;
  createdAt: string;
  marketCap: string;
  priceChange: number;
  bondingProgress: number;
  description: string;
}

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Transform API project to Active Project display format
const transformToActiveProject = (project: LaunchpadProject): ActiveProject => {
  let creatorName = "Anonymous";
  let creatorAvatar: string | undefined;

  if (project.creator) {
    if (typeof project.creator === "object" && project.creator !== null) {
      creatorName = (project.creator as { username?: string }).username || "Anonymous";
      creatorAvatar = (project.creator as { profilePicture?: string }).profilePicture;
    } else if (typeof project.creator === "string") {
      creatorName = project.creator;
    }
  }

  return {
    id: project.id,
    name: project.name,
    ticker: project.ticker,
    imageUrl: project.imageUrl || "/figma-assets/launchpad/project-1.png",
    status: project.status,
    creator: creatorName,
    creatorAvatar: creatorAvatar || project.creatorAvatar,
    createdAt: formatTimeAgo(project.createdAt),
    marketCap: project.marketCapFormatted || `$${(project.marketCap / 1000).toFixed(1)}K`,
    priceChange: typeof project.priceChange24h === 'string' ? parseFloat(project.priceChange24h) || 0 : (project.priceChange24h || 0),
    bondingProgress: project.bondingProgress || 0,
    description: project.description || "No description available",
  };
};

// Format token amount for display
const formatTokenAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  return amount.toFixed(2);
};

export default function Portfolio() {
  const t = useT();
  const [totalBalance, setTotalBalance] = useState("$0.00");
  const [tokensHeld, setTokensHeld] = useState<TokenHolding[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [_tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [_isLoadingTradeHistory, setIsLoadingTradeHistory] = useState(true);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  // const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  // const [selectedToken, setSelectedToken] = useState<TokenHolding | null>(null);

  // Redirect to token detail page
  const handleOpenTrade = (token: TokenHolding) => {
    // Navigate to token detail page using the same event as home screen
    const event = new CustomEvent("launchpad-token-detail", {
      detail: token.projectId,
    });
    window.dispatchEvent(event);
  };

  // // Close trade modal
  // const handleCloseTrade = () => {
  //   setIsTradeModalOpen(false);
  //   setSelectedToken(null);
  // };

  // Fetch user's portfolio (tokens held)
  const fetchPortfolio = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setTokensHeld([]);
        setTotalBalance("$0.00");
        return;
      }

      const response = await apiService.getLaunchpadPortfolio(accessToken);
      const investments = response?.investments || [];

      // Transform investments to TokenHolding format
      const holdings: TokenHolding[] = investments
        .filter((inv) => parseFloat(inv.tokenBalance) > 0)
        .map((inv) => ({
          id: inv.id,
          projectId: inv.project?.id || "",
          name: inv.project?.name || "Unknown",
          ticker: inv.project?.ticker || "???",
          image: inv.project?.imageUrl,
          tokenBalance: parseFloat(inv.tokenBalance) || 0,
          currentValueSol: parseFloat(inv.currentValueSol) || 0,
          totalSolInvested: parseFloat(inv.totalSolInvested) || 0,
          unrealizedPnlSol: parseFloat(inv.unrealizedPnlSol) || 0,
          unrealizedPnlPercent: parseFloat(inv.unrealizedPnlPercent) || 0,
          priceChange24h: inv.project?.priceChange24h || 0,
        }));

      setTokensHeld(holdings);

      // Calculate total balance from summary
      const totalValueSol = parseFloat(response.summary?.totalCurrentValueSol || "0");
      // Approximate USD value (assuming $200/SOL for display)
      const totalValueUsd = totalValueSol * 200;
      setTotalBalance(totalValueUsd >= 1000
        ? `$${(totalValueUsd / 1000).toFixed(1)}K`
        : `$${totalValueUsd.toFixed(2)}`
      );
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
      setTokensHeld([]);
      setTotalBalance("$0.00");
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  const fetchTradeHistory = useCallback(async () => {
    setIsLoadingTradeHistory(true);
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setTradeHistory([]);
        return;
      }

      const response = await apiService.getLaunchpadUserTradeHistory(accessToken, { limit: 20 });
      setTradeHistory(response?.trades || []);
    } catch (error) {
      console.error("Failed to fetch trade history:", error);
      setTradeHistory([]);
    } finally {
      setIsLoadingTradeHistory(false);
    }
  }, []);

  // Fetch active projects (live projects from the launchpad)
  const fetchActiveProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const response = await apiService.getLaunchpadLiveProjects();
      const projects = response?.projects || [];
      const transformed = projects.map(transformToActiveProject);
      setActiveProjects(transformed);
    } catch (error) {
      console.error("Failed to fetch active projects:", error);
      setActiveProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    fetchTradeHistory();
    fetchActiveProjects();
  }, [fetchPortfolio, fetchTradeHistory, fetchActiveProjects]);

  // Navigate to request token
  const handleRequestToken = () => {
    localStorage.setItem("swarp_fd_launchpad_subsection", "request-token");
    window.dispatchEvent(new CustomEvent("launchpad-subsection-change", { detail: "request-token" }));
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? "#27AE60" : "#EB5757";
  };

  // Format change percentage
  const formatChange = (change: number) => {
    return `${Math.abs(change).toFixed(2)}%`;
  };

  return (
    <div className="flex flex-col">
      {/* Total Balance Section */}
      <div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center !gap-7 !px-7 !py-7 lg:!pr-8"
        style={{ borderBottom: "0.2px solid #2B2D30" }}
      >
        <div className="flex flex-col !gap-1">
          {/* Total Balance Label */}
          <div className="flex items-center !gap-1">
            <span
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "16px",
                fontWeight: 400,
                lineHeight: "1.4em",
                letterSpacing: "-0.3px",
                color: "#636466",
              }}
            >
              {t.launchpad?.portfolio?.totalBalance || "Total balance"}
            </span>
            {/* Info Icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M6.5625 6.5625L6.58642 6.55083C6.66122 6.51346 6.74516 6.49831 6.8283 6.50717C6.91145 6.51604 6.99031 6.54854 7.05556 6.60083C7.1208 6.65313 7.1697 6.72302 7.19645 6.80224C7.2232 6.88146 7.22669 6.96669 7.2065 7.04783L6.7935 8.70217C6.77317 8.78335 6.77655 8.86866 6.80324 8.94798C6.82993 9.0273 6.87881 9.0973 6.94408 9.14968C7.00935 9.20206 7.08828 9.23461 7.1715 9.24349C7.25471 9.25236 7.33873 9.23718 7.41358 9.19975L7.4375 9.1875M12.25 7C12.25 7.68944 12.1142 8.37213 11.8504 9.00909C11.5865 9.64605 11.1998 10.2248 10.7123 10.7123C10.2248 11.1998 9.64605 11.5865 9.00909 11.8504C8.37213 12.1142 7.68944 12.25 7 12.25C6.31056 12.25 5.62787 12.1142 4.99091 11.8504C4.35395 11.5865 3.7752 11.1998 3.28769 10.7123C2.80018 10.2248 2.41347 9.64605 2.14963 9.00909C1.8858 8.37213 1.75 7.68944 1.75 7C1.75 5.60761 2.30312 4.27226 3.28769 3.28769C4.27226 2.30312 5.60761 1.75 7 1.75C8.39239 1.75 9.72774 2.30312 10.7123 3.28769C11.6969 4.27226 12.25 5.60761 12.25 7ZM7 4.8125H7.00467V4.81717H7V4.8125Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Balance Amount */}
          <span
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: "28px",
              fontWeight: 600,
              lineHeight: "1.3em",
              color: "#FFFFFF",
            }}
          >
            {totalBalance}
          </span>
        </div>

        {/* Line Graph Placeholder */}
        <div className="w-full lg:w-[333px] h-[77px]">
          <svg width="100%" height="77" viewBox="0 0 333 77" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="166.5" y1="0" x2="166.5" y2="77" gradientUnits="userSpaceOnUse">
                <stop stopColor="#40E0D0" stopOpacity="0.12" />
                <stop offset="1" stopColor="#40E0D0" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <path
              d="M0 50L20 45L40 48L60 35L80 40L100 30L120 35L140 25L160 28L180 20L200 25L220 15L240 18L260 22L280 12L300 8L320 10L333 5V77H0V50Z"
              fill="url(#chartGradient)"
            />
            <path
              d="M0 50L20 45L40 48L60 35L80 40L100 30L120 35L140 25L160 28L180 20L200 25L220 15L240 18L260 22L280 12L300 8L320 10L333 5"
              stroke="#40E0D0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Tokens Held Section */}
      <div
        className="flex flex-col !gap-7 !px-7 !py-7 lg:!pr-8"
        style={{ borderBottom: "0.2px solid #2B2D30" }}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: "20px",
              fontWeight: 600,
              lineHeight: "1.19em",
              color: "#FFFFFF",
            }}
          >
            {t.launchpad?.portfolio?.tokensHeld || "Tokens held"}
          </h2>
          {/* Expand/Collapse Icon - Double Chevrons Up */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.375 14.0625L9 8.4375L14.625 14.0625" stroke="#B3B5B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.375 9.5625L9 3.9375L14.625 9.5625" stroke="#B3B5B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Loading State - Skeleton */}
        {isLoadingTokens ? (
          <div className="flex flex-col !gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center !py-3">
                <div className="flex items-center !gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#1A1B23] animate-pulse" />
                  <div className="flex flex-col !gap-1.5">
                    <div className="h-4 w-24 bg-[#1A1B23] rounded animate-pulse" />
                    <div className="h-3 w-16 bg-[#1A1B23] rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-col !gap-1.5 w-[200px]">
                  <div className="h-4 w-16 bg-[#1A1B23] rounded animate-pulse" />
                  <div className="h-3 w-20 bg-[#1A1B23] rounded animate-pulse" />
                </div>
                <div className="w-[212px]">
                  <div className="h-4 w-14 bg-[#1A1B23] rounded animate-pulse" />
                </div>
                <div className="w-[48px]">
                  <div className="h-4 w-10 bg-[#1A1B23] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : tokensHeld.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center !py-12 !gap-3">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L4 14V34L24 44L44 34V14L24 4Z"
                stroke="#46484C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24 44V24"
                stroke="#46484C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M44 14L24 24L4 14"
                stroke="#46484C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "16px",
                fontWeight: 500,
                lineHeight: "1.4em",
                letterSpacing: "-0.3px",
                color: "#636466",
              }}
            >
              {t.launchpad?.portfolio?.noTokensHeld || "No tokens held yet"}
            </span>
            <span
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: "1.4em",
                letterSpacing: "-0.3px",
                color: "#46484C",
              }}
            >
              {t.launchpad?.portfolio?.noTokensHeldDescription || "Buy tokens to see them here"}
            </span>
          </div>
        ) : (
          <>
            {/* Tokens Table - Desktop */}
            <div className="hidden lg:flex flex-col !gap-3">
              {/* Table Header */}
              <div className="flex items-center">
                <span
                  className="flex-1"
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: "#FFFFFF",
                  }}
                >
                  {t.launchpad?.portfolio?.name || "Name"}
                </span>
                <span
                  className="w-[200px]"
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: "#FFFFFF",
                  }}
                >
                  {t.launchpad?.portfolio?.amount || "Amount"}
                </span>
                <span
                  className="w-[212px]"
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: "#FFFFFF",
                  }}
                >
                  {t.launchpad?.portfolio?.change24h || "24H change"}
                </span>
                <span
                  className="w-[48px]"
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: "#FFFFFF",
                  }}
                >
                  {t.launchpad?.portfolio?.trade || "Trade"}
                </span>
              </div>

              {/* Token Rows */}
              <div className="flex flex-col">
                {tokensHeld.map((token, index) => (
              <div
                key={token.id}
                className="flex items-center !py-3 !pb-4"
                style={{ borderBottom: index < tokensHeld.length - 1 ? "0.2px solid #2B2D30" : "none" }}
              >
                {/* Name Column */}
                <div className="flex items-center !gap-3 flex-1">
                  {/* Token Image */}
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                    {token.image ? (
                      <img
                        src={token.image}
                        alt={token.name}
                        className="w-full h-full object-cover"
                      />
                    ) : token.ticker === "SOL" ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#14F195]" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    )}
                  </div>
                  {/* Token Name and Ticker */}
                  <div className="flex flex-col !gap-1.5">
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "16px",
                        fontWeight: 600,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#FFFFFF",
                      }}
                    >
                      {token.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#636466",
                      }}
                    >
                      {token.ticker}
                    </span>
                  </div>
                </div>

                {/* Amount Column */}
                <div className="flex flex-col !gap-1.5 w-[200px]">
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    {formatTokenAmount(token.tokenBalance)}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "12px",
                      fontWeight: 400,
                      lineHeight: "1.5em",
                      letterSpacing: "-0.3px",
                      color: "#46484C",
                    }}
                  >
                    {token.totalSolInvested.toFixed(4)} SOL
                  </span>
                </div>

                {/* 24H Change Column */}
                <div className="flex items-center !gap-0.5 w-[212px]">
                  {/* Arrow Icon */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    {token.priceChange24h >= 0 ? (
                      <path
                        d="M7 11V3M7 3L3 7M7 3L11 7"
                        stroke={getChangeColor(token.priceChange24h)}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <path
                        d="M7 3V11M7 11L3 7M7 11L11 7"
                        stroke={getChangeColor(token.priceChange24h)}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: getChangeColor(token.priceChange24h),
                    }}
                  >
                    {formatChange(token.priceChange24h)}
                  </span>
                </div>

                {/* Trade Column */}
                <span
                  onClick={() => handleOpenTrade(token)}
                  className="w-[48px] cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: "#40E0D0",
                  }}
                >
                  {t.launchpad?.portfolio?.trade || "Trade"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tokens Cards - Mobile */}
        <div className="flex lg:hidden flex-col !gap-3">
          {tokensHeld.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between !p-4 bg-[#131519] rounded-xl"
            >
              {/* Left Side - Token Info */}
              <div className="flex items-center !gap-3">
                {/* Token Image */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                  {token.image ? (
                    <img
                      src={token.image}
                      alt={token.name}
                      className="w-full h-full object-cover"
                    />
                  ) : token.ticker === "SOL" ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#14F195]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  )}
                </div>
                {/* Token Name and Ticker */}
                <div className="flex flex-col !gap-1">
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "16px",
                      fontWeight: 600,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    {token.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#636466",
                    }}
                  >
                    {token.ticker}
                  </span>
                </div>
              </div>

              {/* Right Side - Amount, Change, and Trade */}
              <div className="flex items-center !gap-4">
                <div className="flex flex-col items-end !gap-1">
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    {formatTokenAmount(token.tokenBalance)}
                  </span>
                  <div className="flex items-center !gap-0.5">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      {token.priceChange24h >= 0 ? (
                        <path
                          d="M7 11V3M7 3L3 7M7 3L11 7"
                          stroke={getChangeColor(token.priceChange24h)}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <path
                          d="M7 3V11M7 11L3 7M7 11L11 7"
                          stroke={getChangeColor(token.priceChange24h)}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                        lineHeight: "1.5em",
                        letterSpacing: "-0.3px",
                        color: getChangeColor(token.priceChange24h),
                      }}
                    >
                      {formatChange(token.priceChange24h)}
                    </span>
                  </div>
                </div>
                {/* Trade Button */}
                <span
                  onClick={() => handleOpenTrade(token)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: "#40E0D0",
                  }}
                >
                  {t.launchpad?.portfolio?.trade || "Trade"}
                </span>
              </div>
            </div>
          ))}
        </div>
          </>
        )}
      </div>

      {/* Active Projects Section */}
      <div className="flex flex-col !gap-13 !px-7 !py-7 lg:!pr-8 !pb-9">
        {/* Section Header */}
        <div className="flex items-center">
          <h2
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: "20px",
              fontWeight: 600,
              lineHeight: "1.19em",
              color: "#FFFFFF",
            }}
          >
            {t.launchpad?.portfolio?.activeProjects || "Active projects"}
          </h2>
        </div>

        {/* Active Projects Content */}
        {isLoadingProjects ? (
          // Skeleton loader for Active Projects
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 !gap-4">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="flex flex-col !p-4 bg-[#131519] rounded-xl border border-[#2B2D30]"
              >
                {/* Skeleton Image */}
                <div className="w-full h-32 rounded-lg bg-[#1A1B23] animate-pulse !mb-3" />
                {/* Skeleton Project Info */}
                <div className="flex flex-col !gap-2">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-[#1A1B23] animate-pulse rounded" />
                    <div className="h-4 w-12 bg-[#1A1B23] animate-pulse rounded" />
                  </div>
                  <div className="h-4 w-20 bg-[#1A1B23] animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activeProjects.length > 0 ? (
          // Show project cards when there are active projects
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 !gap-4">
            {activeProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col !p-4 bg-[#131519] rounded-xl border border-[#2B2D30] hover:border-[#3B3D40] transition-colors cursor-pointer"
              >
                {/* Project Image */}
                <div className="w-full h-32 rounded-lg bg-[#1A1B23] !mb-3 overflow-hidden">
                  {project.imageUrl && (
                    <img
                      src={project.imageUrl}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* Project Info */}
                <div className="flex flex-col !gap-2">
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "16px",
                        fontWeight: 600,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#FFFFFF",
                      }}
                    >
                      {project.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "12px",
                        fontWeight: 400,
                        lineHeight: "1.5em",
                        letterSpacing: "-0.3px",
                        color: "#636466",
                      }}
                    >
                      {project.ticker}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#46484C",
                    }}
                  >
                    {project.marketCap}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center !gap-4">
            <div className="flex flex-col items-center !gap-1">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "16px",
                  fontWeight: 600,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#B3B5B6",
                }}
              >
                {t.launchpad?.portfolio?.noSubmittedProjects || "No submitted projects"}
              </span>
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#636466",
                }}
              >
                {t.launchpad?.portfolio?.noSubmittedProjectsDescription || "You haven't requested a token yet."}
              </span>
            </div>
            {/* Request Token Button */}
            <button
              onClick={handleRequestToken}
              className="flex items-center justify-center !px-[18px] !py-2.5 bg-white rounded-full hover:bg-gray-100 transition-colors"
            >
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#090A11",
                }}
              >
                {t.launchpad?.portfolio?.requestToken || "Request a token"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Trade Modal */}
      {/* {selectedToken && (
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={handleCloseTrade}
          token={{
            name: selectedToken.name,
            ticker: selectedToken.ticker,
            image: selectedToken.image,
          }}
        />
      )} */}
    </div>
  );
}
