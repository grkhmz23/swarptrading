'use client';

import React from 'react';
import Image from 'next/image';
import { PriceChart } from './PriceChart';
import ProgressSection from './ProgressSection';
import { WalletData, MarketData, Transaction } from '@/types/home';
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

interface HomeSectionProps {
  t: TranslationKeys;
  wallet: WalletData | null;
  user: UserState;
  userProfile: UserProfile | null;
  marketData: MarketData | null;
  chartData: { timestamp: number; price: number }[];
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  priceLoading: boolean;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  mainnetBalance: number;
  isBalanceSyncing: boolean;
  portfolioValue?: number;
  moonPayLoading: boolean;
  verifyLoading?: boolean;
  kycStatus?: 'not_started' | 'pending' | 'approved' | 'declined' | 'resubmission_requested';
  currency: 'USD' | 'EUR' | 'GBP';
  conversionRates: { USD: number; EUR: number; GBP: number };
  // Handlers
  formatPublicKey: (key: string | null | undefined) => string;
  formatTransactionDate: (timestamp: string) => string;
  getTransactionIcon: (transaction: Transaction) => React.ReactNode;
  handleCopyAddress: () => void;
  handleOpenUsernameModal: () => void;
  handleCloseUsernameCard: () => void;
  handleBalanceSync: () => void;
  handleTopUpClick: () => void;
  handleMoonPaySell: () => void;
  handleVerifyIdentity: () => void;
  loadTransactionHistory: () => void;
  setShowSendModal: (show: boolean) => void;
  setShowReceiveModal: (show: boolean) => void;
  setShowSwapModal: (show: boolean) => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  t,
  wallet,
  user,
  userProfile,
  marketData,
  chartData,
  selectedPeriod,
  setSelectedPeriod,
  priceLoading,
  transactions,
  transactionsLoading,
  transactionsError,
  mainnetBalance,
  isBalanceSyncing,
  portfolioValue,
  moonPayLoading,
  verifyLoading,
  kycStatus,
  currency,
  conversionRates,
  formatPublicKey,
  formatTransactionDate,
  getTransactionIcon,
  handleCopyAddress,
  handleOpenUsernameModal,
  handleCloseUsernameCard,
  handleBalanceSync,
  handleTopUpClick,
  handleMoonPaySell,
  handleVerifyIdentity,
  loadTransactionHistory,
  setShowSendModal,
  setShowReceiveModal,
  setShowSwapModal,
}) => {
  const walletT = t.wallet as Record<string, unknown> | undefined;
  const commonT = t.common as Record<string, string> | undefined;
  const moonPayT = t.moonPay as Record<string, string> | undefined;
  const chartT = walletT?.chart as Record<string, string> | undefined;
  const transactionT = walletT?.transaction as Record<string, string> | undefined;

  const currencySymbol: Record<'USD' | 'EUR' | 'GBP', string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const convertedPrice = marketData?.price
    ? marketData.price * conversionRates[currency]
    : 0;

  const convertedChange = marketData?.change
    ? marketData.change * conversionRates[currency]
    : 0;

  return (
    <>
      {/* Home Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left Column - Main Content */}
        <div className="flex-1 !p-4 lg:!p-0 border-b border-[#2B2D30]">
          {/* Progress Section */}
          <ProgressSection
            handleVerifyIdentity={handleVerifyIdentity}
            verifyLoading={verifyLoading}
            kycStatus={kycStatus}
            mainnetBalance={mainnetBalance}
            hasSwapped={transactions.length > 0}
          />
        </div>

        {/* Right Column - Wallet Info */}
        <div className="w-full lg:w-[400px] !p-4 lg:!p-7 !space-y-4 lg:!space-y-6 border-b lg:border-l border-[#2B2D30]">
          {/* My Wallet Section */}
          <div>
            <div className="flex items-center !gap-3 !mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#40E0D0]">
                {user.profilePictureUrl ? (
                  <Image
                    src={user.profilePictureUrl}
                    alt="Profile"
                    width={40}
                    height={40}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : user.username ? (
                  <span className="text-[#090A11] font-semibold">
                    {user.username[0].toUpperCase()}
                  </span>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#090A11]/20 animate-pulse"></div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-white text-base font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                  {(walletT?.myWallet as string) || "My Wallet"}
                </h3>
                <div className="flex items-center !gap-2">
                  <p className="text-[#636466] text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                    {wallet ? formatPublicKey(wallet.publicKey) : (commonT?.loading || 'Loading...')}
                  </p>
                  <button
                    onClick={handleCopyAddress}
                    className="!p-1 hover:bg-[#2B2D30] rounded transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="#636466" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Username Card - Show only if no username set and not dismissed */}
            {userProfile && !userProfile.username && userProfile.username !== 'dismissed' && (
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30] !mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#143536] rounded-full flex items-center justify-center">
                    <Image
                      src="figma-assets/username.svg"
                      alt="Username icon"
                      width={12}
                      height={12}
                      className="object-contain w-full h-full"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#B3B5B6] text-sm">
                      {(walletT?.createUsernameDesc as string) || "Create your @username: A unique identity for your wallet."}
                    </p>
                    <button
                      onClick={handleOpenUsernameModal}
                      className="text-[#40E0D0] text-sm hover:text-white transition-colors mt-1 cursor-pointer"
                    >
                      {(walletT?.createUsername as string) || "Create Username"}
                    </button>
                  </div>
                  <button
                    onClick={handleCloseUsernameCard}
                    className="w-6 h-6 cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <Image
                      src="figma-assets/cross.svg"
                      alt="Close"
                      width={12}
                      height={12}
                      className="object-contain w-full h-full"
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Username Display - Show if username is set */}
            {userProfile?.username && userProfile.username !== 'dismissed' && (
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30] !mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#40E0D0] to-[#40E0D0]/80 rounded-full flex items-center justify-center">
                    <span className="text-[#090A11] font-bold text-lg">
                      {userProfile.username?.[0]?.toUpperCase() || '@'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                      @{userProfile.username}
                    </h3>
                    <p className="text-[#B3B5B6] text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                      {(walletT?.uniqueIdentity as string) || "Your unique wallet identity"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Display */}
            <div className="text-start !mb-6">
              <div className="flex items-center gap-1">
                <p className="text-[#636466] text-sm !mb-2">
                  {(walletT?.estimatedBalance as string) || "Estimated balance"}
                </p>
                <div className="w-4 h-4 !mb-1.5">
                  <Image
                    src="figma-assets/info.svg"
                    alt="Info"
                    width={12}
                    height={12}
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>
              <h2 className="text-white text-3xl lg:text-4xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                {wallet ? `$${(portfolioValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
              </h2>
              <p className="text-[#636466] text-sm !mt-1">
                {wallet ? `${wallet.balance.toFixed(6)} SOL` : '0.000000 SOL'}
              </p>

              {/* Mainnet Balance Info */}
              {mainnetBalance > 0 && (
                <div className="!mt-3 !p-3 bg-[#40E0D0]/10 border border-[#40E0D0]/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#40E0D0] text-sm font-medium">
                        {moonPayT?.mainnetBalance || 'MoonPay Mainnet Balance'}
                      </p>
                      <p className="text-white text-lg font-semibold">{mainnetBalance.toFixed(6)} SOL</p>
                    </div>
                    <button
                      onClick={handleBalanceSync}
                      disabled={isBalanceSyncing}
                      className="bg-[#40E0D0] text-[#090A11] !px-3 !py-1.5 rounded-full text-sm font-semibold hover:bg-[#40E0D0]/90 transition-colors disabled:opacity-50"
                    >
                      {isBalanceSyncing ? (
                        <div className="flex items-center gap-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#090A11]"></div>
                          <span>{moonPayT?.syncing || 'Syncing...'}</span>
                        </div>
                      ) : (
                        moonPayT?.syncToDevnet || 'Sync to Devnet'
                      )}
                    </button>
                  </div>
                  <p className="text-[#636466] text-xs !mt-1">
                    {moonPayT?.purchasedVia || 'SOL purchased via MoonPay (on mainnet)'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col justify-center !gap-2 !mb-6 !pt-8">
              {[
                { icon: 'send', label: (walletT?.send as string) || 'Send', action: () => setShowSendModal(true) },
                { icon: 'receive', label: (walletT?.receive as string) || 'Receive', action: () => setShowReceiveModal(true) },
                { icon: 'swap', label: (walletT?.swap as string) || 'Swap', action: () => setShowSwapModal(true) },
                { icon: 'topup', label: (walletT?.topUp as string) || 'Top up', action: handleTopUpClick },
                { icon: 'withdraw', label: (walletT?.withdraw as string) || 'Withdraw', action: handleMoonPaySell }
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex items-center !gap-2 !p-2 hover:bg-[#131519] rounded-lg transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 bg-[#131519] rounded-full flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center">
                      {action.icon === 'send' && (
                        <Image src="figma-assets/send.svg" alt="Send" width={12} height={12} className="object-contain w-full h-full" />
                      )}
                      {action.icon === 'receive' && (
                        <Image src="figma-assets/receive.svg" alt="Receive" width={12} height={12} className="object-contain w-full h-full" />
                      )}
                      {action.icon === 'swap' && (
                        <Image src="figma-assets/swap-bg.svg" alt="Swap" width={12} height={12} className="object-contain w-full h-full" />
                      )}
                      {action.icon === 'topup' && (
                        <Image src="figma-assets/top-up.svg" alt="Top up" width={12} height={12} className="object-contain w-full h-full" />
                      )}
                      {action.icon === 'withdraw' && (
                        <Image src="figma-assets/withdraw.svg" alt="Withdraw" width={12} height={12} className="object-contain w-full h-full" />
                      )}
                    </div>
                  </div>
                  <span className="text-[#B3B5B6] text-xs">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Wallet Performance and Transactions (Full Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 !gap-4 lg:!gap-6">
        {/* Wallet Performance Chart */}
        <div className="!p-5 lg:!p-6 border-b lg:border-b-0 lg:border-r border-[#2B2D30]">
          <h3 className="text-white text-lg lg:text-xl font-semibold !mb-4 lg:!mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            {(walletT?.walletPerformance as string) || "Wallet performance"}
          </h3>

          <div className="flex items-start justify-between !mb-6">
            <div>
              <p className="text-[#636466] text-sm !mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                {(walletT?.solanaValue as string) || 'Solana (SOL) Value'}
              </p>

              <div className="flex items-baseline gap-3">
                {priceLoading ? (
                  <div className="animate-pulse bg-[#2B2D30] h-8 w-24 rounded"></div>
                ) : (
                  <h4 className="text-white text-3xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                    {currencySymbol[currency]}
                    {convertedPrice?.toFixed(2) ?? "240.75"}
                  </h4>
                )}

                {marketData && (
                  <p className={`text-sm font-medium ${convertedChange >= 0 ? "text-[#40E0D0]" : "text-red-500"}`}>
                    {convertedChange >= 0 ? "+" : "-"}
                    {currencySymbol[currency]}
                    {Math.abs(convertedChange).toFixed(2)} ({marketData.changePercent?.toFixed(1) ?? "0"}%)
                  </p>
                )}
              </div>
            </div>

            <div className="relative">
              <button className="bg-[#2B2D30] rounded-full !px-3 !py-2 flex items-center !gap-2 hover:bg-[#363739] transition-colors">
                <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                <span className="text-white text-xs font-medium">SOL</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#636466]">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Real-time Chart */}
          <div className="h-48 !mb-6 w-full !p-4 bg-gradient-to-b from-[#1A1B23]/30 to-transparent rounded-lg">
            <PriceChart
              data={chartData}
              width="100%"
              height={180}
              color={marketData?.changePercent && marketData.changePercent >= 0 ? '#40E0D0' : '#FF6B6B'}
              showGradient={true}
            />
          </div>

          {/* Time Period Buttons */}
          <div className="w-full flex justify-between items-center">
            {['1H', '1D', '1W', '1M', '1Y', 'ALL'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`text-sm !px-2 !py-1 transition-colors flex-1 text-center ${
                  selectedPeriod === period ? 'text-[#40E0D0] font-semibold' : 'text-[#636466] hover:text-white'
                }`}
              >
                {chartT?.[period] || period}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Section */}
        <div className="rounded-xl !p-5 lg:!p-6">
          <div className="flex items-center justify-between !mb-4 lg:!mb-6">
            <h3 className="text-white text-lg lg:text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              {(walletT?.transactions as string) || "Transactions"}
            </h3>
            {transactions.length > 0 && (
              <button
                onClick={loadTransactionHistory}
                className="text-[#40E0D0] hover:text-white transition-colors p-2 cursor-pointer"
                title={commonT?.refreshTransactions || "Refresh transactions"}
              >
                <Image
                  src="/refresh.svg"
                  alt={commonT?.refreshTransactions || "Refresh"}
                  width={20}
                  height={20}
                  className="w-9 h-9"
                />
              </button>
            )}
          </div>

          {transactionsLoading ? (
            <div className="flex justify-center items-center !py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40E0D0]"></div>
            </div>
          ) : transactionsError ? (
            <div className="flex justify-center flex-col items-center text-center !py-8">
              <div className="w-14 h-14 bg-[#2B2D30] rounded-full flex items-center justify-center mx-auto !mb-4">
                <span className="text-red-500 text-xl">⚠️</span>
              </div>
              <h4 className="text-red-500 text-base font-semibold !mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Error loading transactions
              </h4>
              <p className="text-[#636466] text-sm !mb-4">{transactionsError}</p>
              <button
                onClick={loadTransactionHistory}
                className="bg-[#40E0D0] text-[#090A11] !px-4 !py-2 rounded-full text-sm font-bold"
              >
                Try Again
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex justify-center flex-col items-center text-center !py-8">
              <div className="w-14 h-14 bg-[#2B2D30] rounded-full flex items-center justify-center mx-auto !mb-4">
                <Image
                  src="figma-assets/house.svg"
                  alt="No transactions"
                  width={48}
                  height={64}
                  className="object-contain w-full h-full"
                />
              </div>
              <h4 className="text-[#B3B5B6] text-base font-semibold !mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                No transactions yet
              </h4>
              <p className="text-[#636466] text-sm !mb-4">Transactions will be shown here</p>
              <button
                onClick={handleTopUpClick}
                disabled={moonPayLoading}
                className="bg-white cursor-pointer text-[#090A11] !px-4 !py-2 flex justify-between gap-2 items-center rounded-full text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {moonPayLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#090A11]"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <path d="M3.01038 8.5H14.3437" stroke="#090A11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8.67712 2.8335V14.1668" stroke="#090A11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {moonPayLoading ? (commonT?.openingMoonPay || 'Opening MoonPay...') : (commonT?.topUpYourWallet || 'Top up your wallet')}
              </button>
            </div>
          ) : (
            <div className="!space-y-3 max-h-[320px] overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  id={`transaction-${transaction.id}`}
                  className="flex items-center justify-between !p-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center !gap-3">
                    <div className="w-10 h-10 bg-[#2B2D30] rounded-full flex items-center justify-center">
                      <span className="text-lg">{getTransactionIcon(transaction)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center !gap-2">
                        <h4 className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                          {transaction.isMoonPay
                            ? (transaction.type === 'RECEIVE' ? (transactionT?.boughtSol || 'Bought SOL') : (transactionT?.soldSol || 'Sold SOL'))
                            : (transaction.type === 'SEND' ? (transactionT?.sentSol || 'Sent SOL') : (transactionT?.receivedSol || 'Received SOL'))
                          }
                        </h4>
                        {transaction.isMoonPay && (
                          <span className="bg-[#40E0D0] text-[#090A11] text-xs px-2 py-0.5 rounded-full font-medium">MoonPay</span>
                        )}
                        {transaction.status === 'PENDING' && (
                          <span className="text-yellow-500 text-xs">{transactionT?.pending || "Pending"}</span>
                        )}
                        {transaction.status === 'FAILED' && (
                          <span className="text-red-500 text-xs">{transactionT?.failed || "Failed"}</span>
                        )}
                      </div>
                      <p className="text-[#636466] text-xs">
                        {transaction.type === 'SEND'
                          ? `${transactionT?.to || "To"} ${formatPublicKey(transaction.toAddress)}`
                          : `${transactionT?.from || "From"} ${formatPublicKey(transaction.fromAddress)}`
                        }
                      </p>
                      <p className="text-[#636466] text-xs">
                        {formatTransactionDate(transaction.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${transaction.type === 'RECEIVE' ? 'text-[#40E0D0]' : 'text-white'}`}>
                      {transaction.type === 'RECEIVE' ? '+' : '-'}{Number(transaction.amount).toFixed(6)} SOL
                    </p>
                    <p className="text-[#636466] text-xs">
                      {transactionT?.fee || "Fee"}: {Number(transaction.fee).toFixed(6)} SOL
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
