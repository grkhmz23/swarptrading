'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n/I18nProvider';
import { getAccessToken } from '@/lib/session';
import { errorMessage, newIdempotencyKey } from '@/lib/http';
import { isAmountInput, maxSpendable, parseAmount } from '@/lib/amount';
import { normalizeMint, WRAPPED_SOL_MINT } from '@/lib/solana';
import { IS_MAINNET, NETWORK_LABEL, SWARP_TOKEN_MINT } from '@/config/env';
import { PinConfirmModal } from '@/components/ui/PinConfirmModal';

interface SwapModalProps {
  walletId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onNavigateToWallet?: () => void;
  /** Mint to preselect as the output token (e.g. from a token's "Buy" button). */
  initialOutputMint?: string;
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
  symbol: string;
  balance: number;
  mint: string;
}

/** A swappable token. `address` is the mint (wrapped SOL stands for SOL). */
interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isVerified?: boolean;
}

type SwapState = 'initial' | 'quote' | 'success';

const SLIPPAGE_PRESETS = [0.5, 1, 2];
const MAX_SLIPPAGE = 5;
const DEFAULT_QUOTE_TTL_MS = 30_000;

/** Quote expiry as epoch milliseconds; accepts seconds or milliseconds from the API. */
function quoteExpiry(validUntil: number | undefined, fetchedAt: number): number {
  if (typeof validUntil !== 'number' || !Number.isFinite(validUntil) || validUntil <= 0) {
    return fetchedAt + DEFAULT_QUOTE_TTL_MS;
  }
  return validUntil < 1e12 ? validUntil * 1000 : validUntil;
}

function sanitizeLogo(uri?: string): string | undefined {
  const cleaned = uri?.trim().replace(/[\s\x00-\x1F\x7F]/g, '');
  return cleaned && /^https:\/\//.test(cleaned) ? cleaned : undefined;
}

/**
 * Keep one token per symbol so a symbol always means the same mint in this UI.
 * Verified tokens win over unverified look-alikes.
 */
function dedupeBySymbol(tokens: SwapToken[]): SwapToken[] {
  const bySymbol = new Map<string, SwapToken>();
  for (const token of tokens) {
    const key = token.symbol.toUpperCase();
    const existing = bySymbol.get(key);
    if (!existing || (!existing.isVerified && token.isVerified)) bySymbol.set(key, token);
  }
  return Array.from(bySymbol.values());
}

function TokenIcon({ token, size = 20 }: { token?: SwapToken; size?: number }) {
  const [failed, setFailed] = useState(false);
  const logo = sanitizeLogo(token?.logoURI);
  const symbol = token?.symbol ?? '?';
  if (logo && !failed) {
    return (
      <Image
        src={logo}
        alt={token?.name || symbol}
        width={size}
        height={size}
        className="inline-block rounded-full"
        unoptimized
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className="inline-flex items-center justify-center rounded-full bg-[#2B2D30] text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {symbol.length <= 2 ? symbol : symbol.charAt(0)}
    </div>
  );
}

function formatAmount(value: number, maxDecimals = 6): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals }).format(value);
}

