"use client";

import React from "react";
import SettingsTile from "./shared/SettingsTile";
import Dropdown from "./shared/Dropdown";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setCurrency, setLanguage, setNetwork } from "@/store/slices/settingsSlice";
import { useT } from "@/i18n/I18nProvider";
import { apiService } from "@/services/api";
import { displayNameToLocale } from "@/i18n";

export default function General() {
  const dispatch = useDispatch();
  const t = useT();

  // Get selected values from Redux
  const selectedCurrency = useSelector((state: RootState) => state.settings.currency);
  const selectedLanguage = useSelector((state: RootState) => state.settings.language);
  const selectedNetwork = useSelector((state: RootState) => state.settings.network);

  // Dropdown options
  const languages = ["English", "Italian"];
  const currencyOptions = ["USD", "EUR", "GBP"];
  const networkOptions = ["Solana", "Swarp"];

  // Handlers
  const handleLanguageSelect = async (lang: string) => {
    dispatch(setLanguage(lang as "English" | "Italian"));

    // Also update the backend so notifications use the correct language
    const token = localStorage.getItem('swarp_fd_access_token');
    if (token) {
      try {
        const localeCode = displayNameToLocale[lang] || 'en';
        await apiService.updateLanguage(token, localeCode);
      } catch (error) {
        console.error('Failed to update language preference on backend:', error);
      }
    }
  };

  const handleCurrencySelect = (currency: string) => {
    dispatch(setCurrency(currency as "USD" | "EUR" | "GBP"));
  };

  const handleNetworkSelect = (network: string) => {
    dispatch(setNetwork(network as "Solana" | "Swarp"));
  };

  return (
    <div className="w-full mx-auto flex flex-wrap justify-center gap-7 cursor-default px-4 sm:px-0">
      {/* General Settings Section */}
      <div className="w-full flex flex-col items-center">

        {/* Page Title */}
        <div className="gap-2.5 w-full max-w-[742px] md:max-w-[450px] lg:max-w-[540px] xl:max-w-[742px] 2xl:max-w-[742px]">
          <h4
            className="text-[20px] font-bold !py-7 text-white max-md:text-[18px] max-sm:!py-5 sm:text-left"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t.settings?.general?.title || "General"}
          </h4>

          {/* Divider */}
          <div className="border-[0.2px] border-[#2B2D30] rounded-xs" />
        </div>

        {/* Tiles */}
        <div className="flex justify-center w-full !pt-8">
          <div className="w-[742px] sm:w-[550px] md:w-[450px] lg:w-[540px] xl:w-[742px] 2xl:w-[742px] h-full rounded-[12px] flex flex-col transition-all duration-200 max-xl:w-[85%] max-lg:w-[90%] max-md:w-full max-md:h-auto max-sm:!p-5 max-sm:!pt-3">

            {/* Language */}
            <SettingsTile
              title={t.settings?.general?.language?.title || "Language"}
              subtitle={t.settings?.general?.language?.subtitle || "Select your preferred language for the app interface"}
              iconSrc="/figma-assets/globe.svg"
              iconAlt="Language"
              rightElement={
                <Dropdown
                  options={languages}
                  selected={selectedLanguage}
                  onSelect={handleLanguageSelect}
                />
              }
            />

            {/* Currency */}
            <SettingsTile
              title={t.settings?.general?.currency?.title || "Currency"}
              subtitle={t.settings?.general?.currency?.subtitle || "Choose the currency for viewing balances and transactions"}
              iconSrc="/figma-assets/currency.svg"
              iconAlt="Currency"
              rightElement={
                <Dropdown
                  options={currencyOptions}
                  selected={selectedCurrency}
                  onSelect={handleCurrencySelect}
                />
              }
            />

            {/* Network */}
            <SettingsTile
              title={t.settings?.general?.network?.title || "Network"}
              subtitle={t.settings?.general?.network?.subtitle || "Select the blockchain network for processing transactions"}
              iconSrc="/figma-assets/network.svg"
              iconAlt="Network"
              rightElement={
                <Dropdown
                  options={networkOptions}
                  selected={selectedNetwork}
                  onSelect={handleNetworkSelect}
                />
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
