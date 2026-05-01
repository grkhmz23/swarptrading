'use client';

import React from 'react';
import { useT } from '@/i18n/I18nProvider';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFiatTopUp: () => void;
  onBankTransfer?: () => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  onFiatTopUp,
  onBankTransfer,
}) => {
  const t = useT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 !p-4">
      <div className="bg-[#131519] rounded-2xl !p-6 w-full max-w-[435px] my-auto min-h-fit max-h-[90vh] relative flex flex-col ">
        {/* Header */}
        <div className="!mb-6">
          {/* Close Button and Title */}
          <div className="flex items-center justify-between !mb-6">
            <h2 className="text-white text-[18px] font-bold">{t.modals?.topUp?.title || "Top up"}</h2>
            <button
              onClick={onClose}
              className="!p-2 text-[#636466] hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Divider - Full width */}
        <div className="absolute left-0 right-0 h-px bg-[#2B2D30]" style={{ top: '75px' }}></div>

        <div className="text-start !mb-8 !mt-2">
          <h3 className="text-white text-xl font-semibold !mb-1">{t.modals?.topUp?.topUpYourWallet || "Top up your wallet"}</h3>
          <p className="text-[#636466] text-[14px]">
            {t.modals?.topUp?.fiatDescription || "Purchase SOL, USDC, or USDT directly with your bank card via MoonPay."}
          </p>
        </div>

        {/* Top Up Options */}
        <div className="!space-y-4 !mb-16">
          <button
            onClick={onFiatTopUp}
            className="w-full bg-[#131519] border rounded-xl !p-4 transition-colors cursor-pointer group border-[#2B2D30] hover:border-[#40E0D0]"
          >
            <div className="flex items-center !gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20.64 4.32031H3.36002C2.03627 4.32031 0.960022 5.39656 0.960022 6.72031V17.2803C0.960022 18.6041 2.03627 19.6803 3.36002 19.6803H20.64C21.9638 19.6803 23.04 18.6041 23.04 17.2803V6.72031C23.04 5.39656 21.9638 4.32031 20.64 4.32031ZM12 12.4803H4.32002V11.5203H12V12.4803ZM22.08 10.0803H1.92002V7.68031H22.08V10.0803Z" fill="white"/>
                </svg>
              </div>
              <div className="text-left flex-1">
                <h4 className="text-white text-[14px] font-semibold !mb-1">{t.modals?.topUp?.topUpWithFiat || "Top up with Fiat"}</h4>
                <p className="text-[#636466] text-[12px]">{t.modals?.topUp?.supportedTokens || "SOL, USDC, USDT"}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>

          {onBankTransfer && (
            <button
              onClick={onBankTransfer}
              className="w-full bg-[#131519] border rounded-xl !p-4 transition-colors cursor-pointer group border-[#2B2D30] hover:border-[#40E0D0]"
            >
              <div className="flex items-center !gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <h4 className="text-white text-[14px] font-semibold !mb-1">{"Bank Transfer"}</h4>
                  <p className="text-[#636466] text-[12px]">{"Deposit or withdraw via bank account"}</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18l6-6-6-6" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* Info text */}
        <div className="text-center">
          <p className="text-[#636466] text-[12px]">
            {t.modals?.topUp?.swapHint || "Want other tokens? Buy SOL first, then swap to any token."}
          </p>
        </div>
      </div>
    </div>
  );
};
