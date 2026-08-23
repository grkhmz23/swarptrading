"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, User } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchMilestones, claimReward, RewardResponse } from "@/store/slices/rewardSlice";
import { fetchReferrals } from "@/store/slices/referralSlice";
import { useT } from "@/i18n/I18nProvider";

// Icon mapping for milestones
const MILESTONE_ICONS: Record<string, string> = {
  "welcome-bonus": "/figma-assets/welocmeBonusSvg.svg",
  "cashback-booster": "/figma-assets/cashbackBoosterSvg.svg",
  "early-airdrop-access": "/figma-assets/earlyAirDropAccessSvg.svg",
};

export default function RewardItem() {
  const t = useT();
  const dispatch = useDispatch<AppDispatch>();

  const { milestones, loadingMilestones, claiming } = useSelector((state: RootState) => state.rewards);

  // Helper to translate milestone titles and descriptions
  const getTranslatedMilestone = (rewardType: string, fallbackName: string, fallbackSubtitle: string) => {
    const milestoneMap: Record<string, { title: string; desc: string }> = {
      'welcome-bonus': {
        title: t.rewardsPage?.milestones?.welcomeBonus || fallbackName,
        desc: t.rewardsPage?.milestones?.welcomeBonusDesc || fallbackSubtitle,
      },
      'cashback-booster': {
        title: t.rewardsPage?.milestones?.cashbackBooster || fallbackName,
        desc: t.rewardsPage?.milestones?.cashbackBoosterDesc || fallbackSubtitle,
      },
      'early-airdrop-access': {
        title: t.rewardsPage?.milestones?.earlyAirdropAccess || fallbackName,
        desc: t.rewardsPage?.milestones?.earlyAirdropAccessDesc || fallbackSubtitle,
      },
    };
    return milestoneMap[rewardType] || { title: fallbackName, desc: fallbackSubtitle };
  };

  // Helper to translate requirement label (e.g., "1 FRIEND" -> "1 AMICO")
  const getTranslatedRequirementLabel = (label: string) => {
    if (!label) return label;
    const match = label.match(/^(\d+)\s+(FRIEND|FRIENDS)$/i);
    if (match) {
      const count = parseInt(match[1], 10);
      const friendWord = count === 1
        ? (t.rewardsPage?.friend || "FRIEND")
        : (t.rewardsPage?.friends || "FRIENDS");
      return `${count} ${friendWord}`;
    }
    return label;
  };
  const { referrals, count, loading, error } = useSelector(
    (state: RootState) => state.referrals
  );
  const user = useSelector((state: RootState) => state.user);

  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAuthToken(localStorage.getItem("swarp_fd_access_token"));
  }, []);

  useEffect(() => {
    if (!authToken) return;
    if (referrals.length === 0) {
      dispatch(fetchReferrals(authToken));
    }
  }, [dispatch, referrals.length, authToken]);

  useEffect(() => {
    if (!authToken || !user?.id) return;
    dispatch(fetchMilestones({ userId: user.id, token: authToken }));
  }, [dispatch, authToken, user?.id]);

  const handleClaim = async (rewardType: string) => {
    if (!user?.id || !authToken) {
      alert("Authentication required. Please log in again.");
      return;
    }
    try {
      await dispatch(claimReward({ userId: user.id, rewardType, token: authToken })).unwrap();
    } catch (err: unknown) {
      console.error("Claim failed:", err);
      const message =
        err instanceof Error ? err.message : "Failed to claim reward. Please try again.";
      alert(message);
    }
  };

  const progressCurrent = milestones.filter((m) => m.claimed).length;
  const progressTotal = milestones.length || 3;
  const progressPercent = Math.round((progressCurrent / progressTotal) * 100);

  const isLoading = loadingMilestones || loading;

  return (
    <div className="w-full max-w-4xl mx-auto !pb-11 ">
      <div className="w-[742px] sm:w-[400px] md:w-[550px] lg:w-[540px] xl:w-[742px] 2xl:w-[742px] border-[0.2px] border-[#2B2D30] rounded-[12px] bg-transparent !p-6 text-gray-300 max-md:w-full">
        {/* Header */}
        <div className="!mb-4">
          <h3 className="text-[18px] font-semibold text-white">{t.settings?.referAndEarn?.rewards?.title || "Rewards & milestones"}</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00F0C8] border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Progress Section */}
            <div className="flex items-start justify-start !gap-4 !mb-[29px]">
              <Image
                src="/figma-assets/tierSvg.svg"
                alt="Tier Icon"
                width={31}
                height={67}
                className="object-contain"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] text-[#9AA0A3]">{t.settings?.referAndEarn?.rewards?.nextUnlock || "Next unlock:"}</div>
                    <div className="text-[16px] font-semibold text-white !mt-1">{t.settings?.referAndEarn?.rewards?.proTier || "Pro Tier"}</div>
                  </div>
                  <div className="text-[12px] text-[#9AA0A3]">{progressCurrent}/{progressTotal}</div>
                </div>
                <div className="!mt-3 ">
                  <div className="w-full h-1.5 rounded-full bg-[#0e0f10] border border-[#1A1C1E] overflow-hidden">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${progressPercent}%`, background: "#40E0D0" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#1F2124] !mb-4" />

            {/* You referred */}
            <div className="flex flex-col !mb-5">
              <div className="flex justify-between items-center !gap-3">
                <div className="flex items-center gap-[4px]">
                  <div className="text-[14px] text-white font-semibold">{t.settings?.referAndEarn?.rewards?.youReferred || "You referred"}</div>
                </div>
                <div className="flex items-center !gap-1 text-white">
                  <Image
                    src="/figma-assets/userIconSvg.svg"
                    alt="users"
                    width={11}
                    height={13}
                    className="inline-block"
                  />
                  <span className="text-[12px] font-medium">{count}</span>
                </div>
              </div>

              {error && <div className="text-sm text-red-500 mt-3">{error}</div>}
              {!error && referrals.length === 0 && (
                <div className="text-sm text-gray-500 mt-3">{t.settings?.referAndEarn?.rewards?.noReferrals || "No referrals yet."}</div>
              )}
              {referrals.length > 0 && (
                <div className="flex flex-col gap-[10px] !mt-[12px]">
                  {referrals.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {c.profilePicture ? (
                          <div className="w-[38px] h-[38px] rounded-full overflow-hidden flex items-center justify-center">
                            <Image
                              src={c.profilePicture}
                              alt={`${c.firstName} ${c.lastName}`}
                              width={38}
                              height={38}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#40E0D0] text-black font-semibold text-lg">
                            {c.firstName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="text-[14px] text-white font-medium">
                          {c.firstName} {c.lastName}
                        </div>
                      </div>
                      <div className="text-[12px] text-[#636466] text-right">
                        {t.settings?.referAndEarn?.rewards?.joined || "Joined"} {new Date(c.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#1F2124] !mb-4" />

            {/* Milestones */}
            <div className="!space-y-4">
              {milestones.map((m: RewardResponse) => {
                const translated = getTranslatedMilestone(m.rewardType, m.rewardName, m.subtitle);
                const translatedLabel = getTranslatedRequirementLabel(m.requirementLabel);
                return (
                <div key={m.rewardType} className="flex items-center justify-between gap-4 rounded-lg">
                  <div className="flex items-center !gap-4">
                    <div className="flex items-start justify-start rounded-md ">
                      <ImageOrFallback
                        src={MILESTONE_ICONS[m.rewardType]}
                        alt={translated.title}
                        size={84}
                      />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[#00F0C8] !mb-1">{translatedLabel}</div>
                      <div className="text-[16px] font-semibold text-white">{translated.title}</div>
                      <div className="text-[12px] text-[#636466] !mt-1">{translated.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {m.claimed ? (
                      <button
                        disabled
                        className="!px-6 !py-2 rounded-full bg-[#2B2D30] text-[#636466] text-[14px] font-medium cursor-not-allowed flex items-center gap-1"
                      >
                        <Check size={20} />
                        {t.settings?.referAndEarn?.rewards?.claimed || "Claimed"}
                      </button>
                    ) : m.eligible ? (
                      <button
                        onClick={() => handleClaim(m.rewardType)}
                        disabled={claiming === m.rewardType}
                        className="!px-6 !py-2 rounded-full bg-white text-[#090A11] text-[14px] cursor-pointer font-bold hover:opacity-95 transition"
                      >
                        {claiming === m.rewardType ? (t.settings?.referAndEarn?.rewards?.claiming || "Claiming...") : (t.settings?.referAndEarn?.rewards?.claim || "Claim")}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="!px-6 !py-2 rounded-full bg-[#2B2D30] text-[#636466] text-[14px] font-medium cursor-not-allowed"
                      >
                        {t.settings?.referAndEarn?.rewards?.locked || "Locked"}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ImageOrFallback({ src, alt, size = 40 }: { src?: string; alt?: string; size?: number }) {
  if (src) {
    return <Image src={src} alt={alt || ""} width={size} height={size} className="object-contain" />;
  }
  return <User size={size} className="text-[#9AA0A3]" />;
}
