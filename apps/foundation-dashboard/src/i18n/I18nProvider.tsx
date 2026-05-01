"use client";

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { apiService } from '@/services/api';
import { displayNameToLocale, defaultLocale, type Locale, type TranslationKeys } from './index';

// Empty fallback object for when backend is unavailable
const emptyTranslations = {} as TranslationKeys;

interface I18nContextType {
  locale: Locale;
  t: TranslationKeys;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

// Cache version - increment this when translation structure changes
const CACHE_VERSION = 31;

// Cache for backend translations with version tracking
const translationsCache: Record<string, { version: number; data: TranslationKeys }> = {};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Get language from Redux store (stored as "English" or "Italian")
  const languageDisplayName = useSelector((state: RootState) => state.settings.language);

  // Convert display name to locale code
  const locale = (displayNameToLocale[languageDisplayName] || defaultLocale) as Locale;

  const [translations, setTranslations] = useState<TranslationKeys>(emptyTranslations);
  const [isLoading, setIsLoading] = useState(true); // Start as loading

  // Fetch translations from backend
  useEffect(() => {
    const fetchTranslations = async () => {
      // Check cache first - but only if version matches
      const cached = translationsCache[locale];
      if (cached && cached.version === CACHE_VERSION) {
        setTranslations(cached.data);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const backendTranslations = await apiService.getTranslations(locale);
        const typedTranslations = backendTranslations as TranslationKeys;

        // Cache the fetched translations with version
        translationsCache[locale] = { version: CACHE_VERSION, data: typedTranslations };
        setTranslations(typedTranslations);
      } catch (error) {
        console.warn(`Failed to fetch translations from backend for locale: ${locale}`, error);
        // Keep empty translations - components use fallback strings
        setTranslations(emptyTranslations);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations();
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    t: translations,
    isLoading,
  }), [locale, translations, isLoading]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }

  return context;
}

// Shorthand hook that just returns the translations object
export function useT() {
  const { t } = useTranslation();
  return t;
}

// Hook to check if translations are still loading
export function useTranslationLoading() {
  const { isLoading } = useTranslation();
  return isLoading;
}
