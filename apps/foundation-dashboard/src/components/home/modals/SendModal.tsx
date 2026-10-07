'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n/I18nProvider';
import Image from 'next/image';
import { getAccessToken } from '@/lib/session';
import { ApiError, errorMessage, newIdempotencyKey } from '@/lib/http';
import { floorToDecimals, isAmountInput, maxSpendable, parseAmount, SOL_FEE_RESERVE } from '@/lib/amount';
import { isLikelySolanaAddress, normalizeMint } from '@/lib/solana';
import { NETWORK_LABEL } from '@/config/env';
import { PinConfirmModal } from '@/components/ui/PinConfirmModal';

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
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validationSeqRef = useRef(0);
  const submittingRef = useRef(false);
  /** One key per prepared send; reused if the same send is retried after an ambiguous failure. */
  const idempotencyKeyRef = useRef<string | null>(null);
  const [pendingSend, setPendingSend] = useState<{ toAddress: string; amount: number; amountText: string; memo?: string } | null>(null);
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [selectedToken, setSelectedToken] = useState<TokenBalance>({ ...SOL_TOKEN, balance: currentBalance });
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [jupiterTokens, setJupiterTokens] = useState<JupiterToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);

  const loadAllTokenData = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setIsLoadingTokens(true);
    setTokensError(null);
    const [listResult, balanceResult] = await Promise.allSettled([
      apiService.getAllJupiterTokens({ limit: 500 }),
      apiService.getSwapTokenBalances(walletId, token),
    ]);
    if (listResult.status === 'fulfilled') setJupiterTokens(listResult.value.tokens);
    if (balanceResult.status === 'fulfilled') {
      setTokenBalances(Array.isArray(balanceResult.value) ? balanceResult.value : []);
    } else {
      setTokensError('Could not load token balances. Only SOL can be sent right now.');
    }
    setIsLoadingTokens(false);
  }, [walletId]);

  // Reset the form only when the modal opens, not on every balance refresh.
  const balanceRef = useRef(currentBalance);
  useEffect(() => {
    balanceRef.current = currentBalance;
  }, [currentBalance]);
  useEffect(() => {
    if (!isOpen) return;
    loadAllTokenData();
    setSelectedToken({ ...SOL_TOKEN, balance: balanceRef.current });
    setToAddress('');
    setAmount('');
    setMemo('');
    setError(null);
    setAddressValidationMessage(null);
    setPendingSend(null);
    idempotencyKeyRef.current = null;
  }, [isOpen, loadAllTokenData]);

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

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    };
  }, []);

  /**
   * Tokens the user can pick, keyed by mint. Native SOL has an empty mint;
   * wrapped SOL from the token list is folded into it so choosing "SOL" always
   * sends native SOL.
   */
  const availableTokens = React.useMemo(() => {
    const balanceByMint = new Map<string, TokenBalance>();
    tokenBalances.forEach((tb) => {
      const mint = normalizeMint(tb.mint);
      if (mint) balanceByMint.set(mint, tb);
    });

    const tokens: TokenBalance[] = [{ ...SOL_TOKEN, balance: currentBalance }];
    const seen = new Set<string>();
    jupiterTokens.forEach((jt) => {
      const mint = normalizeMint(jt.address);
      if (!mint || seen.has(mint)) return;
      seen.add(mint);
      const userBalance = balanceByMint.get(mint);
      tokens.push({
        token: jt.symbol,
        symbol: jt.symbol,
        name: jt.name,
        balance: userBalance?.balance ?? 0,
        usdValue: userBalance?.usdValue ?? 0,
        mint,
        decimals: jt.decimals,
        logoURI: jt.logoURI?.trim().replace(/[\s\x00-\x1F\x7F]/g, ''),
      });
    });
    // Held tokens that are not in the list still need to be sendable.
    balanceByMint.forEach((tb, mint) => {
      if (!seen.has(mint)) tokens.push({ ...tb, mint });
    });

    const [sol, ...rest] = tokens;
    rest.sort((a, b) => {
      if (a.balance > 0 && b.balance === 0) return -1;
      if (a.balance === 0 && b.balance > 0) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
    return [sol, ...rest];
  }, [jupiterTokens, tokenBalances, currentBalance]);

  const isNativeSol = !selectedToken.mint;

  const getSelectedTokenBalance = () => {
    if (isNativeSol) return currentBalance;
    return availableTokens.find((tb) => tb.mint === selectedToken.mint)?.balance ?? 0;
  };

  const validateAddress = async (address: string): Promise<boolean> => {
    const trimmed = address.trim();
    if (!trimmed) {
      setAddressValidationMessage(null);
      return false;
    }
    if (!isLikelySolanaAddress(trimmed)) {
      setAddressValidationMessage(t.modals?.send?.errors?.invalidAddress || 'Invalid Solana address');
      return false;
    }

    const seq = ++validationSeqRef.current;
    setIsValidatingAddress(true);
    setAddressValidationMessage(null);
    try {
      const token = getAccessToken();
      if (!token) {
        setAddressValidationMessage(t.modals?.send?.errors?.authRequired || 'Authentication required');
        return false;
      }
      const result = await apiService.validateSolanaAddress(trimmed, token);
      if (seq !== validationSeqRef.current) return result.valid;
      if (!result.valid) {
        let message = result.message;
        if (message === 'Invalid recipient address' || message === 'Invalid Solana address') {
          message = t.modals?.send?.errors?.invalidAddress || message;
        }
        setAddressValidationMessage(message);
      } else {
        setAddressValidationMessage(null);
      }
      return result.valid;
    } catch {
      if (seq === validationSeqRef.current) {
        setAddressValidationMessage(t.modals?.send?.errors?.unableToValidate || 'Unable to validate address');
      }
      return false;
    } finally {
      if (seq === validationSeqRef.current) setIsValidatingAddress(false);
    }
  };

  const handleAddressChange = (address: string) => {
    setToAddress(address);
    setError(null);
    setAddressValidationMessage(null);
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    if (address.trim()) {
      validationTimeoutRef.current = setTimeout(() => {
        validateAddress(address);
      }, 500);
    }
  };

  /** Step 1: validate everything, then ask for the PIN. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isLoading) return;
    submittingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const recipient = toAddress.trim();
      if (!recipient) {
        setError(t.modals?.send?.errors?.recipientRequired || 'Recipient address is required');
        return;
      }
      if (recipient === currentWalletAddress) {
        setError(t.modals?.send?.errors?.cannotSendToSelf || 'Cannot send to your own wallet address');
        return;
      }

      const balance = getSelectedTokenBalance();
      const spendable = isNativeSol ? Math.max(0, balance - SOL_FEE_RESERVE) : balance;
      const parsed = parseAmount(amount, selectedToken.decimals, spendable);
      if (!parsed.ok) {
        setError(
          parsed.problem === 'insufficient' && isNativeSol
            ? `Insufficient balance. Keep at least ${SOL_FEE_RESERVE} SOL for network fees.`
            : parsed.message
        );
        return;
      }

      if (!(await validateAddress(recipient))) {
        setError(t.modals?.send?.errors?.invalidAddress || 'Please enter a valid Solana wallet address');
        return;
      }

      const prepared = { toAddress: recipient, amount: parsed.value, amountText: parsed.text, memo: memo.trim() || undefined };
      const same =
        pendingSend &&
        pendingSend.toAddress === prepared.toAddress &&
        pendingSend.amountText === prepared.amountText &&
        pendingSend.memo === prepared.memo;
      if (!same || !idempotencyKeyRef.current) idempotencyKeyRef.current = newIdempotencyKey();
      setPendingSend(prepared);
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  /** Step 2: PIN verified; send exactly what was reviewed. */
  const executeSend = async () => {
    if (!pendingSend || !idempotencyKeyRef.current) return;
    const token = getAccessToken();
    if (!token) throw new Error(t.modals?.send?.errors?.tokenNotFound || 'Your session has expired. Please sign in again.');

    try {
      await apiService.sendTransaction(
        walletId,
        token,
        {
          toAddress: pendingSend.toAddress,
          amount: pendingSend.amount,
          memo: pendingSend.memo,
          tokenMint: selectedToken.mint || undefined,
        },
        idempotencyKeyRef.current
      );
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 0) {
        // The request may have reached the server. Keep the same idempotency key so a
        // retry cannot send twice, and tell the user to check history first.
        throw new Error('Network error: the transfer may or may not have been sent. Check your transaction history before retrying.');
      }
      throw err;
    }

    idempotencyKeyRef.current = null;
    const successMessage = (t.modals?.send?.success?.transactionSent || 'Transaction sent successfully! {amount} {token} sent to recipient.')
      .replace('{amount}', pendingSend.amountText)
      .replace('{token}', selectedToken.symbol);
    showSuccess(successMessage);

    // Ask the server for the new balance instead of guessing it locally.
    let freshBalance = currentBalance;
    try {
      const wallets = await apiService.getUserWallets(token);
      const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0];
      if (wallet && Number.isFinite(Number(wallet.balance))) freshBalance = Number(wallet.balance);
    } catch {
      // The dashboard refreshes the wallet on its own interval.
    }
    onSuccess(freshBalance);

    setPendingSend(null);
    setToAddress('');
    setAmount('');
    setMemo('');
    onClose();
  };

  const handleTokenSelect = (token: TokenBalance) => {
    setSelectedToken(token);
    setShowTokenSelector(false);
    setAmount('');
    setError(null);
  };

  const handleMax = () => {
    setAmount(maxSpendable(getSelectedTokenBalance(), selectedToken.decimals, isNativeSol));
    setError(null);
  };

  const formatBalance = (balance: number, decimals: number) => floorToDecimals(balance, Math.min(decimals, 6)) || '0';

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
                          key={token.mint || 'native-sol'}
                          type="button"
                          onClick={() => handleTokenSelect(token)}
                          className={`w-full !px-4 !py-3 flex items-center justify-between hover:bg-[#1A1B23] transition-colors ${
                            selectedToken.mint === token.mint ? 'bg-[#1A1B23]' : ''
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
              <div className="flex items-center justify-between">
                <p className="text-[#636466] text-sm">{t.modals?.send?.availableBalance || "Available Balance"}</p>
                <span className="text-[10px] uppercase tracking-wide rounded-full bg-[#2B2D30] text-[#40E0D0] !px-2 !py-0.5">{NETWORK_LABEL}</span>
              </div>
              <p className="text-white text-lg font-semibold">
                {isLoadingTokens ? '...' : formatBalance(getSelectedTokenBalance(), selectedToken.decimals)} {selectedToken.symbol}
              </p>
              {tokensError && <p className="text-yellow-400 text-xs !mt-2">{tokensError}</p>}
              {selectedToken.mint && (
                <p className="text-[#636466] text-xs !mt-2 break-all">Mint: {selectedToken.mint}</p>
              )}
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
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => {
                      if (isAmountInput(e.target.value)) {
                        setAmount(e.target.value);
                        setError(null);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-[#090A11] border border-[#2B2D30] rounded-xl !pl-4 !pr-16 !py-3 text-white placeholder-[#636466] focus:border-[#40E0D0] focus:outline-none"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleMax}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#40E0D0] text-xs font-semibold"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Memo (Optional) */}
              <div>
                <label className="block text-white text-sm font-medium !mb-2">
                  {t.modals?.send?.memoOptional || "Memo (Optional)"}
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value.slice(0, 120))}
                  maxLength={120}
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
                {isLoading ? (t.modals?.send?.sending || 'Checking...') : (t.modals?.send?.sendTransaction || 'Review & Send')}
              </button>
            </form>
          </div>
        </div>
      )}

      <PinConfirmModal
        isOpen={isOpen && pendingSend !== null}
        title="Confirm transfer"
        confirmLabel="Send"
        summary={
          pendingSend
            ? [
                { label: 'Amount', value: `${pendingSend.amountText} ${selectedToken.symbol}` },
                { label: 'To', value: pendingSend.toAddress },
                { label: 'Network', value: NETWORK_LABEL },
                ...(pendingSend.memo ? [{ label: 'Memo', value: pendingSend.memo }] : []),
              ]
            : []
        }
        onCancel={() => setPendingSend(null)}
        onConfirmed={async () => {
          try {
            await executeSend();
          } catch (err) {
            showError(errorMessage(err, t.modals?.send?.errors?.failedToSend || 'Failed to send transaction'));
            throw err;
          }
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
    </>
  );
};
