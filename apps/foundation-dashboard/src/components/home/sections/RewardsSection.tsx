'use client';

import React from 'react';
import Image from 'next/image';
import { User, Check } from 'lucide-react';
import { WalletSidebar } from './WalletSidebar';
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

interface RewardItem {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  requirementLabel: string;
  claimed?: boolean;
  eligible?: boolean;
  rewardType: string;
  progress?: number;
}

interface RewardsSectionProps {
  t: TranslationKeys;
  wallet: WalletData | null;
  user: UserState;
  userProfile: UserProfile | null;
  displayRewards: RewardItem[];
  displayMoreRewards: RewardItem[];
  loadingYourRewards: boolean;
  loadingMoreRewards: boolean;
  claiming: string | null;
  mainnetBalance: number;
  portfolioValue?: number;
  isBalanceSyncing: boolean;
  // Handlers
  formatPublicKey: (key: string | null | undefined) => string;
  handleClaim: (rewardType: string) => void;
  handleCopyAddress: () => void;
  handleOpenUsernameModal: () => void;
  handleCloseUsernameCard: () => void;
  handleBalanceSync: () => void;
  handleTopUpClick: () => void;
  handleMoonPaySell: () => void;
  setShowSendModal: (show: boolean) => void;
  setShowReceiveModal: (show: boolean) => void;
  setShowSwapModal: (show: boolean) => void;
}

export const RewardsSection: React.FC<RewardsSectionProps> = ({
  t,
  wallet,
  user,
  userProfile,
  displayRewards,
  displayMoreRewards,
  loadingYourRewards,
  loadingMoreRewards,
  claiming,
  mainnetBalance,
  portfolioValue,
  isBalanceSyncing,
  formatPublicKey,
  handleClaim,
  handleCopyAddress,
  handleOpenUsernameModal,
  handleCloseUsernameCard,
  handleBalanceSync,
  handleTopUpClick,
  handleMoonPaySell,
  setShowSendModal,
  setShowReceiveModal,
  setShowSwapModal,
}) => {
  const rewardsPageT = t.rewardsPage as Record<string, string> | undefined;

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-0 overflow-visible !px-7 sm:!px-10 md:!px-16 lg:!px-0">
      {/* Left Column - Rewards Content */}
      <div className="flex-1 flex flex-col !p-4 lg:!p-7 border-b lg:border-b-0 border-[#2B2D30] overflow-visible lg:overflow-y-auto">
        {(loadingYourRewards || loadingMoreRewards) ? (
          <div className="flex items-center justify-center py-16 flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00F0C8] border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="!mb-4">
              <h3 className="text-[18px] font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                {rewardsPageT?.yourRewards || "Your Rewards"}
              </h3>
            </div>

            <div className="!space-y-7">
              {displayRewards.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 rounded-lg"
                >
                  <div className="flex items-center !gap-2">
                    <div className="flex items-center justify-center rounded-md">
                      {m.icon ? (
                        <Image
                          src={m.icon}
                          alt={m.title}
                          width={84}
                          height={84}
                          className="object-contain"
                        />
                      ) : (
                        <User size={84} className="text-[#9AA0A3]" />
                      )}
                    </div>

                    <div>
                      <div className="text-[12px] font-semibold text-[#00F0C8] !mb-0.5">
                        {m.requirementLabel}
                      </div>
                      <div className="text-[16px] font-semibold text-white">
                        {m.title}
                      </div>
                      <div className="text-[12px] text-[#636466] !mt-1">
                        {m.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {m.claimed ? (
                      <button
                        disabled
                        className="!px-6 !py-2 rounded-full bg-[#2B2D30] text-[#636466] text-[14px] font-medium cursor-not-allowed flex items-center gap-1"
                      >
                        <Check size={20} />
                        {rewardsPageT?.claimed || "Claimed"}
                      </button>
                    ) : m.eligible ? (
                      <button
                        onClick={() => handleClaim(m.rewardType)}
                        disabled={claiming === m.rewardType}
                        className="!px-6 !py-2 rounded-full bg-white text-[#090A11] text-[14px] cursor-pointer font-bold hover:opacity-95 transition"
                      >
                        {claiming === m.rewardType ? (rewardsPageT?.claiming || "Claiming...") : (rewardsPageT?.claim || "Claim")}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="!px-6 !py-2 rounded-full bg-[#2B2D30] text-[#636466] text-[14px] font-medium cursor-not-allowed"
                      >
                        {rewardsPageT?.locked || "Locked"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="!my-7">
              <h3 className="text-[18px] font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                {rewardsPageT?.moreRewards || "More Rewards"}
              </h3>
            </div>

            <div className="!space-y-7">
              {displayMoreRewards.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 rounded-lg"
                >
                  <div className="flex items-center !gap-2">
                    <div className="flex items-center justify-center rounded-md">
                      {m.icon ? (
                        <Image
                          src={m.icon}
                          alt={m.title}
                          width={84}
                          height={84}
                          className="object-contain"
                        />
                      ) : (
                        <User size={84} className="text-[#9AA0A3]" />
                      )}
                    </div>

                    <div>
                      <div className="text-[12px] font-semibold text-[#00F0C8] !mb-1">
                        {m.requirementLabel}
                      </div>
                      <div className="text-[16px] font-semibold text-white">
                        {m.title}
                      </div>
                      <div className="text-[12px] text-[#636466] !mt-1">
                        {m.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-[171px] h-[6px] bg-[#2B2D30] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#40E0D0] rounded-full"
                      style={{ width: `${m.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right Column - Wallet Sidebar */}
      <WalletSidebar
        t={t}
        wallet={wallet}
        user={user}
        userProfile={userProfile}
        mainnetBalance={mainnetBalance}
        portfolioValue={portfolioValue}
        isBalanceSyncing={isBalanceSyncing}
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
        className="border-t lg:border-t-0"
      />
    </div>
  );
};
