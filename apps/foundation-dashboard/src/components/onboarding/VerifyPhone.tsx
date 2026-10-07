'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { apiService, ApiError } from '../../services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';
import { setAccessToken } from '@/lib/session';
import { CodeInput, emptyCode, type CodeInputHandle } from '../ui/CodeInput';
import { LegalNotice } from '../ui/LegalNotice';

interface VerifyPhoneProps {
  onBack?: () => void;
  onComplete?: () => void;
}

export const VerifyPhone: React.FC<VerifyPhoneProps> = ({
  onComplete
}) => {
  const t = useT();
  const [code, setCode] = useState<string[]>(emptyCode());
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const codeInputRef = useRef<CodeInputHandle>(null);

  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('swarp_fd_pending_phone');
    if (!storedPhoneNumber) {
      // Nothing to verify: the user arrived here directly.
      window.location.replace('/');
      return;
    }
    setPhoneNumber(storedPhoneNumber);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleResendOTP = async () => {
    if (!phoneNumber || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');

    try {
      await apiService.continueWithPhone(phoneNumber);
      setResendCooldown(30);
      setCode(emptyCode());
      codeInputRef.current?.focus();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError.message.includes('Failed to send SMS')) {
        setError(t.onboarding?.verifyPhone?.errors?.failedToSendSms || 'Failed to send SMS. Please check your phone number and try again.');
      } else {
        setError(apiError.message || t.onboarding?.verifyPhone?.errors?.failedToResend || 'Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleContinueWithCode = async (verificationCode: string) => {
    if (verificationCode.length !== 6) {
      setError(t.onboarding?.verifyPhone?.errors?.completeCode || 'Please enter the complete 6-digit code');
      return;
    }

    if (!phoneNumber) {
      setError(t.onboarding?.verifyPhone?.errors?.phoneNotFound || 'Phone number not found. Please go back and try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await apiService.verifyOtp({
        phoneNumber: phoneNumber,
        otp: verificationCode
      });

      // Store the access token
      setAccessToken(result.token);
      localStorage.setItem('swarp_fd_user', JSON.stringify(result.user));
      
      // Note: Keep pendingPhoneNumber and isNewUser in localStorage for CreatingWallet component
      // They will be cleaned up after wallet creation is complete

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError.statusCode === 401) {
        if (apiError.message.includes('expired')) {
          setError(t.onboarding?.verifyPhone?.errors?.otpExpired || 'OTP has expired. Please request a new code.');
        } else {
          setError(t.onboarding?.verifyPhone?.errors?.invalidOtp || 'Invalid OTP. Please check and try again.');
        }
      } else {
        setError(apiError.message || 'Verification failed. Please try again.');
      }
      
      setCode(emptyCode());
      codeInputRef.current?.focus();
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
        {/* Language Selector */}
        <div className='flex justify-center py-4'>
          <LanguageSelector />
        </div>

        {/* Main Content - Vertically Centered */}
        <div className='flex-1 flex flex-col justify-center items-center'>
          <div className='w-full max-w-[515px] text-center !p-4 flex flex-col items-center gap-6'>
            <div className='w-16 h-20'>
              <Image 
                src="/verify-mobile.svg" 
                alt="verify Logo" 
                width={48} 
                height={64}
                className="object-contain w-full h-full"
              />
            </div>
            {/* Title */}
            <div>
              <p className='text-2xl text-white font-semibold !pb-2'>
                {t.onboarding?.verifyPhone?.title || 'Verification Code'}
              </p>
              <p className='text-[#636466] text-base mt-2'>
                {t.onboarding?.verifyPhone?.subtitle || 'Enter the 6-digit code sent to your phone number'} <span className='font-medium'>{phoneNumber}</span>
              </p>
            </div>
            
            <CodeInput
              ref={codeInputRef}
              value={code}
              onChange={(digits) => {
                setCode(digits);
                if (error) setError('');
              }}
              onComplete={handleContinueWithCode}
              oneTimeCode
              autoFocus
              disabled={isLoading}
              invalid={Boolean(error)}
              ariaLabel={t.onboarding?.verifyPhone?.title || 'Verification code'}
              boxClassName="w-12 h-12 text-center text-white text-xl font-semibold bg-[#090A11] border rounded-xl focus:outline-none transition-colors"
            />

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm text-center max-w-sm">
                {error}
              </div>
            )}

            {/* Timer for resend code */}
            {resendCooldown > 0 && (
              <div className="text-[#636466] text-sm text-center">
                {t.onboarding?.verifyPhone?.newCodeIn || 'You can get a new code in'} <span className='text-white'>{resendCooldown} {t.onboarding?.verifyPhone?.sec || 'sec'}</span>
              </div>
            )}

            {/* Resend Code */}
            <div>
              <p className='text-[#636466] text-sm'>
                {t.onboarding?.verifyPhone?.didntReceiveCode || "Didn't receive a code?"}{' '}
                <button
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isResending}
                  className={`${
                    resendCooldown > 0 || isResending
                      ? 'text-gray-500 cursor-not-allowed'
                      : 'text-[#40E0D0] hover:text-[#40E0D0]/80'
                  } underline transition-colors`}
                >
                  {isResending ? (t.onboarding?.verifyPhone?.sending || 'Sending...') :
                   resendCooldown > 0 ? (t.onboarding?.verifyPhone?.waitToResend || 'Wait to resend') : (t.onboarding?.verifyPhone?.resendCode || 'Resend code')}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Terms and Loading State */}
        <div className='flex flex-col gap-2 justify-center items-center pb-4'>
          <div className='flex flex-col gap-4 justify-center items-center'>
            <div className="w-full max-w-[412px] h-px bg-gradient-to-r from-transparent via-[#2B2D30] to-transparent" />
            <LegalNotice />
            
            {/* Loading indicator when processing */}
            {(isLoading || isResending) && (
              <div className="flex items-center justify-center gap-2 text-[#40E0D0]">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#40E0D0]"></div>
                <span className="text-sm">
                  {isResending ? (t.onboarding?.verifyPhone?.sendingSms || 'Sending SMS...') : (t.onboarding?.verifyPhone?.verifying || 'Verifying...')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};