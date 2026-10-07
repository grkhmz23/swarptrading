'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';
import { getAccessToken } from '@/lib/session';
import { markSessionUnlocked } from '@/lib/pinGate';
import { errorMessage } from '@/lib/http';
import { CodeInput, emptyCode, type CodeInputHandle } from '../ui/CodeInput';
import { LegalNotice } from '../ui/LegalNotice';

interface ConfirmPasscodeProps {
  onBack?: () => void;
  onComplete?: () => void;
  originalPasscode: string;
}

export const ConfirmPasscode: React.FC<ConfirmPasscodeProps> = ({
  onComplete,
  originalPasscode
}) => {
  const t = useT();
  const [passcode, setPasscode] = useState<string[]>(emptyCode());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const codeInputRef = useRef<CodeInputHandle>(null);

  const reset = (message: string) => {
    setError(message);
    setPasscode(emptyCode());
    codeInputRef.current?.focus();
  };

  const handleContinueWithCode = async (fullPasscode: string) => {
    if (isLoading) return;
    if (fullPasscode !== originalPasscode) {
      reset(t.onboarding?.confirmPasscode?.errors?.mismatch || 'Passcodes do not match. Please try again.');
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError(t.onboarding?.confirmPasscode?.errors?.tokenNotFound || 'Your session has expired. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await apiService.setWalletPIN(fullPasscode, token);
      markSessionUnlocked(token);
      onComplete?.();
    } catch (error: unknown) {
      reset(errorMessage(error, t.onboarding?.confirmPasscode?.errors?.failedToSave || 'Failed to save passcode. Please try again.'));
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
          <div className='w-full max-w-[358px] text-center flex flex-col items-center gap-7'>
            
            {/* Wallet Security Icon */}
            <div className='w-14 h-14 flex items-center justify-center  rounded-full'>
              <Image 
                src="/wallet-security-icon.svg" 
                alt="Wallet Security" 
                width={52} 
                height={51}
                className="object-contain"
              />
            </div>
            
            {/* Title and Description */}
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl text-white font-bold'>
                {t.onboarding?.confirmPasscode?.title || 'Confirm passcode'}
              </h1>
              <p className='text-[#636466] text-sm text-center'>
                {t.onboarding?.confirmPasscode?.subtitle || 'This 6-digit passcode keeps your wallet and payments secure.'}
              </p>
              {error && (
                <p className='text-red-500 text-sm text-center mt-2'>
                  {error}
                </p>
              )}
            </div>
            
            <CodeInput
              ref={codeInputRef}
              value={passcode}
              onChange={(digits) => {
                setPasscode(digits);
                if (error) setError('');
              }}
              onComplete={handleContinueWithCode}
              secret
              autoFocus
              disabled={isLoading}
              invalid={Boolean(error)}
              ariaLabel={t.onboarding?.confirmPasscode?.title || 'Confirm passcode'}
              className='flex gap-3 justify-center w-full'
            />
          </div>
        </div>

        {/* Bottom Section - Terms */}
          <div className='flex flex-col gap-2 justify-center items-center pb-4'>
          <div className='flex flex-col gap-4 justify-center items-center mt-4'>
            <div className="w-full max-w-[412px] h-px bg-gradient-to-r from-transparent via-[#2B2D30] to-transparent" />
            <LegalNotice />
            
          </div>
        </div>
      </div>
    </div>
  );
};