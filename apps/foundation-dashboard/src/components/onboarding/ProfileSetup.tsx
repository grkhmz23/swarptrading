'use client';

import React, { useState } from 'react';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { apiService } from '../../services/api';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';

interface ProfileSetupProps {
  email?: string;
  onBack?: () => void;
  onComplete?: (data: { firstName: string; lastName: string; email: string }) => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  email = '',
  onBack,
  onComplete
}) => {
  const t = useT();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleContinue();
    }
  };

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError(t.onboarding?.profileSetup?.errors?.allFieldsRequired || 'All fields are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('swarp_fd_access_token');
      if (!token) throw new Error('Authentication token not found');

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      };

      const updated = await apiService.updateUserProfile(payload, token);

      // Persist in local storage
      localStorage.setItem('swarp_fd_pending_profile', JSON.stringify(payload));
      localStorage.setItem('swarp_fd_user', JSON.stringify(updated));

      onComplete?.(payload);
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      if (error && error.statusCode === 401) {
        setError(t.onboarding?.profileSetup?.errors?.authRequired || 'Authentication required. Please login again.');
      } else if (error && error.statusCode === 409) {
        setError(error.message || t.onboarding?.profileSetup?.errors?.emailInUse || 'Email already in use');
      } else {
        setError(error?.message || t.onboarding?.profileSetup?.errors?.failedToSave || 'Failed to save profile.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full h-screen overflow-hidden !p-8 relative bg-[#090A11]'>
      <AnimatedGradientBackground />
      <div className='flex flex-col h-full relative z-10'>

        {/* Language Selector */}
        <div className='flex justify-center !py-4'>
          <LanguageSelector />
        </div>

        {/* Main Content */}
        <div className='flex-1 flex flex-col justify-center items-center'>
          <div className='w-full max-w-[358px] text-center flex flex-col items-center gap-7'>
            <div className='w-14 h-14 flex items-center justify-center rounded-full'>
              <svg width='52' height='52' viewBox='0 0 24 24' fill='none' stroke='#40E0D0' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                <circle cx='12' cy='7' r='4' />
              </svg>
            </div>

            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl text-white font-bold'>{t.onboarding?.profileSetup?.title || 'Complete Your Profile'}</h1>
              <p className='text-[#636466] text-sm text-center'>{t.onboarding?.profileSetup?.subtitle || 'Help us verify your identity'}</p>
            </div>

            {/* Input Fields */}
            <div className='flex flex-col gap-5 w-full'>
              <input
                type='text'
                placeholder={t.onboarding?.profileSetup?.firstName || 'First Name'}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                className='w-full !px-4 !py-3 bg-[#131519] border border-[#2B2D30] rounded-xl text-white placeholder-[#636466] focus:outline-none focus:border-[#40E0D0] transition-colors'
              />
              <input
                type='text'
                placeholder={t.onboarding?.profileSetup?.lastName || 'Last Name'}
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                className='w-full !px-4 !py-3 bg-[#131519] border border-[#2B2D30] rounded-xl text-white placeholder-[#636466] focus:outline-none focus:border-[#40E0D0] transition-colors'
              />
             
            </div>

            {error && <p className='text-sm text-red-400 w-full text-left'>{error}</p>}

            {/* Buttons */}
            <div className='flex flex-col gap-3 w-full'>
              <button
                onClick={handleContinue}
                disabled={isLoading}
                className='w-full !py-3 bg-[#40E0D0] text-[#090A11] cursor-pointer font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? (t.onboarding?.profileSetup?.saving || 'Saving...') : (t.onboarding?.profileSetup?.continue || 'Continue')}
              </button>

              <button
                onClick={onBack}
                disabled={isLoading}
                className='w-full !py-3 bg-[#131519] cursor-pointer border border-[#2B2D30] text-white font-semibold rounded-xl hover:border-[#40E0D0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {t.onboarding?.profileSetup?.back || 'Back'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex flex-col gap-2 justify-center items-center pb-4'>
          <div className='flex flex-col gap-4 justify-center items-center mt-4'>
            <div className='w-full max-w-[412px] h-px bg-gradient-to-r from-transparent via-[#2B2D30] to-transparent' />
            <p className='text-[#636466] text-xs text-center max-w-sm mx-auto px-6'>
              {t.onboarding?.signUp?.termsText || 'You acknowledge that you have read and agree to'}{' '}
              <a
                href='https://www.swarpfoundation.com/terms'
                target='_blank'
                rel='noopener noreferrer'
                className='text-white underline hover:text-[#40E0D0] transition-colors cursor-pointer'
              >
                {t.onboarding?.signUp?.termsLink || "Swarp Foundation's Terms"}
              </a>{' '}
              {t.onboarding?.signUp?.and || 'and'}{' '}
              <a
                href='https://www.swarpfoundation.com/privacy'
                target='_blank'
                rel='noopener noreferrer'
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
