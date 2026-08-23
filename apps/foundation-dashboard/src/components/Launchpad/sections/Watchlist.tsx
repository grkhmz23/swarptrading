"use client";

import { useState, useEffect, useCallback } from "react";
import AddAssetModal from "../AddAssetModal";
import { apiService, LaunchpadProject } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
};

// Helper function to format volume
const formatVolume = (volume: number | string | undefined | null): string => {
  const vol = typeof volume === "string" ? parseFloat(volume) : volume;
  if (!vol || isNaN(vol)) return "$0";
  if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
};

// Helper function to format price
const formatPrice = (price: string | number): string => {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(priceNum) || priceNum === 0) return "$0.00";
  if (priceNum < 0.0001) return `$${priceNum.toExponential(2)}`;
  if (priceNum < 1) return `$${priceNum.toFixed(6)}`;
  return `$${priceNum.toFixed(2)}`;
};

export default function Watchlist() {
  const t = useT();
  const [projects, setProjects] = useState<LaunchpadProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("swarp_fd_access_token");
      if (!token) {
        setError(t.launchpad?.watchlist?.loginRequired || "Please login to view your watchlist");
        setIsLoading(false);
        return;
      }

      const response = await apiService.getLaunchpadWatchlist(token);
      setProjects(response.projects || []);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
      setError(t.launchpad?.watchlist?.failedToLoad || "Failed to load watchlist");
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Initial fetch on mount
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Open add asset modal
  const handleOpenAddAsset = () => {
    setIsAddAssetModalOpen(true);
  };

  // Close add asset modal
  const handleCloseAddAsset = () => {
    setIsAddAssetModalOpen(false);
  };

  const handleSaveAssets = () => {
    fetchWatchlist();
  };

  const handleRemoveFromWatchlist = async (projectId: string) => {
    try {
      const token = localStorage.getItem("swarp_fd_access_token");
      if (!token) return;

      await apiService.toggleLaunchpadWatchlist(projectId, token);
      // Refresh the watchlist
      fetchWatchlist();
    } catch (err) {
      console.error("Failed to remove from watchlist:", err);
    }
  };

  const parsePriceChange = (change: string | number | undefined): number => {
    if (change === undefined || change === null) return 0;
    return typeof change === 'string' ? parseFloat(change) || 0 : change;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? "#27AE60" : "#EB5757";
  };

  // Format change percentage
  const formatChange = (change: number) => {
    return `${Math.abs(change || 0).toFixed(1)}%`;
  };

  return (
    <div className="flex flex-col">
      {/* Header Section */}
      <div
        className="flex justify-between items-center !px-7 !py-7"
        style={{ borderBottom: "0.2px solid #2B2D30" }}
      >
        {/* Title */}
        <h1
          style={{
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            lineHeight: "1.19em",
            color: "#FFFFFF",
          }}
        >
          {t.launchpad?.watchlist?.title || "Watchlist"}
        </h1>

        {/* New Asset Button */}
        <button
          onClick={handleOpenAddAsset}
          className="flex cursor-pointer  items-center !gap-2 !px-4 !py-2.5 bg-white rounded-full hover:bg-gray-100 transition-colors"
        >
          {/* Plus Icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2.625V11.375M2.625 7H11.375"
              stroke="#090A11"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
            {t.launchpad?.watchlist?.newAsset || "New asset"}
          </span>
        </button>
      </div>

      {/* Loading State - Skeleton */}
      {isLoading && (
        <div className="flex flex-col !px-7 !py-5">
          {/* Skeleton Table Header */}
          <div className="hidden lg:flex items-center !py-3" style={{ borderBottom: "0.2px solid #2B2D30" }}>
            <div className="w-[64px]" />
            <div className="w-[56px]"><div className="h-4 w-4 bg-[#1A1B23] rounded animate-pulse" /></div>
            <div className="w-[204px]"><div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" /></div>
            <div className="w-[120px]"><div className="h-4 w-10 bg-[#1A1B23] rounded animate-pulse" /></div>
            <div className="w-[100px]"><div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" /></div>
            <div className="w-[120px]"><div className="h-4 w-16 bg-[#1A1B23] rounded animate-pulse" /></div>
            <div className="w-[100px]"><div className="h-4 w-16 bg-[#1A1B23] rounded animate-pulse" /></div>
            <div className="w-[60px]"><div className="h-4 w-8 bg-[#1A1B23] rounded animate-pulse" /></div>
          </div>
          {/* Skeleton Rows - Desktop */}
          <div className="hidden lg:flex flex-col">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center !py-4" style={{ borderBottom: "0.2px solid #2B2D30" }}>
                <div className="w-[64px]"><div className="w-6 h-6 bg-[#1A1B23] rounded animate-pulse" /></div>
                <div className="w-[56px]"><div className="h-4 w-4 bg-[#1A1B23] rounded animate-pulse" /></div>
                <div className="flex items-center !gap-3 w-[204px]">
                  <div className="w-8 h-8 rounded-full bg-[#1A1B23] animate-pulse" />
                  <div className="flex flex-col !gap-1">
                    <div className="h-4 w-20 bg-[#1A1B23] rounded animate-pulse" />
                    <div className="h-3 w-10 bg-[#1A1B23] rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-[120px]"><div className="h-4 w-16 bg-[#1A1B23] rounded animate-pulse" /></div>
                <div className="w-[100px]"><div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" /></div>
                <div className="w-[120px]"><div className="h-4 w-14 bg-[#1A1B23] rounded animate-pulse" /></div>
                <div className="w-[100px]"><div className="h-4 w-14 bg-[#1A1B23] rounded animate-pulse" /></div>
                <div className="w-[60px]"><div className="h-4 w-6 bg-[#1A1B23] rounded animate-pulse" /></div>
              </div>
            ))}
          </div>
          {/* Skeleton Cards - Mobile */}
          <div className="flex lg:hidden flex-col !gap-3 !mt-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col !p-4 bg-[#131519] rounded-xl">
                <div className="flex items-center justify-between !mb-3">
                  <div className="flex items-center !gap-3">
                    <div className="h-4 w-6 bg-[#1A1B23] rounded animate-pulse" />
                    <div className="w-8 h-8 rounded-full bg-[#1A1B23] animate-pulse" />
                    <div className="flex flex-col !gap-1">
                      <div className="h-4 w-20 bg-[#1A1B23] rounded animate-pulse" />
                      <div className="h-3 w-10 bg-[#1A1B23] rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-6 h-6 bg-[#1A1B23] rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-3 !gap-3">
                  <div className="flex flex-col !gap-1">
                    <div className="h-3 w-10 bg-[#1A1B23] rounded animate-pulse" />
                    <div className="h-4 w-14 bg-[#1A1B23] rounded animate-pulse" />
                  </div>
                  <div className="flex flex-col !gap-1">
                    <div className="h-3 w-12 bg-[#1A1B23] rounded animate-pulse" />
                    <div className="h-4 w-14 bg-[#1A1B23] rounded animate-pulse" />
                  </div>
                  <div className="flex flex-col !gap-1">
                    <div className="h-3 w-10 bg-[#1A1B23] rounded animate-pulse" />
                    <div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center !py-16 !gap-4">
          <span
            style={{
              fontFamily: "'Inter Variable', Inter, sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              color: "#EB5757",
            }}
          >
            {error}
          </span>
          <button
            onClick={fetchWatchlist}
            className="!px-4 !py-2 bg-[#40E0D0] text-[#090A11] rounded-full text-sm font-medium hover:bg-[#40E0D0]/90"
          >
            {t.launchpad?.watchlist?.tryAgain || "Try Again"}
          </button>
        </div>
      )}

      {/* Table Section */}
      {!isLoading && !error && (
        <div className="flex flex-col !px-7 !py-5">
          {/* Table Header - Desktop */}
          <div
            className="hidden lg:flex items-center !py-3"
            style={{ borderBottom: "0.2px solid #2B2D30" }}
          >
            {/* Star Column - Empty header */}
            <div className="w-[64px]" />
            {/* Rank Column */}
            <div className="w-[56px]">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                {t.launchpad?.watchlist?.rank || "#"}
              </span>
            </div>
            {/* Token Column */}
            <div className="w-[204px]">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                {t.launchpad?.watchlist?.token || "Token"}
              </span>
            </div>
            {/* Price Column */}
            <div className="w-[120px]">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                {t.launchpad?.watchlist?.price || "Price"}
              </span>
            </div>
            {/* 24H % Column */}
            <div className="w-[100px]">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                {t.launchpad?.watchlist?.change24h || "24H %"}
              </span>
            </div>
            {/* Market Cap Column */}
            <div className="w-[120px]">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                {t.launchpad?.watchlist?.marketCap || "Market Cap"}
              </span>
            </div>
            {/* Volume Column */}
            <div className="w-[100px]">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                {t.launchpad?.watchlist?.volume24h || "Volume (24h)"}
              </span>
            </div>
            {/* Age Column */}
            <div className="w-[60px]">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                {t.launchpad?.watchlist?.age || "Age"}
              </span>
            </div>
          </div>

          {/* Table Rows - Desktop */}
          <div className="hidden lg:flex flex-col">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="flex items-center !py-4"
                style={{ borderBottom: index < projects.length - 1 ? "0.2px solid #2B2D30" : "none" }}
              >
                {/* Star Column */}
                <div
                  className="w-[64px] flex items-center cursor-pointer"
                  onClick={() => handleRemoveFromWatchlist(project.id)}
                >
                  {/* Filled Star Icon */}
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path
                      d="M14.8189 19.5463C13.8104 19.4925 12.4898 18.8662 10.7796 17.6816L10.7477 17.6602L10.7183 17.6816C9.00813 18.867 7.68822 19.4933 6.67821 19.5471L6.53642 19.5511C4.34832 19.5511 4.06953 17.4607 5.16796 13.8152L5.21098 13.6743L5.13132 13.6149C0.307461 9.9425 1.11197 7.4008 7.16569 7.22818L7.32659 7.22422L7.4182 6.96609C8.36127 4.32938 9.35063 2.93976 10.6259 2.85503L10.7501 2.85107C12.0835 2.85107 13.1055 4.24465 14.0813 6.96609L14.1721 7.22422L14.3346 7.22818C20.3883 7.4008 21.1928 9.9425 16.3681 13.6141L16.2869 13.6735L16.3307 13.8144C17.406 17.3871 17.1591 19.4656 15.0913 19.5471L14.9615 19.5495L14.8189 19.5463Z"
                      fill="#40E0D0"
                    />
                  </svg>
                </div>
                {/* Rank Column */}
                <div className="w-[56px]">
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
                    {index + 1}
                  </span>
                </div>
                {/* Token Column */}
                <div className="flex items-center !gap-3 w-[204px]">
                  {/* Token Image */}
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
                    style={project.imageUrl ? { backgroundImage: `url(${project.imageUrl})`, backgroundSize: 'cover' } : {}}
                  />
                  {/* Token Name and Ticker */}
                  <div className="flex flex-col !gap-0.5">
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
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
                </div>
                {/* Price Column */}
                <div className="w-[120px]">
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
                    {formatPrice(project.price)}
                  </span>
                </div>
                {/* 24H % Column */}
                <div className="flex items-center !gap-0.5 w-[100px]">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    {parsePriceChange(project.priceChange24h) >= 0 ? (
                      <path
                        d="M7 11V3M7 3L3 7M7 3L11 7"
                        stroke={getChangeColor(parsePriceChange(project.priceChange24h))}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <path
                        d="M7 3V11M7 11L3 7M7 11L11 7"
                        stroke={getChangeColor(parsePriceChange(project.priceChange24h))}
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
                      color: getChangeColor(parsePriceChange(project.priceChange24h)),
                    }}
                  >
                    {formatChange(parsePriceChange(project.priceChange24h))}
                  </span>
                </div>
                {/* Market Cap Column */}
                <div className="w-[120px]">
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
                    {project.marketCapFormatted || formatVolume(project.marketCap || 0)}
                  </span>
                </div>
                {/* Volume Column */}
                <div className="w-[100px]">
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
                    {formatVolume(project.volume24h || 0)}
                  </span>
                </div>
                {/* Age Column */}
                <div className="w-[60px]">
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
                    {formatTimeAgo(project.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="flex lg:hidden flex-col !gap-3 !mt-4">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="flex flex-col !p-4 bg-[#131519] rounded-xl"
              >
                {/* Top Row - Token Info and Star */}
                <div className="flex items-center justify-between !mb-3">
                  <div className="flex items-center !gap-3">
                    {/* Rank */}
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
                      #{index + 1}
                    </span>
                    {/* Token Image */}
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
                      style={project.imageUrl ? { backgroundImage: `url(${project.imageUrl})`, backgroundSize: 'cover' } : {}}
                    />
                    {/* Token Name and Ticker */}
                    <div className="flex flex-col">
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
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
                  </div>
                  {/* Filled Star Icon */}
                  <div
                    className="cursor-pointer"
                    onClick={() => handleRemoveFromWatchlist(project.id)}
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path
                        d="M14.8189 19.5463C13.8104 19.4925 12.4898 18.8662 10.7796 17.6816L10.7477 17.6602L10.7183 17.6816C9.00813 18.867 7.68822 19.4933 6.67821 19.5471L6.53642 19.5511C4.34832 19.5511 4.06953 17.4607 5.16796 13.8152L5.21098 13.6743L5.13132 13.6149C0.307461 9.9425 1.11197 7.4008 7.16569 7.22818L7.32659 7.22422L7.4182 6.96609C8.36127 4.32938 9.35063 2.93976 10.6259 2.85503L10.7501 2.85107C12.0835 2.85107 13.1055 4.24465 14.0813 6.96609L14.1721 7.22422L14.3346 7.22818C20.3883 7.4008 21.1928 9.9425 16.3681 13.6141L16.2869 13.6735L16.3307 13.8144C17.406 17.3871 17.1591 19.4656 15.0913 19.5471L14.9615 19.5495L14.8189 19.5463Z"
                        fill="#40E0D0"
                      />
                    </svg>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 !gap-3">
                  {/* Price */}
                  <div className="flex flex-col !gap-1">
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
                      {t.launchpad?.watchlist?.price || "Price"}
                    </span>
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
                      {formatPrice(project.price)}
                    </span>
                  </div>
                  {/* Volume */}
                  <div className="flex flex-col !gap-1">
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
                      {t.launchpad?.watchlist?.volume || "Volume"}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#FFFFFF",
                      }}
                    >
                      {formatVolume(project.volume24h || 0)}
                    </span>
                  </div>
                  {/* 24H Change */}
                  <div className="flex flex-col !gap-1">
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
                      {t.launchpad?.watchlist?.change24h || "24H %"}
                    </span>
                    <div className="flex items-center !gap-0.5">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        {parsePriceChange(project.priceChange24h) >= 0 ? (
                          <path
                            d="M7 11V3M7 3L3 7M7 3L11 7"
                            stroke={getChangeColor(parsePriceChange(project.priceChange24h))}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <path
                            d="M7 3V11M7 11L3 7M7 11L11 7"
                            stroke={getChangeColor(parsePriceChange(project.priceChange24h))}
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
                          color: getChangeColor(parsePriceChange(project.priceChange24h)),
                        }}
                      >
                        {formatChange(parsePriceChange(project.priceChange24h))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center !py-16 !gap-4">
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
                {t.launchpad?.watchlist?.noTokens || "No tokens in watchlist"}
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
                {t.launchpad?.watchlist?.noTokensDescription || "Add tokens to track their prices and stats."}
              </span>
              <button
                onClick={handleOpenAddAsset}
                className="flex items-center !gap-2 !px-4 !py-2.5 bg-white rounded-full hover:bg-gray-100 transition-colors !mt-2"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 2.625V11.375M2.625 7H11.375"
                    stroke="#090A11"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
                  {t.launchpad?.watchlist?.addAsset || "Add asset"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddAssetModalOpen}
        onClose={handleCloseAddAsset}
        onSave={handleSaveAssets}
      />
    </div>
  );
}
