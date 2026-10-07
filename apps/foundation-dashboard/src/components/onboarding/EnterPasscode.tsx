'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';
import { getAccessToken, setAccessToken } from '@/lib/session';

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
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...passcode];
    newCode[index] = value;
    setPasscode(newCode);
    
    // Clear error when user starts typing
    if (error) setError('');

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }

    // Auto-verify when all digits are entered
    if (value && newCode.every(digit => digit !== '')) {
      const fullPasscode = newCode.join('');
      verifyPasscode(fullPasscode);
    }
  };

  const handleBackspace = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
      const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  const verifyPasscode = async (fullPasscode: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!/^\d{6}$/.test(fullPasscode)) {
        setError(t.onboarding?.enterPasscode?.errors?.pinFormat || 'PIN must be exactly 6 digits');
        return;
      }

      if (isDirectLogin) {
        // Direct login flow - use phone number + passcode
        const phoneNumber = localStorage.getItem('swarp_fd_pending_phone');
        if (!phoneNumber) {
          setError(t.onboarding?.enterPasscode?.errors?.phoneNotFound || 'Phone number not found');
          return;
        }

        const result = await apiService.loginWithPasscode(phoneNumber, fullPasscode);
        
        // Store authentication data
        setAccessToken(result.token);
        localStorage.setItem('swarp_fd_user', JSON.stringify(result.user));
        
        localStorage.removeItem('swarp_fd_login_method');
        localStorage.removeItem('swarp_fd_pending_phone');
        localStorage.removeItem('swarp_fd_user_id_passcode');
        localStorage.removeItem('swarp_fd_is_new_user');
        localStorage.removeItem('swarp_fd_requires_onboarding');
         localStorage.removeItem('swarp_fd_pending_profile');
          localStorage.removeItem('swarp_fd_profile_image');

      } else {
        // Existing wallet PIN verification flow (e.g. Google / social login)
        const token = getAccessToken();
        if (!token) {
          setError(t.onboarding?.enterPasscode?.errors?.tokenNotFound || 'Authentication token not found');
          return;
        }

        // 1) Verify the wallet PIN with backend
        await apiService.verifyWalletPIN(fullPasscode, token);

        // 2) Ensure wallet data is available in localStorage so home screen can load
        try {
          const wallets = await apiService.getUserWallets(token);
          if (Array.isArray(wallets) && wallets.length > 0) {
            localStorage.setItem('swarp_fd_wallet', JSON.stringify(wallets[0]));
          }
        } catch (err) {
          console.warn('Failed to load wallet after PIN verification:', err);
          // Do not block login if wallet fetch fails; HomeScreen will handle errors
        }
      }
      
      // Success - proceed to next step
      if (onComplete) {
        onComplete();
      }
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      const apiMessage = apiError.message || '';
      // Translate known API error messages - check if message contains "Invalid passcode"
      let errorMessage: string;
      if (apiMessage.toLowerCase().includes('invalid passcode')) {
        errorMessage = t.onboarding?.enterPasscode?.errors?.invalid || 'Invalid passcode. Please try again.';
      } else {
        errorMessage = apiMessage || t.onboarding?.enterPasscode?.errors?.invalid || 'Invalid passcode. Please try again.';
      }
      setError(errorMessage);
      // Clear the passcode on error
      setPasscode(['', '', '', '', '', '']);
      // Focus first input
      const firstInput = document.querySelector(`input[data-index="0"]`) as HTMLInputElement;
      if (firstInput) firstInput.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // const isPasscodeComplete = passcode.every(digit => digit !== ''); // Not used currently

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
            
            {/* Passcode Input Fields */}
            <div className='flex gap-3 justify-center w-full'>
              {passcode.map((digit, index) => (
                <input
                  key={index}
                  data-index={index}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleBackspace(index, e)}
                  disabled={isLoading}
                  className={`w-12 h-12 text-center text-white text-xl font-semibold bg-[#131519] border rounded-xl focus:outline-none transition-colors ${
                    error ? 'border-red-500' : 'border-[#2B2D30] focus:border-[#40E0D0]'
                  }`}
                />
              ))}
            </div>
            
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
    </div>
  );
};