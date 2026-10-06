'use client';

import React, { useState } from 'react';
import { apiService } from '@/services/api';

interface FiatFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  walletAddress: string;
  authToken: string;
}

type TabType = 'deposit' | 'withdraw';

const FIAT_CURRENCIES = [
  { code: 'EUR', symbol: '\u20AC', label: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', label: 'British Pound' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
];

const CRYPTO_OPTIONS = [
  { code: 'SOL', label: 'Solana' },
  { code: 'USDC', label: 'USD Coin' },
];

export const FiatFlowModal: React.FC<FiatFlowModalProps> = ({
  isOpen,
  onClose,
  walletId,
  walletAddress,
  authToken,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  const [fiatCurrency, setFiatCurrency] = useState('EUR');
  const [cryptoCurrency, setCryptoCurrency] = useState('SOL');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showFiatDropdown, setShowFiatDropdown] = useState(false);

  if (!isOpen) return null;

  const selectedFiat = FIAT_CURRENCIES.find((c) => c.code === fiatCurrency) || FIAT_CURRENCIES[0];

  const handleContinue = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.generateTransakUrl(walletId, authToken, {
        type: activeTab === 'deposit' ? 'buy' : 'sell',
        walletAddress,
        fiatCurrency,
        cryptoCurrency,
        fiatAmount: parseFloat(amount),
      });

      window.open(result.url, '_blank');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate transfer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab('deposit');
    setAmount('');
    setError(null);
    setSuccess(false);
    setShowFiatDropdown(false);
    onClose();
  };

  // Rough estimate display (illustrative only)
  const estimatedCrypto = amount && parseFloat(amount) > 0
    ? (cryptoCurrency === 'USDC'
      ? parseFloat(amount) * 0.98
      : parseFloat(amount) * 0.0067
    ).toFixed(cryptoCurrency === 'USDC' ? 2 : 4)
    : '0';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 !p-4" onClick={handleClose}>
      <div
        className="bg-[#1A1B23] rounded-3xl !p-6 w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 !p-2 text-[#636466] hover:text-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Tab selector */}
        <div className="flex bg-[#090A11] rounded-xl !p-1 !mb-6">
          <button
            onClick={() => { setActiveTab('deposit'); setSuccess(false); setError(null); }}
            className={`flex-1 !py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'deposit'
                ? 'bg-[#40E0D0] text-black'
                : 'text-[#636466] hover:text-white'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => { setActiveTab('withdraw'); setSuccess(false); setError(null); }}
            className={`flex-1 !py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'withdraw'
                ? 'bg-[#40E0D0] text-black'
                : 'text-[#636466] hover:text-white'
            }`}
          >
            Withdraw
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="text-center !py-8">
            <div className="w-16 h-16 bg-[#40E0D0]/20 rounded-full flex items-center justify-center !mx-auto !mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-white text-lg font-semibold !mb-2">Transfer initiated!</h3>
            <p className="text-[#636466] text-sm !mb-6">
              Complete the process in the Transak window.
            </p>
            <button
              onClick={handleClose}
              className="bg-[#40E0D0] text-black font-semibold !py-3 rounded-xl w-full hover:bg-[#40E0D0]/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Heading */}
            <div className="!mb-5">
              <h2 className="text-white text-lg font-bold !mb-1">
                {activeTab === 'deposit' ? 'Deposit via Bank Transfer' : 'Withdraw to Bank Account'}
              </h2>
              <p className="text-[#636466] text-sm">
                {activeTab === 'deposit'
                  ? 'Buy SOL or USDC directly from your bank account'
                  : 'Sell your crypto and receive funds in your bank'}
              </p>
            </div>

            {/* Fiat currency selector */}
            <div className="!mb-4">
              <label className="text-[#636466] text-xs !mb-1.5 block">
                {activeTab === 'deposit' ? 'You pay' : 'You receive'}
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowFiatDropdown(!showFiatDropdown)}
                  className="w-full bg-[#090A11] border border-[#2B2D30] rounded-xl !px-4 !py-3 flex items-center justify-between text-white hover:border-[#40E0D0]/50 transition-colors"
                >
                  <span className="text-sm font-medium">{selectedFiat.code} ({selectedFiat.symbol})</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showFiatDropdown && (
                  <div className="absolute top-full left-0 right-0 !mt-1 bg-[#090A11] border border-[#2B2D30] rounded-xl overflow-hidden z-10">
                    {FIAT_CURRENCIES.map((currency) => (
                      <button
                        key={currency.code}
                        onClick={() => { setFiatCurrency(currency.code); setShowFiatDropdown(false); }}
                        className={`w-full !px-4 !py-3 text-left text-sm hover:bg-[#1A1B23] transition-colors ${
                          fiatCurrency === currency.code ? 'text-[#40E0D0]' : 'text-white'
                        }`}
                      >
                        {currency.code} ({currency.symbol}) - {currency.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount input */}
            <div className="!mb-4">
              <label className="text-[#636466] text-xs !mb-1.5 block">
                {activeTab === 'deposit' ? 'Amount' : 'Crypto amount'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#636466] text-sm">
                  {activeTab === 'deposit' ? selectedFiat.symbol : ''}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(null); }}
                  placeholder="0.00"
                  className={`w-full bg-[#090A11] border border-[#2B2D30] rounded-xl !py-3 text-white text-sm focus:outline-none focus:border-[#40E0D0] transition-colors ${
                    activeTab === 'deposit' ? '!pl-8 !pr-4' : '!px-4'
                  }`}
                />
              </div>
            </div>

            {/* Crypto selector */}
            <div className="!mb-4">
              <label className="text-[#636466] text-xs !mb-1.5 block">
                {activeTab === 'deposit' ? 'You receive' : 'You sell'}
              </label>
              <div className="flex gap-2">
                {CRYPTO_OPTIONS.map((crypto) => (
                  <button
                    key={crypto.code}
                    onClick={() => setCryptoCurrency(crypto.code)}
                    className={`flex-1 !py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                      cryptoCurrency === crypto.code
                        ? 'bg-[#40E0D0]/10 border-[#40E0D0] text-[#40E0D0]'
                        : 'bg-[#090A11] border-[#2B2D30] text-[#636466] hover:border-[#40E0D0]/30'
                    }`}
                  >
                    {crypto.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated amount */}
            <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !px-4 !py-3 !mb-5">
              <div className="flex justify-between items-center">
                <span className="text-[#636466] text-xs">
                  {activeTab === 'deposit' ? 'Estimated receive' : 'Estimated payout'}
                </span>
                <span className="text-white text-sm font-medium">
                  {activeTab === 'deposit'
                    ? `~${estimatedCrypto} ${cryptoCurrency}`
                    : `~${selectedFiat.symbol}${estimatedCrypto}`
                  }
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl !px-4 !py-3 !mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={handleContinue}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="bg-[#40E0D0] text-black font-semibold !py-3 rounded-xl w-full hover:bg-[#40E0D0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                activeTab === 'deposit' ? 'Continue to Bank Transfer' : 'Continue to Withdrawal'
              )}
            </button>

            {/* Footer note */}
            <p className="text-[#636466] text-[11px] text-center !mt-3">
              Powered by Transak &bull; Secure bank transfers
            </p>
          </>
        )}
      </div>
    </div>
  );
};
