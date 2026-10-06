'use client';

import React, { useEffect, useRef } from 'react';
import { CustomFilters } from '@/types/home';

interface CustomFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customFilters: CustomFilters;
  setCustomFilters: React.Dispatch<React.SetStateAction<CustomFilters>>;
  onApply: () => void;
  onClearAll: () => void;
}

export const CustomFiltersModal: React.FC<CustomFiltersModalProps> = ({
  isOpen,
  onClose,
  customFilters,
  setCustomFilters,
  onApply,
  onClearAll,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 !p-4">
      <div ref={modalRef} className="bg-[#131519] rounded-2xl !p-6 w-full max-w-md relative">
        {/* Header */}
        <div className="flex items-center justify-between !mb-6">
          <h2 className="text-white text-lg font-semibold">Customize Filters</h2>
          <button
            onClick={onClose}
            className="text-[#636466] hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Filters Form */}
        <div className="!space-y-5">
          {/* Liquidity Filter */}
          <div>
            <label className="text-[#B3B5B6] text-sm font-medium !mb-2 block">Liquidity:</label>
            <div className="flex items-center !gap-3">
              <div className="flex-1 flex items-center bg-[#1A1D21] border border-[#2B2D30] rounded-lg overflow-hidden">
                <span className="text-[#636466] !px-3">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={customFilters.liquidityMin}
                  onChange={(e) => setCustomFilters(prev => ({ ...prev, liquidityMin: e.target.value }))}
                  className="flex-1 bg-transparent text-white !py-3 !pr-3 outline-none placeholder-[#636466]"
                />
              </div>
              <div className="flex-1 flex items-center bg-[#1A1D21] border border-[#2B2D30] rounded-lg overflow-hidden">
                <span className="text-[#636466] !px-3">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={customFilters.liquidityMax}
                  onChange={(e) => setCustomFilters(prev => ({ ...prev, liquidityMax: e.target.value }))}
                  className="flex-1 bg-transparent text-white !py-3 !pr-3 outline-none placeholder-[#636466]"
                />
              </div>
            </div>
          </div>

          {/* Volume Filter */}
          <div>
            <label className="text-[#B3B5B6] text-sm font-medium !mb-2 block">24h Volume:</label>
            <div className="flex items-center !gap-3">
              <div className="flex-1 flex items-center bg-[#1A1D21] border border-[#2B2D30] rounded-lg overflow-hidden">
                <span className="text-[#636466] !px-3">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={customFilters.volumeMin}
                  onChange={(e) => setCustomFilters(prev => ({ ...prev, volumeMin: e.target.value }))}
                  className="flex-1 bg-transparent text-white !py-3 !pr-3 outline-none placeholder-[#636466]"
                />
              </div>
              <div className="flex-1 flex items-center bg-[#1A1D21] border border-[#2B2D30] rounded-lg overflow-hidden">
                <span className="text-[#636466] !px-3">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={customFilters.volumeMax}
                  onChange={(e) => setCustomFilters(prev => ({ ...prev, volumeMax: e.target.value }))}
                  className="flex-1 bg-transparent text-white !py-3 !pr-3 outline-none placeholder-[#636466]"
                />
              </div>
            </div>
          </div>

          {/* Market Cap Filter */}
          <div>
            <label className="text-[#B3B5B6] text-sm font-medium !mb-2 block">Market Cap:</label>
            <div className="flex items-center !gap-3">
              <div className="flex-1 flex items-center bg-[#1A1D21] border border-[#2B2D30] rounded-lg overflow-hidden">
                <span className="text-[#636466] !px-3">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={customFilters.marketCapMin}
                  onChange={(e) => setCustomFilters(prev => ({ ...prev, marketCapMin: e.target.value }))}
                  className="flex-1 bg-transparent text-white !py-3 !pr-3 outline-none placeholder-[#636466]"
                />
              </div>
              <div className="flex-1 flex items-center bg-[#1A1D21] border border-[#2B2D30] rounded-lg overflow-hidden">
                <span className="text-[#636466] !px-3">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={customFilters.marketCapMax}
                  onChange={(e) => setCustomFilters(prev => ({ ...prev, marketCapMax: e.target.value }))}
                  className="flex-1 bg-transparent text-white !py-3 !pr-3 outline-none placeholder-[#636466]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center !gap-3 !mt-6">
          <button
            onClick={onClearAll}
            className="flex-1 !py-3 text-[#B3B5B6] bg-[#1A1D21] border border-[#2B2D30] rounded-lg font-medium hover:bg-[#2B2D30] transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onApply}
            className="flex-1 !py-3 text-[#090A11] bg-[#40E0D0] rounded-lg font-medium hover:bg-[#35c4b5] transition-colors flex items-center justify-center !gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
