'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';
import { clearSession, getAccessToken, setAccessToken } from '@/lib/session';
import { clearPinFailures, markSessionUnlocked, pinRetryDelayMs, recordPinFailure } from '@/lib/pinGate';
import { ApiError, errorMessage } from '@/lib/http';
import { CodeInput, emptyCode, type CodeInputHandle } from '../ui/CodeInput';
import { LegalNotice } from '../ui/LegalNotice';

interface EnterPasscodeProps {
  onBack?: () => void;
  onComplete?: () => void;
  isDirectLogin?: boolean; // New prop to distinguish between login flows
}

export const EnterPasscode: React.FC<EnterPasscodeProps> = ({
  onComplete,
  isDirectLogin = false
}) => {
  const t = useT();
  const [passcode, setPasscode] = useState<string[]>(emptyCode());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryInSeconds, setRetryInSeconds] = useState(0);
  const codeInputRef = useRef<CodeInputHandle>(null);

  // Pick up a retry delay left over from earlier attempts in this tab.
  useEffect(() => {
    const remaining = Math.ceil(pinRetryDelayMs() / 1000);
    if (remaining > 0) setRetryInSeconds(remaining);
  }, []);

  // Count down an active retry delay after repeated wrong PINs.
  useEffect(() => {
    if (retryInSeconds <= 0) return;
    const id = setTimeout(() => setRetryInSeconds(Math.ceil(pinRetryDelayMs() / 1000)), 1000);
    return () => clearTimeout(id);
  }, [retryInSeconds]);

  const fail = (message: string) => {
    const state = recordPinFailure();
    const wait = Math.ceil(Math.max(0, state.lockedUntil - Date.now()) / 1000);
    setRetryInSeconds(wait);
    setError(wait > 0 ? `${message} Too many attempts: try again in ${wait}s.` : message);
    setPasscode(emptyCode());
    codeInputRef.current?.focus();
  };

  const verifyPasscode = async (fullPasscode: string) => {
    if (isLoading || pinRetryDelayMs() > 0) return;
    if (!/^\d{6}$/.test(fullPasscode)) {
      setError(t.onboarding?.enterPasscode?.errors?.pinFormat || 'PIN must be exactly 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');
    const invalidMessage = t.onboarding?.enterPasscode?.errors?.invalid || 'Invalid passcode. Please try again.';

    try {
      if (isDirectLogin) {
        // Returning user: phone number + passcode.
        const phoneNumber = localStorage.getItem('swarp_fd_pending_phone');
        if (!phoneNumber) {
          setError(t.onboarding?.enterPasscode?.errors?.phoneNotFound || 'Phone number not found');
          return;
        }

        const result = await apiService.loginWithPasscode(phoneNumber, fullPasscode);
        setAccessToken(result.token);
        markSessionUnlocked(result.token);
        localStorage.setItem('swarp_fd_user', JSON.stringify(result.user));
        localStorage.setItem('swarp_fd_onboarding_complete', 'true');
        [
          'swarp_fd_login_method',
          'swarp_fd_pending_phone',
          'swarp_fd_user_id_passcode',
          'swarp_fd_is_new_user',
          'swarp_fd_requires_onboarding',
          'swarp_fd_pending_profile',
          'swarp_fd_profile_image',
        ].forEach((key) => localStorage.removeItem(key));
      } else {
        // Signed in (OTP / Google / existing session): unlock the wallet with its PIN.
        const token = getAccessToken();
        if (!token) {
          setError(t.onboarding?.enterPasscode?.errors?.tokenNotFound || 'Your session has expired. Please sign in again.');
          return;
        }
        await apiService.verifyWalletPIN(fullPasscode, token);
        markSessionUnlocked(token);
        localStorage.setItem('swarp_fd_onboarding_complete', 'true');
      }

      clearPinFailures();
      onComplete?.();
    } catch (error: unknown) {
      const status = error instanceof ApiError ? error.statusCode : undefined;
      if (status === 401 || status === 403 || status === 400) {
        fail(invalidMessage);
      } else {
        setError(errorMessage(error, invalidMessage));
        setPasscode(emptyCode());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOutAndRestart = () => {
    clearSession();
    window.location.replace('/');
  };

  return (
    <div 
      className='w-full h-screen overflow-hidden !p-8 relative bg-[#090A11]'
    >
      {/* Animated Gradient Background */}
      <AnimatedGradientBackground />
      <div className='relative z-10 h-full flex flex-col'>
        {/* Language Selector */}
        <div className='flex justify-center py-4'>
          <LanguageSelector />
        </div>
      {/* Header */}
     
      <div className='flex-1 flex flex-col'>
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
                {t.onboarding?.enterPasscode?.title || 'Enter your passcode'}
              </h1>
              <p className='text-[#636466] text-sm text-center'>
                {t.onboarding?.enterPasscode?.subtitle || 'Enter your 6-digit passcode to access your wallet.'}
              </p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}
            
            <CodeInput
              ref={codeInputRef}
              value={passcode}
              onChange={(digits) => {
                setPasscode(digits);
                if (error && retryInSeconds <= 0) setError('');
              }}
              onComplete={verifyPasscode}
              secret
              autoFocus
              disabled={isLoading || retryInSeconds > 0}
              invalid={Boolean(error)}
              ariaLabel={t.onboarding?.enterPasscode?.title || 'Enter your passcode'}
              className='flex gap-3 justify-center w-full'
            />

            <button
              type="button"
              onClick={signOutAndRestart}
              className="text-[#636466] text-sm underline hover:text-white transition-colors"
            >
              Use a different account
            </button>

            {/* Loading indicator */}
            {isLoading && (
              <div className="text-[#40E0D0] text-sm text-center">
                {t.onboarding?.enterPasscode?.verifying || 'Verifying...'}
              </div>
            )}
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
    </div>
  );
};