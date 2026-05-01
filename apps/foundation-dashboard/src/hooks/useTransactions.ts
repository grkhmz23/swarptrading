'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '@/services/api';
import { Transaction } from '@/types/home';
import { WalletData } from '@/types/home';

interface FilterDropdownState {
  dateFilter: string;
  currencyFilter: string;
  amountRangeFilter: string;
  showDateDropdown: boolean;
  showCurrencyDropdown: boolean;
  showAmountDropdown: boolean;
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  filterState: FilterDropdownState;
  targetTransactionId: string | null;
  loadTransactionHistory: () => Promise<void>;
  setTargetTransactionId: (id: string | null) => void;
  toggleDropdown: (dropdownType: 'date' | 'swarp_fd_currency' | 'amount') => void;
  setFilter: (filterType: 'dateFilter' | 'currencyFilter' | 'amountRangeFilter', value: string) => void;
  getFilteredTransactions: () => Transaction[];
  formatTransactionDate: (timestamp: string, t: Record<string, unknown>) => string;
}

export const useTransactions = (wallet: WalletData | null): UseTransactionsReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [targetTransactionId, setTargetTransactionId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterDropdownState>({
    dateFilter: 'all',
    currencyFilter: 'all',
    amountRangeFilter: 'all',
    showDateDropdown: false,
    showCurrencyDropdown: false,
    showAmountDropdown: false,
  });

  const loadTransactionHistory = useCallback(async () => {
    if (!wallet) return;

    try {
      setTransactionsLoading(true);
      setTransactionsError(null);
      const token = localStorage.getItem('swarp_fd_access_token');

      if (!token) {
        setTransactionsError('Authentication token not found');
        return;
      }

      // Load Solana transactions from backend
      const data = await apiService.getTransactionHistory(wallet.id, token);
      const solanaTransactions = data.transactions || [];

      // Load MoonPay transactions from localStorage
      const moonPayTransactions = JSON.parse(localStorage.getItem('swarp_fd_moonpay_txs') || '[]');

      // Convert MoonPay transactions to match the existing format
      const formattedMoonPayTransactions = moonPayTransactions.map((tx: {
        id: string;
        moonPayTransactionId?: string;
        type: string;
        amount: number;
        timestamp: string;
        currency: string;
        fee?: number;
        fromAddress?: string;
        toAddress?: string;
        status: string;
        fiatAmount?: number;
        fiatCurrency?: string;
        description?: string;
      }) => ({
        id: tx.id,
        signature: tx.moonPayTransactionId || 'MoonPay',
        type: tx.type === 'MOONPAY_PURCHASE' ? 'RECEIVE' : 'SEND',
        amount: tx.amount,
        fromAddress: tx.type === 'MOONPAY_PURCHASE' ? 'MoonPay' : wallet.publicKey,
        toAddress: tx.type === 'MOONPAY_PURCHASE' ? wallet.publicKey : 'MoonPay',
        fee: 0, // MoonPay fees are included in the purchase price
        status: 'CONFIRMED',
        timestamp: tx.timestamp,
        isMoonPay: true,
        fiatAmount: tx.fiatAmount,
        fiatCurrency: tx.fiatCurrency,
        description: tx.description
      }));

      // Combine and sort by timestamp (newest first)
      const allTransactions = [...formattedMoonPayTransactions, ...solanaTransactions]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setTransactions(allTransactions);
    } catch (error: unknown) {
      console.error('Error loading transaction history:', error);
      const apiError = error as { message?: string };
      setTransactionsError(apiError.message || 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [wallet]);

  const toggleDropdown = useCallback((dropdownType: 'date' | 'swarp_fd_currency' | 'amount') => {
    setFilterState(prev => ({
      ...prev,
      showDateDropdown: dropdownType === 'date' ? !prev.showDateDropdown : false,
      showCurrencyDropdown: dropdownType === 'swarp_fd_currency' ? !prev.showCurrencyDropdown : false,
      showAmountDropdown: dropdownType === 'amount' ? !prev.showAmountDropdown : false,
    }));
  }, []);

  const setFilter = useCallback((filterType: 'dateFilter' | 'currencyFilter' | 'amountRangeFilter', value: string) => {
    setFilterState(prev => ({
      ...prev,
      [filterType]: value,
      showDateDropdown: false,
      showCurrencyDropdown: false,
      showAmountDropdown: false,
    }));
  }, []);

  const getFilteredTransactions = useCallback(() => {
    return transactions.filter(transaction => {
      // Date filter
      const now = new Date();
      const transactionDate = new Date(transaction.timestamp);
      let passesDateFilter = true;

      switch (filterState.dateFilter) {
        case 'today':
          passesDateFilter = transactionDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          passesDateFilter = transactionDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          passesDateFilter = transactionDate >= monthAgo;
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          passesDateFilter = transactionDate >= yearAgo;
          break;
        default:
          passesDateFilter = true;
      }

      // Currency filter
      let passesCurrencyFilter = true;
      switch (filterState.currencyFilter) {
        case 'sol':
          passesCurrencyFilter = transaction.signature?.includes('SOL') ||
            !transaction.isMoonPay ||
            transaction.fiatCurrency === undefined;
          break;
        case 'usd':
          passesCurrencyFilter = !!(transaction.isMoonPay && transaction.fiatCurrency === 'USD');
          break;
        case 'eur':
          passesCurrencyFilter = !!(transaction.isMoonPay && transaction.fiatCurrency === 'EUR');
          break;
        default:
          passesCurrencyFilter = true;
      }

      // Amount range filter
      let passesAmountFilter = true;
      const amount = Math.abs(transaction.amount);
      switch (filterState.amountRangeFilter) {
        case 'small':
          passesAmountFilter = amount < 1;
          break;
        case 'medium':
          passesAmountFilter = amount >= 1 && amount < 10;
          break;
        case 'large':
          passesAmountFilter = amount >= 10;
          break;
        default:
          passesAmountFilter = true;
      }

      return passesDateFilter && passesCurrencyFilter && passesAmountFilter;
    });
  }, [transactions, filterState]);

  const formatTransactionDate = useCallback((timestamp: string, t: Record<string, unknown>) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const common = t.common as Record<string, string> | undefined;

    if (diffDays === 1) {
      return common?.today || 'Today';
    } else if (diffDays === 2) {
      return common?.yesterday || 'Yesterday';
    } else if (diffDays < 7) {
      return (common?.daysAgo || '{days} days ago').replace('{days}', String(diffDays - 1));
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  // Load transactions when wallet changes
  useEffect(() => {
    if (wallet) {
      loadTransactionHistory();
    }
  }, [wallet, loadTransactionHistory]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setFilterState(prev => ({
          ...prev,
          showDateDropdown: false,
          showCurrencyDropdown: false,
          showAmountDropdown: false,
        }));
      }
    };

    if (filterState.showDateDropdown || filterState.showCurrencyDropdown || filterState.showAmountDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterState.showDateDropdown, filterState.showCurrencyDropdown, filterState.showAmountDropdown]);

  return {
    transactions,
    transactionsLoading,
    transactionsError,
    filterState,
    targetTransactionId,
    loadTransactionHistory,
    setTargetTransactionId,
    toggleDropdown,
    setFilter,
    getFilteredTransactions,
    formatTransactionDate,
  };
};
