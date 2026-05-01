/**
 * Balance Sync Service
 * Handles synchronization between mainnet MoonPay purchases and devnet wallet balances
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface MainnetWalletInfo {
  address: string;
  privateKey: number[];
  devnetWalletAddress: string;
  lastSyncedBalance: number;
  createdAt: string;
}

interface BalanceSyncResult {
  success: boolean;
  newBalance?: number;
  difference?: number;
  error?: string;
}

class BalanceSyncService {
  private mainnetConnection: Connection;
  private devnetConnection: Connection;
  private syncInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    // Initialize connections - using multiple RPC endpoints for reliability
    this.mainnetConnection = new Connection('https://solana-api.projectserum.com', 'confirmed');
    this.devnetConnection = new Connection('https://api.devnet.solana.com');
  }

  /**
   * Get stored mainnet wallet info for a devnet address
   */
  private getMainnetWalletInfo(devnetAddress: string): MainnetWalletInfo | null {
    const stored = localStorage.getItem(`swarp_fd_mainnet_wallet_${devnetAddress}`);
    // SECURITY: Private keys must never be stored in localStorage
    const privateKey = null; // disabled: localStorage.getItem(`swarp_fd_mainnet_private_key_${devnetAddress}`);
    const lastBalance = localStorage.getItem(`swarp_fd_mainnet_balance_${devnetAddress}`);

    if (!stored || !privateKey) {
      return null;
    }

    return {
      address: stored,
      privateKey: JSON.parse(privateKey),
      devnetWalletAddress: devnetAddress,
      lastSyncedBalance: lastBalance ? parseFloat(lastBalance) : 0,
      createdAt: localStorage.getItem(`swarp_fd_mainnet_created_${devnetAddress}`) || new Date().toISOString()
    };
  }

  /**
   * Store mainnet wallet info
   */
  private storeMainnetWalletInfo(info: MainnetWalletInfo): void {
    localStorage.setItem(`swarp_fd_mainnet_wallet_${info.devnetWalletAddress}`, info.address);
    // SECURITY: Private keys must never be stored in browser storage
    // localStorage.setItem(`swarp_fd_mainnet_private_key_${info.devnetWalletAddress}`, JSON.stringify(info.privateKey)); // DISABLED
    localStorage.setItem(`swarp_fd_mainnet_balance_${info.devnetWalletAddress}`, info.lastSyncedBalance.toString());
    localStorage.setItem(`swarp_fd_mainnet_created_${info.devnetWalletAddress}`, info.createdAt);
  }

  /**
   * Get devnet balance for a wallet - simplified since we're using devnet directly
   */
  async getDevnetBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.devnetConnection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to fetch devnet balance:', error);
      return 0;
    }
  }

  /**
   * Get mock balance for development/testing with MoonPay sandbox
   */
  getMockPendingBalance(walletAddress: string): number {
    const mockBalance = localStorage.getItem(`swarp_fd_moonpay_pending_balance_${walletAddress}`);
    return mockBalance ? parseFloat(mockBalance) : 0;
  }

  /**
   * Simplified sync for devnet wallets - no complex mainnet mapping needed
   */
  async syncBalanceForWallet(walletAddress: string): Promise<BalanceSyncResult> {
    try {
      // Get current devnet balance
      const currentBalance = await this.getDevnetBalance(walletAddress);
      const lastKnownBalance = localStorage.getItem(`swarp_fd_last_balance_${walletAddress}`);
      const previousBalance = lastKnownBalance ? parseFloat(lastKnownBalance) : 0;
      
      const balanceDifference = currentBalance - previousBalance;

      // If there's new balance (from MoonPay or any other source)
      if (balanceDifference > 0.001) { // Minimum threshold to avoid dust
        console.log(`Balance increase detected: +${balanceDifference} SOL`);

        // Update the stored balance
        localStorage.setItem(`swarp_fd_last_balance_${walletAddress}`, currentBalance.toString());

        // Create a record of this sync
        const syncRecord = {
          id: `sync_${Date.now()}`,
          walletAddress,
          amount: balanceDifference,
          timestamp: new Date().toISOString(),
          type: 'BALANCE_INCREASE'
        };

        // Store sync history
        const syncHistory = JSON.parse(localStorage.getItem('swarp_fd_balance_sync_history') || '[]');
        syncHistory.unshift(syncRecord);
        localStorage.setItem('swarp_fd_balance_sync_history', JSON.stringify(syncHistory.slice(0, 100))); // Keep last 100

        // Trigger sync notification
        this.createSyncNotification(balanceDifference);

        return {
          success: true,
          newBalance: currentBalance,
          difference: balanceDifference
        };
      }

      return { success: true, newBalance: currentBalance, difference: 0 };
    } catch (error) {
      console.error('Error syncing balance:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Start monitoring devnet wallets for balance changes (from MoonPay or any source)
   */
  startBalanceMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('Starting balance monitoring for wallet changes...');

    // Check every 30 seconds for balance changes
    this.syncInterval = setInterval(async () => {
      try {
        // Get stored wallet from localStorage (current user's wallet)
        const storedWallet = localStorage.getItem('swarp_fd_wallet');
        if (storedWallet) {
          const wallet = JSON.parse(storedWallet);
          await this.syncBalanceForWallet(wallet.publicKey);
        }
      } catch (error) {
        console.error('Error in balance monitoring:', error);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop monitoring
   */
  stopBalanceMonitoring(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isMonitoring = false;
    console.log('Stopped balance monitoring');
  }

  /**
   * Get sync history
   */
  getSyncHistory(): unknown[] {
    return JSON.parse(localStorage.getItem('swarp_fd_balance_sync_history') || '[]');
  }

  /**
   * Manual sync for a specific wallet
   */
  async manualSync(devnetAddress: string): Promise<BalanceSyncResult> {
    console.log(`Manual sync requested for ${devnetAddress}`);
    return await this.syncBalanceForWallet(devnetAddress);
  }

  /**
   * Development helper: Simulate receiving SOL (like from MoonPay)
   * In reality, MoonPay would send SOL directly to your devnet wallet
   */
  simulateMoonPayPurchase(walletAddress: string, solAmount: number): void {
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    
    if (!isDevelopment) {
      console.warn('simulateMoonPayPurchase only works in development mode');
      return;
    }
    
    console.log(`🧪 Dev mode: Simulating MoonPay purchase of ${solAmount} SOL`);
    console.log('🧪 In production, MoonPay would send SOL directly to your devnet wallet');
    console.log('🧪 You can test the transaction complete flow by monitoring balance changes');
    
    // Store the expected purchase for testing
    const purchases = JSON.parse(localStorage.getItem('swarp_fd_mock_moonpay_purchases') || '[]');
    purchases.push({
      walletAddress,
      amount: solAmount,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    localStorage.setItem('swarp_fd_mock_moonpay_purchases', JSON.stringify(purchases));
    
    // In a real scenario, you would use devnet faucet or have test SOL sent to the wallet
    console.log('🧪 To test: Use devnet faucet to send SOL to your wallet, then the balance sync will detect it');
  }

  /**
   * Get current wallet balance info
   */
  async getTotalMainnetBalance(): Promise<{ total: number; wallets: { address: string; balance: number }[] }> {
    try {
      // Get current user's wallet
      const storedWallet = localStorage.getItem('swarp_fd_wallet');
      if (!storedWallet) {
        return { total: 0, wallets: [] };
      }

      const wallet = JSON.parse(storedWallet);
      const balance = await this.getDevnetBalance(wallet.publicKey);
      
      return {
        total: balance,
        wallets: [{
          address: wallet.publicKey,
          balance
        }]
      };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return { total: 0, wallets: [] };
    }
  }

  /**
   * Check if a wallet has a mainnet counterpart
   */
  hasMainnetWallet(devnetAddress: string): boolean {
    return this.getMainnetWalletInfo(devnetAddress) !== null;
  }

  /**
   * Get mainnet address for a devnet wallet
   */
  getMainnetAddress(devnetAddress: string): string | null {
    const info = this.getMainnetWalletInfo(devnetAddress);
    return info ? info.address : null;
  }

  /**
   * Create notification for balance sync
   */
  createSyncNotification(amount: number): void {
    // This will integrate with your existing notification system
    const event = new CustomEvent('moonpay-balance-synced', {
      detail: { amount, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }
}

export const balanceSyncService = new BalanceSyncService();

// Auto-start monitoring when service is imported
if (typeof window !== 'undefined') {
  balanceSyncService.startBalanceMonitoring();
  
  // Listen for page visibility changes to resume monitoring
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      balanceSyncService.startBalanceMonitoring();
    }
  });
}