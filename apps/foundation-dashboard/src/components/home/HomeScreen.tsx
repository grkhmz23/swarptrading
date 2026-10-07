'use client';

import React, { useState, useEffect, useCallback } from 'react';

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
import { isMoonPaySandboxAvailable, openMoonPaySandboxBuy } from '@/services/moonpay';
import { veriffService } from '@/services/veriff';
import { isLikelySolanaAddress } from '@/lib/solana';
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
  WalletTokenBalance,
} from '@/types/home';
import { getAccessToken } from '@/lib/session';
import { errorMessage } from '@/lib/http';
import { readJson } from '@/lib/storage';

const DASHBOARD_SECTIONS = ['Home', 'Wallet', 'Trade', 'Transactions', 'Rewards', 'Staking', 'Settings', 'Launchpad'];

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
    /** The user closed the "create a username" card this session. */
    usernamePromptDismissed?: boolean;
  } | null>(null);
  const [currentSection, setCurrentSection] = useState<string>('Home');
  const [hasInitializedSection, setHasInitializedSection] = useState(false);
  const [moonPayLoading, setMoonPayLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [fiatModalTab, setFiatModalTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [walletStale, setWalletStale] = useState(false);
  const [walletTokenBalances, setWalletTokenBalances] = useState<WalletTokenBalance[]>([]);
  const [hasCompletedSwap, setHasCompletedSwap] = useState(false);
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
  


// Get currency from Redux

// Conversion rates
// USD-based FX rates from the backend; null until loaded (prices then stay in USD).
const [conversionRates, setConversionRates] = useState<{ USD: number; EUR: number | null; GBP: number | null }>({
  USD: 1,
  EUR: null,
  GBP: null,
});

useEffect(() => {
  const fetchRates = async () => {
    try {
      const response = await apiService.getExchangeRates();
      const rates = response.success ? response.data?.rates : undefined;
      const valid = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null);
      setConversionRates({ USD: 1, EUR: valid(rates?.EUR), GBP: valid(rates?.GBP) });
    } catch {
      // Keep USD only.
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



  // Restore the last visited section on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedSection = localStorage.getItem('swarp_fd_dashboard_section');
    if (storedSection && DASHBOARD_SECTIONS.includes(storedSection)) {
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
      setChartData(Array.isArray(data) ? data : []);
    } catch {
      // No price history available: the chart shows its empty state.
      setChartData([]);
    }
  }, [selectedPeriod]);

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
      const sorted = [...(data.transactions || [])].sort(
        (x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime()
      );
      setTransactions(sorted);
    } catch (error: unknown) {
      setTransactionsError(errorMessage(error, 'Failed to load transactions'));
    } finally {
      setTransactionsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    loadWalletData();
    loadUserProfile();
    loadMarketData();
    loadChartData();

    // Refresh price and balance (incoming transfers, completed purchases) while the tab is visible.
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadMarketData();
      loadWalletData();
    }, 30000);

    return () => clearInterval(interval);
    // Mount-only: the loaders read the latest state themselves.
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
    const token = getAccessToken();
    if (!token) {
      setError('Your session has expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    // Show the last known wallet immediately; it is marked stale if the API cannot confirm it.
    const cachedRaw = readJson<WalletData>('swarp_fd_wallet');
    const known = wallet ?? (cachedRaw.id && cachedRaw.publicKey ? (cachedRaw as WalletData) : null);
    if (!wallet && known) setWallet(known);

    try {
      const wallets = await apiService.getUserWallets(token);
      if (wallets.length > 0) {
        setWallet(wallets[0]);
        setWalletStale(false);
        setError(null);
        localStorage.setItem('swarp_fd_wallet', JSON.stringify(wallets[0]));

        try {
          const balances = await apiService.getTokenBalances(wallets[0].id, token);
          if (typeof balances?.portfolioValue === 'number') setPortfolioValue(balances.portfolioValue);
          setWalletTokenBalances(Array.isArray(balances?.balances) ? balances.balances : []);
        } catch {
          // Token balances are optional on top of the SOL balance.
        }

        try {
          const swaps = await apiService.getSwapHistory(wallets[0].id, token, { limit: 1, status: 'COMPLETED' });
          setHasCompletedSwap((swaps?.total ?? swaps?.swaps?.length ?? 0) > 0);
        } catch {
          // Progress card simply keeps the step open.
        }
      } else {
        setWallet(null);
        setError('No wallet found for this account.');
      }
    } catch (error: unknown) {
      if (known) setWalletStale(true);
      else setError(errorMessage(error, 'Failed to load wallet data'));
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
    } catch {
      // Keep the last real price if we had one; otherwise the UI shows "price unavailable".
      setMarketData((previous) => previous);
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
    if (Number.isNaN(date.getTime())) return '';
    // Compare calendar days, not 24h windows.
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / (24 * 60 * 60 * 1000));

    if (diffDays <= 0) return t.common?.today || 'Today';
    if (diffDays === 1) return t.common?.yesterday || 'Yesterday';
    if (diffDays < 7) return (t.common?.daysAgo || '{days} days ago').replace('{days}', String(diffDays));
    return date.toLocaleDateString();
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
    if (!userProfile?.username) {
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
          passesCurrencyFilter = !transaction.tokenMint;
          break;
        case 'tokens':
          passesCurrencyFilter = Boolean(transaction.tokenMint);
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
    setUserProfile(prev => prev ? { ...prev, usernamePromptDismissed: true } : null);
  };

  // Fiat on/off-ramp
  const handleTopUpClick = () => {
    setShowTopUpModal(true);
  };

  /** Card purchase: MoonPay sandbox when configured, otherwise the backend-signed Transak flow. */
  const handleFiatTopUp = async () => {
    setShowTopUpModal(false);
    if (!wallet) {
      showError(t.moonPay?.walletNotAvailable || 'Wallet not available', 'top-right');
      return;
    }
    if (!isMoonPaySandboxAvailable()) {
      setFiatModalTab('deposit');
      setShowFiatModal(true);
      return;
    }
    setMoonPayLoading(true);
    try {
      await openMoonPaySandboxBuy(wallet.publicKey);
      // Funds arrive on-chain; the balance refresh picks them up.
      loadWalletData();
      loadTransactionHistory();
    } catch (error: unknown) {
      showError(errorMessage(error, 'Failed to open MoonPay'), 'top-right');
    } finally {
      setMoonPayLoading(false);
    }
  };

  /** Withdraw to a bank account through the backend-signed Transak sell flow. */
  const handleWithdraw = () => {
    if (!wallet || !authToken) {
      showError(t.moonPay?.walletNotAvailable || 'Wallet not available', 'top-right');
      return;
    }
    setFiatModalTab('withdraw');
    setShowFiatModal(true);
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

        {walletStale && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 !px-4 !py-2 flex items-center justify-between gap-3" role="status">
            <p className="text-yellow-300 text-sm">Could not reach the server. Balances shown may be out of date.</p>
            <button type="button" onClick={handleRefresh} className="text-[#40E0D0] text-sm font-medium shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Main Content Area - Two Column Layout - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {currentSection === 'Home' ? (
            <HomeSection
              t={t}
              wallet={wallet}
              hasCompletedSwap={hasCompletedSwap}
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
              handleTopUpClick={handleTopUpClick}
              handleWithdraw={handleWithdraw}
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
              portfolioValue={portfolioValue}
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
              handleTopUpClick={handleTopUpClick}
              handleWithdraw={handleWithdraw}
              setShowSendModal={setShowSendModal}
              setShowReceiveModal={setShowReceiveModal}
              setShowSwapModal={setShowSwapModal}
            />
          ) : currentSection === 'Wallet' ? (
            <WalletSection
              t={t}
              wallet={wallet}
              tokenBalances={walletTokenBalances}
              user={user}
              userProfile={userProfile}
              jupiterTokens={jupiterTokens}
              jupiterTokensLoading={jupiterTokensLoading}
              tokenPrices={tokenPrices}
              tokenPricesLoading={tokenPricesLoading}
              portfolioValue={portfolioValue}
              failedImages={failedImages}
              setFailedImages={setFailedImages}
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
              portfolioValue={portfolioValue}
              formatPublicKey={formatPublicKey}
              handleClaim={handleClaim}
              handleCopyAddress={handleCopyAddress}
              handleOpenUsernameModal={handleOpenUsernameModal}
              handleCloseUsernameCard={handleCloseUsernameCard}
              handleTopUpClick={handleTopUpClick}
              handleWithdraw={handleWithdraw}
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
        onBankTransfer={() => { setShowTopUpModal(false); setFiatModalTab('deposit'); setShowFiatModal(true); }}
      />

      {/* Fiat Bank Transfer Modal (Transak) */}
      {wallet && authToken && (
        <FiatFlowModal
          isOpen={showFiatModal}
          onClose={() => setShowFiatModal(false)}
          walletId={wallet.id}
          walletAddress={wallet.publicKey}
          authToken={authToken}
          initialTab={fiatModalTab}
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