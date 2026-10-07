'use client';

import React from 'react';
import Image from 'next/image';
import { WalletSidebar } from './WalletSidebar';
import { WalletData, JupiterToken, WalletTokenBalance } from '@/types/home';
import { WRAPPED_SOL_MINT } from '@/lib/solana';
import { floorToDecimals } from '@/lib/amount';
import type { TranslationKeys } from '@/i18n';

interface UserState {
  id?: string;
  username?: string;
  profilePictureUrl?: string | null;
}

interface UserProfile {
  username?: string;
  firstName: string;
  lastName: string;
}

interface TokenPrices {
  [symbol: string]: {
    price: number;
    priceChange24h?: number;
  };
}

interface WalletSectionProps {
  t: TranslationKeys;
  wallet: WalletData | null;
  /** SPL token balances held by the wallet (SOL comes from `wallet.balance`). */
  tokenBalances: WalletTokenBalance[];
  user: UserState;
  userProfile: UserProfile | null;
  jupiterTokens: JupiterToken[];
  jupiterTokensLoading: boolean;
  tokenPrices: TokenPrices;
  tokenPricesLoading: boolean;
  portfolioValue?: number;
  failedImages: Set<string>;
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Handlers
  formatPublicKey: (key: string | null | undefined) => string;
  handleCopyAddress: () => void;
  handleOpenUsernameModal: () => void;
  handleCloseUsernameCard: () => void;
  handleTopUpClick: () => void;
  handleWithdraw: () => void;
  setShowSendModal: (show: boolean) => void;
  setShowReceiveModal: (show: boolean) => void;
  setShowSwapModal: (show: boolean) => void;
}

export const WalletSection: React.FC<WalletSectionProps> = ({
  t,
  wallet,
  tokenBalances,
  user,
  userProfile,
  jupiterTokens,
  jupiterTokensLoading,
  tokenPrices,
  tokenPricesLoading,
  portfolioValue,
  failedImages,
  setFailedImages,
  formatPublicKey,
  handleCopyAddress,
  handleOpenUsernameModal,
  handleCloseUsernameCard,
  handleTopUpClick,
  handleWithdraw,
  setShowSendModal,
  setShowReceiveModal,
  setShowSwapModal,
}) => {
  const walletT = t.wallet as Record<string, string> | undefined;

  const balanceByMint = new Map(tokenBalances.map((b) => [b.mint, b]));
  const holdingOf = (token: JupiterToken): { balance: number; usdValue: number } => {
    if (token.address === WRAPPED_SOL_MINT) return { balance: wallet?.balance ?? 0, usdValue: 0 };
    const held = balanceByMint.get(token.address);
    return { balance: Number(held?.balance ?? 0), usdValue: Number(held?.usdValue ?? 0) };
  };
  // Tokens the wallet holds come first.
  const sortedTokens = [...jupiterTokens].sort((a, b) => Number(holdingOf(b).balance > 0) - Number(holdingOf(a).balance > 0));

  const formatPrice = (p: number | undefined) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.0001) return p.toFixed(4);
    return p.toFixed(8);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left Column - All Tokens */}
      <div className="flex-1 flex flex-col !p-4 lg:!p-7 border-b lg:border-b-0 lg:border-r border-[#2B2D30] overflow-hidden">
        {/* Tokens Header */}
        <h2 className="text-white text-lg font-semibold !mb-4 flex-shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>
          {walletT?.trendingTokens || "Trending Tokens"}
        </h2>

        {/* Tokens Table */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-3 !gap-4 !px-4 !py-3 text-[#636466] text-sm border-b border-[#2B2D30] min-w-[500px] flex-shrink-0">
            <span>{walletT?.name || "Name"}</span>
            <span>{walletT?.balance || "Balance"}</span>
            <span>{walletT?.currentPrice || "Current price"}</span>
          </div>

          {/* Loading Skeleton */}
          {(tokenPricesLoading || jupiterTokensLoading) ? (
            <div className="divide-y divide-[#2B2D30] overflow-y-auto flex-1">
              {[...Array(10)].map((_, index) => (
                <div key={index} className="grid grid-cols-3 !gap-4 !px-4 !py-4 items-center min-w-[500px]">
                  <div className="flex items-center !gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2B2D30] animate-pulse"></div>
                    <div>
                      <div className="h-4 w-20 bg-[#2B2D30] rounded animate-pulse mb-1"></div>
                      <div className="h-3 w-12 bg-[#2B2D30] rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div>
                    <div className="h-4 w-16 bg-[#2B2D30] rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-20 bg-[#2B2D30] rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-[#2B2D30] rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-14 bg-[#2B2D30] rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Token Rows - All tokens from Jupiter API */
            <div className="divide-y divide-[#2B2D30] overflow-y-auto flex-1">
              {sortedTokens.map((token) => {
                // Use tokenPrices from API, fallback to token.usdPrice from Jupiter
                const price = tokenPrices[token.symbol]?.price ?? token.usdPrice;
                const priceChange = tokenPrices[token.symbol]?.priceChange24h ?? 0;
                const isSOL = token.address === WRAPPED_SOL_MINT;
                const held = holdingOf(token);
                const heldValue = held.usdValue > 0 ? held.usdValue : held.balance * (price || 0);
                const isSWARP = token.symbol === 'SWARP' || token.symbol === 'SWRP';
                const rawLogoURI = token.logoURI?.trim().replace(/[\s\x00-\x1F\x7F]/g, '');
                const sanitizedLogoURI = rawLogoURI && (rawLogoURI.startsWith('http://') || rawLogoURI.startsWith('https://'))
                  ? rawLogoURI
                  : undefined;

                return (
                  <div key={token.address} className="grid grid-cols-3 !gap-4 !px-4 !py-4 items-center hover:bg-[#131519] transition-colors min-w-[500px]">
                    <div className="flex items-center !gap-3 min-w-0">
                      <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden ${isSWARP ? 'bg-[#40E0D0]/15' : 'bg-[#2B2D30]'}`}>
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
                          <span className="text-[#636466] text-xs">{token.symbol}</span>
                          {isSWARP && (
                            <span className="bg-[#132123] text-[#40E0D0] text-[10px] !px-1.5 !py-0.5 rounded font-semibold leading-tight">Primary</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-medium">${heldValue.toFixed(2)}</p>
                      <p className="text-[#636466] text-sm">
                        {floorToDecimals(held.balance, Math.min(token.decimals ?? 6, 6))} {token.symbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        ${formatPrice(price)}
                      </p>
                      <p className={`text-sm ${priceChange >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
              {/* Empty State - No tokens */}
              {jupiterTokens.length === 0 && (
                <div className="flex flex-col items-center justify-center !py-12 text-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="!mb-4 opacity-50">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12h6M12 9v6" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[#636466] text-sm">{walletT?.noTokensFound || "No tokens found"}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Wallet Sidebar */}
      <WalletSidebar
        t={t}
        wallet={wallet}
        user={user}
        userProfile={userProfile}
        portfolioValue={portfolioValue}
        formatPublicKey={formatPublicKey}
        handleCopyAddress={handleCopyAddress}
        handleOpenUsernameModal={handleOpenUsernameModal}
        handleCloseUsernameCard={handleCloseUsernameCard}
        handleTopUpClick={handleTopUpClick}
        handleWithdraw={handleWithdraw}
        setShowSendModal={setShowSendModal}
        setShowReceiveModal={setShowReceiveModal}
        setShowSwapModal={setShowSwapModal}
        className="lg:border-l-0"
      />
    </div>
  );
};
