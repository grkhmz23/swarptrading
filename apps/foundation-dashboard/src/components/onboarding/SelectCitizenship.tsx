'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { countries, popularCountries, Country } from '../../utils/countries';
import { apiService, ApiError } from '../../services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';

interface SelectCitizenshipProps {
  onBack?: () => void;
  onComplete?: (country: string) => void;
}

export const SelectCitizenship: React.FC<SelectCitizenshipProps> = ({
  onComplete
}) => {
  const t = useT();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [userIdentifier, setUserIdentifier] = useState<{ phoneNumber?: string; email?: string }>({});

useEffect(() => {
  const storedPhoneNumber = localStorage.getItem('swarp_fd_pending_phone');
  const storedUser = localStorage.getItem('swarp_fd_user');
  const pendingProfileData = localStorage.getItem('swarp_fd_pending_profile');

  // 1️⃣ First priority: Phone number flow
  if (storedPhoneNumber) {
    setUserIdentifier({ phoneNumber: storedPhoneNumber });
    return;
  }

  // 2️⃣ Second: Google login (pendingProfileData)
  if (pendingProfileData) {
    try {
      const data = JSON.parse(pendingProfileData);
      if (data.email) {
        setUserIdentifier({ email: data.email });
        return;
      }
    } catch (e) {
      console.error("Error parsing pendingProfileData:", e);
    }
  }

  // 3️⃣ Third: stored user object
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      setUserIdentifier({
        phoneNumber: user.phoneNumber,
        email: user.email
      });
    } catch (e) {
      console.error("Error parsing stored user:", e);
    }
  }

  // Cleanup items
  localStorage.removeItem('swarp_fd_onboarding_step');
  localStorage.removeItem('swarp_fd_user_has_pin');
  localStorage.removeItem('swarp_fd_wallet');
}, []);


  // Handle browser back button to redirect to home
  useEffect(() => {
    // Push a state to control back button behavior
    window.history.pushState({ page: 'citizenship' }, '', window.location.pathname);
    
    const handlePopState = (event: PopStateEvent) => {
      console.log('🔙 Browser back button pressed on citizenship page, redirecting to home');
      event.preventDefault();
      window.location.href = '/';
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Close dropdown when clicking outside and handle keyboard search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdown = document.querySelector('.country-dropdown');
      if (dropdown && !dropdown.contains(target)) {
        setIsDropdownOpen(false);
        setSearchTerm(''); // Clear search when closing
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isDropdownOpen) return;
      
      // Handle typing for search
      if (event.key.length === 1 && /[a-zA-Z ]/.test(event.key)) {
        setSearchTerm(prev => prev + event.key);
      } else if (event.key === 'Backspace') {
        setSearchTerm(prev => prev.slice(0, -1));
      } else if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDropdownOpen]);

  // Filter countries based on search term
  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) {
      // Show popular countries first, then all others
      const popular = popularCountries;
      const others = countries.filter(c => !popular.find(p => p.code === c.code));
      return [...popular, { code: 'divider', name: '---', flag: '' }, ...others];
    }
    
    return countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleCountrySelect = (country: Country) => {
    if (country.code === 'divider') return;
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchTerm('');
    setError('');
    // Removed auto-continue - now user must click continue button
  };

  const handleContinueClick = async () => {
    if (!selectedCountry) return;
    await handleContinueWithCountry(selectedCountry);
  };

  const handleApplyReferral = async (token: string) => {
    try {
      const referralCode = localStorage.getItem('swarp_fd_referral_code') || '';
      if (!referralCode || referralCode.trim() === '') {
        console.log('No referral code to apply');
        return;
      }

      const res = await apiService.applyReferral(token, referralCode);
      console.log('Referral applied successfully:', res);
      // Optionally store referral info
      localStorage.setItem('swarp_fd_referral_applied', JSON.stringify(res));
    } catch (err: unknown) {
      console.error('Failed to apply referral:', err);
      // Don't fail the flow if referral fails - continue with citizenship selection
    }
  };

  const handleContinueWithCountry = async (country: Country) => {
    if (!userIdentifier.phoneNumber && !userIdentifier.email) {
      setError(t.onboarding?.selectCitizenship?.errors?.userNotFound || 'User identification not found. Please try again.');
      return;
    }

    console.log('🔍 Debug - userIdentifier:', userIdentifier);
    console.log('🔍 Debug - country code:', country.code);

    setIsLoading(true);
    setError('');

    try {
      const result = await apiService.updateCountry({
        ...userIdentifier,
        country: country.code
      });

      console.log('Country updated successfully:', result);
      
      // Update stored user data
      const storedUser = localStorage.getItem('swarp_fd_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.country = country.code;
        localStorage.setItem('swarp_fd_user', JSON.stringify(user));
      }

      // Apply referral if token is available
      const token = localStorage.getItem('swarp_fd_access_token');
      if (token) {
        await handleApplyReferral(token);
      }

      if (onComplete) {
        onComplete(country.code);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.message || t.onboarding?.selectCitizenship?.errors?.failedToUpdate || 'Failed to update country. Please try again.');
      console.error('Country update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className='w-full h-screen overflow-hidden !p-8 relative bg-[#090A11]'
    >
      {/* Animated Gradient Background */}
      <AnimatedGradientBackground />
      <div className='flex flex-col h-full relative z-10'>
        {/* Language Selector at Top */}
        <div className='flex justify-center py-4'>
          <LanguageSelector />
        </div>

        {/* Main Content - Vertically Centered */}
        <div className='flex-1 flex flex-col justify-center items-center'>
          <div className='w-full max-w-[400px] text-center !p-4 flex flex-col items-center gap-8'>
            
            {/* Globe Icon */}
            <div className='w-16 h-16 flex items-center justify-center'>
              <Image 
                src="/globe-web.svg" 
                alt="Globe Icon" 
                width={64} 
                height={64}
                className="object-contain"
              />
            </div>
            
            {/* Title */}
            <div>
              <p className='text-2xl text-white font-semibold !pb-2'>
                {t.onboarding?.selectCitizenship?.title || 'Select your citizenship'}
              </p>
              <p className='text-[#636466] text-base mt-2 '>
                {t.onboarding?.selectCitizenship?.subtitle || "Swarp Foundation is required to collect this info. If you're a dual citizen, please select one country."}
              </p>
            </div>
            
            {/* Country Dropdown and Continue Button Container */}
            <div className='w-full max-w-[320px] flex items-center gap-3'>
              {/* Country Dropdown */}
              <div className='flex-1 relative country-dropdown'>
                <div 
                  className="flex w-full bg-[#090A11] !border !border-[#2B2D30] rounded-2xl !px-6 !py-3 cursor-pointer justify-between items-center"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="flex items-center gap-3">
                    {selectedCountry && (
                      <span className="text-lg">{selectedCountry.flag}</span>
                    )}
                    <span className={`text-base ${selectedCountry ? 'text-white' : 'text-[#636466]'}`}>
                      {selectedCountry ? selectedCountry.name : (t.onboarding?.selectCitizenship?.selectCountry || 'Select your country')}
                    </span>
                  </div>
                  <div className="w-4 h-4">
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none"
                      className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6L8 10L12 6" stroke="#636466" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#131519] border border-[#2B2D30] rounded-xl z-50 shadow-xl max-h-80">
                    {/* Search hint */}
                    {searchTerm && (
                      <div className="px-4 py-2 text-xs text-[#636466] border-b border-[#2B2D30]">
                        {t.onboarding?.selectCitizenship?.searchHint || 'Searching for'} &quot;{searchTerm}&quot;
                      </div>
                    )}
                    
                    {/* Countries List */}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCountries.length === 0 ? (
                        <div className="px-6 py-4 text-[#636466] text-center">
                          {t.onboarding?.selectCitizenship?.noCountriesFound || 'No countries found'}
                        </div>
                      ) : (
                        filteredCountries.map((country) => (
                          country.code === 'divider' ? (
                            <div key="divider" className="px-6 py-2">
                              <div className="text-[#636466] text-xs font-semibold">{t.onboarding?.selectCitizenship?.allCountries || 'All Countries'}</div>
                              <div className="h-px bg-[#2B2D30] mt-2"></div>
                            </div>
                          ) : (
                            <div
                              key={country.code}
                              className="flex items-center gap-3 !px-6 !py-3 hover:bg-[#1A1C20] cursor-pointer text-white transition-colors"
                              onClick={() => handleCountrySelect(country)}
                            >
                              <span className="text-lg">{country.flag}</span>
                              <span className="flex-1">{country.name}</span>
                              <span className="text-[#636466] text-xs">{country.code}</span>
                            </div>
                          )
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Continue Button */}
              <button
                onClick={handleContinueClick}
                disabled={!selectedCountry || isLoading}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                  selectedCountry && !isLoading 
                    ? 'bg-[#40E0D0] hover:bg-[#36C5B5] cursor-pointer' 
                    : 'bg-[#2B2D30] cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
<path d="M12.375 4.125L19.25 11M19.25 11L12.375 17.875M19.25 11H2.75" stroke="#090A11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm text-center max-w-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className='flex flex-col gap-2 justify-center items-center pb-4'>
          <div className='flex flex-col gap-4 justify-center items-center mt-4'>
            <div className="w-full max-w-[412px] h-px bg-gradient-to-r from-transparent via-[#2B2D30] to-transparent" />
            <p className='text-[#636466] text-xs text-center max-w-sm mx-auto px-6'>
              {t.onboarding?.signUp?.termsText || 'You acknowledge that you have read and agree to'}{' '}
              <a
                href="https://www.swarpfoundation.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className='text-white underline hover:text-[#40E0D0] transition-colors cursor-pointer'
              >
                {t.onboarding?.signUp?.termsLink || "Swarp Foundation's Terms"}
              </a> {t.onboarding?.signUp?.and || 'and'}{' '}
              <a
                href="https://www.swarpfoundation.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className='text-white underline hover:text-[#40E0D0] transition-colors cursor-pointer'
              >
                {t.onboarding?.signUp?.privacyLink || 'Privacy Policy'}
              </a>.
            </p>
            
            
         
          </div>
        </div>
      </div>
    </div>
  );
};