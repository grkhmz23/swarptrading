"use client";

import React, { useState, useEffect } from "react";
import SettingsTile from "./shared/SettingsTile";
import ToggleButton from "./shared/ToggleButton";
import { apiService } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";

interface NotificationPreferences {
  allowNotifications: boolean;
  transactionAlerts: boolean;
  swapAndTopUp: boolean;
  rewardsAndReferrals: boolean;
  securityActivity: boolean;
}

export default function Notifications() {
  const t = useT();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    allowNotifications: true,
    transactionAlerts: true,
    swapAndTopUp: true,
    rewardsAndReferrals: true,
    securityActivity: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("swarp_fd_access_token");
      if (!token) {
        console.error("No access token found");
        return;
      }

      const prefs = await apiService.getNotificationPreferences(token);
      console.log("Loaded preferences:", prefs);
      setPreferences(prefs);
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
      // Keep default preferences on error (all true)
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const previousValue = preferences[key];

    try {
      setIsSaving(true);
      const token = localStorage.getItem("swarp_fd_access_token");
      if (!token) {
        console.error("No access token found");
        return;
      }

      // Optimistically update UI
      setPreferences((prev) => ({ ...prev, [key]: value }));

      const response = await apiService.updateNotificationPreferences(token, { [key]: value });
      console.log("Preference updated:", key, value, response);

      // Update with server response to ensure consistency
      if (response.preferences) {
        setPreferences(response.preferences);
      }
    } catch (error) {
      console.error("Failed to update notification preference:", error);
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full mx-auto flex flex-wrap justify-center gap-7 cursor-default px-4 sm:px-0">
      {/*  Notifications Section  */}
      <div className="w-full flex flex-col items-center">
        {/*  Page Title  */}
        <div className="gap-2.5 w-full max-w-[742px] md:max-w-[450px] lg:max-w-[540px] xl:max-w-[742px] 2xl:max-w-[742px]">
          <h4
            className="text-[20px] font-bold !py-7 text-white max-md:text-[18px] max-sm:!py-5 sm:text-left"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t.settings?.notifications?.title || "Notifications"}
          </h4>
          {/* Divider */}
          <div className="border-[0.2px] border-[#2B2D30] rounded-xs" />
        </div>

        {/*  Tiles Section  */}
        <div className="flex justify-center w-full !pt-8">
          <div
            className="
              w-[742px] sm:w-[550px] md:w-[450px] lg:w-[540px] xl:w-[742px] 2xl:w-[742px]
              h-full rounded-[12px] flex flex-col
              transition-all duration-200
              max-xl:w-[85%] max-lg:w-[90%] max-md:w-full max-md:h-auto
              max-sm:!p-5 max-sm:!pt-3
            "
          >
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40E0D0]" />
              </div>
            ) : (
              <>
                {/*  Allow Notifications  */}
                <SettingsTile
                  title={t.settings?.notifications?.allowNotifications?.title || "Allow notifications"}
                  rightElement={
                    <ToggleButton
                      checked={preferences.allowNotifications}
                      onChange={(checked) =>
                        updatePreference("allowNotifications", checked)
                      }
                      disabled={isSaving}
                    />
                  }
                />

                {/*  Transaction Alerts  */}
                <SettingsTile
                  title={t.settings?.notifications?.transactionAlerts?.title || "Transaction alerts"}
                  subtitle={t.settings?.notifications?.transactionAlerts?.subtitle || "Receive notifications for incoming and outgoing payments."}
                  rightElement={
                    <ToggleButton
                      checked={preferences.transactionAlerts}
                      onChange={(checked) =>
                        updatePreference("transactionAlerts", checked)
                      }
                      disabled={isSaving || !preferences.allowNotifications}
                    />
                  }
                />

                {/*  Swap & Top Up  */}
                <SettingsTile
                  title={t.settings?.notifications?.swapAndTopUp?.title || "Swap & top up"}
                  subtitle={t.settings?.notifications?.swapAndTopUp?.subtitle || "Get alerts when your swaps or top-ups are completed."}
                  rightElement={
                    <ToggleButton
                      checked={preferences.swapAndTopUp}
                      onChange={(checked) =>
                        updatePreference("swapAndTopUp", checked)
                      }
                      disabled={isSaving || !preferences.allowNotifications}
                    />
                  }
                />

                {/*  Rewards & Referrals  */}
                <SettingsTile
                  title={t.settings?.notifications?.rewardsAndReferrals?.title || "Rewards & referrals"}
                  subtitle={t.settings?.notifications?.rewardsAndReferrals?.subtitle || "Be notified when you earn cashback or referral bonuses."}
                  rightElement={
                    <ToggleButton
                      checked={preferences.rewardsAndReferrals}
                      onChange={(checked) =>
                        updatePreference("rewardsAndReferrals", checked)
                      }
                      disabled={isSaving || !preferences.allowNotifications}
                    />
                  }
                />

                {/*  Security Activity  */}
                <SettingsTile
                  title={t.settings?.notifications?.securityActivity?.title || "Security activity"}
                  subtitle={t.settings?.notifications?.securityActivity?.subtitle || "Get notified for new logins or changes to your security settings."}
                  rightElement={
                    <ToggleButton
                      checked={preferences.securityActivity}
                      onChange={(checked) =>
                        updatePreference("securityActivity", checked)
                      }
                      disabled={isSaving || !preferences.allowNotifications}
                    />
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
