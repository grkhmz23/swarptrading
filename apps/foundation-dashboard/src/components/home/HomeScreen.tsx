'use client';

import React, { useState, useEffect, useCallback } from 'react';

// import { useRouter } from 'next/navigation'; // Unused for now
import { apiService } from '@/services/api';
import {
  SendModal,
  ReceiveModal,
  SwapModal,
  UsernameModal,
  NotificationModal,
  TopUpModal,
  CustomFiltersModal,
  FiatFlowModal,
} from './modals';
// PriceChart moved to HomeSection
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RewardsSection, WalletSection, TradeSection, TransactionsSection, HomeSection, TokenDetailSection, StakingSection } from './sections';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { moonPayService } from '@/services/moonpay';
import { veriffService } from '@/services/veriff';
import { isLikelySolanaAddress } from '@/lib/solana';
import { balanceSyncService } from '@/services/balanceSync';
import { SettingsContent } from "@/components/Setting/SettingsContent";
import Image from 'next/image';
import { SETTINGS_INNER_ITEMS_BASE } from "@/components/Setting/settingsItems";
import { LAUNCHPAD_INNER_ITEMS } from "@/components/Launchpad/launchpadItems";
import LaunchpadLayout from "@/components/Launchpad/LaunchpadLayout";
import { useT } from "@/i18n/I18nProvider";
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchYourRewards, fetchMoreRewards, claimReward } from '@/store/slices/rewardSlice';
import {
  fetchUserProfile,
  fetchProfilePictureUrl,
} from "@/store/slices/userSlice";
// ProgressSection moved to HomeSection

import { Notification } from '@/types/Notification';
import {
  WalletData,
  HomeScreenProps,
  MarketData,
  Transaction,
  JupiterToken,
} from '@/types/home';
import { getAccessToken } from '@/lib/session';

