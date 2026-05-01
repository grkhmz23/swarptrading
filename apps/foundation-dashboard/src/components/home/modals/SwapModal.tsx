'use client';

import React, {useCallback, useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import Image from 'next/image';
import { useT } from '@/i18n/I18nProvider';
interface SwapModalProps {
  walletId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onNavigateToWallet?: () => void;
}

interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  minimumOutputAmount: number;
  priceImpact: number;
  fees: {
    jupiterFee: number;
    networkFee: number;
    total: number;
  };
  validUntil: number;
  route: unknown;
}

interface TokenBalance {
  token: string;
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  mint: string;
  decimals: number;
}

interface JupiterToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isVerified?: boolean;
}

type SwapState = 'initial' | 'quote' | 'success';

export const SwapModal: React.FC<SwapModalProps> = ({
  walletId,
  isOpen,
  onClose,
  onSuccess,
  onNavigateToWallet,
}) => {
  const t = useT();
  const [inputToken, setInputToken] = useState('SOL');
  const [outputToken, setOutputToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippageTolerance] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [swapState, setSwapState] = useState<SwapState>('initial');
  const [swapResult, setSwapResult] = useState<{ inputAmount: number; outputAmount: number; inputToken: string; outputToken: string } | null>(null);
  const { toast, showError, hideToast } = useToast();

  // Dynamic token list from Jupiter API
  const [availableTokens, setAvailableTokens] = useState<JupiterToken[]>([]);

  // Custom dropdown state
  const [showInputDropdown, setShowInputDropdown] = useState(false);
  const [showOutputDropdown, setShowOutputDropdown] = useState(false);
  const [tokenSearchInput, setTokenSearchInput] = useState('');
  const [tokenSearchOutput, setTokenSearchOutput] = useState('');

  // Filter tokens based on search
  const filteredInputTokens = availableTokens.filter(token =>
    token.symbol.toLowerCase().includes(tokenSearchInput.toLowerCase()) ||
    token.name.toLowerCase().includes(tokenSearchInput.toLowerCase())
  );
  const filteredOutputTokens = availableTokens.filter(token =>
    token.symbol.toLowerCase().includes(tokenSearchOutput.toLowerCase()) ||
    token.name.toLowerCase().includes(tokenSearchOutput.toLowerCase())
  );

// Fetch tokens from Jupiter API
const loadTokens = useCallback(async () => {
  try {
    console.log('[SwapModal] Fetching tokens from API...');
    const response = await apiService.getAllJupiterTokens({ limit: 500 });
    console.log('[SwapModal] API response:', response.tokens?.length, 'tokens');
    if (response.tokens && response.tokens.length > 0) {
      setAvailableTokens(response.tokens);
    } else {
      console.warn('[SwapModal] API returned empty tokens, using fallback');
      setAvailableTokens([
        { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9 },
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether', decimals: 6 },
      ]);
    }
  } catch (err) {
    console.error("[SwapModal] Failed to fetch tokens:", err);
    // Fallback to basic tokens if API fails
    setAvailableTokens([
      { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9 },
      { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether', decimals: 6 },
    ]);
  }
}, []);

const loadInitialData = useCallback(async () => {
  try {
    const token = localStorage.getItem("swarp_fd_access_token");
    if (!token) return;

    const balances = await apiService
      .getSwapTokenBalances(walletId, token)
      .catch((err) => {
        console.error("Failed to fetch token balances:", err);
        return [];
      });

    const balanceArray = Array.isArray(balances)
      ? balances
      : (balances as { balances?: TokenBalance[] })?.balances || [];

    setTokenBalances(balanceArray);
  } catch (error) {
    console.error("Error loading initial data:", error);
  }
}, [walletId]);
  // Load tokens on first open
  useEffect(() => {
    if (isOpen && availableTokens.length === 0) {
      loadTokens();
    }
    console.log('[SwapModal] availableTokens state:', availableTokens.length);
  }, [isOpen, availableTokens.length, loadTokens]);

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setSwapState('initial');
      setAmount('');
      setQuote(null);
      setSwapResult(null);
      setError(null);
    }
  }, [isOpen, loadInitialData]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  const getQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsGettingQuote(true);
    setError(null);

    try {
      const token = localStorage.getItem('swarp_fd_access_token');
      if (!token) {
        setError(t.modals?.swap?.errors?.authRequired || 'Authentication required');
        return;
      }

      // Get swap quote from API (routes to Jupiter or Raydium based on pair)
      const quoteData = await apiService.getSwapQuote(walletId, token, {
        inputToken,
        outputToken,
        amount: parseFloat(amount),
        slippageTolerance,
      });

      setQuote(quoteData);
      setSwapState('quote');
    } catch (error: unknown) {
      console.error('Error getting quote:', error);
      setError((error as Error).message || t.modals?.swap?.errors?.failedToGetQuote || 'Failed to get swap quote');
      setQuote(null);
    } finally {
      setIsGettingQuote(false);
    }
  };

  const handleSwap = async () => {
    if (!quote || !amount) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('swarp_fd_access_token');
      if (!token) {
        setError(t.modals?.swap?.errors?.authRequired || 'Authentication required');
        return;
      }

      // Execute swap via API (routes to Jupiter or Raydium based on pair)
      const result = await apiService.executeSwap(walletId, token, {
        inputToken,
        outputToken,
        amount: parseFloat(amount),
      });

      if (result.success) {
        setSwapResult({
          inputAmount: parseFloat(amount),
          outputAmount: result.actualOutputAmount || quote.outputAmount,
          inputToken,
          outputToken
        });
        setSwapState('success');
        onSuccess(`Swap completed: ${result.actualOutputAmount || quote.outputAmount} ${outputToken} received`);
      } else {
        setError(result.error || t.modals?.swap?.errors?.swapFailed || 'Swap failed');
      }
    } catch (error: unknown) {
      console.error('Swap error:', error);
      setError((error as Error).message || t.modals?.swap?.errors?.failedToExecute || 'Failed to execute swap');
      showError((t.modals?.swap?.errors?.swapFailedWithReason || 'Swap failed: {reason}').replace('{reason}', (error as Error).message));
    } finally {
      setIsLoading(false);
    }
  };

  const swapTokens = () => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setAmount('');
    setQuote(null);
    setSwapState('initial');
    setShowInputDropdown(false);
    setShowOutputDropdown(false);
  };

  // Close dropdowns when clicking outside
  const closeDropdowns = () => {
    setShowInputDropdown(false);
    setShowOutputDropdown(false);
    setTokenSearchInput('');
    setTokenSearchOutput('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };

  const getTokenBalance = (symbol: string) => {
    const balance = Array.isArray(tokenBalances)
      ? tokenBalances.find(b => b.symbol === symbol)
      : null;
    return balance ? balance.balance : 0;
  };

  // Token icon component with proper fallback to initials
  const TokenIcon = ({ symbol, size = 20 }: { symbol: string; size?: number }) => {
    const [imageError, setImageError] = React.useState(false);
    const token = availableTokens.find(t => t.symbol === symbol);
    const sanitizedLogoURI = token?.logoURI?.trim().replace(/[\s\x00-\x1F\x7F]/g, '');

    // Get initials - first letter of symbol, or first 2 letters for longer symbols
    const getInitials = (sym: string) => {
      if (sym.length <= 2) return sym;
      return sym.charAt(0);
    };

    if (sanitizedLogoURI && !imageError) {
      return (
        <Image
          src={sanitizedLogoURI}
          alt={token?.name || symbol}
          width={size}
          height={size}
          className="inline-block rounded-full"
          unoptimized
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback to styled initials
    return (
      <div
        className="inline-flex items-center justify-center rounded-full bg-[#2B2D30] text-white font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {getInitials(symbol)}
      </div>
    );
  };

  const getTokenIcon = (symbol: string) => {
    return <TokenIcon symbol={symbol} size={20} />;
  };

  const handleGoToWallet = () => {
    onClose();
    // Reset state for next use
    setSwapState('initial');
    setAmount('');
    setQuote(null);
    setSwapResult(null);
    setError(null);
    // Navigate to wallet page
    onNavigateToWallet?.();
  };

  if (!isOpen) return null;

  return (
    <>
      {toast && <Toast {...toast} onClose={hideToast} />}
      
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center !p-4 z-50 overflow-y-auto" onClick={closeDropdowns}>
        <div className="bg-[#1A1D21] border border-[#2B2D30] rounded-2xl !p-6 w-full max-w-md my-auto min-h-fit max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between !mb-6">
            <h2 className="text-xl font-semibold text-white">{t.modals?.swap?.title || "Swap"}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {swapState === 'initial' && (
            <div className="!space-y-4">
              {/* You Pay Section */}
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30]">
                <div className="flex justify-between items-center !mb-3">
                  <span className="text-sm text-gray-400">{t.modals?.swap?.youPay || "You Pay"}</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInputDropdown(!showInputDropdown);
                        setShowOutputDropdown(false);
                        setTokenSearchInput('');
                      }}
                      className="flex items-center gap-2 bg-[#2B2D30] rounded-lg !px-3 !py-1.5 hover:bg-[#3B3D40] transition-colors"
                    >
                      <span className="text-lg">{getTokenIcon(inputToken)}</span>
                      <span className="text-white text-sm">{inputToken}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showInputDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showInputDropdown && (
                      <div className="absolute right-0 top-full !mt-2 w-64 bg-[#1A1D21] border border-[#2B2D30] rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="!p-2 border-b border-[#2B2D30]">
                          <input
                            type="text"
                            placeholder="Search token..."
                            value={tokenSearchInput}
                            onChange={(e) => setTokenSearchInput(e.target.value)}
                            className="w-full bg-[#131519] text-white text-sm rounded-lg !px-3 !py-2 outline-none border border-[#2B2D30] focus:border-[#40E0D0]"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredInputTokens.length === 0 ? (
                            <div className="!px-4 !py-3 text-center text-gray-400 text-sm">No tokens found</div>
                          ) : (
                            filteredInputTokens.map(token => (
                              <button
                                key={token.address}
                                type="button"
                                onClick={() => {
                                  setInputToken(token.symbol);
                                  setQuote(null);
                                  setSwapState('initial');
                                  setShowInputDropdown(false);
                                  setTokenSearchInput('');
                                }}
                                className={`w-full flex items-center gap-3 !px-4 !py-2.5 hover:bg-[#2B2D30] transition-colors text-left ${
                                  token.symbol === inputToken ? 'bg-[#2B2D30]' : ''
                                }`}
                              >
                                <span className="text-lg">{getTokenIcon(token.symbol)}</span>
                                <div>
                                  <div className="text-white text-sm font-medium">{token.symbol}</div>
                                  <div className="text-gray-400 text-xs">{token.name}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`0 ${inputToken}`}
                      className="bg-transparent text-white text-2xl font-medium placeholder-gray-500 w-full outline-none"
                      step="any"
                      min="0"
                    />
                  </div>
                  <div className="text-sm text-gray-400">
                    {t.modals?.swap?.available || "Available"}: {getTokenBalance(inputToken).toFixed(6)} {inputToken}
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  onClick={swapTokens}
                  className="bg-[#40E0D0] hover:bg-[#40E0D0]/90 rounded-full !p-3 transition-colors"
                >
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* You Receive Section */}
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30]">
                <div className="flex justify-between items-center !mb-3">
                  <span className="text-sm text-gray-400">{t.modals?.swap?.youReceive || "You Receive"}</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOutputDropdown(!showOutputDropdown);
                        setShowInputDropdown(false);
                        setTokenSearchOutput('');
                      }}
                      className="flex items-center gap-2 bg-[#2B2D30] rounded-lg !px-3 !py-1.5 hover:bg-[#3B3D40] transition-colors"
                    >
                      <span className="text-lg">{getTokenIcon(outputToken)}</span>
                      <span className="text-white text-sm">{outputToken}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showOutputDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showOutputDropdown && (
                      <div className="absolute right-0 top-full !mt-2 w-64 bg-[#1A1D21] border border-[#2B2D30] rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="!p-2 border-b border-[#2B2D30]">
                          <input
                            type="text"
                            placeholder="Search token..."
                            value={tokenSearchOutput}
                            onChange={(e) => setTokenSearchOutput(e.target.value)}
                            className="w-full bg-[#131519] text-white text-sm rounded-lg !px-3 !py-2 outline-none border border-[#2B2D30] focus:border-[#40E0D0]"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredOutputTokens.length === 0 ? (
                            <div className="!px-4 !py-3 text-center text-gray-400 text-sm">No tokens found</div>
                          ) : (
                            filteredOutputTokens.map(token => (
                              <button
                                key={token.address}
                                type="button"
                                onClick={() => {
                                  setOutputToken(token.symbol);
                                  setQuote(null);
                                  setSwapState('initial');
                                  setShowOutputDropdown(false);
                                  setTokenSearchOutput('');
                                }}
                                className={`w-full flex items-center gap-3 !px-4 !py-2.5 hover:bg-[#2B2D30] transition-colors text-left ${
                                  token.symbol === outputToken ? 'bg-[#2B2D30]' : ''
                                }`}
                              >
                                <span className="text-lg">{getTokenIcon(token.symbol)}</span>
                                <div>
                                  <div className="text-white text-sm font-medium">{token.symbol}</div>
                                  <div className="text-gray-400 text-xs">{token.name}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl text-white font-medium">
                    {quote ? formatCurrency(quote.outputAmount) : '0'} {outputToken}
                  </div>
                  <div className="text-sm text-gray-400">
                    {t.modals?.swap?.available || "Available"}: {getTokenBalance(outputToken).toFixed(6)} {outputToken}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg !p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Swap Now Button */}
              <button
                onClick={getQuote}
                disabled={
                  isGettingQuote || 
                  !amount || 
                  parseFloat(amount) <= 0 ||
                  inputToken === outputToken
                }
                className={`w-full !py-4 !px-4 rounded-xl font-medium transition-all ${
                  isGettingQuote || !amount || parseFloat(amount) <= 0 || inputToken === outputToken
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-[#40E0D0] hover:bg-[#40E0D0]/90 text-black'
                }`}
              >
                {isGettingQuote ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    {t.modals?.swap?.loading || "Loading..."}
                  </div>
                ) : !amount || parseFloat(amount) <= 0 ? (
                  t.modals?.swap?.enterAmount || 'Enter amount'
                ) : inputToken === outputToken ? (
                  t.modals?.swap?.selectDifferentTokens || 'Select different tokens'
                ) : (
                  t.modals?.swap?.swapNow || 'Swap now'
                )}
              </button>
            </div>
          )}

          {swapState === 'quote' && quote && (
            <div className="!space-y-4">
              {/* You Pay Section */}
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30]">
                <div className="flex justify-between items-center !mb-3">
                  <span className="text-sm text-gray-400">{t.modals?.swap?.youPay || "You Pay"}</span>
                  <div className="flex items-center gap-1 bg-[#2B2D30] rounded-lg !px-2 !py-1">
                    {/* <span className="text-lg">{getTokenIcon(inputToken)}</span> */}
                    <span className="text-sm text-white">{inputToken}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {/* <span className="text-2xl text-white !mr-2">$</span> */}
                    <span className="text-2xl text-white font-medium">{amount}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {t.modals?.swap?.available || "Available"}: {getTokenBalance(inputToken).toFixed(6)} {inputToken}
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <div className="bg-[#40E0D0] rounded-full !p-3">
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>

              {/* You Receive Section */}
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30]">
                <div className="flex justify-between items-center !mb-3">
                  <span className="text-sm text-gray-400">{t.modals?.swap?.youReceive || "You Receive"}</span>
                  <div className="flex items-center gap-1 bg-[#2B2D30] rounded-lg !px-2 !py-1">
                    <span className="text-lg">{getTokenIcon(outputToken)}</span>
                    <span className="text-sm text-white">{outputToken}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl text-white font-medium">
                    {formatCurrency(quote.outputAmount)} {outputToken}
                  </div>
                  <div className="text-sm text-gray-400">
                    {t.modals?.swap?.available || "Available"}: {getTokenBalance(outputToken).toFixed(6)} {outputToken}
                  </div>
                </div>
              </div>

              {/* Devnet Warning for Jupiter swaps */}
              {inputToken !== 'SWARP' && outputToken !== 'SWARP' && process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' && (
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg !p-3 !mb-3">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Jupiter swaps only work on mainnet. On devnet, only SWARP token swaps (via Raydium) are available.
                  </p>
                </div>
              )}

              {/* Quote Details */}
              <div className="!space-y-3 !py-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.provider || "Provider"}</span>
                  <span className="text-white">
                    {inputToken === 'SWARP' || outputToken === 'SWARP' ? 'Raydium' : 'Jupiter'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.rate || "Rate"}</span>
                  <span className="text-white">1 {outputToken} ≈ ${(quote.inputAmount / quote.outputAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.fee || "Fee"}</span>
                  <span className="text-white">${quote.fees.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.slippage || "Slippage"}</span>
                  <span className="text-white">{(quote.priceImpact || 0.1).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.deliveryTime || "Delivery time"}</span>
                  <span className="text-white">{t.modals?.swap?.approxMinute || "≈ 1 minute"}</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg !p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Swap Now Button */}
              <button
                onClick={handleSwap}
                disabled={isLoading}
                className={`w-full !py-4 !px-4 rounded-xl font-medium transition-all ${
                  isLoading
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-[#40E0D0] hover:bg-[#40E0D0]/90 text-black'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    {t.modals?.swap?.processing || "Processing..."}
                  </div>
                ) : (
                  t.modals?.swap?.swapNow || 'Swap now'
                )}
              </button>
            </div>
          )}

          {swapState === 'success' && swapResult && (
            <div className="text-center !space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="bg-[#40E0D0] rounded-full !p-4">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Success Message */}
              <div>
                <h3 className="text-xl font-semibold text-white !mb-2">{t.modals?.swap?.conversionSuccessful || "Swap successful!"}</h3>
                <p className="text-gray-400 text-sm">
                  {t.modals?.swap?.swappedMessage || "You've swapped"} <span className="text-white font-medium">{swapResult.inputAmount.toFixed(6)} {swapResult.inputToken}</span> {t.modals?.swap?.into || "for"}{' '}
                  <span className="text-white font-medium">{swapResult.outputAmount.toFixed(6)} {swapResult.outputToken}</span> {t.modals?.swap?.via || "via"}{' '}
                  <span className="text-white">{swapResult.inputToken === 'SWARP' || swapResult.outputToken === 'SWARP' ? 'Raydium' : 'Jupiter'}</span>
                </p>
                <p className="text-gray-400 text-sm !mt-2">
                  {t.modals?.swap?.walletUpdated || "Your wallet has been updated, and you can now send, receive or withdraw your funds."}
                </p>
              </div>

              {/* Go to Wallet Button */}
              <button
                onClick={handleGoToWallet}
                className="w-full !py-4 !px-4 rounded-xl font-medium bg-[#40E0D0] hover:bg-[#40E0D0]/90 text-black transition-all"
              >
                {t.modals?.swap?.goToWallet || "Go to wallet"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};