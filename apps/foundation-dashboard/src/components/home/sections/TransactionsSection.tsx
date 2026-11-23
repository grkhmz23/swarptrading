'use client';

import React from 'react';
import Image from 'next/image';
import { WalletSidebar } from './WalletSidebar';
import { WalletData, Transaction, transactionSymbol } from '@/types/home';
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

interface FilterState {
  dateFilter: string;
  currencyFilter: string;
  amountRangeFilter: string;
  showDateDropdown: boolean;
  showCurrencyDropdown: boolean;
  showAmountDropdown: boolean;
}

interface TransactionsSectionProps {
  t: TranslationKeys;
  wallet: WalletData | null;
  user: UserState;
  userProfile: UserProfile | null;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  filterState: FilterState;
  portfolioValue?: number;
  // Handlers
  formatPublicKey: (key: string | null | undefined) => string;
  formatTransactionDate: (timestamp: string) => string;
  getTransactionIcon: (transaction: Transaction) => React.ReactNode;
  getFilteredTransactions: () => Transaction[];
  toggleDropdown: (type: 'date' | 'swarp_fd_currency' | 'amount') => void;
  setFilter: (filterType: 'dateFilter' | 'currencyFilter' | 'amountRangeFilter', value: string) => void;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  loadTransactionHistory: () => void;
  handleCopyAddress: () => void;
  handleOpenUsernameModal: () => void;
  handleCloseUsernameCard: () => void;
  handleTopUpClick: () => void;
  handleWithdraw: () => void;
  setShowSendModal: (show: boolean) => void;
  setShowReceiveModal: (show: boolean) => void;
  setShowSwapModal: (show: boolean) => void;
}

