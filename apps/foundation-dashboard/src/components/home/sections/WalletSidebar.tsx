'use client';

import React from 'react';
import Image from 'next/image';
import { WalletData } from '@/types/home';
import type { TranslationKeys } from '@/i18n';

interface UserState {
  id?: string;
  username?: string;
  profilePictureUrl?: string | null;
}

interface UserProfile {
  username?: string;
  firstName: string;
  lastName: string;
}

interface WalletSidebarProps {
  t: TranslationKeys;
  wallet: WalletData | null;
  user: UserState;
  userProfile: UserProfile | null;
  portfolioValue?: number;
  formatPublicKey: (key: string | null | undefined) => string;
  handleCopyAddress: () => void;
  handleOpenUsernameModal: () => void;
  handleCloseUsernameCard: () => void;
  handleTopUpClick: () => void;
  handleWithdraw: () => void;
  setShowSendModal: (show: boolean) => void;
  setShowReceiveModal: (show: boolean) => void;
  setShowSwapModal: (show: boolean) => void;
  className?: string;
}

export const WalletSidebar: React.FC<WalletSidebarProps> = ({
  t,
  wallet,
  user,
  userProfile,
  portfolioValue,
  formatPublicKey,
  handleCopyAddress,
  handleOpenUsernameModal,
  handleCloseUsernameCard,
  handleTopUpClick,
  handleWithdraw,
  setShowSendModal,
  setShowReceiveModal,
  setShowSwapModal,
  className = '',
}) => {
  const walletT = t.wallet as Record<string, unknown> | undefined;
  const commonT = t.common as Record<string, string> | undefined;
  const moonPayT = t.moonPay as Record<string, string> | undefined;

  return (
    <div className={`w-full lg:w-[400px] lg:min-w-[400px] !p-4 lg:!p-7 !space-y-4 lg:!space-y-6 border-b lg:border-l border-[#2B2D30] overflow-y-auto overflow-x-hidden h-full ${className}`}>
      {/* My Wallet Section */}
      <div>
        <div className="flex items-center !gap-3 !mb-4">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#40E0D0]">
            {user.profilePictureUrl ? (
              <Image
                src={user.profilePictureUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                width={40}
                height={40}
                unoptimized
              />
            ) : user.username ? (
              <span className="text-[#090A11] font-semibold">
                {user.username[0].toUpperCase()}
              </span>
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#090A11]/20 animate-pulse"></div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-white text-base font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
              {(walletT?.myWallet as string) || "My Wallet"}
            </h3>
            <div className="flex items-center !gap-2">
              <p className="text-[#636466] text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                {wallet ? formatPublicKey(wallet.publicKey) : (commonT?.loading || 'Loading...')}
              </p>
              <button
                onClick={handleCopyAddress}
                className="!p-1 hover:bg-[#2B2D30] rounded transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="#636466" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Username Card - Show only if no username set and not dismissed */}
        {userProfile && !userProfile.username && userProfile.username !== 'dismissed' && (
          <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30] !mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#143536] rounded-full flex items-center justify-center">
                <Image
                  src="figma-assets/username.svg"
                  alt="Username icon"
                  width={12}
                  height={12}
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="flex-1">
                <p className="text-[#B3B5B6] text-sm">
                  {(walletT?.createUsernameDesc as string) || "Create your @username: A unique identity for your wallet."}
                </p>
                <button
                  onClick={handleOpenUsernameModal}
                  className="text-[#40E0D0] text-sm hover:text-white transition-colors mt-1 cursor-pointer"
                >
                  {(walletT?.createUsername as string) || "Create Username"}
                </button>
              </div>
              <button
                onClick={handleCloseUsernameCard}
                className="w-6 h-6 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <Image
                  src="figma-assets/cross.svg"
                  alt="Close"
                  width={12}
                  height={12}
                  className="object-contain w-full h-full"
                />
              </button>
            </div>
          </div>
        )}

        {/* Username Display - Show if username is set */}
        {userProfile?.username && userProfile.username !== 'dismissed' && (
          <div className="bg-[#131519] rounded-xl !p-4 border border-[#2B2D30] !mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#40E0D0] to-[#40E0D0]/80 rounded-full flex items-center justify-center">
                <span className="text-[#090A11] font-bold text-lg">
                  {userProfile.username?.[0]?.toUpperCase() || '@'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-white text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                  @{userProfile.username}
                </h3>
                <p className="text-[#B3B5B6] text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                  {(walletT?.uniqueIdentity as string) || "Your unique wallet identity"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="text-start !mb-6">
          <div className="flex items-center gap-1">
            <p className="text-[#636466] text-sm !mb-2">
              {(walletT?.estimatedBalance as string) || "Estimated balance"}
            </p>
            <div className="w-4 h-4 !mb-1.5">
              <Image
                src="figma-assets/info.svg"
                alt="Info"
                width={12}
                height={12}
                className="object-contain w-full h-full"
              />
            </div>
          </div>
          <h2 className="text-white text-3xl lg:text-4xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            {wallet ? `$${(portfolioValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
          </h2>
          <p className="text-[#636466] text-sm !mt-1">
            {wallet ? `${wallet.balance.toFixed(6)} SOL` : '0.000000 SOL'}
          </p>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col !gap-2 !mb-6">
          {[
            { icon: 'send', label: (walletT?.send as string) || 'Send', action: () => setShowSendModal(true) },
            { icon: 'receive', label: (walletT?.receive as string) || 'Receive', action: () => setShowReceiveModal(true) },
            { icon: 'swap', label: (walletT?.swap as string) || 'Swap', action: () => setShowSwapModal(true) },
            { icon: 'topup', label: (walletT?.topUp as string) || 'Top up', action: handleTopUpClick },
            { icon: 'withdraw', label: (walletT?.withdraw as string) || 'Withdraw', action: handleWithdraw }
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              className="flex items-center justify-start !gap-2 !p-2 hover:bg-[#131519] rounded-lg transition-colors cursor-pointer w-full min-w-0"
            >
              <div className="w-10 h-10 bg-[#131519] rounded-full flex items-center justify-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center">
                  {action.icon === 'send' && (
                    <Image src="figma-assets/send.svg" alt="Send" width={12} height={12} className="object-contain w-full h-full" />
                  )}
                  {action.icon === 'receive' && (
                    <Image src="figma-assets/receive.svg" alt="Receive" width={12} height={12} className="object-contain w-full h-full" />
                  )}
                  {action.icon === 'swap' && (
                    <Image src="figma-assets/swap-bg.svg" alt="Swap" width={12} height={12} className="object-contain w-full h-full" />
                  )}
                  {action.icon === 'topup' && (
                    <Image src="figma-assets/top-up.svg" alt="Top up" width={12} height={12} className="object-contain w-full h-full" />
                  )}
                  {action.icon === 'withdraw' && (
                    <Image src="figma-assets/withdraw.svg" alt="Withdraw" width={12} height={12} className="object-contain w-full h-full" />
                  )}
                </div>
              </div>
              <span className="text-[#B3B5B6] text-xs">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