const navigationItemsBase = [
  { key: 'home' as const, icon: 'home', route: '/dashboard' },
  { key: 'wallet' as const, icon: 'wallet', route: '/wallet' },
  { key: 'trade' as const, icon: 'trade', route: '/trade' },
  { key: 'transactions' as const, icon: 'transactions', route: '/transactions' },
  { key: 'rewards' as const, icon: 'rewards', route: '/rewards' },
  { key: 'staking' as const, icon: 'staking', route: '/staking' },
  { key: 'settings' as const, icon: 'settings', route: '/settings' },
  { key: 'launchpad' as const, icon: 'launchpad', route: '/launchpad' }
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const t = useT();

  const navigationItems = navigationItemsBase.map(item => ({
    name: (t.navigation as Record<string, string> | undefined)?.[item.key] || item.key.charAt(0).toUpperCase() + item.key.slice(1),
    key: item.key,
    icon: item.icon,
    route: item.route
  }));

  const SETTINGS_INNER_ITEMS = SETTINGS_INNER_ITEMS_BASE.map(item => ({
    id: item.id,
    label: t.settings?.sidebar?.[item.labelKey] || item.labelKey,
    icon: item.icon
  }));

  // Helper to get translated section title for the header
  const getTranslatedSectionTitle = (section: string): string => {
    const sectionKeyMap: Record<string, string> = {
      'Home': 'home',
      'Wallet': 'wallet',
      'Trade': 'trade',
      'Transactions': 'transactions',
      'Rewards': 'rewards',
      'Staking': 'staking',
      'Settings': 'settings',
      'Launchpad': 'launchpad',
    };
    const key = sectionKeyMap[section];
    const navTranslations = t.navigation as Record<string, string> | undefined;
    if (key && navTranslations?.[key]) {
      return navTranslations[key];
    }
    return section;
  };

  //  const handleTileClick = (id: string | number) => {
  //   console.log("clicked:", id);
  // };
  // const router = useRouter(); // Unused for now
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapOutputMint, setSwapOutputMint] = useState<string | undefined>(undefined);
  const openSwapForToken = useCallback((mint: string) => {
    setSwapOutputMint(mint);
    setShowSwapModal(true);
  }, []);

  // Deep link from /token/[address]: /dashboard?swap=<mint> opens the swap with that token preselected.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mint = params.get('swap');
    if (mint && isLikelySolanaAddress(mint)) {
      openSwapForToken(mint);
      params.delete('swap');
      const rest = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    }
  }, [openSwapForToken]);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showFiatModal, setShowFiatModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [chartData, setChartData] = useState<{ timestamp: number; price: number }[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('1D');
  const [priceLoading, setPriceLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    username?: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [currentSection, setCurrentSection] = useState<string>('Home');
  const [hasInitializedSection, setHasInitializedSection] = useState(false);
  const [moonPayLoading, setMoonPayLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [mainnetBalance, setMainnetBalance] = useState<number>(0);
  const [isBalanceSyncing, setIsBalanceSyncing] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [launchpadExpanded, setLaunchpadExpanded] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, { price: number; priceChange24h?: number }>>({});
  const [tokenPricesLoading, setTokenPricesLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  // Jupiter tokens list for wallet display
  const [jupiterTokens, setJupiterTokens] = useState<JupiterToken[]>([]);
  const [jupiterTokensLoading, setJupiterTokensLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [tokenFilter, setTokenFilter] = useState<'all' | 'gainers' | 'losers' | 'volume' | 'new'>('all');

  // Token detail view state
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(null);

  // Custom filters modal state
  const [showCustomFiltersModal, setShowCustomFiltersModal] = useState(false);
  const [customFilters, setCustomFilters] = useState({
    liquidityMin: '',
    liquidityMax: '',
    volumeMin: '',
    volumeMax: '',
    marketCapMin: '',
    marketCapMax: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    liquidityMin: '',
    liquidityMax: '',
    volumeMin: '',
    volumeMax: '',
    marketCapMin: '',
    marketCapMax: '',
  });

  // Check if any custom filters are active
  const hasActiveCustomFilters = Object.values(appliedFilters).some(v => v !== '');

  // claimingId now comes from Redux state.rewards.claiming

  //const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  // Token balances commented out for now
  // const [tokenBalances, setTokenBalances] = useState<Array<{
  //   token: string;
  //   symbol: string;
  //   name: string;
  //   balance: number;
  //   usdValue: number;
  //   mint: string;
  //   decimals: number;
  // }>>([]);
  // const [tokenBalancesLoading, setTokenBalancesLoading] = useState(false);
  const [targetTransactionId, setTargetTransactionId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState({
    dateFilter: 'all',
    currencyFilter: 'all',
    amountRangeFilter: 'all',
    showDateDropdown: false,
    showCurrencyDropdown: false,
    showAmountDropdown: false,
  });
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // const rewardsCarouselRef = useRef<HTMLDivElement | null>(null);
  // const topMoversCarouselRef = useRef<HTMLDivElement | null>(null);
  // const REWARDS_VIEWPORT_WIDTH = 756;
  // const TOP_MOVERS_VIEWPORT_WIDTH = 800;

  // const scrollContainer = useCallback((ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
  //   const node = ref.current;
  //   if (!node) return;
  //   const scrollAmount = node.clientWidth || 0;
  //   node.scrollBy({
  //     left: direction === 'right' ? scrollAmount : -scrollAmount,
  //     behavior: 'smooth',
  //   });
  // }, []);

// Get currency from Redux

// Conversion rates
const [conversionRates, setConversionRates] = useState({
  USD: 1,
  EUR: 0.10,
  GBP: 0.10,
});

useEffect(() => {
  const fetchRates = async () => {
    try {
      const response = await apiService.getExchangeRates();
      if (response.success && response.data) {
        setConversionRates({
          USD: 1,
          EUR: response.data.rates.EUR,
          GBP: response.data.rates.GBP,
        });
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates', err);
    }
  };
  fetchRates();
}, []);

useEffect(() => {
  const fetchJupiterTokens = async () => {
    try {
      setJupiterTokensLoading(true);
      // Use getTokensWithVolume to get volume data from DexScreener
      const response = await apiService.getTokensWithVolume({ limit: 100 });
      if (response.tokens) {
        setJupiterTokens(response.tokens);
      }
    } catch (err) {
      console.error('Failed to fetch Jupiter tokens with volume:', err);
      // Try fallback to basic getAllJupiterTokens
      try {
        const fallbackResponse = await apiService.getAllJupiterTokens({ limit: 100 });
        if (fallbackResponse.tokens) {
          setJupiterTokens(fallbackResponse.tokens);
        }
      } catch {
        // Final fallback to basic tokens
        setJupiterTokens([
          { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9 },
          { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether', decimals: 6 },
        ]);
      }
    } finally {
      setJupiterTokensLoading(false);
    }
  };
  fetchJupiterTokens();
}, []);

useEffect(() => {
  const fetchTokenPrices = async (isInitial = false) => {
    try {
      // Get price symbols from loaded Jupiter tokens, fallback to basic tokens
      const priceSymbols = jupiterTokens.length > 0
        ? jupiterTokens.slice(0, 50).map(t => t.symbol) // Limit to 50 for price API
        : ['SOL', 'SWARP', 'USDC', 'USDT', 'wETH', 'wBTC', 'BONK', 'RAY', 'JUP'];

      const response = await apiService.getTokenPrices(priceSymbols);
      if (response.prices) {
        setTokenPrices(response.prices);
      }
    } catch (err) {
      console.error('Failed to fetch token prices:', err);
    } finally {
      if (isInitial) {
        setTokenPricesLoading(false);
      }
    }
  };
  fetchTokenPrices(true);

  // Refresh prices every 30 seconds
  const interval = setInterval(() => fetchTokenPrices(false), 30000);
  return () => clearInterval(interval);
}, [jupiterTokens]);

// Currency (currencySymbol, convertedPrice, convertedChange moved to HomeSection)
const currency = useSelector((state: RootState) => state.settings.currency);

  // const handleRewardsScroll = (direction: 'left' | 'right') => {
  //   scrollContainer(rewardsCarouselRef, direction);
  // };

  // const handleTopMoversScroll = (direction: 'left' | 'right') => {
  //   scrollContainer(topMoversCarouselRef, direction);
  // };

  // Restore the last visited section on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedSection = localStorage.getItem('swarp_fd_dashboard_section');
    if (storedSection) {
      setCurrentSection(storedSection);
    }
    setHasInitializedSection(true);
  }, []);

  // Persist the current section so refreshes return to the same view
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasInitializedSection) return;
    if (currentSection) {
      localStorage.setItem('swarp_fd_dashboard_section', currentSection);
    }
  }, [currentSection, hasInitializedSection]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAuthToken(getAccessToken());
  }, []);
    // ✅ Reward list (main) - derived from Redux store (fetched from API)
    const dispatch = useDispatch<AppDispatch>();
    const {
      yourRewards: reduxYourRewards,
      moreRewards: reduxMoreRewards,
      loadingYourRewards,
      loadingMoreRewards,
      claiming
    } = useSelector(
      (state: RootState) => state.rewards
    );

    // Icon mapping for Your Rewards
    const YOUR_REWARDS_ICONS: Record<string, string> = {
      'referral-welcome': '/figma-assets/welcomeBonusReferred.svg',
      'send-cashback-booster': '/figma-assets/cashbackBoosterSvg.svg',
      'first-cashback': '/figma-assets/firstCashback.svg',
    };

    // Icon mapping for More Rewards
    const MORE_REWARDS_ICONS: Record<string, string> = {
      'airdrop-ready': '/figma-assets/earlyAirDropAccessSvg.svg',
      'staking-sprout': '/figma-assets/stakingSprout.svg',
      'swap-streak': '/figma-assets/swapStreak.svg',
    };

    // Helper to get translated reward content
    const getTranslatedReward = (rewardType: string, fallbackTitle: string, fallbackSubtitle: string) => {
      const rewardMap: Record<string, { title: string; desc: string }> = {
        // Your Rewards
        'referral-welcome': {
          title: t.rewardsPage?.rewards?.referralWelcome || fallbackTitle,
          desc: t.rewardsPage?.rewards?.referralWelcomeDesc || fallbackSubtitle,
        },
        'send-cashback-booster': {
          title: t.rewardsPage?.rewards?.sendCashbackBooster || fallbackTitle,
          desc: t.rewardsPage?.rewards?.sendCashbackBoosterDesc || fallbackSubtitle,
        },
        'first-cashback': {
          title: t.rewardsPage?.rewards?.firstCashback || fallbackTitle,
          desc: t.rewardsPage?.rewards?.firstCashbackDesc || fallbackSubtitle,
        },
        // More Rewards
        'airdrop-ready': {
          title: t.rewardsPage?.rewards?.airdropReady || fallbackTitle,
          desc: t.rewardsPage?.rewards?.airdropReadyDesc || fallbackSubtitle,
        },
        'staking-sprout': {
          title: t.rewardsPage?.rewards?.stakingSprout || fallbackTitle,
          desc: t.rewardsPage?.rewards?.stakingSproutDesc || fallbackSubtitle,
        },
        'swap-streak': {
          title: t.rewardsPage?.rewards?.swapStreak || fallbackTitle,
          desc: t.rewardsPage?.rewards?.swapStreakDesc || fallbackSubtitle,
        },
        // Legacy milestones (for Refer & Earn section)
        'welcome-bonus': {
          title: t.rewardsPage?.milestones?.welcomeBonus || fallbackTitle,
          desc: t.rewardsPage?.milestones?.welcomeBonusDesc || fallbackSubtitle,
        },
        'cashback-booster': {
          title: t.rewardsPage?.milestones?.cashbackBooster || fallbackTitle,
          desc: t.rewardsPage?.milestones?.cashbackBoosterDesc || fallbackSubtitle,
        },
        'early-airdrop-access': {
          title: t.rewardsPage?.milestones?.earlyAirdropAccess || fallbackTitle,
          desc: t.rewardsPage?.milestones?.earlyAirdropAccessDesc || fallbackSubtitle,
        },
      };
      return rewardMap[rewardType] || { title: fallbackTitle, desc: fallbackSubtitle };
    };

    // Helper to translate requirement label (e.g., "1 FRIEND" -> "1 AMICO")
    const getTranslatedRequirementLabel = (label: string) => {
      if (!label) return label;
      const match = label.match(/^(\d+)\s+(FRIEND|FRIENDS)$/i);
      if (match) {
        const count = parseInt(match[1], 10);
        const friendWord = count === 1
          ? (t.rewardsPage?.friend || "FRIEND")
          : (t.rewardsPage?.friends || "FRIENDS");
        return `${count} ${friendWord}`;
      }
      return label;
    };

    // Map Your Rewards from Redux to display format
    const displayRewards = (reduxYourRewards || []).map((r) => {
      const translated = getTranslatedReward(r.rewardType, r.rewardName, r.subtitle);
      return {
        id: r.rewardType,
        title: translated.title,
        requirementLabel: getTranslatedRequirementLabel(r.requirementLabel),
        subtitle: translated.desc,
        claimed: r.claimed,
        eligible: r.eligible,
        icon: YOUR_REWARDS_ICONS[r.rewardType] || '/figma-assets/welcomeBonusReferred.svg',
        rewardType: r.rewardType,
      };
    });

    // Map More Rewards from Redux to display format
    const displayMoreRewards = (reduxMoreRewards || []).map((r) => {
      const translated = getTranslatedReward(r.rewardType, r.rewardName, r.subtitle);
      return {
        id: r.rewardType,
        title: translated.title,
        requirementLabel: getTranslatedRequirementLabel(r.requirementLabel),
        subtitle: translated.desc,
        claimed: r.claimed,
        eligible: r.eligible,
        progress: r.progress,
        currentValue: r.currentValue,
        targetValue: r.targetValue,
        icon: MORE_REWARDS_ICONS[r.rewardType] || '/figma-assets/earlyAirDropAccessSvg.svg',
        rewardType: r.rewardType,
      };
    });
const user = useSelector((state: RootState) => state.user);

useEffect(() => {
  if (!authToken) return;
  dispatch(fetchUserProfile(authToken));
  dispatch(fetchProfilePictureUrl(authToken));
}, [dispatch, authToken]);

useEffect(() => {
  if (!authToken || !user?.id) return;
  dispatch(fetchYourRewards({ userId: user.id, token: authToken }));
  dispatch(fetchMoreRewards({ userId: user.id, token: authToken }));
}, [dispatch, authToken, user?.id]);
  //Balance Tile Item

// const items: TileItem[] = [
//   {
//     id: 1,
//     title: "Crypto",
//     balance: "$5.35",
//     currentPrice: "2.45%",
//     icon: "/figma-assets/crypto_1.svg",   
//   },
//   {
//     id: 2,
//     title: "Cash",
//     balance: "$1.00",
//     currentPrice: "2.45%",
//     icon: "/figma-assets/cash.svg",       
//   },
// ];

//crypto cards 

//  const cryptoData = [
//   {
//     id: 1,
//     title: "SWRP",
//     price: "5.35",
//     change: "+0.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
//   {
//     id: 2,
//     title: "SOL",
//     price: "5.35",
//     change: "-2.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
//   {
//     id: 3,
//     title: "ETH",
//     price: "5.35",
//     change: "+0.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
//   {
//     id: 4,
//     title: "PYTH",
//     price: "5.35",
//     change: "+0.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
//   {
//     id: 5,
//     title: "USDC",
//     price: "5.35",
//     change: "-2.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
//     {
//     id: 6,
//     title: "ETH",
//     price: "5.35",
//     change: "+0.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
//  {
//     id: 7,
//     title: "USDC",
//     price: "5.35",
//     change: "-2.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
//     {
//     id: 8,
//     title: "ETH",
//     price: "5.35",
//     change: "+0.45%",
//     icon: "/figma-assets/ethSvg.svg",
//   },
 
// ];

    // Claim from Home: dispatch redux action using rewardType
    const handleClaim = async (rewardType: string) => {
      if (!user?.id || !authToken) {
        console.error('Missing authentication for claiming reward');
        return;
      }
      try {
        await dispatch(claimReward({ userId: user.id, rewardType, token: authToken })).unwrap();
      } catch (err) {
        console.error('Claim failed', err);
      }
    };
    
  const loadChartData = useCallback(async () => {
    try {
      const data = await apiService.getSolanaHistoricalData(selectedPeriod);
      setChartData(data);
    } catch (error: unknown) {
      console.error('Error loading chart data:', error);
      
      // Create realistic crypto price data that mimics actual market behavior
      const basePrice = 240.75;
      const mockData: { timestamp: number; price: number }[] = [];
      let currentPrice = basePrice * 0.7; // Start lower to show growth trend
      
      for (let i = 0; i < 100; i++) {
        const progress = i / 99;
        
        // Main trend - overall upward movement with some downturns
        let trendMultiplier = 1;
        if (progress < 0.3) {
          // Initial growth period
          trendMultiplier = 1 + (progress * 0.8);
        } else if (progress < 0.6) {
          // Sustained high with some volatility
          trendMultiplier = 1.24 + Math.sin(progress * 10) * 0.05;
        } else if (progress < 0.8) {
          // Sharp decline period
          trendMultiplier = 1.24 - (progress - 0.6) * 0.6;
        } else {
          // Recovery period
          trendMultiplier = 0.92 + (progress - 0.8) * 0.4;
        }
        
        // Add realistic price movements
        const momentum = (Math.random() - 0.48) * 0.03; // Slight upward bias
        const volatility = (Math.random() - 0.5) * 0.02; // Random volatility
        const microMovement = (Math.random() - 0.5) * 0.01; // Small fluctuations
        
        // Calculate next price with realistic constraints
        const priceChange = currentPrice * (momentum + volatility + microMovement);
        const trendPrice = basePrice * trendMultiplier;
        
        // Blend current momentum with trend target
        currentPrice = currentPrice + priceChange + (trendPrice - currentPrice) * 0.1;
        
        // Ensure price doesn't go negative or too extreme
        currentPrice = Math.max(currentPrice, basePrice * 0.5);
        currentPrice = Math.min(currentPrice, basePrice * 1.5);
        
        mockData.push({
          timestamp: Date.now() - (100 - i) * 15 * 60 * 1000, // 15-minute intervals
          price: currentPrice,
        });
      }
      
      setChartData(mockData);
      console.error('Using fallback chart data due to API error');
    }
  }, [selectedPeriod]);

  const loadMainnetBalance = useCallback(async () => {
    if (!wallet) return;
    
    try {
      // Since we're using devnet directly, this will just return current wallet balance
      // In future, this could track pending MoonPay transactions
      //const balanceInfo = await balanceSyncService.getTotalMainnetBalance();
      setMainnetBalance(0); // Set to 0 since we're not using separate mainnet tracking anymore
    } catch (error) {
      console.error('Error loading balance info:', error);
    }
  }, [wallet]);

  const handleBalanceSync = async () => {
    if (!wallet) return;
    
    try {
      setIsBalanceSyncing(true);
      const syncResult = await balanceSyncService.manualSync(wallet.publicKey);
      
      if (syncResult.success && syncResult.difference && syncResult.difference > 0) {
        // Sync the balance to backend devnet wallet
        const token = getAccessToken();
        if (token) {
          try {
            const backendSyncResult = await apiService.syncMoonPayBalance(
              wallet.id,
              token,
              syncResult.difference,
              `mainnet_sync_${Date.now()}`
            );
            
            if (backendSyncResult.success) {
              showSuccess((t.moonPay?.balanceSynced || 'Balance synced! +{amount} SOL added to your wallet').replace('{amount}', syncResult.difference.toFixed(6)), 'top-right');
              
              // Refresh all wallet data
              loadWalletData();
              loadMainnetBalance();
              loadTransactionHistory();
              
              // Add to MoonPay transaction history (frontend tracking)
              const moonPayTransaction = {
                id: `moonpay_sync_${Date.now()}`,
                type: 'MOONPAY_PURCHASE',
                status: 'COMPLETED',
                amount: syncResult.difference,
                currency: 'SOL',
                fiatAmount: syncResult.difference * (marketData?.price || 200), // Estimate
                fiatCurrency: 'USD',
                moonPayTransactionId: backendSyncResult.transaction?.signature || `sync_${Date.now()}`,
                timestamp: new Date().toISOString(),
                description: 'SOL purchased via MoonPay (synced from mainnet)'
              };
              
              const existingTransactions = JSON.parse(localStorage.getItem('swarp_fd_moonpay_txs') || '[]');
              existingTransactions.unshift(moonPayTransaction);
              localStorage.setItem('swarp_fd_moonpay_txs', JSON.stringify(existingTransactions.slice(0, 50)));
            } else {
              showError(t.moonPay?.failedToSyncBalance || 'Failed to sync balance to backend', 'top-right');
            }
          } catch (error) {
            console.error('Backend sync failed:', error);
            showError(t.moonPay?.failedToSyncBalance || 'Failed to sync balance to backend', 'top-right');
          }
        }
      } else if (syncResult.success && (!syncResult.difference || syncResult.difference === 0)) {
        showSuccess(t.moonPay?.balanceUpToDate || 'Balance is up to date', 'top-right');
      } else {
        showError(`${t.moonPay?.failedToSync || 'Sync failed'}: ${syncResult.error || 'Unknown error'}`, 'top-right');
      }
    } catch (error) {
      console.error('Error syncing balance:', error);
      showError(t.moonPay?.failedToSync || 'Failed to sync balance', 'top-right');
    } finally {
      setIsBalanceSyncing(false);
    }
  };

  // Token balances loading commented out for now
  // const loadTokenBalances = useCallback(async () => {
  //   if (!wallet) return;
  //
  //   try {
  //     const token = getAccessToken();
  //     if (!token) return;
  //
  //     setTokenBalancesLoading(true);
  //     const balances = await apiService.getSwapTokenBalances(wallet.id, token);
  //     setTokenBalances(Array.isArray(balances) ? balances : []);
  //     console.log('Token balances loaded:', balances);
  //   } catch (error) {
  //     console.error('Error loading token balances:', error);
  //     setTokenBalances([]); // Reset to empty array on error
  //   } finally {
  //     setTokenBalancesLoading(false);
  //   }
  // }, [wallet]);

  const loadTransactionHistory = useCallback(async () => {
    if (!wallet) return;
    
    try {
      setTransactionsLoading(true);
      setTransactionsError(null);
      const token = getAccessToken();
      
      if (!token) {
        setTransactionsError('Authentication token not found');
        return;
      }

      const data = await apiService.getTransactionHistory(wallet.id, token);
      const solanaTransactions = data.transactions || [];
      
      const moonPayTransactions = JSON.parse(localStorage.getItem('swarp_fd_moonpay_txs') || '[]');
      
      // Convert MoonPay transactions to match the existing format
      const formattedMoonPayTransactions = moonPayTransactions.map((tx: { id: string; moonPayTransactionId?: string; type: string; amount: number; timestamp: string; currency: string; fee?: number; fromAddress?: string; toAddress?: string; status: string; fiatAmount?: number; fiatCurrency?: string; description?: string }) => ({
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

  useEffect(() => {
    loadWalletData();
    loadUserProfile();
    loadMarketData();
    loadChartData();
    loadMainnetBalance();
    // loadTokenBalances(); // Load token balances including SWARP - commented out

    const interval = setInterval(() => {
      loadMarketData();
      loadMainnetBalance(); // Also check mainnet balance periodically
      // loadTokenBalances(); // Also refresh token balances periodically - commented out
    }, 30000); // Update every 30 seconds

    // Listen for MoonPay balance sync events
    const handleBalanceSync = (event: CustomEvent) => {
      const { amount } = event.detail;
      showSuccess((t.moonPay?.purchaseDetected || 'MoonPay purchase detected! +{amount} SOL').replace('{amount}', amount.toFixed(6)), 'top-right');

      // Refresh all data
      setTimeout(() => {
        loadWalletData();
        loadMainnetBalance();
        // loadTokenBalances(); // Refresh token balances after sync - commented out
        loadTransactionHistory();
      }, 1000);
    };

    window.addEventListener('moonpay-balance-synced', handleBalanceSync as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('moonpay-balance-synced', handleBalanceSync as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadChartData();
  }, [selectedPeriod, loadChartData]);

  useEffect(() => {
    if (wallet) {
      loadTransactionHistory();
      // loadTokenBalances(); // Load token balances when wallet changes - commented out
    }
  }, [wallet, loadTransactionHistory]);

  // Effect to scroll to target transaction when transactions section is loaded
  useEffect(() => {
    if (currentSection === 'Transactions' && targetTransactionId && transactions.length > 0) {
      const scrollToTransaction = () => {
        const transactionElement = document.getElementById(`transaction-${targetTransactionId}`);
        if (transactionElement) {
          transactionElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Highlight the transaction briefly
          transactionElement.style.background = 'rgba(64, 224, 208, 0.1)';
          transactionElement.style.border = '1px solid rgba(64, 224, 208, 0.3)';
          setTimeout(() => {
            transactionElement.style.background = '';
            transactionElement.style.border = '';
          }, 3000);
          // Clear the target transaction ID
          setTargetTransactionId(null);
        }
      };
      
      // Small delay to ensure DOM is updated
      setTimeout(scrollToTransaction, 100);
    }
  }, [currentSection, targetTransactionId, transactions]);

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

  const loadWalletData = async () => {
    try {
      const token = getAccessToken();
      
      if (!token) {
        console.error('❌ No authentication token found');
        setError('Authentication token not found');
        return;
      }

      // Get wallet data from localStorage first (faster)
      const storedWallet = localStorage.getItem('swarp_fd_wallet');
      if (storedWallet) {
        setWallet(JSON.parse(storedWallet));
      }

      // Then fetch fresh data from API
      const wallets = await apiService.getUserWallets(token);
      if (wallets.length > 0) {
        setWallet(wallets[0]);
        localStorage.setItem('swarp_fd_wallet', JSON.stringify(wallets[0]));

        try {
          const tokenBalancesResponse = await apiService.getTokenBalances(wallets[0].id, token);
          if (tokenBalancesResponse && typeof tokenBalancesResponse.portfolioValue === 'number') {
            setPortfolioValue(tokenBalancesResponse.portfolioValue);
          }
        } catch (err) {
          console.warn('Failed to fetch portfolio value:', err);
        }
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
          console.error('🔄 Using cached wallet data due to API error');
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
  };

  const loadUserProfile = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const profile = await apiService.getUserProfile(token);
      setUserProfile({
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    } catch (error: unknown) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadMarketData = async () => {
    try {
      setPriceLoading(true);
      const data = await apiService.getSolanaPrice();
      setMarketData(data);
    } catch (error: unknown) {
      console.error('Error loading market data:', error);
      
      // Provide fallback market data
      const fallbackData: MarketData = {
        symbol: 'SOL',
        price: 181.67,
        change: -5.23,
        changePercent: -2.8,
        high: 190.50,
        low: 175.30,
        volume: 1234567890,
        timestamp: Date.now(),
      };
      
      setMarketData(fallbackData);
      console.error('Using fallback market data due to API error');
    } finally {
      setPriceLoading(false);
    }
  };

  const formatPublicKey = (publicKey: string | null | undefined) => {
    if (!publicKey) return 'N/A';
    return `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`;
  };

  const formatTransactionDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return t.common?.today || 'Today';
    } else if (diffDays === 2) {
      return t.common?.yesterday || 'Yesterday';
    } else if (diffDays < 7) {
      return (t.common?.daysAgo || '{days} days ago').replace('{days}', String(diffDays - 1));
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.status === 'PENDING') {
      return '⏳';
    }
    
    if (transaction.isMoonPay) {
      return transaction.type === 'RECEIVE' ? '🏪' : '💰'; // MoonPay purchase/sale icons
    }
    
    return transaction.type === 'SEND' ? (
                <Image 
                  src="figma-assets/send.svg" 
                  alt="Sent" 
                  width={16} 
                  height={16}
                  className="object-contain w-full h-full "
                />
              ) : (
                 <Image 
                                                          src="figma-assets/receive.svg" 
                                                          alt="Arrow down" 
                                                          width={12} 
                                                          height={12}
                                                          className="object-contain w-full h-full"
                                                        />
              );
  };

  const handleCopyAddress = async () => {
    if (wallet) {
      try {
        await navigator.clipboard.writeText(wallet.publicKey);
        showSuccess(t.common?.addressCopied || 'Address copied!', 'top-right');
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadWalletData();
  };

  // Airdrop functionality commented out for now
  // const handleAirdrop = async () => {
  //   if (!wallet) return;
  //
  //   try {
  //     const token = getAccessToken();
  //     if (!token) {
  //       setError('Authentication token not found');
  //       return;
  //     }
  //
  //     setIsLoading(true);
  //     const result = await apiService.airdropSOL(wallet.id, token, 2);
  //
  //     // Update wallet balance
  //     setWallet(prev => prev ? { ...prev, balance: result.balance } : null);
  //
  //     alert(`Success! ${result.message}\nTransaction: ${result.txSignature.slice(0, 8)}...`);
  //   } catch (error: unknown) {
  //     console.error('Airdrop error:', error);
  //     const apiError = error as { message?: string };
  //     alert(apiError.message || 'Failed to airdrop SOL');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleSendSuccess = (newBalance: number) => {
    setWallet(prev => prev ? { ...prev, balance: newBalance } : null);
    if (wallet) {
      const updatedWallet = { ...wallet, balance: newBalance };
      localStorage.setItem('swarp_fd_wallet', JSON.stringify(updatedWallet));
    }
    // Refresh transaction history
    loadTransactionHistory();
  };

  const handleSwapSuccess = (message: string) => {
    showSuccess(message, 'top-right');
    // Refresh wallet data and transaction history
    loadWalletData();
    loadTransactionHistory();
  };

  const handleUsernameSet = (username: string) => {
    setUserProfile(prev => prev ? { ...prev, username } : null);
  };

  const handleOpenUsernameModal = () => {
    // Only allow opening username modal if no username is set
    if (!userProfile?.username || userProfile.username === 'dismissed') {
      setShowUsernameModal(true);
    }
  };

const handleNotificationClick = (notification: Notification) => {
  setCurrentSection('Transactions');

  let transactionId: string | null = null;

  if (notification.data && typeof notification.data === 'object') {
    const data = notification.data;
    transactionId =
      (data.transactionId as string) ||
      (data.id as string) ||
      (data.txId as string) ||
      (data.signature as string) ||
      notification.id;
  } else {
    transactionId = notification.id;
  }

  setTargetTransactionId(transactionId);
};

  const handleNavigationClick = (itemName: string, subsection?: string) => {
    setCurrentSection(itemName);
    // Clear target transaction ID when switching sections
    if (itemName !== 'Transactions') {
      setTargetTransactionId(null);
    }
    if (itemName === 'Settings' && subsection) {
      localStorage.setItem('swarp_fd_settings_subsection', subsection);
    } else {
      localStorage.removeItem('swarp_fd_settings_subsection');
    }
  };

  const toggleDropdown = (dropdownType: 'date' | 'swarp_fd_currency' | 'amount') => {
    setFilterState(prev => ({
      ...prev,
      showDateDropdown: dropdownType === 'date' ? !prev.showDateDropdown : false,
      showCurrencyDropdown: dropdownType === 'swarp_fd_currency' ? !prev.showCurrencyDropdown : false,
      showAmountDropdown: dropdownType === 'amount' ? !prev.showAmountDropdown : false,
    }));
  };

  const setFilter = (filterType: 'dateFilter' | 'currencyFilter' | 'amountRangeFilter', value: string) => {
    setFilterState(prev => ({
      ...prev,
      [filterType]: value,
      showDateDropdown: false,
      showCurrencyDropdown: false,
      showAmountDropdown: false,
    }));
  };

  const getFilteredTransactions = () => {
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
  };

  const handleCloseUsernameCard = () => {
    // Hide the username card permanently for this session
    // You might want to save this to localStorage if you want it permanent
    setUserProfile(prev => prev ? { ...prev, username: 'dismissed' } : null);
  };

  // MoonPay Integration Handlers
  const handleTopUpClick = () => {
    setShowTopUpModal(true);
  };

  const handleFiatTopUp = async () => {
    setShowTopUpModal(false);
    await handleMoonPayBuy();
  };

  const handleMoonPayBuy = async () => {
    if (!wallet || !userProfile) {
      showError(t.moonPay?.walletNotAvailable || 'Wallet or user profile not available', 'top-right');
      return;
    }

    try {
      setMoonPayLoading(true);
      
      const options = {
        walletAddress: wallet.publicKey,
        currencyCode: 'sol',
        // baseCurrencyCode: 'usd', // Remove to let MoonPay auto-detect user's region
        externalCustomerId: wallet.id,
        onEventCallback: (event: unknown) => {
          const eventTyped = event as { type: string; data?: unknown };
          moonPayService.handleWidgetEvent(eventTyped);
          
          if (eventTyped.type === 'transaction_completed') {
            // Store MoonPay transaction in localStorage for history
            const eventData = eventTyped.data as { quoteCurrencyAmount?: number; baseCurrencyAmount?: number; baseCurrency?: string; transactionId?: string };
            const moonPayTransaction = {
              id: `moonpay_${Date.now()}`,
              type: 'MOONPAY_PURCHASE',
              status: 'COMPLETED',
              amount: eventData?.quoteCurrencyAmount || 0,
              currency: 'SOL',
              fiatAmount: eventData?.baseCurrencyAmount || 0,
              fiatCurrency: eventData?.baseCurrency || 'USD',
              moonPayTransactionId: eventData?.transactionId,
              timestamp: new Date().toISOString(),
              description: 'SOL purchased via MoonPay'
            };
            
            // Add to localStorage transaction history
            const existingTransactions = JSON.parse(localStorage.getItem('swarp_fd_moonpay_txs') || '[]');
            existingTransactions.unshift(moonPayTransaction);
            localStorage.setItem('swarp_fd_moonpay_txs', JSON.stringify(existingTransactions.slice(0, 50))); // Keep last 50
            
            showSuccess((t.moonPay?.purchaseSuccessful || 'Purchase successful! {amount} SOL purchased for ${fiat}').replace('{amount}', String(moonPayTransaction.amount)).replace('{fiat}', String(moonPayTransaction.fiatAmount)), 'top-right');
            
            // Refresh wallet balance and transaction history
            setTimeout(() => {
              loadWalletData();
              loadTransactionHistory();
            }, 3000);
          } else if (eventTyped.type === 'transaction_failed') {
            showError(t.moonPay?.purchaseFailed || 'Purchase failed. Please try again.', 'top-right');
          } else if (eventTyped.type === 'widget_closed') {
            setMoonPayLoading(false);
          }
        }
      };

      await moonPayService.openBuyWidget(options);
      
      // Show helpful message about regional restrictions
      setTimeout(() => {
        showSuccess(t.common?.moonPayOpened || 'MoonPay opened in new window. If you see "Coming soon to your region", try using a VPN or the service may not be available in your area yet.', 'top-right');
      }, 2000);
      
    } catch (error: unknown) {
      console.error('Error opening MoonPay buy widget:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open buy widget';
      showError(errorMessage, 'top-right');
    } finally {
      // Don't set loading to false immediately, let the callback handle it
      // setMoonPayLoading(false);
    }
  };

  const handleMoonPaySell = async () => {
    if (!wallet || !userProfile) {
      showError(t.moonPay?.walletNotAvailable || 'Wallet or user profile not available', 'top-right');
      return;
    }

    if (wallet.balance <= 0) {
      showError(t.moonPay?.noSolAvailable || 'No SOL available to sell', 'top-right');
      return;
    }

    try {
      setMoonPayLoading(true);
      
      const options = {
        walletAddress: wallet.publicKey,
        refundWalletAddress: wallet.publicKey,
        amount: wallet.balance,
        externalCustomerId: wallet.id,
        onEventCallback: (event: unknown) => {
          const eventTyped = event as { type: string; data?: unknown };
          moonPayService.handleWidgetEvent(eventTyped);
          
          if (eventTyped.type === 'transaction_completed') {
            // Store MoonPay sell transaction in localStorage
            const sellEventData = eventTyped.data as { baseCurrencyAmount?: number; quoteCurrencyAmount?: number; quoteCurrency?: string; transactionId?: string };
            const moonPayTransaction = {
              id: `moonpay_sell_${Date.now()}`,
              type: 'MOONPAY_SALE',
              status: 'COMPLETED',
              amount: sellEventData?.baseCurrencyAmount || wallet.balance || 0,
              currency: 'SOL',
              fiatAmount: sellEventData?.quoteCurrencyAmount || 0,
              fiatCurrency: sellEventData?.quoteCurrency || 'USD',
              moonPayTransactionId: sellEventData?.transactionId,
              timestamp: new Date().toISOString(),
              description: 'SOL sold via MoonPay'
            };
            
            // Add to localStorage transaction history
            const existingTransactions = JSON.parse(localStorage.getItem('swarp_fd_moonpay_txs') || '[]');
            existingTransactions.unshift(moonPayTransaction);
            localStorage.setItem('swarp_fd_moonpay_txs', JSON.stringify(existingTransactions.slice(0, 50)));
            
            showSuccess((t.moonPay?.saleSuccessful || 'Sale successful! {amount} SOL sold for ${fiat}').replace('{amount}', String(moonPayTransaction.amount)).replace('{fiat}', String(moonPayTransaction.fiatAmount)), 'top-right');
            
            // Refresh wallet balance and transaction history
            setTimeout(() => {
              loadWalletData();
              loadTransactionHistory();
            }, 3000);
          } else if (eventTyped.type === 'transaction_failed') {
            showError(t.moonPay?.saleFailed || 'Sale failed. Please try again.', 'top-right');
          } else if (eventTyped.type === 'widget_closed') {
            setMoonPayLoading(false);
          }
        }
      };

      await moonPayService.openSellWidget(options);
    } catch (error: unknown) {
      console.error('Error opening MoonPay sell widget:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open sell widget';
      showError(errorMessage, 'top-right');
    } finally {
      setMoonPayLoading(false);
    }
  };

  const handleVerifyIdentity = async () => {
    if (!userProfile) {
      showError(t.common?.profileNotAvailable || 'User profile not available', 'top-right');
      return;
    }

    // If already approved, no action needed
    if (user?.kycStatus === 'approved') {
      showSuccess(t.onboarding?.alreadyVerified || 'Your identity is already verified!', 'top-right');
      return;
    }

    try {
      setVerifyLoading(true);
      const token = getAccessToken();
      if (!token) {
        showError(t.common?.authTokenNotFound || 'Authentication token not found', 'top-right');
        return;
      }

      const response = await apiService.createVeriffSession(token, {
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
      });

      if (response.success && response.sessionUrl) {
        // Open Veriff verification (InContext SDK modal or new window)
        await veriffService.openVerification(response.sessionUrl, {
          onEvent: (event: string) => {
            if (event === 'FINISHED') {
              showSuccess(
                t.onboarding?.verificationSubmitted || 'Verification submitted! We will notify you once reviewed.',
                'top-right',
              );
              // Refresh user profile to get updated KYC status
              if (authToken) {
                dispatch(fetchUserProfile(authToken));
              }
            }
            setVerifyLoading(false);
          },
        });
      } else {
        showError(t.common?.failedToCreateSession || 'Failed to create verification session', 'top-right');
      }
    } catch (error: unknown) {
      console.error('Error opening Veriff verification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open identity verification';
      showError(errorMessage, 'top-right');
    } finally {
      setVerifyLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#090A11] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#40E0D0] mx-auto mb-4"></div>
         
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#090A11] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-[#40E0D0] text-[#090A11] px-6 py-2 rounded-full font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#090A11] flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentSection={currentSection}
        navigationItems={navigationItems}
        settingsItems={SETTINGS_INNER_ITEMS}
        launchpadItems={LAUNCHPAD_INNER_ITEMS}
        settingsExpanded={settingsExpanded}
        setSettingsExpanded={setSettingsExpanded}
        launchpadExpanded={launchpadExpanded}
        setLaunchpadExpanded={setLaunchpadExpanded}
        onNavigationClick={handleNavigationClick}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0 overflow-hidden">
        {/* Top Header Bar */}
        <Header
          t={t}
          currentSection={currentSection}
          getTranslatedSectionTitle={getTranslatedSectionTitle}
          setSidebarOpen={setSidebarOpen}
          setCurrentSection={setCurrentSection}
          setShowNotificationModal={setShowNotificationModal}
          onLogout={onLogout}
        />

        {/* Main Content Area - Two Column Layout - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {currentSection === 'Home' ? (
            <HomeSection
              t={t}
              wallet={wallet}
              user={user}
              userProfile={userProfile}
              marketData={marketData}
              chartData={chartData}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              priceLoading={priceLoading}
              transactions={transactions}
              transactionsLoading={transactionsLoading}
              transactionsError={transactionsError}
              mainnetBalance={mainnetBalance}
              isBalanceSyncing={isBalanceSyncing}
              portfolioValue={portfolioValue}
              moonPayLoading={moonPayLoading}
              verifyLoading={verifyLoading}
              kycStatus={user?.kycStatus}
              currency={currency}
              conversionRates={conversionRates}
              formatPublicKey={formatPublicKey}
              formatTransactionDate={formatTransactionDate}
              getTransactionIcon={getTransactionIcon}
              handleCopyAddress={handleCopyAddress}
              handleOpenUsernameModal={handleOpenUsernameModal}
              handleCloseUsernameCard={handleCloseUsernameCard}
              handleBalanceSync={handleBalanceSync}
              handleTopUpClick={handleTopUpClick}
              handleMoonPaySell={handleMoonPaySell}
              handleVerifyIdentity={handleVerifyIdentity}
              loadTransactionHistory={loadTransactionHistory}
              setShowSendModal={setShowSendModal}
              setShowReceiveModal={setShowReceiveModal}
              setShowSwapModal={setShowSwapModal}
            />
          ) : currentSection === 'Transactions' ? (
            <TransactionsSection
              t={t}
              wallet={wallet}
              user={user}
              userProfile={userProfile}
              transactions={transactions}
              transactionsLoading={transactionsLoading}
              transactionsError={transactionsError}
              filterState={filterState}
              mainnetBalance={mainnetBalance}
              portfolioValue={portfolioValue}
              isBalanceSyncing={isBalanceSyncing}
              formatPublicKey={formatPublicKey}
              formatTransactionDate={formatTransactionDate}
              getTransactionIcon={getTransactionIcon}
              getFilteredTransactions={getFilteredTransactions}
              toggleDropdown={toggleDropdown}
              setFilter={setFilter}
              setFilterState={setFilterState}
              loadTransactionHistory={loadTransactionHistory}
              handleCopyAddress={handleCopyAddress}
              handleOpenUsernameModal={handleOpenUsernameModal}
              handleCloseUsernameCard={handleCloseUsernameCard}
              handleBalanceSync={handleBalanceSync}
              handleTopUpClick={handleTopUpClick}
              handleMoonPaySell={handleMoonPaySell}
              setShowSendModal={setShowSendModal}
              setShowReceiveModal={setShowReceiveModal}
              setShowSwapModal={setShowSwapModal}
            />
          ) : currentSection === 'Wallet' ? (
            <WalletSection
              t={t}
              wallet={wallet}
              user={user}
              userProfile={userProfile}
              jupiterTokens={jupiterTokens}
              jupiterTokensLoading={jupiterTokensLoading}
              tokenPrices={tokenPrices}
              tokenPricesLoading={tokenPricesLoading}
              mainnetBalance={mainnetBalance}
              portfolioValue={portfolioValue}
              isBalanceSyncing={isBalanceSyncing}
              failedImages={failedImages}
              setFailedImages={setFailedImages}
              formatPublicKey={formatPublicKey}
              handleCopyAddress={handleCopyAddress}
              handleOpenUsernameModal={handleOpenUsernameModal}
              handleCloseUsernameCard={handleCloseUsernameCard}
              handleBalanceSync={handleBalanceSync}
              handleTopUpClick={handleTopUpClick}
              handleMoonPaySell={handleMoonPaySell}
              setShowSendModal={setShowSendModal}
              setShowReceiveModal={setShowReceiveModal}
              setShowSwapModal={setShowSwapModal}
            />
          ) : currentSection === 'Trade' ? (
            selectedTokenAddress ? (
              <TokenDetailSection
                t={t}
                tokenAddress={selectedTokenAddress}
                onBack={() => setSelectedTokenAddress(null)}
                onBuy={openSwapForToken}
              />
            ) : (
              <TradeSection
                t={t}
                jupiterTokens={jupiterTokens}
                jupiterTokensLoading={jupiterTokensLoading}
                tokenPrices={tokenPrices}
                tokenPricesLoading={tokenPricesLoading}
                tokenSearchQuery={tokenSearchQuery}
                setTokenSearchQuery={setTokenSearchQuery}
                tokenFilter={tokenFilter}
                setTokenFilter={setTokenFilter}
                appliedFilters={appliedFilters}
                hasActiveCustomFilters={hasActiveCustomFilters}
                setShowCustomFiltersModal={setShowCustomFiltersModal}
                failedImages={failedImages}
                setFailedImages={setFailedImages}
                setShowSwapModal={setShowSwapModal}
                onTokenSelect={setSelectedTokenAddress}
              />
            )
          ) : currentSection === 'Swap' ? (
            /* Swap/MoonPay Content */
            <div className="p-7">
              <div className="max-w-2xl mx-auto">
                <div className="text-center !mb-8">
                  <h2 className="text-white text-3xl font-bold !mb-4">{t.moonPay?.buySellTitle || 'Buy & Sell Crypto'}</h2>
                  <p className="text-[#636466] text-lg">{t.moonPay?.buySellSubtitle || 'Convert between fiat and crypto seamlessly with MoonPay'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 !gap-6 !mb-8">
                  {/* Buy Crypto Card */}
                  <div className="bg-gradient-to-br from-[#40E0D0]/10 to-[#40E0D0]/5 border border-[#40E0D0]/20 rounded-2xl !p-6">
                    <div className="flex items-center gap-4 !mb-4">
                      <div className="w-12 h-12 bg-[#40E0D0] rounded-full flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="#090A11" strokeWidth="2" fill="#090A11"/>
                          <path d="M9 12l2 2 4-4" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white text-xl font-semibold">{t.moonPay?.buyCrypto || 'Buy Crypto'}</h3>
                        <p className="text-[#636466] text-sm">{t.moonPay?.buyCryptoDesc || 'Purchase SOL with your bank card'}</p>
                      </div>
                    </div>

                    <div className="!space-y-3 !mb-6">
                      <div className="flex items-center gap-2 text-[#B3B5B6] text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t.moonPay?.instantPurchases || 'Instant purchases with credit/debit card'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#B3B5B6] text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t.moonPay?.directToWallet || 'Direct to your Solana wallet'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#B3B5B6] text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t.moonPay?.secureRegulated || 'Secure and regulated'}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleTopUpClick}
                      disabled={moonPayLoading}
                      className="w-full bg-[#40E0D0] text-[#090A11] !py-3 rounded-xl font-semibold hover:bg-[#40E0D0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {moonPayLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#090A11]"></div>
                          <span>{t.common?.openingMoonPay || 'Opening MoonPay...'}</span>
                        </div>
                      ) : (
                        t.moonPay?.buySol || 'Buy SOL'
                      )}
                    </button>
                  </div>

                  {/* Sell Crypto Card */}
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-2xl !p-6">
                    <div className="flex items-center gap-4 !mb-4">
                      <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#090A11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white text-xl font-semibold">{t.moonPay?.sellCrypto || 'Sell Crypto'}</h3>
                        <p className="text-[#636466] text-sm">{t.moonPay?.sellCryptoDesc || 'Convert SOL to your local currency'}</p>
                      </div>
                    </div>

                    <div className="!space-y-3 !mb-6">
                      <div className="flex items-center gap-2 text-[#B3B5B6] text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t.moonPay?.directBankTransfers || 'Direct bank transfers'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#B3B5B6] text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t.moonPay?.competitiveRates || 'Competitive exchange rates'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#B3B5B6] text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t.moonPay?.fastProcessing || 'Fast processing'}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleMoonPaySell}
                      disabled={moonPayLoading || !wallet || wallet.balance <= 0}
                      className="w-full bg-orange-500 text-white !py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {moonPayLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{t.common?.openingMoonPay || 'Opening MoonPay...'}</span>
                        </div>
                      ) : !wallet || wallet.balance <= 0 ? (
                        t.moonPay?.noSolToSell || 'No SOL to sell'
                      ) : (
                        t.moonPay?.sellSol || 'Sell SOL'
                      )}
                    </button>
                  </div>
                </div>

                {/* Current Balance Info */}
                {wallet && (
                  <div className="bg-[#131519] border border-[#2B2D30] rounded-xl !p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#636466] text-sm">{t.moonPay?.currentBalance || 'Current SOL Balance'}</p>
                        <p className="text-white text-xl font-semibold">{wallet.balance.toFixed(6)} SOL</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#636466] text-sm">{t.moonPay?.walletAddress || 'Wallet Address'}</p>
                        <p className="text-[#B3B5B6] text-sm font-mono">
                          {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Important Notices */}
                <div className="!space-y-4 !mt-6">
                  {/* Identity Verification Notice */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl !p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#090A11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-amber-400 font-semibold !mb-2">{t.moonPay?.identityVerification || 'Identity Verification Required'}</h4>
                        <p className="text-[#B3B5B6] text-sm">
                          {t.moonPay?.identityVerificationDesc || "To buy or sell crypto with MoonPay, you'll need to complete identity verification. This is a one-time process that helps ensure security and compliance with financial regulations."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Regional Availability Notice */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl !p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#090A11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#090A11"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-blue-400 font-semibold !mb-2">{t.moonPay?.regionalAvailability || 'Regional Availability'}</h4>
                        <p className="text-[#B3B5B6] text-sm">
                          {t.moonPay?.regionalAvailabilityDesc || 'MoonPay services are available in 160+ countries. If you see "Coming soon to your region", the service may not yet be available in your location.'}{' '}
                          <a href="https://support.moonpay.com/hc/en-gb/articles/4405195650065" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                            {t.moonPay?.supportedCountries || 'supported countries here'}
                          </a>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSection === "Staking" ? (
  <StakingSection authToken={authToken} />
) : currentSection === "Settings" ? (
  <div className="p-7">
    <SettingsContent />
  </div>
) : currentSection === "Launchpad" ? (
  <div className="p-7">
    <LaunchpadLayout innerItems={LAUNCHPAD_INNER_ITEMS} />
  </div>
) : currentSection === "Rewards" ? (
            <RewardsSection
              t={t}
              wallet={wallet}
              user={user}
              userProfile={userProfile}
              displayRewards={displayRewards}
              displayMoreRewards={displayMoreRewards}
              loadingYourRewards={loadingYourRewards}
              loadingMoreRewards={loadingMoreRewards}
              claiming={claiming}
              mainnetBalance={mainnetBalance}
              portfolioValue={portfolioValue}
              isBalanceSyncing={isBalanceSyncing}
              formatPublicKey={formatPublicKey}
              handleClaim={handleClaim}
              handleCopyAddress={handleCopyAddress}
              handleOpenUsernameModal={handleOpenUsernameModal}
              handleCloseUsernameCard={handleCloseUsernameCard}
              handleBalanceSync={handleBalanceSync}
              handleTopUpClick={handleTopUpClick}
              handleMoonPaySell={handleMoonPaySell}
              setShowSendModal={setShowSendModal}
              setShowReceiveModal={setShowReceiveModal}
              setShowSwapModal={setShowSwapModal}
            />
) : (
  /* Other sections placeholder */
  <div className="p-7 text-center">
    <h2 className="text-white text-xl !mb-4">{getTranslatedSectionTitle(currentSection)}</h2>
    <p className="text-[#636466]">This section is coming soon!</p>
  </div>
)
}
        </div>
      </div>
      
      {/* Modals */}
      {wallet && (
        <>
          <SendModal
            walletId={wallet.id}
            currentBalance={wallet.balance}
            currentWalletAddress={wallet.publicKey}
            isOpen={showSendModal}
            onClose={() => setShowSendModal(false)}
            onSuccess={handleSendSuccess}
          />
          
          <ReceiveModal
            walletAddress={wallet.publicKey}
            isOpen={showReceiveModal}
            onClose={() => setShowReceiveModal(false)}
          />

          <SwapModal
            walletId={wallet.id}
            isOpen={showSwapModal}
            initialOutputMint={swapOutputMint}
            onClose={() => {
              setShowSwapModal(false);
              setSwapOutputMint(undefined);
            }}
            onSuccess={handleSwapSuccess}
            onNavigateToWallet={() => setCurrentSection('Wallet')}
          />

          <UsernameModal
            isOpen={showUsernameModal}
            onClose={() => setShowUsernameModal(false)}
            onUsernameSet={handleUsernameSet}
            onShowSuccess={showSuccess}
            onShowError={showError}
          />
        </>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onNotificationClick={handleNotificationClick}
      />

      {/* Top Up Modal */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onFiatTopUp={handleFiatTopUp}
        onBankTransfer={() => { setShowTopUpModal(false); setShowFiatModal(true); }}
      />

      {/* Fiat Bank Transfer Modal (Transak) */}
      {wallet && authToken && (
        <FiatFlowModal
          isOpen={showFiatModal}
          onClose={() => setShowFiatModal(false)}
          walletId={wallet.id}
          walletAddress={wallet.publicKey}
          authToken={authToken}
        />
      )}

      {/* Custom Filters Modal for Trade */}
      <CustomFiltersModal
        isOpen={showCustomFiltersModal}
        onClose={() => setShowCustomFiltersModal(false)}
        customFilters={customFilters}
        setCustomFilters={setCustomFilters}
        onApply={() => {
          setAppliedFilters({ ...customFilters });
          setShowCustomFiltersModal(false);
        }}
        onClearAll={() => {
          const emptyFilters = {
            liquidityMin: '',
            liquidityMax: '',
            volumeMin: '',
            volumeMax: '',
            marketCapMin: '',
            marketCapMax: '',
          };
          setCustomFilters(emptyFilters);
          setAppliedFilters(emptyFilters);
          setShowCustomFiltersModal(false);
        }}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        position={toast.position}
      />
    </div>
  );
};