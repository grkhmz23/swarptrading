'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import type { TranslationKeys } from '@/i18n';

import { SWARP_TOKEN_MINT } from '@/config/env';
import { fetchTokenDetail, type TokenData } from '@/services/tokenDetail';


interface TokenDetailSectionProps {
  t: TranslationKeys;
  tokenAddress: string;
  onBack: () => void;
  /** Open the swap flow with this token preselected as the output. */
  onBuy: (mint: string) => void;
}

export const TokenDetailSection: React.FC<TokenDetailSectionProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  t,
  tokenAddress,
  onBack,
  onBuy,
}) => {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSWARP = tokenAddress === SWARP_TOKEN_MINT;

  useEffect(() => {
    if (!tokenAddress) return;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      setFailedImage(false);

      // SWARP is in private sale and not listed on any DEX: there is no market price.
      if (isSWARP) {
        setTokenData({
          address: SWARP_TOKEN_MINT,
          symbol: 'SWARP',
          name: 'Swarp Token',
          logoURI: 'https://swarpfoundation.com/swarp-logo.png',
          price: null,
          priceChange24h: 0,
          volume24h: 0,
          marketCap: 0,
          liquidity: 0,
          fdv: 0,
          holderCount: 0,
        });
        setLoading(false);
        return;
      }

      try {
        const data = await fetchTokenDetail(tokenAddress, controller.signal);
        if (controller.signal.aborted) return;
        setTokenData(data);
        if (!data) setError('Token not found');
      } catch (err) {
        if (controller.signal.aborted) return;
        setTokenData(null);
        setError(err instanceof Error && err.message ? err.message : 'Failed to load token data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [tokenAddress, isSWARP]);

  const formatPrice = (p: number | null) => {
    if (p === null) return 'Price unavailable';
    if (!p) return '$0.00';
    if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    if (p >= 0.0001) return `$${p.toFixed(4)}`;
    if (p >= 0.00000001) return `$${p.toFixed(8)}`;
    return `$${p.toExponential(2)}`;
  };

  const formatLargeNumber = (v: number) => {
    if (!v) return '-';
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; nothing to recover.
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Loading Skeleton */}
        <div className="flex-shrink-0 !p-4 lg:!p-6 border-b border-[#2B2D30]">
          {/* Back button skeleton */}
          <div className="flex items-center gap-2 !mb-4">
            <div className="w-5 h-5 bg-[#2B2D30] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[#2B2D30] rounded animate-pulse" />
          </div>

          {/* Token info skeleton */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-[#2B2D30] animate-pulse" />
              <div>
                <div className="h-5 w-32 bg-[#2B2D30] rounded animate-pulse !mb-2" />
                <div className="h-4 w-16 bg-[#2B2D30] rounded animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-28 bg-[#2B2D30] rounded-lg animate-pulse" />
          </div>

          {/* Price skeleton */}
          <div className="!mt-4">
            <div className="h-10 w-40 bg-[#2B2D30] rounded animate-pulse !mb-2" />
            <div className="h-4 w-24 bg-[#2B2D30] rounded animate-pulse" />
          </div>
        </div>

        {/* Chart skeleton */}
        <div className="flex-1 overflow-y-auto">
          <div className="!p-4 lg:!p-6">
            <div className="bg-[#131519] border border-[#2B2D30] rounded-xl h-[450px] animate-pulse !mb-6" />

            {/* Stats grid skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 !mb-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                  <div className="h-3 w-16 bg-[#2B2D30] rounded animate-pulse !mb-2" />
                  <div className="h-5 w-20 bg-[#2B2D30] rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Action buttons skeleton */}
            <div className="flex gap-4 !mb-6">
              <div className="flex-1 h-14 bg-[#2B2D30] rounded-xl animate-pulse" />
              <div className="w-40 h-14 bg-[#2B2D30] rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="flex flex-col h-full">
       

        {/* Error Content */}
        <div className="flex-1 flex items-center justify-center !p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-[#2B2D30] rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-white text-lg font-semibold">{error || 'Token not found'}</p>
            <p className="text-[#636466] text-sm">The token you&apos;re looking for could not be found.</p>
            <button
              onClick={onBack}
              className="bg-[#40E0D0] text-[#090A11] !px-6 !py-3 rounded-xl font-semibold hover:bg-[#40E0D0]/90 transition-colors !mt-2 cursor-pointer"
            >
              Back to Trade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Token Header */}
      <div className="flex-shrink-0 !p-4 lg:!p-6 border-b border-[#2B2D30]">
        {/* Back Button - Above token info */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 !mb-4 text-[#636466] hover:text-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-medium">Back to Trade</span>
        </button>

        <div className="flex items-center gap-4">
          {/* Token Info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-[#2B2D30] flex items-center justify-center overflow-hidden">
              {tokenData.logoURI && !failedImage ? (
                <Image
                  src={tokenData.logoURI}
                  alt={tokenData.symbol}
                  width={48}
                  height={48}
                  className="object-cover"
                  unoptimized
                  onError={() => setFailedImage(true)}
                />
              ) : (
                <span className="text-white font-bold text-xl">{tokenData.symbol.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">{tokenData.name}</h1>
                {tokenData.isVerified && (
                  <svg className="w-5 h-5 text-[#40E0D0]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-[#636466]">{tokenData.symbol}</p>
            </div>
          </div>

          {/* Copy Address */}
          <button
            onClick={() => copyToClipboard(tokenAddress)}
            className="flex items-center gap-2 !px-3 !py-2 bg-[#2B2D30] rounded-lg hover:bg-[#363739] transition-colors text-sm"
          >
            <span className="text-[#636466]">{`${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-4)}`}</span>
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#40E0D0]">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>

        {/* Price Display */}
        <div className="!mt-4">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-white">{formatPrice(tokenData.price)}</span>
            <span className={`text-lg font-semibold ${tokenData.priceChange24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {tokenData.priceChange24h >= 0 ? '▲' : '▼'} {Math.abs(tokenData.priceChange24h).toFixed(2)}%
            </span>
          </div>
          <p className="text-[#636466] text-sm !mt-1">24h Change</p>
        </div>
      </div>

      {/* Chart Section - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="!p-4 lg:!p-6">

          {isSWARP ? (
            <>
              {/* SWARP Token - Custom Info (no DexScreener chart) */}
              <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-6 !mb-6">
                <div className="flex items-center justify-center !mb-4">
                  <div className="w-20 h-20 rounded-full bg-[#40E0D0]/15 flex items-center justify-center">
                    <Image src="https://swarpfoundation.com/swarp-logo.png" alt="SWARP" width={48} height={48} unoptimized />
                  </div>
                </div>
                <div className="text-center !mb-6">
                  <h2 className="text-white text-xl font-bold !mb-2">Swarp Token (SWARP)</h2>
                  <p className="text-[#636466] text-sm">The native utility token of the Swarp Foundation ecosystem</p>
                </div>

                <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !p-4 !mb-4">
                  <div className="flex items-center !gap-2 !mb-2">
                    <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    <p className="text-orange-400 text-sm font-semibold">Not Yet Tradeable</p>
                  </div>
                  <p className="text-[#636466] text-sm">SWARP is currently in private sale. Trading will be enabled once liquidity is added after the presale concludes.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !p-3">
                    <p className="text-[#636466] text-xs !mb-1">Presale Price</p>
                    <p className="text-white font-semibold">$0.03</p>
                  </div>
                  <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !p-3">
                    <p className="text-[#636466] text-xs !mb-1">Network</p>
                    <p className="text-white font-semibold">Solana</p>
                  </div>
                  <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !p-3">
                    <p className="text-[#636466] text-xs !mb-1">Decimals</p>
                    <p className="text-white font-semibold">9</p>
                  </div>
                  <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !p-3">
                    <p className="text-[#636466] text-xs !mb-1">Status</p>
                    <p className="text-[#40E0D0] font-semibold">Private Sale</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* DexScreener Chart Embed */}
              <div className="bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden !mb-6">
                <iframe
                  id="dexscreener-embed"
                  title="DexScreener Chart"
                  src={`https://dexscreener.com/solana/${encodeURIComponent(tokenAddress)}?embed=1&loadChartSettings=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`}
                  className="w-full"
                  style={{ height: '450px', border: 'none' }}
                  allow="clipboard-write"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 !mb-6">
                <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                  <p className="text-[#636466] text-sm !mb-1">Market Cap</p>
                  <p className="text-white font-semibold">{formatLargeNumber(tokenData.marketCap)}</p>
                </div>
                <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                  <p className="text-[#636466] text-sm !mb-1">24h Volume</p>
                  <p className="text-white font-semibold">{formatLargeNumber(tokenData.volume24h)}</p>
                </div>
                <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                  <p className="text-[#636466] text-sm !mb-1">Liquidity</p>
                  <p className="text-white font-semibold">{formatLargeNumber(tokenData.liquidity)}</p>
                </div>
                <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                  <p className="text-[#636466] text-sm !mb-1">FDV</p>
                  <p className="text-white font-semibold">{formatLargeNumber(tokenData.fdv)}</p>
                </div>
                <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                  <p className="text-[#636466] text-sm !mb-1">Price</p>
                  <p className="text-white font-semibold">{formatPrice(tokenData.price)}</p>
                </div>
                <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                  <p className="text-[#636466] text-sm !mb-1">24h Change</p>
                  <p className={`font-semibold ${tokenData.priceChange24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {tokenData.priceChange24h >= 0 ? '+' : ''}{tokenData.priceChange24h.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 !mb-6">
                <button
                  onClick={() => onBuy(tokenAddress)}
                  className="flex-1 bg-[#40E0D0] text-[#090A11] !py-4 rounded-xl font-bold text-lg hover:bg-[#40E0D0]/90 transition-colors"
                >
                  Buy {tokenData.symbol}
                </button>
                <button
                  onClick={() => window.open(`https://dexscreener.com/solana/${encodeURIComponent(tokenAddress)}`, '_blank', 'noopener,noreferrer')}
                  className="!px-6 !py-4 bg-[#2B2D30] text-white rounded-xl font-semibold hover:bg-[#363739] transition-colors flex items-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  DexScreener
                </button>
              </div>
            </>
          )}

          {/* Contract Address */}
          <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
            <p className="text-[#636466] text-sm !mb-2">Contract Address</p>
            <div className="flex items-center justify-between gap-4">
              <code className="text-white text-sm font-mono break-all">{tokenAddress}</code>
              <button
                onClick={() => copyToClipboard(tokenAddress)}
                className="flex-shrink-0 !p-2 hover:bg-[#2B2D30] rounded-lg transition-colors"
              >
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#40E0D0]">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
