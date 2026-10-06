'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TokenData {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  fdv: number;
  holderCount: number;
  isVerified?: boolean;
}

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState(false);

  useEffect(() => {
    const fetchTokenData = async () => {
      if (!address) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch token data from backend API (which fetches from DexScreener)
        const response = await fetch(`${API_BASE_URL}/tokens/detail/${address}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Token not found');
            return;
          }
          throw new Error('Failed to fetch token data');
        }

        const data = await response.json();

        if (data.token) {
          setTokenData({
            address: data.token.address,
            symbol: data.token.symbol,
            name: data.token.name,
            logoURI: data.token.logoURI,
            price: data.token.price,
            priceChange24h: data.token.priceChange24h,
            volume24h: data.token.volume24h,
            marketCap: data.token.marketCap,
            liquidity: data.token.liquidity,
            fdv: data.token.fdv,
            holderCount: data.token.holderCount || 0,
            isVerified: data.token.isVerified,
          });
        } else {
          setError('Token not found');
        }
      } catch (err) {
        console.error('Error fetching token data:', err);
        setError('Failed to load token data');
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [address]);

  const formatPrice = (p: number) => {
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
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#40E0D0] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#636466]">Loading token data...</p>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-[#090A11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-[#2B2D30] rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-white text-lg font-semibold">{error || 'Token not found'}</p>
          <button
            onClick={() => router.back()}
            className="bg-[#40E0D0] text-[#090A11] px-6 py-2 rounded-full font-semibold hover:bg-[#40E0D0]/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A11] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#090A11]/95 backdrop-blur-sm border-b border-[#2B2D30]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#2B2D30] rounded-lg transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-[#2B2D30] flex items-center justify-center overflow-hidden">
              {tokenData.logoURI && !failedImage ? (
                <Image
                  src={tokenData.logoURI}
                  alt={tokenData.symbol}
                  width={40}
                  height={40}
                  className="object-cover"
                  unoptimized
                  onError={() => setFailedImage(true)}
                />
              ) : (
                <span className="text-white font-bold">{tokenData.symbol.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{tokenData.name}</h1>
                {tokenData.isVerified && (
                  <svg className="w-4 h-4 text-[#40E0D0]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-[#636466] text-sm">{tokenData.symbol}</p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(address)}
            className="flex items-center gap-2 px-3 py-2 bg-[#2B2D30] rounded-lg hover:bg-[#363739] transition-colors text-sm"
          >
            <span className="text-[#636466]">{`${address.slice(0, 4)}...${address.slice(-4)}`}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Price Section */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">{formatPrice(tokenData.price)}</span>
            <span className={`text-lg font-semibold ${tokenData.priceChange24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {tokenData.priceChange24h >= 0 ? '▲' : '▼'} {Math.abs(tokenData.priceChange24h).toFixed(2)}%
            </span>
          </div>
          <p className="text-[#636466] text-sm mt-1">24h Change</p>
        </div>

        {/* Chart Section */}
        <div className="bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden mb-6">
          <iframe
            id="dexscreener-embed"
            title="DexScreener Chart"
            src={`https://dexscreener.com/solana/${address}?embed=1&loadChartSettings=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`}
            className="w-full"
            style={{ height: '500px', border: 'none' }}
            allow="clipboard-write"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-[#131519] border border-[#2B2D30] rounded-xl p-4">
            <p className="text-[#636466] text-sm mb-1">Market Cap</p>
            <p className="text-white font-semibold">{formatLargeNumber(tokenData.marketCap)}</p>
          </div>
          <div className="bg-[#131519] border border-[#2B2D30] rounded-xl p-4">
            <p className="text-[#636466] text-sm mb-1">24h Volume</p>
            <p className="text-white font-semibold">{formatLargeNumber(tokenData.volume24h)}</p>
          </div>
          <div className="bg-[#131519] border border-[#2B2D30] rounded-xl p-4">
            <p className="text-[#636466] text-sm mb-1">Liquidity</p>
            <p className="text-white font-semibold">{formatLargeNumber(tokenData.liquidity)}</p>
          </div>
          <div className="bg-[#131519] border border-[#2B2D30] rounded-xl p-4">
            <p className="text-[#636466] text-sm mb-1">FDV</p>
            <p className="text-white font-semibold">{formatLargeNumber(tokenData.fdv)}</p>
          </div>
          <div className="bg-[#131519] border border-[#2B2D30] rounded-xl p-4">
            <p className="text-[#636466] text-sm mb-1">Price</p>
            <p className="text-white font-semibold">{formatPrice(tokenData.price)}</p>
          </div>
          <div className="bg-[#131519] border border-[#2B2D30] rounded-xl p-4">
            <p className="text-[#636466] text-sm mb-1">24h Change</p>
            <p className={`font-semibold ${tokenData.priceChange24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {tokenData.priceChange24h >= 0 ? '+' : ''}{tokenData.priceChange24h.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/home?section=Trade&swap=${address}`)}
            className="flex-1 bg-[#40E0D0] text-[#090A11] py-4 rounded-xl font-bold text-lg hover:bg-[#40E0D0]/90 transition-colors"
          >
            Buy {tokenData.symbol}
          </button>
          <button
            onClick={() => window.open(`https://dexscreener.com/solana/${address}`, '_blank')}
            className="px-6 py-4 bg-[#2B2D30] text-white rounded-xl font-semibold hover:bg-[#363739] transition-colors flex items-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            DexScreener
          </button>
        </div>

        {/* Contract Address */}
        <div className="mt-6 bg-[#131519] border border-[#2B2D30] rounded-xl p-4">
          <p className="text-[#636466] text-sm mb-2">Contract Address</p>
          <div className="flex items-center justify-between gap-4">
            <code className="text-white text-sm font-mono break-all">{address}</code>
            <button
              onClick={() => copyToClipboard(address)}
              className="flex-shrink-0 p-2 hover:bg-[#2B2D30] rounded-lg transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
