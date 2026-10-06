export interface User {
  id: string;
  email: string;
  phoneNumber: string | null;
  isVerified: boolean;
  country: string | null;
  currency: string | null;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  publicKey: string;
  isPinSet: boolean;
  incorrectPinAttempts: number;
  isLocked: boolean;
  dailyTransactionLimit: number;
  dailyTransactionCount: number;
  dailyTransactionTotal: number;
  lastTransactionReset: string;
  requiresConfirmation: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Transaction {
  id: string;
  senderWalletId: string;
  recipientWalletId: string;
  amount: number;
  transactionHash: string | null;
  status: 'pending' | 'completed' | 'failed';
  confirmationCode: string | null;
  confirmationExpiresAt: string | null;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  senderWallet?: Wallet;
  recipientWallet?: Wallet;
}

export interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  totalWallets: number;
  activeWallets: number;
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalTransactionVolume: number;
  todayTransactionVolume: number;
}

export type ProjectStatus = 'bonding' | 'migrated' | 'failed';

export interface LaunchpadProject {
  id: string;
  name: string;
  ticker: string;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  tokenAddress: string;
  creatorId: string;
  creator?: User;
  status: ProjectStatus;
  currentPrice: string;
  marketCap: string;
  liquidity: string;
  volume24h: string;
  priceChange24h: string;
  priceChange5m: string;
  priceChange1h: string;
  priceChange6h: string;
  totalSupply: string;
  circulatingSupply: string;
  bondingProgress: string;
  holderCount: number;
  twitterUrl: string | null;
  telegramUrl: string | null;
  websiteUrl: string | null;
  discordUrl: string | null;
  profileScore: number;
  isFeatured: boolean;
  dexPairAddress: string | null;
  migratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  marketDataUpdatedAt: string | null;
}
