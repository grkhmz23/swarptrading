'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n/I18nProvider';
import Image from 'next/image';

interface TokenBalance {
  token: string;
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  mint: string;
  decimals: number;
  logoURI?: string;
}

interface JupiterToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isVerified?: boolean;
}

interface SendModalProps {
  walletId: string;
  currentBalance: number;
  currentWalletAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

// Default SOL token (always available)
const SOL_TOKEN: TokenBalance = {
  token: 'SOL',
  symbol: 'SOL',
  name: 'Solana',
  balance: 0,
  usdValue: 0,
  mint: '',
  decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
};

export const SendModal: React.FC<SendModalProps> = ({
  walletId,
  currentBalance,
  currentWalletAddress,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const t = useT();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidationMessage, setAddressValidationMessage] = useState<string | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast, showSuccess, showError, hideToast } = useToast();

  // Token selection state - dynamically populated from Jupiter API
  const [selectedToken, setSelectedToken] = useState<TokenBalance>({ ...SOL_TOKEN, balance: currentBalance });
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [jupiterTokens, setJupiterTokens] = useState<JupiterToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Load tokens from Jupiter API (same as SwapModal)
  const loadJupiterTokens = useCallback(async () => {
    try {
      const response = await apiService.getAllJupiterTokens({ limit: 500 });
      setJupiterTokens(response.tokens);
    } catch (err) {
      console.error("Failed to fetch Jupiter tokens:", err);
      // Fallback to basic tokens if API fails
      setJupiterTokens([
        // aislop-ignore-next-line ai-slop/hardcoded-id -- Canonical wrapped SOL mint address, not an environment-specific project identifier.
        { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9, logoURI: SOL_TOKEN.logoURI },
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether', decimals: 6 },
      ]);
    }
  }, []);

  const loadTokenBalances = useCallback(async () => {
    try {
      const token = localStorage.getItem('swarp_fd_access_token');
      if (!token) return;

      const balances = await apiService.getSwapTokenBalances(walletId, token);
      const balanceArray = Array.isArray(balances) ? balances : [];
      setTokenBalances(balanceArray);
    } catch (error) {
      console.error('Failed to load token balances:', error);
    }
  }, [walletId]);

  const loadAllTokenData = useCallback(async () => {
    setIsLoadingTokens(true);
    await Promise.all([loadJupiterTokens(), loadTokenBalances()]);
    setIsLoadingTokens(false);
  }, [loadJupiterTokens, loadTokenBalances]);

  useEffect(() => {
    if (isOpen) {
      loadAllTokenData();
      // Reset form when modal opens - default to SOL
      setSelectedToken({ ...SOL_TOKEN, balance: currentBalance });
      setToAddress('');
      setAmount('');
      setMemo('');
      setError(null);
      setAddressValidationMessage(null);
    }
  }, [isOpen, loadAllTokenData, currentBalance]);

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

  // Build the list of available tokens from Jupiter API merged with user balances
  const availableTokens = React.useMemo(() => {
    // Create a map of user's token balances by mint address for quick lookup
    const balanceMap = new Map<string, TokenBalance>();
    tokenBalances.forEach(tb => {
      balanceMap.set(tb.mint, tb);
    });

    // Convert Jupiter tokens to TokenBalance format, merging with user balances
    const tokens: TokenBalance[] = jupiterTokens.map(jt => {
      const userBalance = balanceMap.get(jt.address);
      return {
        token: jt.symbol,
        symbol: jt.symbol,
        name: jt.name,
        balance: userBalance?.balance || 0,
        usdValue: userBalance?.usdValue || 0,
        mint: jt.address,
        decimals: jt.decimals,
        logoURI: jt.logoURI?.trim().replace(/[\s\x00-\x1F\x7F]/g, ''), // Remove whitespace/control chars from logo URLs
      };
    });

    // If Jupiter tokens are empty (loading or failed), at least show SOL with current balance
    if (tokens.length === 0) {
      return [{ ...SOL_TOKEN, balance: currentBalance }];
    }

    const solToken = tokens.find(t => t.symbol === 'SOL');
    if (solToken) {
      solToken.balance = currentBalance;
    }

    // Sort: tokens with balance first, then alphabetically
    tokens.sort((a, b) => {
      // SOL always first
      if (a.symbol === 'SOL') return -1;
      if (b.symbol === 'SOL') return 1;
      // Then by balance (tokens with balance first)
      if (a.balance > 0 && b.balance === 0) return -1;
      if (a.balance === 0 && b.balance > 0) return 1;
      // Then alphabetically
      return a.symbol.localeCompare(b.symbol);
    });

    return tokens;
  }, [jupiterTokens, tokenBalances, currentBalance]);

