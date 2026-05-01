'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '@/services/api';
import { balanceSyncService } from '@/services/balanceSync';
import { WalletData } from '@/types/home';

interface UseWalletReturn {
  wallet: WalletData | null;
  isLoading: boolean;
  error: string | null;
  mainnetBalance: number;
  isBalanceSyncing: boolean;
  loadWalletData: () => Promise<void>;
  handleSendSuccess: (newBalance: number) => void;
  handleBalanceSync: (
    showSuccess: (msg: string, pos?: 'top-right' | 'bottom-left') => void,
    showError: (msg: string, pos?: 'top-right' | 'bottom-left') => void,
    loadTransactionHistory: () => void,
    t: Record<string, unknown>
  ) => Promise<void>;
  handleRefresh: () => void;
}

export const useWallet = (): UseWalletReturn => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainnetBalance, setMainnetBalance] = useState<number>(0);
  const [isBalanceSyncing, setIsBalanceSyncing] = useState(false);

  const loadWalletData = useCallback(async () => {
    try {
      const token = localStorage.getItem('swarp_fd_access_token');
      console.log('🔍 Debug - Loading wallet data:');
      console.log('- Token present:', token ? 'YES' : 'NO');

      if (!token) {
        console.error('❌ No authentication token found');
        setError('Authentication token not found');
        return;
      }

      // Get wallet data from localStorage first (faster)
      const storedWallet = localStorage.getItem('swarp_fd_wallet');
      if (storedWallet) {
        console.log('📱 Using cached wallet data while fetching fresh data');
        setWallet(JSON.parse(storedWallet));
      }

      // Then fetch fresh data from API
      console.log('🌐 Making API call to /wallet endpoint');
      const wallets = await apiService.getUserWallets(token);
      console.log('✅ API call successful, received wallets:', wallets.length);
      if (wallets.length > 0) {
        setWallet(wallets[0]);
        localStorage.setItem('swarp_fd_wallet', JSON.stringify(wallets[0]));
        console.log('💾 Wallet data updated and cached');
      }
    } catch (error: unknown) {
      console.error('❌ Error loading wallet data:', error);
      const apiError = error as { message?: string; statusCode?: number; error?: string };
      console.error('🔍 Error breakdown:', {
        message: apiError.message,
        statusCode: apiError.statusCode,
        error: apiError.error,
        fullError: error
      });

      // Check if we have stored wallet data to fall back to
      const storedWallet = localStorage.getItem('swarp_fd_wallet');
      if (storedWallet) {
        try {
          setWallet(JSON.parse(storedWallet));
          setError(null); // Clear error if we have fallback data
          console.log('🔄 Using cached wallet data due to API error');
        } catch {
          console.error('💥 Failed to parse cached wallet data');
          const apiError = error as { message?: string };
          setError(apiError.message || 'Failed to load wallet data');
        }
      } else {
        console.error('📭 No cached wallet data available');
        const apiError = error as { message?: string };
        setError(apiError.message || 'Failed to load wallet data');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMainnetBalance = useCallback(async () => {
    if (!wallet) return;

    try {
      // Since we're using devnet directly, this will just return current wallet balance
      // In future, this could track pending MoonPay transactions
      setMainnetBalance(0); // Set to 0 since we're not using separate mainnet tracking anymore
    } catch (error) {
      console.error('Error loading balance info:', error);
    }
  }, [wallet]);

  const handleSendSuccess = useCallback((newBalance: number) => {
    setWallet(prev => prev ? { ...prev, balance: newBalance } : null);
    // Update localStorage
    if (wallet) {
      const updatedWallet = { ...wallet, balance: newBalance };
      localStorage.setItem('swarp_fd_wallet', JSON.stringify(updatedWallet));
    }
  }, [wallet]);

  const handleBalanceSync = useCallback(async (
    showSuccess: (msg: string, pos?: 'top-right' | 'bottom-left') => void,
    showError: (msg: string, pos?: 'top-right' | 'bottom-left') => void,
    loadTransactionHistory: () => void,
    t: Record<string, unknown>
  ) => {
    if (!wallet) return;

    const moonPay = t.moonPay as Record<string, string> | undefined;

    try {
      setIsBalanceSyncing(true);
      const syncResult = await balanceSyncService.manualSync(wallet.publicKey);

      if (syncResult.success && syncResult.difference && syncResult.difference > 0) {
        // Sync the balance to backend devnet wallet
        const token = localStorage.getItem('swarp_fd_access_token');
        if (token) {
          try {
            const backendSyncResult = await apiService.syncMoonPayBalance(
              wallet.id,
              token,
              syncResult.difference,
              `mainnet_sync_${Date.now()}`
            );

            if (backendSyncResult.success) {
              showSuccess(
                (moonPay?.balanceSynced || 'Balance synced! +{amount} SOL added to your wallet')
                  .replace('{amount}', syncResult.difference.toFixed(6)),
                'top-right'
              );

              // Refresh all wallet data
              loadWalletData();
              loadMainnetBalance();
              loadTransactionHistory();
            } else {
              showError(moonPay?.failedToSyncBalance || 'Failed to sync balance to backend', 'top-right');
            }
          } catch (error) {
            console.error('Backend sync failed:', error);
            showError(moonPay?.failedToSyncBalance || 'Failed to sync balance to backend', 'top-right');
          }
        }
      } else if (syncResult.success && (!syncResult.difference || syncResult.difference === 0)) {
        showSuccess(moonPay?.balanceUpToDate || 'Balance is up to date', 'top-right');
      } else {
        showError(`${moonPay?.failedToSync || 'Sync failed'}: ${syncResult.error || 'Unknown error'}`, 'top-right');
      }
    } catch (error) {
      console.error('Error syncing balance:', error);
      showError(moonPay?.failedToSync || 'Failed to sync balance', 'top-right');
    } finally {
      setIsBalanceSyncing(false);
    }
  }, [wallet, loadWalletData, loadMainnetBalance]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    loadWalletData();
  }, [loadWalletData]);

  // Load wallet data on mount
  useEffect(() => {
    loadWalletData();
    loadMainnetBalance();
  }, [loadWalletData, loadMainnetBalance]);

  return {
    wallet,
    isLoading,
    error,
    mainnetBalance,
    isBalanceSyncing,
    loadWalletData,
    handleSendSuccess,
    handleBalanceSync,
    handleRefresh,
  };
};
