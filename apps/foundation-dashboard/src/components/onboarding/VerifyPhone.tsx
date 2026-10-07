'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiService, ApiError } from '../../services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';
import { setAccessToken } from '@/lib/session';

interface VerifyPhoneProps {
  onBack?: () => void;
  onComplete?: () => void;
}

export const VerifyPhone: React.FC<VerifyPhoneProps> = ({
  onComplete
}) => {
  const t = useT();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
const [, setDevelopmentOtp] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('swarp_fd_pending_phone');
    if (storedPhoneNumber) {
      setPhoneNumber(storedPhoneNumber);
    }

    setResendCooldown(30);
    const initialTimer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(initialTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Development mode: Show notice about Twilio Verify
    if (process.env.NODE_ENV !== 'production') {
      // With Twilio Verify, OTP is no longer returned in API response
      // OTP will be sent directly to the phone via SMS
      setDevelopmentOtp('Using Twilio Verify - Check SMS');
    }

    return () => clearInterval(initialTimer);
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
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
        // Small delay to ensure the UI updates before submission
        setTimeout(() => {
          handleContinueWithCode(newCode.join(''));
        }, 100);
      }
    }
  };

  const handleBackspace = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  const handleResendOTP = async () => {
    if (!phoneNumber || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');

    try {
      await apiService.continueWithPhone(phoneNumber);
      
      setResendCooldown(30);
      const cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Development mode: Remind about Twilio Verify
      if (process.env.NODE_ENV !== 'production') {
        setDevelopmentOtp('OTP Resent - Check SMS');
      }

      // Clear the current code
      setCode(['', '', '', '', '', '']);
      
      // Show success message briefly
      setError('');
      
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Resend OTP failed:', error);
      
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
      console.error('OTP verification failed:', error);
      
      if (apiError.statusCode === 401) {
        if (apiError.message.includes('expired')) {
          setError(t.onboarding?.verifyPhone?.errors?.otpExpired || 'OTP has expired. Please request a new code.');
        } else {
          setError(t.onboarding?.verifyPhone?.errors?.invalidOtp || 'Invalid OTP. Please check and try again.');
        }
      } else {
        setError(apiError.message || 'Verification failed. Please try again.');
      }
      
      // Clear the wrong code
      setCode(['', '', '', '', '', '']);
      // Focus on first input
      const firstInput = document.querySelector(`input[data-index="0"]`) as HTMLInputElement;
      if (firstInput) firstInput.focus();
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
            
            {/* Code Input Fields */}
            <div className='flex gap-3 justify-center'>
              {code.map((digit, index) => (
                <input
                  key={index}
                  data-index={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleBackspace(index, e)}
                  disabled={isLoading}
                  className={`w-12 h-12 text-center text-white text-xl font-semibold bg-[#090A11] border rounded-xl focus:outline-none transition-colors ${
                    error ? 'border-red-500' : 'border-[#2B2D30] focus:border-[#40E0D0]'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ))}
            </div>

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

            {/* Development Mode Notice - Twilio Verify */}
            {/* {process.env.NODE_ENV !== 'production' && developmentOtp && (
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3 max-w-sm">
                <div className="text-blue-300 text-xs font-semibold mb-1">DEV MODE - TWILIO VERIFY:</div>
                <div className="text-blue-100 text-sm text-center">
                  {developmentOtp}
                </div>
                <div className="text-blue-400/70 text-xs mt-2 text-center">
                  📱 OTP sent via Twilio Verify to your phone number
                </div>
                {developmentOtp.includes('Check SMS') && (
                  <div className="text-blue-400/70 text-xs mt-1 text-center">
                    Enter the 6-digit code you received via SMS
                  </div>
                )}
              </div>
            )} */}

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