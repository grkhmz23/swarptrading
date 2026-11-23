'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setLanguage } from '@/store/slices/settingsSlice';
import { displayNameToLocale } from '@/i18n';
import { apiService } from '@/services/api';
import { getAccessToken } from '@/lib/session';

interface LanguageSelectorProps {
  className?: string;
}

const languages = [
  { code: 'en', name: 'English', shortCode: 'EN' },
  { code: 'it', name: 'Italian', shortCode: 'IT' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const selectedLanguage = useSelector((state: RootState) => state.settings.language);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(
    (l) => l.name === selectedLanguage || l.code === displayNameToLocale[selectedLanguage]
  ) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = async (lang: typeof languages[0]) => {
    const displayName = lang.name as 'English' | 'Italian';
    dispatch(setLanguage(displayName));
    setIsOpen(false);

    // Update backend preference if logged in
    const token = getAccessToken();
    if (token) {
      try {
        await apiService.updateLanguage(token, lang.code);
      } catch (error) {
        console.error('Failed to update language preference on backend:', error);
      }
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center gap-2 bg-black rounded-full !py-2 !px-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="w-4 h-4 text-white flex items-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <p className="text-white text-sm">
          {currentLang.name} ({currentLang.shortCode})
        </p>
        <div className="w-2 h-2">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              d="M1.875 3.125L5 6.25L8.125 3.125"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 !mt-2 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden shadow-lg z-50 min-w-[160px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang)}
              className={`w-full !px-4 !py-3 text-left text-sm transition-colors flex items-center justify-between ${
                currentLang.code === lang.code
                  ? 'bg-[#40E0D0]/10 text-[#40E0D0]'
                  : 'text-white hover:bg-[#1a1b23]'
              }`}
            >
              <span>
                {lang.name} ({lang.shortCode})
              </span>
              {currentLang.code === lang.code && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
