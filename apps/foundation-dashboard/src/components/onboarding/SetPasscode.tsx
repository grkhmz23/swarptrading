'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';
import { CodeInput, emptyCode, type CodeInputHandle } from '../ui/CodeInput';
import { checkNewPin, pinProblemMessage } from '@/lib/pin';
import { LegalNotice } from '../ui/LegalNotice';

interface SetPasscodeProps {
  onBack?: () => void;
  onComplete?: (passcode: string) => void;
}

export const SetPasscode: React.FC<SetPasscodeProps> = ({
  onComplete
}) => {
  const t = useT();
  const [passcode, setPasscode] = useState<string[]>(emptyCode());
  const [error, setError] = useState('');
  const codeInputRef = useRef<CodeInputHandle>(null);

  const handleComplete = (pin: string) => {
    const problem = checkNewPin(pin);
    if (problem) {
      setError(pinProblemMessage(problem));
      setPasscode(emptyCode());
      codeInputRef.current?.focus();
      return;
    }
    onComplete?.(pin);
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
                {t.onboarding?.setPasscode?.title || 'Set a passcode'}
              </h1>
              <p className='text-[#636466] text-sm text-center'>
                {t.onboarding?.setPasscode?.subtitle || 'This 6-digit passcode keeps your wallet and payments secure.'}
              </p>
            </div>
            
            {error && <p className='text-red-500 text-sm text-center' role="alert">{error}</p>}

            <CodeInput
              ref={codeInputRef}
              value={passcode}
              onChange={(digits) => {
                setPasscode(digits);
                if (error) setError('');
              }}
              onComplete={handleComplete}
              secret
              autoFocus
              invalid={Boolean(error)}
              ariaLabel={t.onboarding?.setPasscode?.title || 'Set a passcode'}
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