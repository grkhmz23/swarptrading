'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';

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
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [, setIsLoading] = useState(false);

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

    // Auto-submit when all 6 digits are entered
    if (value && index === 5) {
      const isComplete = newCode.every(digit => digit !== '');
      if (isComplete) {
        setTimeout(() => {
          handleContinueWithCode(newCode.join(''));
        }, 100);
      }
    }
  };

  const handleBackspace = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
      const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  const handleContinueWithCode = async (fullPasscode: string) => {
    
    if (fullPasscode.length === 6) {
      if (fullPasscode === originalPasscode) {
        setIsLoading(true);
        setError('');
        
        try {
          // Save the PIN to the backend
          const token = localStorage.getItem('swarp_fd_access_token');
          if (!token) {
            setError(t.onboarding?.confirmPasscode?.errors?.tokenNotFound || 'Authentication token not found');
            return;
          }

          // Validate PIN format before sending
          if (!/^\d{6}$/.test(fullPasscode)) {
            setError(t.onboarding?.confirmPasscode?.errors?.pinFormat || 'PIN must be exactly 6 digits');
            return;
          }

          await apiService.setWalletPIN(fullPasscode, token);
          
          // Success - proceed to next step
          if (onComplete) {
            onComplete();
          }
        } catch (error: unknown) {
          const apiError = error as { message?: string };
          setError(apiError.message || t.onboarding?.confirmPasscode?.errors?.failedToSave || 'Failed to save passcode. Please try again.');
        } finally {
          setIsLoading(false);
        }
      } else {
        setError(t.onboarding?.confirmPasscode?.errors?.mismatch || 'Passcodes do not match. Please try again.');
        setPasscode(['', '', '', '', '', '']);
        // Focus first input
        const firstInput = document.querySelector(`input[data-index="0"]`) as HTMLInputElement;
        if (firstInput) firstInput.focus();
      }
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
                  className={`w-12 h-12 text-center text-white text-xl font-semibold bg-[#131519] border rounded-xl focus:outline-none transition-colors ${
                    error ? 'border-red-500' : 'border-[#2B2D30] focus:border-[#40E0D0]'
                  }`}
                />
              ))}
            </div>
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
  );
};