'use client';

import React from 'react';
import Image from 'next/image';
import { JupiterToken, TokenFilter, CustomFilters } from '@/types/home';
import type { TranslationKeys } from '@/i18n';

interface TokenPrices {
  [symbol: string]: {
    price: number;
    priceChange24h?: number;
  };
}

interface TradeSectionProps {
  t: TranslationKeys;
  jupiterTokens: JupiterToken[];
  jupiterTokensLoading: boolean;
  tokenPrices: TokenPrices;
  tokenPricesLoading: boolean;
  tokenSearchQuery: string;
  setTokenSearchQuery: (query: string) => void;
  tokenFilter: TokenFilter;
  setTokenFilter: (filter: TokenFilter) => void;
  appliedFilters: CustomFilters;
  hasActiveCustomFilters: boolean;
  setShowCustomFiltersModal: (show: boolean) => void;
  failedImages: Set<string>;
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowSwapModal: (show: boolean) => void;
  onTokenSelect: (tokenAddress: string) => void;
}

export const TradeSection: React.FC<TradeSectionProps> = ({
  t,
  jupiterTokens,
  jupiterTokensLoading,
  tokenPrices,
  tokenPricesLoading,
  tokenSearchQuery,
  setTokenSearchQuery,
  tokenFilter,
  setTokenFilter,
  appliedFilters,
  hasActiveCustomFilters,
  setShowCustomFiltersModal,
  failedImages,
  setFailedImages,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setShowSwapModal,
  onTokenSelect,
}) => {
  const trade = t.trade as Record<string, unknown> | undefined;
  const wallet = t.wallet as Record<string, string> | undefined;
  const filters = trade?.filters as Record<string, string> | undefined;

  const formatPrice = (p: number | undefined) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.0001) return p.toFixed(4);
    return p.toFixed(8);
  };

  const formatLargeNumber = (v: number | undefined) => {
    if (!v) return '-';
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };

  const formatHolders = (h: number | undefined) => {
    if (!h) return '-';
    if (h >= 1_000_000) return `${(h / 1_000_000).toFixed(2)}M`;
    if (h >= 1_000) return `${(h / 1_000).toFixed(1)}K`;
    return h.toLocaleString();
  };

  const getFilteredTokens = () => {
    return jupiterTokens
      // Search filter
      .filter((token) => {
        if (!tokenSearchQuery.trim()) return true;
        const query = tokenSearchQuery.toLowerCase();
        return (
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query)
        );
      })
      // Apply category filter
      .filter((token) => {
        const priceChange = tokenPrices[token.symbol]?.priceChange24h ?? 0;
        switch (tokenFilter) {
          case 'gainers':
            return priceChange > 0;
          case 'losers':
            return priceChange < 0;
          case 'volume':
          case 'new':
          case 'all':
          default:
            return true;
        }
      })
      // Apply custom filters (Liquidity, Volume, Market Cap)
      .filter((token) => {
        // Liquidity filter
        const liquidity = token.liquidity ?? 0;
        if (appliedFilters.liquidityMin && liquidity < parseFloat(appliedFilters.liquidityMin)) return false;
        if (appliedFilters.liquidityMax && liquidity > parseFloat(appliedFilters.liquidityMax)) return false;

        // Volume filter
        const volume = token.volume24h ?? 0;
        if (appliedFilters.volumeMin && volume < parseFloat(appliedFilters.volumeMin)) return false;
        if (appliedFilters.volumeMax && volume > parseFloat(appliedFilters.volumeMax)) return false;

        // Market Cap filter
        const marketCap = token.mcap ?? 0;
        if (appliedFilters.marketCapMin && marketCap < parseFloat(appliedFilters.marketCapMin)) return false;
        if (appliedFilters.marketCapMax && marketCap > parseFloat(appliedFilters.marketCapMax)) return false;

        return true;
      })
      // Sort based on filter
      .sort((a, b) => {
        const priceChangeA = tokenPrices[a.symbol]?.priceChange24h ?? a.priceChange24h ?? 0;
        const priceChangeB = tokenPrices[b.symbol]?.priceChange24h ?? b.priceChange24h ?? 0;
        const volumeA = a.volume24h ?? 0;
        const volumeB = b.volume24h ?? 0;
        const listingA = a.listingTime || 0;
        const listingB = b.listingTime || 0;

        switch (tokenFilter) {
          case 'gainers':
            return priceChangeB - priceChangeA;
          case 'losers':
            return priceChangeA - priceChangeB;
          case 'volume':
            return volumeB - volumeA;
          case 'new':
            return listingB - listingA;
          default:
            return 0;
        }
      });
  };

  const filteredTokens = getFilteredTokens();

  return (
    <div className="flex flex-col h-full !p-4 lg:!p-7 overflow-hidden">
      {/* Trade Header */}
      <h2 className="text-white text-lg font-semibold !mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
        {(trade?.title as string) || "Trade"}
      </h2>

      {/* Search Bar */}
      <div className="relative !mb-6">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <input
          type="text"
          placeholder={(trade?.searchTokens as string) || "Search by name or symbol..."}
          value={tokenSearchQuery}
          onChange={(e) => setTokenSearchQuery(e.target.value)}
          className="w-full bg-[#131519] border border-[#2B2D30] rounded-lg !py-3 !pl-10 !pr-4 text-white placeholder-[#636466] focus:outline-none focus:border-[#40E0D0] transition-colors"
        />
        {tokenSearchQuery && (
          <button
            onClick={() => setTokenSearchQuery('')}
            className="absolute inset-y-0 right-3 flex items-center text-[#636466] hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between !mb-4">
        <div className="flex items-center !gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all' as const, label: filters?.all || 'All' },
            { key: 'gainers' as const, label: filters?.gainers || 'Top Gainers', icon: '📈' },
            { key: 'losers' as const, label: filters?.losers || 'Top Losers', icon: '📉' },
            { key: 'volume' as const, label: filters?.volume || 'Top Volume', icon: '📊' },
            { key: 'new' as const, label: filters?.new || 'New Listings', icon: '✨' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setTokenFilter(filter.key)}
              className={`flex items-center !gap-1.5 !px-4 !py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                tokenFilter === filter.key
                  ? 'bg-[#40E0D0] text-[#090A11]'
                  : 'bg-[#131519] text-[#B3B5B6] hover:bg-[#2B2D30] border border-[#2B2D30]'
              }`}
            >
              {filter.icon && <span>{filter.icon}</span>}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Custom Filters Button */}
        <button
          onClick={() => setShowCustomFiltersModal(true)}
          className={`flex items-center !gap-2 !px-4 !py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            hasActiveCustomFilters
              ? 'bg-[#40E0D0] text-[#090A11]'
              : 'bg-[#131519] text-[#B3B5B6] hover:bg-[#2B2D30] border border-[#2B2D30]'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {hasActiveCustomFilters && (
            <span className="w-2 h-2 bg-[#090A11] rounded-full"></span>
          )}
        </button>
      </div>

      {/* Tokens Table */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-8 !gap-4 !px-4 !py-3 text-[#636466] text-sm border-b border-[#2B2D30] min-w-[1000px] flex-shrink-0">
          <span className="col-span-2">{(trade?.name as string) || "Name"}</span>
          <span>{(trade?.price as string) || "Price"}</span>
          <span>{(trade?.change as string) || "24h Change"}</span>
          <span>{(trade?.volume as string) || "24h Volume"}</span>
          <span>{(trade?.marketCap as string) || "Market Cap"}</span>
          <span>{(trade?.liquidity as string) || "Liquidity"}</span>
          <span>{(trade?.holders as string) || "Holders"}</span>
        </div>

        {/* Loading Skeleton */}
        {(tokenPricesLoading || jupiterTokensLoading) ? (
          <div className="divide-y divide-[#2B2D30] overflow-y-auto flex-1">
            {[...Array(15)].map((_, index) => (
              <div key={index} className="grid grid-cols-8 !gap-4 !px-4 !py-4 items-center min-w-[1000px]">
                <div className="flex items-center !gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2B2D30] animate-pulse"></div>
                  <div>
                    <div className="h-4 w-20 bg-[#2B2D30] rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-12 bg-[#2B2D30] rounded animate-pulse"></div>
                  </div>
                </div>
                <div><div className="h-4 w-20 bg-[#2B2D30] rounded animate-pulse"></div></div>
                <div><div className="h-4 w-16 bg-[#2B2D30] rounded animate-pulse"></div></div>
                <div><div className="h-4 w-16 bg-[#2B2D30] rounded animate-pulse"></div></div>
                <div><div className="h-4 w-16 bg-[#2B2D30] rounded animate-pulse"></div></div>
                <div><div className="h-4 w-16 bg-[#2B2D30] rounded animate-pulse"></div></div>
                <div><div className="h-4 w-16 bg-[#2B2D30] rounded animate-pulse"></div></div>
              </div>
            ))}
          </div>
        ) : (
          /* Token Rows - Dynamic from Jupiter API with full scroll */
          <div className="divide-y divide-[#2B2D30] overflow-y-auto flex-1">
            {filteredTokens.map((token) => {
              // Use tokenPrices from API, fallback to token.usdPrice from Jupiter
              const price = tokenPrices[token.symbol]?.price ?? token.usdPrice;
              const priceChange = tokenPrices[token.symbol]?.priceChange24h ?? 0;
              const isSWARP = token.symbol === 'SWARP' || token.symbol === 'SWRP';
              const rawLogoURI = token.logoURI?.trim().replace(/[\s\x00-\x1F\x7F]/g, '');
              const sanitizedLogoURI = rawLogoURI && (rawLogoURI.startsWith('http://') || rawLogoURI.startsWith('https://'))
                ? rawLogoURI
                : undefined;

              return (
                <div
                  key={token.address}
                  className="grid grid-cols-8 !gap-4 !px-4 !py-4 items-center hover:bg-[#131519] transition-colors cursor-pointer min-w-[1000px]"
                  onClick={() => onTokenSelect(token.address)}
                >
                  <div className="flex items-center !gap-3 min-w-0 col-span-2">
                    <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden ${isSWARP ? 'bg-[#40E0D0]/15' : 'bg-[#2B2D30]'} relative`}>
                      {isSWARP ? (
                        <Image
                          src="https://swarpfoundation.com/swarp-logo.png"
                          alt="SWARP"
                          width={28}
                          height={28}
                          className="object-contain"
                          unoptimized
                        />
                      ) : sanitizedLogoURI && !failedImages.has(token.address) ? (
                        <Image
                          src={sanitizedLogoURI}
                          alt={token.symbol}
                          width={40}
                          height={40}
                          className="object-contain"
                          unoptimized
                          onError={() => {
                            setFailedImages(prev => new Set(prev).add(token.address));
                          }}
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">{token.symbol.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-white font-medium text-sm">{token.name}</span>
                      <div className="flex items-center !gap-1.5">
                        <span className="text-[#636466] text-sm">{token.symbol}</span>
                        {token.isVerified && (
                          <svg className="w-3.5 h-3.5 text-[#40E0D0] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {isSWARP && (
                          <span className="bg-[#132123] text-[#40E0D0] text-[10px] !px-1.5 !py-0.5 rounded font-semibold leading-tight">Primary</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium">${formatPrice(price)}</p>
                  </div>
                  <div>
                    <p className={`font-medium ${priceChange >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{formatLargeNumber(token.volume24h)}</p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{formatLargeNumber(token.mcap)}</p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{formatLargeNumber(token.liquidity)}</p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{formatHolders(token.holderCount)}</p>
                  </div>
                </div>
              );
            })}

            {/* No Results Message */}
            {filteredTokens.length === 0 && (
              <div className="flex flex-col items-center justify-center !py-12 text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="!mb-4 opacity-50">
                  <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[#636466] text-sm">{(trade?.noTokensFound as string) || "No tokens found"}</p>
                <p className="text-[#636466] text-xs !mt-1">
                  {tokenSearchQuery.trim()
                    ? ((trade?.tryDifferentSearch as string) || "Try searching for a different name or symbol")
                    : ((trade?.tryDifferentFilter as string) || "Try selecting a different filter")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
