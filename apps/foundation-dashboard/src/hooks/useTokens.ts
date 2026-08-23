'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '@/services/api';
import { JupiterToken, TokenFilter, CustomFilters } from '@/types/home';

interface TokenPrices {
  [symbol: string]: {
    price: number;
    priceChange24h?: number;
  };
}

interface UseTokensReturn {
  jupiterTokens: JupiterToken[];
  jupiterTokensLoading: boolean;
  tokenPrices: TokenPrices;
  tokenPricesLoading: boolean;
  tokenSearchQuery: string;
  tokenFilter: TokenFilter;
  customFilters: CustomFilters;
  appliedFilters: CustomFilters;
  showCustomFiltersModal: boolean;
  hasActiveCustomFilters: boolean;
  failedImages: Set<string>;
  setTokenSearchQuery: (query: string) => void;
  setTokenFilter: (filter: TokenFilter) => void;
  setCustomFilters: React.Dispatch<React.SetStateAction<CustomFilters>>;
  setAppliedFilters: React.Dispatch<React.SetStateAction<CustomFilters>>;
  setShowCustomFiltersModal: (show: boolean) => void;
  handleImageError: (address: string) => void;
  getFilteredTokens: () => JupiterToken[];
  applyCustomFilters: () => void;
  clearCustomFilters: () => void;
}

const defaultFilters: CustomFilters = {
  liquidityMin: '',
  liquidityMax: '',
  volumeMin: '',
  volumeMax: '',
  marketCapMin: '',
  marketCapMax: '',
};

export const useTokens = (): UseTokensReturn => {
  const [jupiterTokens, setJupiterTokens] = useState<JupiterToken[]>([]);
  const [jupiterTokensLoading, setJupiterTokensLoading] = useState(true);
  const [tokenPrices, setTokenPrices] = useState<TokenPrices>({});
  const [tokenPricesLoading, setTokenPricesLoading] = useState(true);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [customFilters, setCustomFilters] = useState<CustomFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<CustomFilters>(defaultFilters);
  const [showCustomFiltersModal, setShowCustomFiltersModal] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const hasActiveCustomFilters = Object.values(appliedFilters).some(v => v !== '');

  const fetchJupiterTokens = useCallback(async () => {
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
  }, []);

  const fetchTokenPrices = useCallback(async (isInitial = false) => {
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
  }, [jupiterTokens]);

  const handleImageError = useCallback((address: string) => {
    setFailedImages(prev => new Set(prev).add(address));
  }, []);

  const applyCustomFilters = useCallback(() => {
    setAppliedFilters({ ...customFilters });
    setShowCustomFiltersModal(false);
  }, [customFilters]);

  const clearCustomFilters = useCallback(() => {
    setCustomFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setShowCustomFiltersModal(false);
  }, []);

  const getFilteredTokens = useCallback(() => {
    let filtered = [...jupiterTokens];

    // Apply search filter
    if (tokenSearchQuery) {
      const query = tokenSearchQuery.toLowerCase();
      filtered = filtered.filter(token =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    }

    // Apply preset filters
    switch (tokenFilter) {
      case 'gainers':
        filtered = filtered.filter(t => (t.priceChange24h || 0) > 0)
          .sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0));
        break;
      case 'losers':
        filtered = filtered.filter(t => (t.priceChange24h || 0) < 0)
          .sort((a, b) => (a.priceChange24h || 0) - (b.priceChange24h || 0));
        break;
      case 'volume':
        filtered = filtered.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
        break;
      case 'new':
        filtered = filtered.filter(t => t.listingTime && Date.now() - t.listingTime < 7 * 24 * 60 * 60 * 1000)
          .sort((a, b) => (b.listingTime || 0) - (a.listingTime || 0));
        break;
    }

    // Apply custom filters
    if (appliedFilters.liquidityMin) {
      const min = parseFloat(appliedFilters.liquidityMin);
      filtered = filtered.filter(t => (t.liquidity || 0) >= min);
    }
    if (appliedFilters.liquidityMax) {
      const max = parseFloat(appliedFilters.liquidityMax);
      filtered = filtered.filter(t => (t.liquidity || 0) <= max);
    }
    if (appliedFilters.volumeMin) {
      const min = parseFloat(appliedFilters.volumeMin);
      filtered = filtered.filter(t => (t.volume24h || 0) >= min);
    }
    if (appliedFilters.volumeMax) {
      const max = parseFloat(appliedFilters.volumeMax);
      filtered = filtered.filter(t => (t.volume24h || 0) <= max);
    }
    if (appliedFilters.marketCapMin) {
      const min = parseFloat(appliedFilters.marketCapMin);
      filtered = filtered.filter(t => (t.mcap || 0) >= min);
    }
    if (appliedFilters.marketCapMax) {
      const max = parseFloat(appliedFilters.marketCapMax);
      filtered = filtered.filter(t => (t.mcap || 0) <= max);
    }

    return filtered;
  }, [jupiterTokens, tokenSearchQuery, tokenFilter, appliedFilters]);

  useEffect(() => {
    fetchJupiterTokens();
  }, [fetchJupiterTokens]);

  // Fetch token prices when tokens are loaded
  useEffect(() => {
    fetchTokenPrices(true);

    // Refresh prices every 30 seconds
    const interval = setInterval(() => fetchTokenPrices(false), 30000);
    return () => clearInterval(interval);
  }, [fetchTokenPrices]);

  return {
    jupiterTokens,
    jupiterTokensLoading,
    tokenPrices,
    tokenPricesLoading,
    tokenSearchQuery,
    tokenFilter,
    customFilters,
    appliedFilters,
    showCustomFiltersModal,
    hasActiveCustomFilters,
    failedImages,
    setTokenSearchQuery,
    setTokenFilter,
    setCustomFilters,
    setAppliedFilters,
    setShowCustomFiltersModal,
    handleImageError,
    getFilteredTokens,
    applyCustomFilters,
    clearCustomFilters,
  };
};
