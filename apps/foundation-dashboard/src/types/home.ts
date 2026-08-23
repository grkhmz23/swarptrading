// Home Screen Types and Interfaces

export interface WalletData {
  id: string;
  publicKey: string;
  name: string;
  status: string;
  balance: number;
  isInitialized: boolean;
  createdAt: string;
  lastActivityAt: string;
}

export interface HomeScreenProps {
  onLogout?: () => void;
}

export interface TileItem {
  id: string | number;
  title: string;
  balance: string;
  currentPrice: string;
  icon: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

export interface Transaction {
  id: string;
  signature: string;
  type: 'SEND' | 'RECEIVE';
  amount: number;
  fromAddress: string;
  toAddress: string;
  fee: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  timestamp: string;
  errorMessage?: string;
  isMoonPay?: boolean;
  fiatAmount?: number;
  fiatCurrency?: string;
  description?: string;
}

export interface JupiterToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isVerified?: boolean;
  usdPrice?: number;
  mcap?: number;
  fdv?: number;
  liquidity?: number;
  volume24h?: number;
  volume6h?: number;
  volume1h?: number;
  priceChange24h?: number;
  txns24h?: number;
  listingTime?: number;
  holderCount?: number;
}

export interface TokenPrices {
  [symbol: string]: {
    price: number;
    priceChange24h?: number;
  };
}

export interface CustomFilters {
  liquidityMin: string;
  liquidityMax: string;
  volumeMin: string;
  volumeMax: string;
  marketCapMin: string;
  marketCapMax: string;
}

export interface TransactionFilterState {
  type: 'all' | 'send' | 'receive';
  status: 'all' | 'pending' | 'confirmed' | 'failed';
  dateRange: 'all' | '7days' | '30days' | '90days';
}

export interface ConversionRates {
  USD: number;
  EUR: number;
  GBP: number;
}

export type TokenFilter = 'all' | 'gainers' | 'losers' | 'volume' | 'new';

export type SectionName = 'Home' | 'Wallet' | 'Trade' | 'Transactions' | 'Rewards' | 'Settings' | 'Swap';

export interface NavigationItem {
  key: 'home' | 'wallet' | 'trade' | 'transactions' | 'rewards' | 'settings';
  icon: string;
  route: string;
  label?: string;
}

export interface SettingsSidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Chart data point
export interface ChartDataPoint {
  timestamp: number;
  price: number;
}

// User profile for display
export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string;
}
