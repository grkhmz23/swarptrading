"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiService } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";

// Transaction type
type TransactionType = "Buy" | "Sell";
type TransactionStatus = "Completed" | "Pending" | "Failed";

interface Transaction {
  id: string;
  type: TransactionType;
  tokenName: string;
  tokenTicker: string;
  tokenImage?: string;
  amount: number;
  solAmount: string;
  status: TransactionStatus;
  date: string;
  createdAt: string;
}

// API response type
interface TradeHistoryItem {
  id: string;
  type: 'buy' | 'sell';
  solAmount: string;
  tokenAmount: string;
  status?: string;
  createdAt: string;
  project?: {
    id: string;
    name: string;
    ticker: string;
    imageUrl?: string;
  };
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Helper function to format token amount
const formatTokenAmount = (amount: number): number => {
  if (amount >= 1000000) return Math.round(amount / 1000) * 1000;
  if (amount >= 1000) return Math.round(amount);
  return Math.round(amount * 100) / 100;
};

export default function TradeHistory() {
  const t = useT();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [tokenFilter, setTokenFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Filter dropdown options (use keys for filtering, display translations)
  const dateOptions = useMemo(() => [
    "All",
    "Today",
    "This Week",
    "This Month",
    "This Year"
  ], []);

  const typeOptions = useMemo(() => ["All", "Buy", "Sell"], []);

  // Helper function to get translated label for filter options
  const getFilterLabel = useCallback((option: string, filterType: 'date' | 'type') => {
    const lowerOption = option.toLowerCase().replace(/\s+/g, '');
    if (filterType === 'date') {
      switch (lowerOption) {
        case 'all': return t.launchpad?.tradeHistory?.all || option;
        case 'today': return t.launchpad?.tradeHistory?.today || option;
        case 'thisweek': return t.launchpad?.tradeHistory?.thisWeek || option;
        case 'thismonth': return t.launchpad?.tradeHistory?.thisMonth || option;
        case 'thisyear': return t.launchpad?.tradeHistory?.thisYear || option;
        default: return option;
      }
    } else {
      switch (lowerOption) {
        case 'all': return t.launchpad?.tradeHistory?.all || option;
        case 'buy': return t.launchpad?.tradeHistory?.buy || option;
        case 'sell': return t.launchpad?.tradeHistory?.sell || option;
        default: return option;
      }
    }
  }, [t]);

  // Helper function to translate status
  const translateStatus = useCallback((status: TransactionStatus) => {
    switch (status) {
      case 'Completed': return t.launchpad?.tradeHistory?.completed || status;
      case 'Pending': return t.launchpad?.tradeHistory?.pending || status;
      case 'Failed': return t.launchpad?.tradeHistory?.failed || status;
      default: return status;
    }
  }, [t]);

  // Helper function to translate transaction type
  const translateType = useCallback((type: TransactionType) => {
    return type === 'Buy'
      ? t.launchpad?.tradeHistory?.buy || type
      : t.launchpad?.tradeHistory?.sell || type;
  }, [t]);

  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const tokenDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const fetchTradeHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem("swarp_fd_access_token");
      if (!accessToken) {
        setTransactions([]);
        return;
      }

      const params: { page?: number; limit?: number; type?: 'buy' | 'sell' } = { limit: 50 };
      if (typeFilter && typeFilter !== "All") {
        params.type = typeFilter.toLowerCase() as 'buy' | 'sell';
      }

      const response = await apiService.getLaunchpadUserTradeHistory(accessToken, params);
      const trades: TradeHistoryItem[] = response?.trades || [];

      // Transform API response to Transaction format
      const transformed: Transaction[] = trades.map((trade) => ({
        id: trade.id,
        type: trade.type === 'buy' ? 'Buy' : 'Sell',
        tokenName: trade.project?.name || 'Unknown',
        tokenTicker: trade.project?.ticker || '???',
        tokenImage: trade.project?.imageUrl,
        amount: formatTokenAmount(parseFloat(trade.tokenAmount) || 0),
        solAmount: `${parseFloat(trade.solAmount).toFixed(2)} SOL`,
        status: (trade.status === 'completed' ? 'Completed' : trade.status === 'pending' ? 'Pending' : 'Completed') as TransactionStatus,
        date: formatDate(trade.createdAt),
        createdAt: trade.createdAt,
      }));

      setTransactions(transformed);
    } catch (error) {
      console.error("Failed to fetch trade history:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTradeHistory();
  }, [fetchTradeHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        dateDropdownRef.current && !dateDropdownRef.current.contains(target) &&
        tokenDropdownRef.current && !tokenDropdownRef.current.contains(target) &&
        typeDropdownRef.current && !typeDropdownRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const tokenOptions = useMemo(() => {
    const uniqueTokens = [...new Set(transactions.map(t => t.tokenName))];
    return ["All", ...uniqueTokens];
  }, [transactions]);

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by token
    if (tokenFilter && tokenFilter !== "All") {
      filtered = filtered.filter(t => t.tokenName === tokenFilter);
    }

    // Filter by date
    if (dateFilter && dateFilter !== "All") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(t => {
        const tradeDate = new Date(t.createdAt);
        switch (dateFilter) {
          case "Today":
            return tradeDate >= today;
          case "This Week": {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return tradeDate >= weekAgo;
          }
          case "This Month": {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return tradeDate >= monthAgo;
          }
          case "This Year": {
            const yearStart = new Date(now.getFullYear(), 0, 1);
            return tradeDate >= yearStart;
          }
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [transactions, tokenFilter, dateFilter]);

  const handleDropdownToggle = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const getStatusStyles = (status: TransactionStatus) => {
    switch (status) {
      case "Completed":
        return {
          bg: "rgba(39, 174, 96, 0.1)",
          text: "#27AE60",
        };
      case "Pending":
        return {
          bg: "rgba(255, 188, 73, 0.1)",
          text: "#FFBC49",
        };
      case "Failed":
        return {
          bg: "rgba(235, 87, 87, 0.1)",
          text: "#EB5757",
        };
    }
  };

  const getAmountStyles = (type: TransactionType) => {
    return type === "Buy" ? "#27AE60" : "#EB5757";
  };

  // Format amount with sign
  const formatAmount = (type: TransactionType, amount: number) => {
    const sign = type === "Buy" ? "+" : "-";
    return `${sign}${amount.toLocaleString()}`;
  };

  return (
    <div className="flex flex-col !gap-7 !p-7">
      {/* Activity Section */}
      <div className="flex flex-col !gap-7">
        {/* Section Title */}
        <div className="flex items-center">
          <h2
            className="text-white"
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: "20px",
              fontWeight: 600,
              lineHeight: "1.19em",
            }}
          >
            {t.launchpad?.tradeHistory?.activity || "Activity"}
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center !gap-3">
          {/* Date Filter */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              onClick={() => handleDropdownToggle("date")}
              className="flex items-center justify-center cursor-pointer !gap-1 !px-4 !py-2 bg-[#2B2D30] rounded-full hover:bg-[#3B3D40] transition-colors"
            >
              <span
                className="text-white"
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                }}
              >
                {dateFilter ? getFilterLabel(dateFilter, 'date') : t.launchpad?.tradeHistory?.date || "Date"}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2.5 3.75L5 6.25L7.5 3.75"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {openDropdown === "date" && (
              <div className="absolute top-full left-0 !mt-1 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden z-10 min-w-[120px]">
                {dateOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setDateFilter(option);
                      setOpenDropdown(null);
                    }}
                    className={`w-full cursor-pointer  !px-3 !py-2.5 text-left hover:bg-[#2B2D30] transition-colors ${
                      dateFilter === option ? "bg-[#2B2D30]" : ""
                    }`}
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    {getFilterLabel(option, 'date')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Token Filter */}
          <div className="relative" ref={tokenDropdownRef}>
            <button
              onClick={() => handleDropdownToggle("token")}
              className="flex items-center justify-center cursor-pointer !gap-1 !px-4 !py-2 bg-[#2B2D30] rounded-full hover:bg-[#3B3D40] transition-colors"
            >
              <span
                className="text-white"
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                }}
              >
                {tokenFilter && tokenFilter !== "All" ? tokenFilter : (tokenFilter === "All" ? t.launchpad?.tradeHistory?.all || "All" : t.launchpad?.tradeHistory?.token || "Token")}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2.5 3.75L5 6.25L7.5 3.75"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {openDropdown === "token" && (
              <div className="absolute top-full left-0 !mt-1 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden z-10 min-w-[140px] max-h-[200px] overflow-y-auto">
                {tokenOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setTokenFilter(option);
                      setOpenDropdown(null);
                    }}
                    className={`w-full cursor-pointer  !px-3 !py-2.5 text-left hover:bg-[#2B2D30] transition-colors ${
                      tokenFilter === option ? "bg-[#2B2D30]" : ""
                    }`}
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    {option === "All" ? t.launchpad?.tradeHistory?.all || option : option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type Filter (Buy/Sell) */}
          <div className="relative" ref={typeDropdownRef}>
            <button
              onClick={() => handleDropdownToggle("type")}
              className="flex items-center justify-center cursor-pointer !gap-1 !px-4 !py-2 bg-[#2B2D30] rounded-full hover:bg-[#3B3D40] transition-colors"
            >
              <span
                className="text-white"
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                }}
              >
                {typeFilter ? getFilterLabel(typeFilter, 'type') : t.launchpad?.tradeHistory?.type || "Type"}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2.5 3.75L5 6.25L7.5 3.75"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {openDropdown === "type" && (
              <div className="absolute top-full left-0 !mt-1 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden z-10 min-w-[100px]">
                {typeOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setTypeFilter(option);
                      setOpenDropdown(null);
                    }}
                    className={`w-full cursor-pointer !px-3 !py-2.5 text-left hover:bg-[#2B2D30] transition-colors ${
                      typeFilter === option ? "bg-[#2B2D30]" : ""
                    }`}
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    {getFilterLabel(option, 'type')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading State - Skeleton */}
        {isLoading ? (
          <div className="hidden lg:block w-full">
            <table className="w-full" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th className="text-left !pb-3" style={{ width: "35%" }}>
                    <div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" />
                  </th>
                  <th className="text-left !pb-3" style={{ width: "25%" }}>
                    <div className="h-4 w-14 bg-[#1A1B23] rounded animate-pulse" />
                  </th>
                  <th className="text-left !pb-3" style={{ width: "25%" }}>
                    <div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" />
                  </th>
                  <th className="text-left !pb-3" style={{ width: "15%" }}>
                    <div className="h-4 w-10 bg-[#1A1B23] rounded animate-pulse" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} style={{ borderBottom: "0.2px solid #2B2D30" }}>
                    <td className="!py-3 !pr-4">
                      <div className="flex items-center !gap-3">
                        <div className="w-[49px] h-[46px] rounded-lg bg-[#1A1B23] animate-pulse flex-shrink-0" />
                        <div className="flex flex-col !gap-1.5">
                          <div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" />
                          <div className="h-3 w-20 bg-[#1A1B23] rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="!py-3 !pr-4">
                      <div className="flex flex-col !gap-1.5">
                        <div className="h-4 w-14 bg-[#1A1B23] rounded animate-pulse" />
                        <div className="h-3 w-16 bg-[#1A1B23] rounded animate-pulse" />
                      </div>
                    </td>
                    <td className="!py-3 !pr-4">
                      <div className="h-6 w-20 bg-[#1A1B23] rounded-full animate-pulse" />
                    </td>
                    <td className="!py-3 text-left">
                      <div className="h-4 w-20 bg-[#1A1B23] rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredTransactions.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center !py-12 !gap-3">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
                stroke="#46484C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24 16V24L30 30"
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
              {t.launchpad?.tradeHistory?.noTradeHistory || "No trade history yet"}
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
              {t.launchpad?.tradeHistory?.noTradeHistoryDescription || "Your trades will appear here"}
            </span>
          </div>
        ) : (
          <>
            {/* Table Container - Desktop */}
            <div className="hidden lg:block w-full">
              <table className="w-full" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th
                      className="text-left !pb-3"
                      style={{
                        width: "35%",
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#FFFFFF",
                      }}
                    >
                      {t.launchpad?.tradeHistory?.details || "Details"}
                    </th>
                    <th
                      className="text-left !pb-3"
                      style={{
                        width: "25%",
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#FFFFFF",
                      }}
                    >
                      {t.launchpad?.tradeHistory?.amount || "Amount"}
                    </th>
                    <th
                      className="text-left !pb-3"
                      style={{
                        width: "25%",
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#FFFFFF",
                      }}
                    >
                      {t.launchpad?.tradeHistory?.status || "Status"}
                    </th>
                    <th
                      className="text-left !pb-3"
                      style={{
                        width: "15%",
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#FFFFFF",
                      }}
                    >
                      {t.launchpad?.tradeHistory?.date || "Date"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      style={{ borderBottom: "0.2px solid #2B2D30" }}
                    >
                      {/* Details Column */}
                      <td className="!py-3 !pr-4">
                        <div className="flex items-center !gap-3">
                          {/* Token Image */}
                          <div className="w-[49px] h-[46px] rounded-lg bg-[#1A1B23] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {transaction.tokenImage ? (
                              <img
                                src={transaction.tokenImage}
                                alt={transaction.tokenName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                            )}
                          </div>
                          {/* Type and Token Name */}
                          <div className="flex flex-col !gap-1.5 min-w-0">
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
                              {translateType(transaction.type)}
                            </span>
                            <span
                              className="truncate"
                              style={{
                                fontFamily: "'Inter Variable', Inter, sans-serif",
                                fontSize: "14px",
                                fontWeight: 400,
                                lineHeight: "1.4em",
                                letterSpacing: "-0.3px",
                                color: "#636466",
                              }}
                            >
                              {transaction.tokenName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Amount Column */}
                      <td className="!py-3 !pr-4">
                        <div className="flex flex-col !gap-1.5">
                          <span
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "1.4em",
                              letterSpacing: "-0.3px",
                              color: getAmountStyles(transaction.type),
                            }}
                          >
                            {formatAmount(transaction.type, transaction.amount)}
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
                            {transaction.solAmount}
                          </span>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="!py-3 !pr-4">
                        <span
                          className="inline-flex items-center justify-center !px-3 !py-1.5 rounded-full"
                          style={{
                            backgroundColor: getStatusStyles(transaction.status).bg,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "1.5em",
                              letterSpacing: "-0.3px",
                              color: getStatusStyles(transaction.status).text,
                            }}
                          >
                            {translateStatus(transaction.status)}
                          </span>
                        </span>
                      </td>

                      {/* Date Column */}
                      <td
                        className="!py-3 text-left"
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                          color: "#636466",
                        }}
                      >
                        {transaction.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Transaction Cards - Mobile/Tablet */}
            <div className="flex lg:hidden flex-col !gap-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between !p-4 bg-[#131519] rounded-xl"
                >
                  {/* Left Side - Token Info */}
                  <div className="flex items-center !gap-3">
                    {/* Token Image */}
                    <div className="w-12 h-12 rounded-lg bg-[#1A1B23] flex items-center justify-center overflow-hidden">
                      {transaction.tokenImage ? (
                        <img
                          src={transaction.tokenImage}
                          alt={transaction.tokenName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                      )}
                    </div>
                    {/* Type and Token Name */}
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
                        {translateType(transaction.type)}
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
                        {transaction.tokenName}
                      </span>
                    </div>
                  </div>

                  {/* Right Side - Amount and Status */}
                  <div className="flex flex-col items-end !gap-1">
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: getAmountStyles(transaction.type),
                      }}
                    >
                      {formatAmount(transaction.type, transaction.amount)}
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
                      {transaction.solAmount}
                    </span>
                    <span
                      className="inline-flex items-center justify-center !px-2 !py-1 rounded-full !mt-1"
                      style={{
                        backgroundColor: getStatusStyles(transaction.status).bg,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "10px",
                          fontWeight: 500,
                          lineHeight: "1.5em",
                          letterSpacing: "-0.3px",
                          color: getStatusStyles(transaction.status).text,
                        }}
                      >
                        {translateStatus(transaction.status)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
