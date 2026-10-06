"use client";

import Image from "next/image";
import { useT } from "@/i18n/I18nProvider";

interface ProgressSectionProps {
  handleVerifyIdentity: () => void;
  verifyLoading?: boolean;
  kycStatus?: 'not_started' | 'pending' | 'approved' | 'declined' | 'resubmission_requested';
  mainnetBalance?: number;
  hasSwapped?: boolean;
}

export default function ProgressSection({
  handleVerifyIdentity,
  verifyLoading,
  kycStatus,
  mainnetBalance = 0,
  hasSwapped = false,
}: ProgressSectionProps) {
  const t = useT();

  // Calculate completed steps
  const isAccountCreated = true; // Always done if they're on this page
  const isIdentityVerified = kycStatus === 'approved';
  const isWalletTopUp = mainnetBalance > 0;
  const isFirstSwap = hasSwapped;

  const completedSteps = [isAccountCreated, isIdentityVerified, isWalletTopUp, isFirstSwap].filter(Boolean).length;
  const progressPercent = (completedSteps / 4) * 100;

  return (
    <div className="rounded-xl !p-3 lg:!p-6">
      <div className="!mb-4">
        <div className="flex items-center justify-between !mb-4">
          <div className="flex items-center !gap-2">
            <div className="w-5 h-5 bg-[#40E0D0] !p-0.5 rounded-full">
              <Image
                src="figma-assets/tick.svg"
                alt="Swarp Foundation Logo"
                width={48}
                height={64}
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-[#B3B5B6] text-sm font-medium">
              {completedSteps === 4
                ? (t.onboarding?.accountCreated || "All done!")
                : (t.onboarding?.almostThere || "You're almost there")}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between !mb-10 !gap-3">
          <h2
            className="text-white text-lg sm:text-xl font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {!isIdentityVerified
              ? (t.onboarding?.verifyIdentity || "Verify your identity")
              : !isWalletTopUp
                ? (t.onboarding?.topUpWallet || "Top up your wallet")
                : !isFirstSwap
                  ? (t.onboarding?.swapFirst || "Swap your first fiat / crypto")
                  : (t.onboarding?.accountCreated || "Account setup complete")}
          </h2>

          <div className="flex items-center !gap-3">
            {/* Progress Bar */}
            <div className="w-32 sm:w-48 bg-[#2B2D30] rounded-full h-2">
              <div
                className="bg-[#40E0D0] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-[#636466] text-sm">{completedSteps}/4</span>
          </div>
        </div>

        <div className="!space-y-2 !mb-8">
          <p className="text-white text-[20px]">{t.onboarding?.remainingSteps || "Remaining steps"}</p>
          <p className="text-[#636466] text-sm">
            {t.onboarding?.closeToFinishing || "You're close to finishing your account setup. Next up, verify your identity."}
          </p>
        </div>

        {/* Steps */}
        <div className="!space-y-8">
          {/* Account Created */}
          <div className="flex items-center !gap-3">
            <div className="w-5 h-5 !p-0.5 bg-[#40E0D0] rounded-full flex items-center justify-center">
              <Image
                src="figma-assets/tick.svg"
                alt="Swarp Foundation Logo"
                width={48}
                height={64}
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-[#B3B5B6] text-sm">{t.onboarding?.accountCreated || "Account created"}</span>
          </div>

          {/* Verify Identity */}
          <div className={`${isIdentityVerified ? '' : 'bg-[#1A1B23]'} rounded-lg !p-4 flex justify-between items-center`}>
            <div className="flex items-start !gap-3 !mb-3">
              {isIdentityVerified ? (
                <div className="w-5 h-5 !p-0.5 bg-[#40E0D0] rounded-full flex items-center justify-center mt-0.5">
                  <Image
                    src="figma-assets/tick.svg"
                    alt="Verified"
                    width={48}
                    height={64}
                    className="object-contain w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                  <Image
                    src="figma-assets/verify.svg"
                    alt="Verify"
                    width={12}
                    height={12}
                    className="object-contain w-full h-full"
                  />
                </div>
              )}

              <div className="flex-1 !space-y-3">
                <h3
                  className={`${isIdentityVerified ? 'text-[#B3B5B6]' : 'text-white'} text-sm font-semibold mb-2`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t.onboarding?.verifyIdentity || "Verify your identity"}
                </h3>

                {!isIdentityVerified && (
                  <>
                    <p
                      className="text-[#636466] text-sm mb-3"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {t.onboarding?.verifyDescription || "To unlock fiat deposits, higher limits & rewards, verify your identity in 2 minutes."}
                    </p>

                    <div className="flex items-center gap-1">
                      <p className="text-[#40E0D0] text-sm cursor-pointer">
                        {t.onboarding?.whyImportant || "Why is this important?"}
                      </p>
                      <div className="h-3 w-3">
                        <Image
                          src="figma-assets/down-arrow.svg"
                          alt="Arrow"
                          width={12}
                          height={12}
                          className="object-contain w-full h-full"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isIdentityVerified && (
              <button
                onClick={handleVerifyIdentity}
                disabled={verifyLoading}
                className={`!cursor-pointer !px-4 !py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  kycStatus === 'pending' || kycStatus === 'declined' || kycStatus === 'resubmission_requested'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-white text-[#090A11] hover:bg-gray-100'
                }`}
              >
                {verifyLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#090A11]"></div>
                    <span className="hidden 2xl:inline">{t.onboarding?.opening || "Opening..."}</span>
                  </div>
                ) : kycStatus === 'pending' || kycStatus === 'declined' || kycStatus === 'resubmission_requested' ? (
                  <>
                    <span className="2xl:hidden">{t.onboarding?.retry || "Retry"}</span>
                    <span className="hidden 2xl:inline">{t.onboarding?.retryVerification || "Retry Verification"}</span>
                  </>
                ) : (
                  <>
                    <span className="2xl:hidden">{t.onboarding?.verify || "Verify"}</span>
                    <span className="hidden 2xl:inline">{t.onboarding?.verifyIdentityFull || "Verify Identity"}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Top Up Wallet */}
          <div className="rounded-lg flex justify-between items-center">
            <div className="flex items-start !gap-3">
              {isWalletTopUp ? (
                <div className="w-5 h-5 !p-0.5 bg-[#40E0D0] rounded-full flex items-center justify-center mt-0.5">
                  <Image
                    src="figma-assets/tick.svg"
                    alt="Done"
                    width={48}
                    height={64}
                    className="object-contain w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                  <Image
                    src="figma-assets/wallet.svg"
                    alt="Top up icon"
                    width={12}
                    height={12}
                    className="object-contain w-full h-full"
                  />
                </div>
              )}

              <div className="flex-1 !space-y-2">
                <h3 className={`${isWalletTopUp ? 'text-[#B3B5B6]' : 'text-[#636466]'} text-sm font-semibold`}>
                  {t.onboarding?.topUpWallet || "Top up your wallet"}
                </h3>
                <p className="text-[#636466] text-sm">
                  {t.onboarding?.topUpDescription || "Top your wallet with Fiat or by depositing Crypto."}
                </p>

                <div className="flex items-center gap-1">
                  <p className="text-[#40E0D0]/50 text-sm">{t.onboarding?.learnMore || "Learn more"}</p>
                  <div className="h-3 w-3 opacity-50">
                    <Image
                      src="figma-assets/down-arrow.svg"
                      alt="Arrow down"
                      width={12}
                      height={12}
                      className="object-contain w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Step */}
          <div className="rounded-lg !pt-2 flex justify-between items-center">
            <div className="flex items-start !gap-3">
              {isFirstSwap ? (
                <div className="w-5 h-5 !p-0.5 bg-[#40E0D0] rounded-full flex items-center justify-center mt-0.5">
                  <Image
                    src="figma-assets/tick.svg"
                    alt="Done"
                    width={48}
                    height={64}
                    className="object-contain w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                  <Image
                    src="figma-assets/swap.svg"
                    alt="Swap icon"
                    width={12}
                    height={12}
                    className="object-contain w-full h-full"
                  />
                </div>
              )}

              <div className="flex-1 !space-y-2">
                <h3 className={`${isFirstSwap ? 'text-[#B3B5B6]' : 'text-[#636466]'} text-sm font-semibold`}>
                  {t.onboarding?.swapFirst || "Swap your first fiat / crypto"}
                </h3>
                <p className="text-[#636466] text-sm">
                  {t.onboarding?.swapDescription || "Jump start your fiat / crypto portfolio."}
                </p>

                <div className="flex items-center gap-1">
                  <p className="text-[#40E0D0]/50 text-sm">{t.onboarding?.learnMore || "Learn more"}</p>
                  <div className="h-3 w-3 opacity-50">
                    <Image
                      src="figma-assets/down-arrow.svg"
                      alt="Arrow down"
                      width={12}
                      height={12}
                      className="object-contain w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
