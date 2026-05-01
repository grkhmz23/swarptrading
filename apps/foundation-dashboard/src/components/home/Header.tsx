'use client';

import React from 'react';
import Image from 'next/image';
import type { TranslationKeys } from '@/i18n';

interface HeaderProps {
  t: TranslationKeys;
  currentSection: string;
  getTranslatedSectionTitle: (section: string) => string;
  setSidebarOpen: (open: boolean) => void;
  setCurrentSection: (section: string) => void;
  setShowNotificationModal: (show: boolean) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  t,
  currentSection,
  getTranslatedSectionTitle,
  setSidebarOpen,
  setCurrentSection,
  setShowNotificationModal,
  onLogout,
}) => {

  return (
    <header className="flex items-center justify-between !px-4 lg:!px-7 !py-4 lg:!py-5 border-b border-[#2B2D30] bg-[#090A11] relative z-10">
      <div className="flex items-center !gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="!p-2 text-[#636466] hover:text-white transition-colors lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-white text-xl font-bold hidden md:block" style={{ fontFamily: 'var(--font-heading)' }}>
          {getTranslatedSectionTitle(currentSection)}
        </h1>
      </div>

      <div className="flex items-center !gap-3">
        {/* Search Field */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 !pl-3 flex items-center pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#636466" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="#636466" strokeWidth="2"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder={t.common?.search || "Search"}
            className="bg-[#1A1B23] rounded-full !pl-10 !pr-4 !py-2 text-sm text-white placeholder-[#636466] focus:outline-none focus:border-[#40E0D0] transition-colors w-32 sm:w-48 lg:w-64"
            onFocus={() => {
              localStorage.setItem("swarp_fd_settings_subsection", "address-book");
              window.dispatchEvent(new CustomEvent("settings-subsection-change", { detail: "address-book" }));
              setCurrentSection("Settings");
            }}
            onChange={(e) => {
              const query = e.target.value;
              localStorage.setItem("swarp_fd_address_book_search", query);
              window.dispatchEvent(new CustomEvent("address-book-search", { detail: query }));
            }}
          />
        </div>

        {/* Notifications */}
        <button
          onClick={() => setShowNotificationModal(true)}
          className="h-9 w-9 text-[#636466] hover:text-white transition-colors cursor-pointer"
        >
          <Image
            src="figma-assets/notif.svg"
            alt="Notifications"
            width={48}
            height={64}
            className="object-contain w-full h-full"
          />
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="!p-2 text-white transition-colors cursor-pointer"
          title={t.auth?.logout || 'Logout'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
};
