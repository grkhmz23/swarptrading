'use client';

import React, { useState } from 'react';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { apiService } from "@/services/api";
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';

interface EmailSetupProps {
  onBack?: () => void;
  onComplete?: (data: { email: string }) => void;
}

export const EmailSetup: React.FC<EmailSetupProps> = ({
  onBack,
  onComplete
}) => {
  const t = useT();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleContinue();
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError(t.onboarding?.emailSetup?.errors?.required || 'Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t.onboarding?.emailSetup?.errors?.invalid || 'Please enter a valid email address');
      return false;
    }
    return true;
  };

const handleContinue = async () => {
  if (!validateForm() || isLoading) return;

  setError("");
  setIsLoading(true);

  try {
    const res = await apiService.checkEmail(email);

    if (res.exists) {
      setError(t.onboarding?.emailSetup?.errors?.exists || "Email already exists.");
      return;
    }

    onComplete?.({ email });

  } catch {
    setError(t.onboarding?.emailSetup?.errors?.generic || "Something went wrong. Please try again.");
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className='w-full h-screen overflow-hidden !p-8 relative bg-[#090A11]'>
      <AnimatedGradientBackground />
      <div className='flex flex-col h-full relative z-10'>
        {/* Language Selector at Top */}
        <div className='flex justify-center !py-4'>
          <LanguageSelector />
        </div>

        {/* Main Content */}
        <div className='flex-1 flex flex-col justify-center items-center'>
          <div className='w-full max-w-[358px] text-center flex flex-col items-center gap-7'>
            {/* Icon */}
            <div className='w-14 h-14 flex items-center justify-center rounded-full'>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>

            {/* Title */}
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl text-white font-bold'>
                {t.onboarding?.emailSetup?.title || 'Enter Your Email'}
              </h1>
              <p className='text-[#636466] text-sm text-center'>
                {t.onboarding?.emailSetup?.subtitle || "We'll use this for your account"}
              </p>
            </div>

            {/* Input Fields */}
            <div className='flex flex-col gap-5 w-full'>
              <div>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder={t.onboarding?.emailSetup?.placeholder || 'Email Address'}
                  className='w-full !px-4 !py-3 bg-[#131519] border border-[#2B2D30] rounded-xl text-white placeholder-[#636466] focus:outline-none focus:border-[#40E0D0] transition-colors'
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className='w-full text-left'>
                <p className='text-sm text-red-400'>{error}</p>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={isLoading}
              className='w-full !py-3 bg-[#40E0D0] text-[#090A11] cursor-pointer font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? (t.onboarding?.emailSetup?.checking || 'Checking...') : (t.onboarding?.emailSetup?.continue || 'Continue')}
            </button>

            {/* Back Button */}
            <button
              onClick={onBack}
              className='w-full !py-3 bg-[#131519] border border-[#2B2D30] cursor-pointer text-white font-semibold rounded-xl hover:border-[#40E0D0] transition-colors'
            >
              {t.onboarding?.emailSetup?.back || 'Back'}
            </button>
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