  const getSelectedTokenBalance = () => {
    if (selectedToken.symbol === 'SOL') {
      return currentBalance;
    }
    const tokenBalance = tokenBalances.find(tb => tb.symbol === selectedToken.symbol);
    return tokenBalance?.balance || 0;
  };

  const validateAddress = async (address: string) => {
    if (!address.trim()) {
      setAddressValidationMessage(null);
      return;
    }

    setIsValidatingAddress(true);
    setAddressValidationMessage(null);

    try {
      const token = localStorage.getItem('swarp_fd_access_token');
      if (!token) {
        setAddressValidationMessage(t.modals?.send?.errors?.authRequired || 'Authentication required');
        return false;
      }

      const result = await apiService.validateSolanaAddress(address.trim(), token);

      // Only show message for invalid addresses
      if (!result.valid) {
        // Translate known API error messages
        let message = result.message;
        if (message === 'Invalid recipient address' || message === 'Invalid Solana address') {
          message = t.modals?.send?.errors?.invalidAddress || message;
        }
        setAddressValidationMessage(message);
      } else {
        setAddressValidationMessage(null);
      }

      return result.valid;
    } catch (error: unknown) {
      console.error('Address validation error:', error);
      const apiError = error as { statusCode?: number };
      if (apiError.statusCode === 401) {
        setAddressValidationMessage(t.modals?.send?.errors?.authExpired || 'Authentication expired');
      } else {
        setAddressValidationMessage(t.modals?.send?.errors?.unableToValidate || 'Unable to validate address');
      }
      return false;
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const handleAddressChange = (address: string) => {
    setToAddress(address);
    setError(null);

    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Clear validation message while typing
    setAddressValidationMessage(null);

    // Debounce validation - only validate after user stops typing for 500ms
    if (address.trim()) {
      validationTimeoutRef.current = setTimeout(async () => {
        await validateAddress(address);
      }, 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!toAddress.trim()) {
      setError(t.modals?.send?.errors?.recipientRequired || 'Recipient address is required');
      return;
    }

    const isAddressValid = await validateAddress(toAddress);
    if (!isAddressValid) {
      setError(t.modals?.send?.errors?.invalidAddress || 'Please enter a valid Solana wallet address');
      return;
    }

    // Prevent sending to self
    if (toAddress.trim() === currentWalletAddress) {
      setError(t.modals?.send?.errors?.cannotSendToSelf || 'Cannot send to your own wallet address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError(t.modals?.send?.errors?.invalidAmount || 'Please enter a valid amount');
      return;
    }

    const availableBalance = getSelectedTokenBalance();
    if (amountNum > availableBalance) {
      setError(t.modals?.send?.errors?.insufficientBalance || 'Insufficient balance');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('swarp_fd_access_token');
      if (!token) {
        setError(t.modals?.send?.errors?.tokenNotFound || 'Authentication token not found');
        return;
      }

      const result = await apiService.sendTransaction(walletId, token, {
        toAddress: toAddress.trim(),
        amount: amountNum,
        memo: memo.trim() || undefined,
        tokenMint: selectedToken.mint || undefined, // Only include for SPL tokens
      });

      const successMessage = (t.modals?.send?.success?.transactionSent || `Transaction sent successfully! {amount} {token} sent to recipient.`)
        .replace('{amount}', amountNum.toString())
        .replace('{token}', selectedToken.symbol);
      showSuccess(successMessage);

      // Update balance (subtract sent amount and fee) - only for SOL
      if (selectedToken.symbol === 'SOL') {
        const newBalance = currentBalance - amountNum - (result.fee || 0);
        onSuccess(newBalance);
      } else {
        // For SPL tokens, just trigger refresh
        onSuccess(currentBalance);
      }

      // Reset form
      setToAddress('');
      setAmount('');
      setMemo('');

      // Close modal immediately
      onClose();
    } catch (error: unknown) {
      console.error('Send transaction error:', error);
      const apiError = error as { message?: string };
      const errorMessage = apiError.message || t.modals?.send?.errors?.failedToSend || 'Failed to send transaction';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSelect = (token: TokenBalance) => {
    setSelectedToken(token);
    setShowTokenSelector(false);
    setAmount(''); // Reset amount when token changes
  };

  const formatBalance = (balance: number, decimals: number) => {
    const maxDecimals = Math.min(decimals, 6);
    return balance.toFixed(maxDecimals);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 !p-4 overflow-y-auto"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1A1B23] rounded-3xl !p-6 w-full max-w-sm my-auto min-h-fit max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between !mb-6">
              <h2 className="text-xl font-bold text-white">{t.modals?.send?.title || "Send"}</h2>
              <button
                onClick={onClose}
                className="!p-2 text-[#636466] hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Token Selector */}
            <div className="!mb-4">
              <label className="block text-white text-sm font-medium !mb-2">
                {t.modals?.send?.selectToken || "Select Token"}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTokenSelector(!showTokenSelector)}
                  className="w-full bg-[#090A11] border border-[#2B2D30] rounded-xl !px-4 !py-3 flex items-center justify-between text-white hover:border-[#40E0D0] transition-colors"
                  disabled={isLoading}
                >
                  <div className="flex items-center !gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2B2D30] flex items-center justify-center">
                      {selectedToken.logoURI ? (
                        <Image
                          src={selectedToken.logoURI}
                          alt={selectedToken.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-sm font-semibold">{selectedToken.symbol.charAt(0)}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">{selectedToken.symbol}</p>
                      <p className="text-[#636466] text-xs">{selectedToken.name}</p>
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={`transition-transform ${showTokenSelector ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Token Dropdown - Dynamic list from user's wallet */}
                {showTokenSelector && (
                  <div className="absolute top-full left-0 right-0 !mt-2 bg-[#090A11] border border-[#2B2D30] rounded-xl overflow-hidden z-10 max-h-60 overflow-y-auto">
                    {isLoadingTokens ? (
                      <div className="!px-4 !py-3 text-center text-[#636466]">
                        Loading tokens...
                      </div>
                    ) : availableTokens.length === 0 ? (
                      <div className="!px-4 !py-3 text-center text-[#636466]">
                        No tokens available
                      </div>
                    ) : (
                      availableTokens.map((token) => (
                        <button
                          key={token.mint || token.symbol}
                          type="button"
                          onClick={() => handleTokenSelect(token)}
                          className={`w-full !px-4 !py-3 flex items-center justify-between hover:bg-[#1A1B23] transition-colors ${
                            selectedToken.symbol === token.symbol ? 'bg-[#1A1B23]' : ''
                          }`}
                        >
                          <div className="flex items-center !gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2B2D30] flex items-center justify-center">
                              {token.logoURI ? (
                                <Image
                                  src={token.logoURI}
                                  alt={token.name}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-sm font-semibold text-white">{token.symbol.charAt(0)}</span>
                              )}
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{token.symbol}</p>
                              <p className="text-[#636466] text-xs">{token.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm">
                              {formatBalance(token.balance, token.decimals)}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Balance Info */}
            <div className="bg-[#090A11] rounded-2xl !p-4 !mb-6">
              <p className="text-[#636466] text-sm">{t.modals?.send?.availableBalance || "Available Balance"}</p>
              <p className="text-white text-lg font-semibold">
                {isLoadingTokens ? '...' : formatBalance(getSelectedTokenBalance(), selectedToken.decimals)} {selectedToken.symbol}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="!space-y-4">
              {/* Recipient Address */}
              <div>
                <label className="block text-white text-sm font-medium !mb-2">
                  {t.modals?.send?.recipientAddress || "Recipient Address"}
                </label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder={t.modals?.send?.enterSolanaAddress || "Enter Solana wallet address"}
                  className={`w-full bg-[#090A11] border rounded-xl !px-4 !py-3 text-white placeholder-[#636466] focus:outline-none transition-colors ${
                    addressValidationMessage
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-[#2B2D30] focus:border-[#40E0D0]'
                  }`}
                  disabled={isLoading}
                />

                {/* Address Validation Feedback - Only show for invalid addresses */}
                {isValidatingAddress ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#40E0D0]"></div>
                    <span className="text-[#636466] text-xs">{t.modals?.send?.validatingAddress || "Validating address..."}</span>
                  </div>
                ) : addressValidationMessage ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-red-400 text-xs">{addressValidationMessage}</span>
                  </div>
                ) : null}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-white text-sm font-medium !mb-2">
                  {(t.modals?.send?.amount || "Amount ({token})").replace('{token}', selectedToken.symbol)}
                </label>
                <input
                  type="number"
                  step={selectedToken.decimals >= 6 ? "0.000001" : "0.01"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000000"
                  className="w-full bg-[#090A11] border border-[#2B2D30] rounded-xl !px-4 !py-3 text-white placeholder-[#636466] focus:border-[#40E0D0] focus:outline-none"
                  disabled={isLoading}
                />
              </div>

              {/* Memo (Optional) */}
              <div>
                <label className="block text-white text-sm font-medium !mb-2">
                  {t.modals?.send?.memoOptional || "Memo (Optional)"}
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder={t.modals?.send?.addNote || "Add a note..."}
                  className="w-full bg-[#090A11] border border-[#2B2D30] rounded-xl !px-4 !py-3 text-white placeholder-[#636466] focus:border-[#40E0D0] focus:outline-none"
                  disabled={isLoading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl !p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#40E0D0] text-black font-semibold !py-3 rounded-xl hover:bg-[#40E0D0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (t.modals?.send?.sending || 'Sending...') : (t.modals?.send?.sendTransaction || 'Send Transaction')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        position={toast.position}
      />
    </>
  );
};
