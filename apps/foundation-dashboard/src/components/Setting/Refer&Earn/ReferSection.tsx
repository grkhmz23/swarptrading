"use client";

import { useState, useEffect } from "react";
import { Copy, Upload } from "lucide-react";
import RewardItem from "./RewardItem";
import { apiService } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";
import { getAccessToken } from '@/lib/session';

export default function ReferSection() {
  const t = useT();
  const [referralCode, setReferralCode] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);

  // 🔹 Auto-generate referral code on load
useEffect(() => {
  const generateReferral = async () => {
    try {
      const token = getAccessToken();
      if (!token) return console.error("No token found in localStorage");

      // 🔹 Try getting user data from localStorage
      const userData = localStorage.getItem("swarp_fd_user");
      let user = null;

      if (userData) {
        try {
          user = JSON.parse(userData);
        } catch (err) {
          console.error("Error parsing user data:", err);
        }
      }

      // 🔹 If referral_code exists, use it
      if (user?.referral_code) {
        const formattedCode = user.referral_code.split("").join(" ");
        setReferralCode(formattedCode);
        return;
      }

      // 🔹 Otherwise, call API
      const response = await apiService.generateReferral(token);
      if (response?.referralCode) {
        const formattedCode = response.referralCode.split("").join(" ");
        setReferralCode(formattedCode);

        // 🔹 Store back to localStorage user object for next time
        if (user) {
          user.referral_code = response.referralCode;
          localStorage.setItem("swarp_fd_user", JSON.stringify(user));
        } else {
          // if user not found, store it separately
          localStorage.setItem("swarp_fd_referral_code", response.referralCode);
        }
      }
    } catch (err) {
      console.error("Error generating referral code:", err);
    }
  };

  generateReferral();
}, []);

  // Copy referral code
  const copyToClipboard = async () => {
    const code = referralCode.replace(/\s+/g, "");
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  // Share code
  const handleShare = async () => {
    const code = referralCode.replace(/\s+/g, "");
    const shareTextTemplate = t.settings?.referAndEarn?.shareText || "Join me on Swap Pay using my referral code: {code}";
    const shareText = shareTextTemplate.replace("{code}", code);
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.settings?.referAndEarn?.shareTitle || "Swap Pay Referral",
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share cancelled or failed", err);
      }
    } else {
      alert(shareText);
    }
  };

  return (
    <div className="w-full mx-auto flex flex-wrap justify-center gap-7 cursor-default">
      <div className="">
        <div className="gap-2.5">
          <h4
            className="text-[20px] font-bold !py-7 text-white max-md:text-[18px] max-sm:!py-5"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t.settings?.referAndEarn?.title || "Refer & Earn"}
          </h4>
          <div className="border-[0.2px] border-[#2B2D30] rounded-xs" />
        </div>

        <div className="flex justify-center w-full !pt-8">
          <div
            className="
             w-[742px] sm:w-[400px] md:w-[550px] lg:w-[540px] xl:w-[742px] 2xl:w-[742px] h-[261px]
            border-[0.2px] border-[#2B2D30]
              rounded-[12px]
              !p-6 
              flex flex-col
              !gap-6
              text-gray-300
              transition-all duration-200
              max-xl:w-[85%] max-lg:w-[90%] max-md:w-full max-md:h-auto max-sm:!p-5
            "
          >
            <h2
              className="text-white font-semibold text-[18px] max-sm:text-[16px]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t.settings?.referAndEarn?.heading || "Refer & earn with Swap Pay"}
            </h2>

            <div className="!space-y-[18px] max-sm:!space-y-3">
              {[
                t.settings?.referAndEarn?.step1 || "Invite friends using your unique referral code or link.",
                t.settings?.referAndEarn?.step2 || "Earn rewards every time they join and transact.",
                t.settings?.referAndEarn?.step3 || "Track your referrals and rewards easily in one place.",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3 max-sm:gap-2 max-sm:text-[13px] ">
                  <div className="bg-white text-black w-[18px] h-[18px] flex items-center justify-center rounded-full text-[13px] font-medium max-sm:w-4 max-sm:h-4">
                    {i + 1}
                  </div>
                  <p className="text-[#636466] text-[14px] leading-tight max-sm:text-[13px]">
                    {text}
                  </p>
                </div>
              ))}
            </div>

            {/* Referral display */}
            <div className="flex items-center justify-between !gap-3 max-md:flex-col max-md:items-stretch max-md:gap-4">
              <div className="flex items-center justify-between bg-[#131519] rounded-full !pl-6 border border-[#2a2a2a] flex-grow max-md:flex-col max-md:rounded-2xl max-md:!pl-4 max-md:!py-3">
                <div className="flex tracking-[0.4em] text-[#00f0c8] font-[400] text-[16px] max-md:tracking-[0.2em] max-md:mb-2">
                  {referralCode || t.common?.loading || "Loading..."}
                </div>

                <button
                  onClick={copyToClipboard}
                  className="flex items-center bg-[#131519] gap-2 border-[1px] border-white rounded-full !px-4 !py-3 hover:bg-[#1a1d22] transition max-sm:!px-3 max-sm:!py-2 hover:cursor-pointer"
                >
                  <Copy size={14} strokeWidth={3} color="#FFFFFF" />
                  <span className="text-[12px] text-white font-bold whitespace-nowrap">
                    {copySuccess ? (t.settings?.referAndEarn?.copied || "Copied!") : (t.settings?.referAndEarn?.copyCode || "Copy referral code")}
                  </span>
                </button>
              </div>

              <button
                onClick={handleShare}
                className="bg-white text-black rounded-full !p-3 hover:opacity-90 transition shrink-0 max-md:self-center hover:cursor-pointer"
              >
                <Upload size={18} strokeWidth={3}  />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <RewardItem />
      </div>
    </div>
  );
}