export const TransactionsSection: React.FC<TransactionsSectionProps> = ({
  t,
  wallet,
  user,
  userProfile,
  transactions,
  transactionsLoading,
  transactionsError,
  filterState,
  portfolioValue,
  formatPublicKey,
  formatTransactionDate,
  getTransactionIcon,
  getFilteredTransactions,
  toggleDropdown,
  setFilter,
  setFilterState,
  loadTransactionHistory,
  handleCopyAddress,
  handleOpenUsernameModal,
  handleCloseUsernameCard,
  handleTopUpClick,
  handleWithdraw,
  setShowSendModal,
  setShowReceiveModal,
  setShowSwapModal,
}) => {
  const transactionsPageT = t.transactionsPage as Record<string, string> | undefined;
  const filtersT = (t.transactionsPage as Record<string, unknown> | undefined)?.filters as Record<string, string> | undefined;
  const walletT = t.wallet as Record<string, unknown> | undefined;
  const transactionT = walletT?.transaction as Record<string, string> | undefined;

  const clearAllFilters = () => {
    setFilterState({
      dateFilter: 'all',
      currencyFilter: 'all',
      amountRangeFilter: 'all',
      showDateDropdown: false,
      showCurrencyDropdown: false,
      showAmountDropdown: false,
    });
  };

  const hasActiveFilters = filterState.dateFilter !== 'all' || filterState.currencyFilter !== 'all' || filterState.amountRangeFilter !== 'all';
  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Left Column - Transactions Content */}
      <div className="flex-1 flex flex-col !p-4 lg:!p-7 border-b border-[#2B2D30] min-h-0">
        {/* Filter Section */}
        <div className="!mb-7">
          <div className="flex items-center gap-3 !mb-6 flex-wrap">
            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('date')}
                className={`flex items-center gap-2 !px-4 !py-2 border rounded-full text-sm cursor-pointer transition-colors ${
                  filterState.dateFilter !== 'all'
                    ? 'bg-[#40E0D0] text-[#090A11] border-[#40E0D0]'
                    : 'bg-[#131519] border-[#2B2D30] text-white hover:border-[#40E0D0]'
                }`}
              >
                <span>
                  {filterState.dateFilter === 'all' ? (filtersT?.date || 'Date') :
                   filterState.dateFilter === 'today' ? (filtersT?.today || 'Today') :
                   filterState.dateFilter === 'week' ? (filtersT?.thisWeek || 'This Week') :
                   filterState.dateFilter === 'month' ? (filtersT?.thisMonth || 'This Month') :
                   filterState.dateFilter === 'year' ? (filtersT?.thisYear || 'This Year') : (filtersT?.date || 'Date')}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`transform transition-transform ${filterState.showDateDropdown ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {filterState.showDateDropdown && (
                <div className="absolute top-full left-0 !mt-2 bg-[#131519] border border-[#2B2D30] rounded-xl !py-2 min-w-[150px] z-50 shadow-lg">
                  {[
                    { value: 'all', label: filtersT?.allTime || 'All Time' },
                    { value: 'today', label: filtersT?.today || 'Today' },
                    { value: 'week', label: filtersT?.thisWeek || 'This Week' },
                    { value: 'month', label: filtersT?.thisMonth || 'This Month' },
                    { value: 'year', label: filtersT?.thisYear || 'This Year' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilter('dateFilter', option.value)}
                      className={`w-full text-left !px-4 !py-2 text-sm transition-colors hover:bg-[#2B2D30] ${
                        filterState.dateFilter === option.value ? 'text-[#40E0D0]' : 'text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('swarp_fd_currency')}
                className={`flex items-center gap-2 !px-4 !py-2 border rounded-full text-sm cursor-pointer transition-colors ${
                  filterState.currencyFilter !== 'all'
                    ? 'bg-[#40E0D0] text-[#090A11] border-[#40E0D0]'
                    : 'bg-[#131519] border-[#2B2D30] text-white hover:border-[#40E0D0]'
                }`}
              >
                <span>
                  {filterState.currencyFilter === 'all' ? (filtersT?.currency || 'Currency') :
                   filterState.currencyFilter === 'sol' ? 'SOL' :
                   filterState.currencyFilter === 'tokens' ? 'Tokens' : (filtersT?.currency || 'Currency')}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`transform transition-transform ${filterState.showCurrencyDropdown ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {filterState.showCurrencyDropdown && (
                <div className="absolute top-full left-0 !mt-2 bg-[#131519] border border-[#2B2D30] rounded-xl !py-2 min-w-[120px] z-50 shadow-lg">
                  {[
                    { value: 'all', label: filtersT?.all || 'All' },
                    { value: 'sol', label: 'SOL' },
                    { value: 'tokens', label: 'Tokens' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilter('currencyFilter', option.value)}
                      className={`w-full text-left !px-4 !py-2 text-sm transition-colors hover:bg-[#2B2D30] ${
                        filterState.currencyFilter === option.value ? 'text-[#40E0D0]' : 'text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Range Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('amount')}
                className={`flex items-center gap-2 !px-4 !py-2 border rounded-full text-sm cursor-pointer transition-colors ${
                  filterState.amountRangeFilter !== 'all'
                    ? 'bg-[#40E0D0] text-[#090A11] border-[#40E0D0]'
                    : 'bg-[#131519] border-[#2B2D30] text-white hover:border-[#40E0D0]'
                }`}
              >
                <span>
                  {filterState.amountRangeFilter === 'all' ? (filtersT?.amountRange || 'Amount range') :
                   filterState.amountRangeFilter === 'small' ? '< 1 SOL' :
                   filterState.amountRangeFilter === 'medium' ? '1-10 SOL' :
                   filterState.amountRangeFilter === 'large' ? '> 10 SOL' : (filtersT?.amountRange || 'Amount range')}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`transform transition-transform ${filterState.showAmountDropdown ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {filterState.showAmountDropdown && (
                <div className="absolute top-full left-0 !mt-2 bg-[#131519] border border-[#2B2D30] rounded-xl !py-2 min-w-[150px] z-50 shadow-lg">
                  {[
                    { value: 'all', label: filtersT?.allAmounts || 'All Amounts' },
                    { value: 'small', label: '< 1 SOL' },
                    { value: 'medium', label: '1-10 SOL' },
                    { value: 'large', label: '> 10 SOL' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilter('amountRangeFilter', option.value)}
                      className={`w-full text-left !px-4 !py-2 text-sm transition-colors hover:bg-[#2B2D30] ${
                        filterState.amountRangeFilter === option.value ? 'text-[#40E0D0]' : 'text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between !mb-6">
            <h2 className="text-white text-xl font-semibold">
              {(transactionsPageT?.activity as string) || "Activity"}
            </h2>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[#40E0D0] text-sm hover:text-white transition-colors cursor-pointer"
                >
                  {filtersT?.clearFilters || "Clear Filters"}
                </button>
              )}
            </div>
          </div>

          {/* Transaction Table Header */}
          <div className="flex items-center text-white text-sm !mb-4 !px-4">
            <div className="flex items-center gap-4 flex-1">
              <span>{(transactionsPageT?.details as string) || "Details"}</span>
            </div>
            <div className="text-center flex-1">
              <span>{(transactionsPageT?.amount as string) || "Amount"}</span>
            </div>
            <div className="text-right flex-1">
              <span>{(transactionsPageT?.date as string) || "Date"}</span>
            </div>
          </div>

          {/* Scrollable Transactions List */}
          <div className="flex-1 overflow-y-auto">
            {transactionsLoading ? (
              <div className="flex justify-center items-center !py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40E0D0]"></div>
              </div>
            ) : transactionsError ? (
              <div className="flex flex-col items-center text-center !py-12">
                <div className="w-16 h-16 bg-[#2B2D30] rounded-full flex items-center justify-center !mb-4">
                  <span className="text-red-500 text-2xl">⚠️</span>
                </div>
                <h3 className="text-red-500 text-lg font-semibold !mb-2">
                  {(transactionsPageT?.errorLoading as string) || "Error loading transactions"}
                </h3>
                <p className="text-[#636466] text-sm !mb-4">{transactionsError}</p>
                <button
                  onClick={loadTransactionHistory}
                  className="bg-[#40E0D0] text-[#090A11] !px-6 !py-3 rounded-full text-sm font-bold hover:bg-[#40E0D0]/90 transition-colors"
                >
                  {(transactionsPageT?.tryAgain as string) || "Try Again"}
                </button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center text-center !py-12">
                <div className="w-16 h-16 bg-[#2B2D30] rounded-full flex items-center justify-center !mb-4">
                  <Image
                    src="figma-assets/house.svg"
                    alt="No transactions"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                {transactions.length === 0 ? (
                  <>
                    <h3 className="text-[#B3B5B6] text-lg font-semibold !mb-2">
                      {(transactionsPageT?.noTransactions as string) || "No transactions yet"}
                    </h3>
                    <p className="text-[#636466] text-sm !mb-6">
                      {(transactionsPageT?.noTransactionsDesc as string) || "Transactions will appear here when you send or receive SOL"}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-[#B3B5B6] text-lg font-semibold !mb-2">
                      {(transactionsPageT?.noMatchingTransactions as string) || "No matching transactions"}
                    </h3>
                    <p className="text-[#636466] text-sm !mb-6">
                      {(transactionsPageT?.noMatchingTransactionsDesc as string) || "Try adjusting your filters to see more results"}
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="bg-[#40E0D0] text-[#090A11] !px-4 !py-2 rounded-full text-sm font-semibold hover:bg-[#40E0D0]/90 transition-colors"
                    >
                      {filtersT?.clearAllFilters || "Clear All Filters"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="!space-y-0">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    id={`transaction-${transaction.id}`}
                    className="flex items-center justify-between !p-4 hover:bg-[#131519] transition-colors"
                  >
                    {/* Left: Transaction Details */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-[#2B2D30] rounded-full flex items-center justify-center">
                        {getTransactionIcon(transaction)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white text-sm font-medium">
                            {transaction.type === 'SEND' ? (transactionT?.sent || 'Sent') : (transactionT?.received || 'Received')}
                          </h4>
                          {transaction.status === 'PENDING' && (
                            <span className="text-yellow-500 text-xs">{transactionT?.pending || 'Pending'}</span>
                          )}
                          {transaction.status === 'FAILED' && (
                            <span className="text-red-500 text-xs">{transactionT?.failed || 'Failed'}</span>
                          )}
                        </div>
                        <p className="text-[#636466] text-sm">
                          {transaction.isMoonPay
                            ? transaction.description
                            : (transaction.type === 'SEND'
                              ? `${transactionT?.to || "To"} ${formatPublicKey(transaction.toAddress)}`
                              : `${transactionT?.from || "From"} ${formatPublicKey(transaction.fromAddress)}`
                            )
                          }
                        </p>
                      </div>
                    </div>

                    {/* Center: Amount */}
                    <div className="text-center flex-1">
                      <p className={`text-sm font-semibold ${transaction.type === 'RECEIVE' ? 'text-[#40E0D0]' : 'text-white'}`}>
                        {transaction.type === 'RECEIVE' ? '+' : '-'}{Number(transaction.amount).toFixed(6)} {transactionSymbol(transaction)}
                      </p>
                      <p className="text-[#636466] text-xs">
                        {transactionT?.fee || "Fee"}: {Number(transaction.fee).toFixed(6)} SOL
                      </p>
                    </div>

                    {/* Right: Date */}
                    <div className="text-right flex-1">
                      <p className="text-[#636466] text-sm">
                        {formatTransactionDate(transaction.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
      />
    </div>
  );
};