export const SwapModal: React.FC<SwapModalProps> = ({
  walletId,
  isOpen,
  onClose,
  onSuccess,
  onNavigateToWallet,
  initialOutputMint,
}) => {
  const t = useT();
  const [inputMint, setInputMint] = useState<string>(WRAPPED_SOL_MINT);
  const [outputMint, setOutputMint] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState('');
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteExpiresAt, setQuoteExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [swapState, setSwapState] = useState<SwapState>('initial');
  const [confirming, setConfirming] = useState(false);
  const [swapResult, setSwapResult] = useState<{ inputAmount: number; outputAmount: number; inputSymbol: string; outputSymbol: string; txHash?: string } | null>(null);
  const [tokens, setTokens] = useState<SwapToken[]>([]);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [showInputDropdown, setShowInputDropdown] = useState(false);
  const [showOutputDropdown, setShowOutputDropdown] = useState(false);
  const [tokenSearchInput, setTokenSearchInput] = useState('');
  const [tokenSearchOutput, setTokenSearchOutput] = useState('');
  const idempotencyKeyRef = useRef<string | null>(null);
  const quoteSeqRef = useRef(0);
  const { toast, showError, hideToast } = useToast();

  const tokenByMint = useMemo(() => new Map(tokens.map((tk) => [tk.address, tk])), [tokens]);
  const inputTokenInfo = tokenByMint.get(inputMint);
  const outputTokenInfo = tokenByMint.get(outputMint);
  const inputSymbol = inputTokenInfo?.symbol ?? '';
  const outputSymbol = outputTokenInfo?.symbol ?? '';

  const filter = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (tk) => tk.symbol.toLowerCase().includes(q) || tk.name.toLowerCase().includes(q) || tk.address.toLowerCase() === q
    );
  };
  const filteredInputTokens = filter(tokenSearchInput);
  const filteredOutputTokens = filter(tokenSearchOutput);

  const loadTokens = useCallback(async () => {
    setTokensError(null);
    try {
      const response = await apiService.getAllJupiterTokens({ limit: 500 });
      const list: SwapToken[] = (response.tokens ?? []).map((tk) => ({
        address: tk.address,
        symbol: tk.symbol,
        name: tk.name,
        decimals: tk.decimals,
        logoURI: tk.logoURI,
        isVerified: tk.isVerified,
      }));
      setTokens(dedupeBySymbol(list));
      if (list.length === 0) setTokensError('No tokens are available for swapping right now.');
    } catch (err) {
      setTokens([]);
      setTokensError(errorMessage(err, 'Could not load the token list. Please try again.'));
    }
  }, []);

  const loadBalances = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const balances = await apiService.getSwapTokenBalances(walletId, token);
      setTokenBalances(Array.isArray(balances) ? balances : []);
    } catch {
      setTokenBalances([]);
    }
  }, [walletId]);

  useEffect(() => {
    if (isOpen && tokens.length === 0) loadTokens();
  }, [isOpen, tokens.length, loadTokens]);

  // Reset when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    loadBalances();
    setSwapState('initial');
    setAmount('');
    setQuote(null);
    setSwapResult(null);
    setError(null);
    setConfirming(false);
    idempotencyKeyRef.current = null;
  }, [isOpen, loadBalances]);

  // Choose the pair once tokens are known: SOL -> requested token (or USDC).
  useEffect(() => {
    if (!isOpen || tokens.length === 0) return;
    setInputMint(WRAPPED_SOL_MINT);
    if (initialOutputMint) {
      if (tokenByMint.has(initialOutputMint)) {
        setOutputMint(initialOutputMint);
        setError(null);
      } else {
        setOutputMint('');
        setError('This token is not available for swapping.');
      }
    } else {
      const usdc = tokens.find((tk) => tk.symbol.toUpperCase() === 'USDC');
      setOutputMint(usdc?.address ?? '');
    }
  }, [isOpen, tokens, tokenByMint, initialOutputMint]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Tick while a quote is shown so expiry is visible.
  useEffect(() => {
    if (swapState !== 'quote') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [swapState]);

  const balanceOf = (mint: string): number => {
    if (mint === WRAPPED_SOL_MINT) {
      const sol = tokenBalances.find((b) => !normalizeMint(b.mint) && b.symbol.toUpperCase() === 'SOL');
      return Number(sol?.balance ?? 0);
    }
    return Number(tokenBalances.find((b) => b.mint === mint)?.balance ?? 0);
  };

  const inputBalance = balanceOf(inputMint);
  const inputIsSol = inputMint === WRAPPED_SOL_MINT;
  const parsedAmount = inputTokenInfo ? parseAmount(amount, inputTokenInfo.decimals) : null;
  const sameToken = inputMint === outputMint;
  const quoteExpired = swapState === 'quote' && now >= quoteExpiresAt;
  const secondsLeft = Math.max(0, Math.ceil((quoteExpiresAt - now) / 1000));

  const involvesSwarp = inputMint === SWARP_TOKEN_MINT || outputMint === SWARP_TOKEN_MINT;
  const provider = involvesSwarp ? 'Raydium' : 'Jupiter';

  const getQuote = async () => {
    setError(null);
    if (!inputTokenInfo || !outputTokenInfo) {
      setError('Select both tokens.');
      return;
    }
    if (sameToken) {
      setError(t.modals?.swap?.selectDifferentTokens || 'Select different tokens');
      return;
    }
    const spendable = inputIsSol ? Number(maxSpendable(inputBalance, inputTokenInfo.decimals, true)) : inputBalance;
    const parsed = parseAmount(amount, inputTokenInfo.decimals, spendable);
    if (!parsed.ok) {
      setError(parsed.problem === 'insufficient' && inputIsSol ? 'Insufficient balance (keep a little SOL for fees).' : parsed.message);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError(t.modals?.swap?.errors?.authRequired || 'Authentication required');
      return;
    }

    const seq = ++quoteSeqRef.current;
    setIsGettingQuote(true);
    try {
      const quoteData = await apiService.getSwapQuote(walletId, token, {
        inputToken: inputTokenInfo.symbol,
        outputToken: outputTokenInfo.symbol,
        inputMint: inputTokenInfo.address,
        outputMint: outputTokenInfo.address,
        amount: parsed.value,
        slippageTolerance: slippage,
      });
      if (seq !== quoteSeqRef.current) return;
      if (!(quoteData.outputAmount > 0)) {
        setError('No route found for this swap.');
        setQuote(null);
        return;
      }
      const fetchedAt = Date.now();
      setQuote(quoteData);
      setQuoteExpiresAt(quoteExpiry(quoteData.validUntil, fetchedAt));
      setNow(fetchedAt);
      idempotencyKeyRef.current = newIdempotencyKey();
      setSwapState('quote');
    } catch (err) {
      if (seq !== quoteSeqRef.current) return;
      setError(errorMessage(err, t.modals?.swap?.errors?.failedToGetQuote || 'Failed to get swap quote'));
      setQuote(null);
    } finally {
      if (seq === quoteSeqRef.current) setIsGettingQuote(false);
    }
  };

  const executeSwap = async (pin: string) => {
    if (!quote || !inputTokenInfo || !outputTokenInfo || !parsedAmount?.ok || !idempotencyKeyRef.current) {
      throw new Error('This quote is no longer valid. Please get a new quote.');
    }
    if (Date.now() >= quoteExpiresAt) {
      throw new Error('This quote has expired. Close this window and refresh the quote.');
    }
    const token = getAccessToken();
    if (!token) throw new Error(t.modals?.swap?.errors?.authRequired || 'Authentication required');

    const result = await apiService.executeSwap(
      walletId,
      token,
      {
        inputToken: inputTokenInfo.symbol,
        outputToken: outputTokenInfo.symbol,
        inputMint: inputTokenInfo.address,
        outputMint: outputTokenInfo.address,
        amount: parsedAmount.value,
        slippageTolerance: slippage,
        minimumOutputAmount: quote.minimumOutputAmount,
        pin,
      },
      idempotencyKeyRef.current
    );

    if (!result.success) {
      throw new Error(result.error || t.modals?.swap?.errors?.swapFailed || 'Swap failed');
    }
    idempotencyKeyRef.current = null;
    const received = typeof result.actualOutputAmount === 'number' ? result.actualOutputAmount : quote.minimumOutputAmount;
    setSwapResult({
      inputAmount: parsedAmount.value,
      outputAmount: received,
      inputSymbol: inputTokenInfo.symbol,
      outputSymbol: outputTokenInfo.symbol,
      txHash: result.blockchainTxHash,
    });
    setConfirming(false);
    setSwapState('success');
    onSuccess(`Swap completed: ${formatAmount(received)} ${outputTokenInfo.symbol} received`);
    loadBalances();
  };

  const swapDirection = () => {
    setInputMint(outputMint);
    setOutputMint(inputMint);
    setAmount('');
    setQuote(null);
    setSwapState('initial');
    setShowInputDropdown(false);
    setShowOutputDropdown(false);
  };

  const closeDropdowns = () => {
    setShowInputDropdown(false);
    setShowOutputDropdown(false);
    setTokenSearchInput('');
    setTokenSearchOutput('');
  };

  const backToEdit = () => {
    setSwapState('initial');
    setQuote(null);
    idempotencyKeyRef.current = null;
  };

  const handleGoToWallet = () => {
    onClose();
    setSwapState('initial');
    setAmount('');
    setQuote(null);
    setSwapResult(null);
    setError(null);
    onNavigateToWallet?.();
  };

  const applyCustomSlippage = (text: string) => {
    if (!isAmountInput(text)) return;
    setCustomSlippage(text);
    const value = Number(text);
    if (text && Number.isFinite(value) && value > 0 && value <= MAX_SLIPPAGE) {
      setSlippage(value);
      setQuote(null);
    }
  };

  if (!isOpen) return null;

  const tokenList = (list: SwapToken[], selected: string, onPick: (mint: string) => void) =>
    list.length === 0 ? (
      <div className="!px-4 !py-3 text-center text-gray-400 text-sm">No tokens found</div>
    ) : (
      list.map((token) => (
        <button
          key={token.address}
          type="button"
          onClick={() => onPick(token.address)}
          className={`w-full flex items-center gap-3 !px-4 !py-2.5 hover:bg-[#2B2D30] transition-colors text-left ${
            token.address === selected ? 'bg-[#2B2D30]' : ''
          }`}
        >
          <TokenIcon token={token} />
          <div className="min-w-0">
            <div className="text-white text-sm font-medium flex items-center gap-1">
              {token.symbol}
              {!token.isVerified && token.address !== WRAPPED_SOL_MINT && (
                <span className="text-[10px] text-yellow-400 border border-yellow-600 rounded !px-1">unverified</span>
              )}
            </div>
            <div className="text-gray-400 text-xs truncate">{token.name}</div>
          </div>
        </button>
      ))
    );

  const amountReady = parsedAmount?.ok === true;

  return (
    <>
      {toast && <Toast {...toast} onClose={hideToast} />}

      <div className="fixed inset-0 bg-black/50 flex items-start justify-center !p-4 z-50 overflow-y-auto" onClick={closeDropdowns}>
        <div
          className="bg-[#1A1D21] border border-[#2B2D30] rounded-2xl !p-6 w-full max-w-md my-auto min-h-fit max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="swap-title"
        >
          <div className="flex items-center justify-between !mb-6">
            <div className="flex items-center gap-2">
              <h2 id="swap-title" className="text-xl font-semibold text-white">
                {t.modals?.swap?.title || 'Swap'}
              </h2>
              <span className="text-[10px] uppercase tracking-wide rounded-full bg-[#2B2D30] text-[#40E0D0] !px-2 !py-0.5">{NETWORK_LABEL}</span>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {tokensError && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg !p-3 !mb-4 flex items-center justify-between gap-3">
              <p className="text-red-400 text-sm">{tokensError}</p>
              <button type="button" onClick={loadTokens} className="text-[#40E0D0] text-sm font-medium shrink-0">
                Retry
              </button>
            </div>
          )}

          {swapState === 'initial' && (
            <div className="!space-y-4">
              {/* You pay */}
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30]">
                <div className="flex justify-between items-center !mb-3">
                  <span className="text-sm text-gray-400">{t.modals?.swap?.youPay || 'You Pay'}</span>
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
                      <TokenIcon token={inputTokenInfo} />
                      <span className="text-white text-sm">{inputSymbol || 'Select'}</span>
                    </button>
                    {showInputDropdown && (
                      <div className="absolute right-0 top-full !mt-2 w-64 bg-[#1A1D21] border border-[#2B2D30] rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="!p-2 border-b border-[#2B2D30]">
                          <input
                            type="text"
                            placeholder="Search name, symbol or mint"
                            value={tokenSearchInput}
                            onChange={(e) => setTokenSearchInput(e.target.value)}
                            className="w-full bg-[#131519] text-white text-sm rounded-lg !px-3 !py-2 outline-none border border-[#2B2D30] focus:border-[#40E0D0]"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {tokenList(filteredInputTokens, inputMint, (mint) => {
                            setInputMint(mint);
                            setAmount('');
                            setQuote(null);
                            setShowInputDropdown(false);
                            setTokenSearchInput('');
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
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
                    placeholder="0"
                    aria-label="Amount to pay"
                    className="bg-transparent text-white text-2xl font-medium placeholder-gray-500 w-full outline-none"
                  />
                  <button
                    type="button"
                    disabled={!inputTokenInfo}
                    onClick={() => inputTokenInfo && setAmount(maxSpendable(inputBalance, inputTokenInfo.decimals, inputIsSol))}
                    className="text-[#40E0D0] text-xs font-semibold shrink-0"
                  >
                    MAX
                  </button>
                </div>
                <div className="text-sm text-gray-400 !mt-1">
                  {t.modals?.swap?.available || 'Available'}: {formatAmount(inputBalance)} {inputSymbol}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={swapDirection}
                  aria-label="Switch tokens"
                  className="bg-[#40E0D0] hover:bg-[#40E0D0]/90 rounded-full !p-3 transition-colors"
                >
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* You receive */}
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30]">
                <div className="flex justify-between items-center !mb-3">
                  <span className="text-sm text-gray-400">{t.modals?.swap?.youReceive || 'You Receive'}</span>
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
                      <TokenIcon token={outputTokenInfo} />
                      <span className="text-white text-sm">{outputSymbol || 'Select'}</span>
                    </button>
                    {showOutputDropdown && (
                      <div className="absolute right-0 top-full !mt-2 w-64 bg-[#1A1D21] border border-[#2B2D30] rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="!p-2 border-b border-[#2B2D30]">
                          <input
                            type="text"
                            placeholder="Search name, symbol or mint"
                            value={tokenSearchOutput}
                            onChange={(e) => setTokenSearchOutput(e.target.value)}
                            className="w-full bg-[#131519] text-white text-sm rounded-lg !px-3 !py-2 outline-none border border-[#2B2D30] focus:border-[#40E0D0]"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {tokenList(filteredOutputTokens, outputMint, (mint) => {
                            setOutputMint(mint);
                            setQuote(null);
                            setError(null);
                            setShowOutputDropdown(false);
                            setTokenSearchOutput('');
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {t.modals?.swap?.available || 'Available'}: {formatAmount(balanceOf(outputMint))} {outputSymbol}
                </div>
                {outputTokenInfo && outputTokenInfo.address !== WRAPPED_SOL_MINT && (
                  <div className="text-[11px] text-gray-500 !mt-1 break-all">Mint: {outputTokenInfo.address}</div>
                )}
              </div>

              {/* Slippage */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-400">{t.modals?.swap?.slippage || 'Max slippage'}</span>
                <div className="flex items-center gap-2">
                  {SLIPPAGE_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSlippage(value);
                        setCustomSlippage('');
                        setQuote(null);
                      }}
                      className={`text-xs rounded-lg !px-2.5 !py-1 border ${
                        slippage === value && !customSlippage ? 'border-[#40E0D0] text-[#40E0D0]' : 'border-[#2B2D30] text-gray-300'
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                  <input
                    value={customSlippage}
                    onChange={(e) => applyCustomSlippage(e.target.value)}
                    placeholder="Custom"
                    inputMode="decimal"
                    aria-label="Custom slippage percent"
                    className="w-16 text-xs bg-[#131519] text-white rounded-lg !px-2 !py-1 border border-[#2B2D30] outline-none focus:border-[#40E0D0]"
                  />
                </div>
              </div>
              {slippage > 3 && <p className="text-yellow-400 text-xs">High slippage: you may receive noticeably less than quoted.</p>}

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg !p-3" role="alert">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={getQuote}
                disabled={isGettingQuote || !amountReady || sameToken || !outputTokenInfo}
                className={`w-full !py-4 !px-4 rounded-xl font-medium transition-all ${
                  isGettingQuote || !amountReady || sameToken || !outputTokenInfo
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-[#40E0D0] hover:bg-[#40E0D0]/90 text-black'
                }`}
              >
                {isGettingQuote
                  ? t.modals?.swap?.loading || 'Loading...'
                  : !amountReady
                  ? t.modals?.swap?.enterAmount || 'Enter amount'
                  : sameToken
                  ? t.modals?.swap?.selectDifferentTokens || 'Select different tokens'
                  : 'Get quote'}
              </button>
            </div>
          )}

          {swapState === 'quote' && quote && inputTokenInfo && outputTokenInfo && (
            <div className="!space-y-4">
              <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30] !space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t.modals?.swap?.youPay || 'You Pay'}</span>
                  <span className="text-white font-medium">
                    {amount} {inputSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t.modals?.swap?.youReceive || 'You Receive'} (est.)</span>
                  <span className="text-white font-medium">
                    {formatAmount(quote.outputAmount)} {outputSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Minimum received</span>
                  <span className="text-white">
                    {formatAmount(quote.minimumOutputAmount)} {outputSymbol}
                  </span>
                </div>
              </div>

              {!IS_MAINNET && !involvesSwarp && (
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg !p-3">
                  <p className="text-yellow-400 text-sm">
                    Jupiter swaps only work on mainnet. On {NETWORK_LABEL}, only SWARP swaps (via Raydium) are available.
                  </p>
                </div>
              )}

              <div className="!space-y-3 !py-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.provider || 'Provider'}</span>
                  <span className="text-white">{provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.rate || 'Rate'}</span>
                  <span className="text-white">
                    1 {outputSymbol} ≈ {formatAmount(quote.inputAmount / quote.outputAmount, 8)} {inputSymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price impact</span>
                  <span className={quote.priceImpact > 3 ? 'text-yellow-400' : 'text-white'}>
                    {Number.isFinite(quote.priceImpact) ? `${quote.priceImpact.toFixed(2)}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max slippage</span>
                  <span className="text-white">{slippage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.modals?.swap?.fee || 'Fees'}</span>
                  <span className="text-white">{formatAmount(quote.fees?.total ?? NaN, 9)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quote valid for</span>
                  <span className={quoteExpired ? 'text-red-400' : 'text-white'}>{quoteExpired ? 'expired' : `${secondsLeft}s`}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg !p-3" role="alert">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={backToEdit} className="flex-1 !py-4 rounded-xl font-medium bg-[#2B2D30] text-white">
                  Back
                </button>
                {quoteExpired ? (
                  <button type="button" onClick={getQuote} disabled={isGettingQuote} className="flex-1 !py-4 rounded-xl font-medium bg-[#40E0D0] text-black">
                    {isGettingQuote ? 'Refreshing…' : 'Refresh quote'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="flex-1 !py-4 rounded-xl font-medium bg-[#40E0D0] hover:bg-[#40E0D0]/90 text-black"
                  >
                    {t.modals?.swap?.swapNow || 'Swap now'}
                  </button>
                )}
              </div>
            </div>
          )}

          {swapState === 'success' && swapResult && (
            <div className="text-center !space-y-6">
              <div className="flex justify-center">
                <div className="bg-[#40E0D0] rounded-full !p-4">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white !mb-2">{t.modals?.swap?.conversionSuccessful || 'Swap successful!'}</h3>
                <p className="text-gray-400 text-sm">
                  {t.modals?.swap?.swappedMessage || "You've swapped"}{' '}
                  <span className="text-white font-medium">
                    {formatAmount(swapResult.inputAmount)} {swapResult.inputSymbol}
                  </span>{' '}
                  {t.modals?.swap?.into || 'for'}{' '}
                  <span className="text-white font-medium">
                    {formatAmount(swapResult.outputAmount)} {swapResult.outputSymbol}
                  </span>{' '}
                  {t.modals?.swap?.via || 'via'} <span className="text-white">{provider}</span>
                </p>
                {swapResult.txHash && <p className="text-gray-500 text-xs !mt-2 break-all">Transaction: {swapResult.txHash}</p>}
              </div>
              <button
                onClick={handleGoToWallet}
                className="w-full !py-4 !px-4 rounded-xl font-medium bg-[#40E0D0] hover:bg-[#40E0D0]/90 text-black transition-all"
              >
                {t.modals?.swap?.goToWallet || 'Go to wallet'}
              </button>
            </div>
          )}
        </div>
      </div>

      <PinConfirmModal
        isOpen={confirming && swapState === 'quote' && quote !== null}
        title="Confirm swap"
        confirmLabel="Swap"
        summary={
          quote
            ? [
                { label: 'You pay', value: `${amount} ${inputSymbol}` },
                { label: 'Minimum received', value: `${formatAmount(quote.minimumOutputAmount)} ${outputSymbol}` },
                { label: 'Max slippage', value: `${slippage}%` },
                { label: 'Network', value: NETWORK_LABEL },
              ]
            : []
        }
        onCancel={() => setConfirming(false)}
        onConfirmed={async (pin) => {
          try {
            await executeSwap(pin);
          } catch (err) {
            const reason = errorMessage(err, t.modals?.swap?.errors?.failedToExecute || 'Failed to execute swap');
            showError((t.modals?.swap?.errors?.swapFailedWithReason || 'Swap failed: {reason}').replace('{reason}', reason));
            throw err;
          }
        }}
      />
    </>
  );
};
