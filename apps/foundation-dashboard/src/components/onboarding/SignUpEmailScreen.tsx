'use client';

import React, { useState,useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { apiService, ApiError } from '../../services/api';
import { API_BASE_URL } from '@/config/env';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import  ReferralCodeModal  from './ReferralCodeModal';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';
import { setAccessToken } from '@/lib/session';
import { beginOAuthSignIn, consumeOAuthCallback } from '@/lib/oauth';
import { LegalNotice } from '../ui/LegalNotice';

interface SignUpEmailScreenProps {
  onBack?: () => void;
  onContinue?: (phoneNumber: string) => void;
  onContinueWithGoogle?: (data: { token: string; isNewUser?: boolean; user?: unknown }) => void;
  onReferralCode?: () => void;
}

export const SignUpEmailScreen: React.FC<SignUpEmailScreenProps> = ({
  onContinue,
  onContinueWithGoogle,
}) => {
  const t = useT();
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>('');
  const [phoneError, setPhoneError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false)

  const router = useRouter();

  /** Google OAuth redirect back to this page. */
  useEffect(() => {
    const result = consumeOAuthCallback(window.location.search);
    if (result.kind === 'none') return;
    if (result.kind === 'rejected') {
      setPhoneError(result.reason);
      return;
    }

    setAccessToken(result.token);
    localStorage.setItem('swarp_fd_login_method', 'google');
    if (result.isNewUser !== undefined) {
      localStorage.setItem('swarp_fd_is_new_user', String(result.isNewUser));
    }
    if (result.user && typeof result.user === 'object') {
      localStorage.setItem('swarp_fd_user', JSON.stringify(result.user));
    }
    onContinueWithGoogle?.({ token: result.token, isNewUser: result.isNewUser, user: result.user });
  }, [onContinueWithGoogle]);

  const handlePhoneChange = (value: string | undefined) => {
    // If value is provided, check if it's getting too long or malformed
    if (value) {
      // Don't allow input longer than 17 characters (including country code)
      if (value.length > 17) {
        return; // Block the input
      }
      
      // If the current number is already valid and user tries to add more digits, block it
      if (phoneNumber && isValidPhoneNumber(phoneNumber) && value.length > phoneNumber.length) {
        const digitsOnly = value.replace(/\D/g, '');
        const currentDigitsOnly = phoneNumber.replace(/\D/g, '');
        
        // If user is trying to add more digits to an already valid number, block it
        if (digitsOnly.length > currentDigitsOnly.length) {
          return;
        }
      }
    }
    
    setPhoneNumber(value);
    setPhoneError('');
    
    // Only validate if the user has stopped typing and the field is not empty
    // Don't show error while user is still typing
    if (value && value.trim() !== '') {
      // Only validate if it looks like they're trying to enter a complete number
      const digitsOnly = value.replace(/\D/g, '');
      // Don't validate until they have at least entered a reasonable amount of digits
      if (digitsOnly.length >= 7) {
        try {
          if (!isValidPhoneNumber(value)) {
            setPhoneError(t.onboarding?.signUp?.errors?.invalidPhone || 'Please enter a valid phone number');
          }
        } catch {
          setPhoneError(t.onboarding?.signUp?.errors?.invalidPhone || 'Please enter a valid phone number');
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isFormValid && !isLoading) {
        handleContinue();
      }
    }
  };

  const handleContinue = async () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      setPhoneError(t.onboarding?.signUp?.errors?.phoneRequired || 'Phone number is required');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setPhoneError(t.onboarding?.signUp?.errors?.invalidPhone || 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setPhoneError('');

    try {
      const result = await apiService.continueWithPhone(phoneNumber);

      // Store phone number for verification
      localStorage.setItem('swarp_fd_pending_phone', phoneNumber);
      localStorage.setItem('swarp_fd_is_new_user', result.isNewUser.toString());
      localStorage.setItem('swarp_fd_requires_onboarding', result.requiresOnboarding.toString());
       localStorage.setItem('swarp_fd_login_method', 'phone');
       
      // Route based on user status
      if (!result.isNewUser && !result.requiresOnboarding && result.hasWalletPIN) {
        // Existing user with passcode - go directly to passcode login
        localStorage.setItem('swarp_fd_user_id_passcode', result.userId || '');
        router.push('/login-passcode');
      } else if (result.requiresOnboarding) {
        // User needs onboarding (new user OR existing user without complete setup)
        if (onContinue) {
          onContinue(phoneNumber);
        } else {
          router.push('/verify-phone');
        }
      } else {
        // Fallback to OTP verification
        if (onContinue) {
          onContinue(phoneNumber);
        } else {
          router.push('/verify-phone');
        }
      }
    } catch (error) {
      const apiError = error as ApiError;
      setPhoneError(apiError.message || 'Unable to process your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithGoogle = () => {
    const state = beginOAuthSignIn();
    window.location.assign(`${API_BASE_URL}/auth/google/callback?state=${encodeURIComponent(state)}`);
  };

  const isFormValid = phoneNumber && phoneNumber.trim() !== '' && isValidPhoneNumber(phoneNumber || '');

  return (
    <>
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
        <div className='flex-1 flex flex-col justify-center items-center '>
          
          <div className='w-full max-w-[400px] text-center !p-4 flex flex-col items-center  gap-4'>
            <div className='flex justify-center'>
                <div className="w-12 h-16 ">
                            <Image 
                              src="/swarpay-logo.svg" 
                              alt="Swarp Foundation Logo" 
                              width={48} 
                              height={64}
                              className="object-contain w-full h-full"
                             
                            />
                          </div>
            </div>
            <div className=''>
              <p className='text-2xl text-white font-semibold !pb-2'>
                {t.onboarding?.signUp?.welcome || 'Welcome to Swarp Foundation'}
              </p>
              <p className='text-[#636466] text-base mt-2'>
                 {t.onboarding?.signUp?.subtitle || 'Send and receive money in fiat or crypto.'} <br/>
            {t.onboarding?.signUp?.subtitleLine2 || 'Fast. Secure. Borderless.'}
              </p>
            </div>
            
            <div className='w-full flex flex-col justify-center items-center gap-3'>
              {/* Phone Input with Tailwind Wrapper */}
              <div 
                className={`flex w-full bg-[#131519] !border rounded-2xl overflow-hidden relative ${
                  phoneError ? '!border-red-500' : '!border-[#2B2D30]'
                }`}
                onKeyDown={handleKeyPress}
              >
                <PhoneInput
                  placeholder={t.onboarding?.signUp?.phoneNumber || "Phone number"}
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  defaultCountry="US"
                  country="US"
                  international={true}
                  withCountryCallingCode={true}
                  countryCallingCodeEditable={false}
                  limitMaxLength={true}
                  className="w-full !py-3 !px-4 !pr-14 !focus:outline-none !focus:ring-0"
                  style={{
                    '--PhoneInputCountrySelectArrow-color': '#636466',
                    '--PhoneInputCountryFlag-borderRadius': '4px',
                  }}
                />
                {/* Continue Arrow Button */}
                <button
                  onClick={handleContinue}
                  disabled={!isFormValid || isLoading}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center transition-opacity ${
                    isFormValid && !isLoading ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Image 
                      src="/continue-arrow.svg" 
                      alt="Continue" 
                      width={18} 
                      height={18}
                      className="object-contain"
                    />
                  )}
                </button>
              </div>

              {/* Error Message */}
              {phoneError && (
                <p className="text-red-500 text-sm text-left w-full max-w-full px-2">
                  {phoneError}
                </p>
              )}

              <style jsx>{`
                :global(.PhoneInput) {
                  display: flex !important;
                  align-items: center !important;
                  width: 100% !important;
                  background-color: transparent !important;
                  border: none !important;
                }
                
                :global(.PhoneInput .PhoneInputInput) {
                  margin-left: 16px !important;
                  padding-left: 16px !important;
                  padding-right: 50px !important;
                  border-left: 1px solid #2B2D30 !important;
                  background-color: transparent !important;
                  color: white !important;
                  font-size: 16px !important;
                  line-height: 1.5 !important;
                  outline: none !important;
                  border-top: none !important;
                  border-right: none !important;
                  border-bottom: none !important;
                  box-shadow: none !important;
                }
                
                :global(.PhoneInputCountrySelect) {
                  margin-right: 8px !important;
                  padding-right: 8px !important;
                  background-color: transparent !important;
                  border: none !important;
                  outline: none !important;
                }
                
                :global(.PhoneInputCountrySelectArrow) {
                  color: #636466 !important;
                  opacity: 1 !important;
                }
                
                :global(.PhoneInputCountryIcon) {
                  width: 1.5em !important;
                  height: 1.125em !important;
                  border-radius: 4px !important;
                }
                
                /* Fix Windows-specific white background issues */
                :global(.PhoneInput *) {
                  background-color: transparent !important;
                  box-shadow: none !important;
                }
                
                :global(.PhoneInput .PhoneInputInput::placeholder) {
                  color: #B3B5B6 !important;
                  opacity: 1 !important;
                }
                
                :global(.PhoneInput .PhoneInputInput:focus) {
                  outline: none !important;
                  border-color: #2B2D30 !important;
                  box-shadow: none !important;
                  background-color: transparent !important;
                }
                
                /* Webkit autofill overrides */
                :global(.PhoneInput .PhoneInputInput:-webkit-autofill),
                :global(.PhoneInput .PhoneInputInput:-webkit-autofill:hover),
                :global(.PhoneInput .PhoneInputInput:-webkit-autofill:focus),
                :global(.PhoneInput .PhoneInputInput:-webkit-autofill:active) {
                  -webkit-box-shadow: 0 0 0 30px #131519 inset !important;
                  -webkit-text-fill-color: white !important;
                  background-color: #131519 !important;
                  transition: background-color 5000s ease-in-out 0s;
                }
                
                /* Windows-specific overrides */
                @media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
                  :global(.PhoneInput),
                  :global(.PhoneInput *) {
                    background-color: transparent !important;
                  }
                }
                
                /* Edge/Chrome on Windows overrides */
                @supports (-ms-ime-align: auto) {
                  :global(.PhoneInput),
                  :global(.PhoneInput *) {
                    background-color: transparent !important;
                  }
                }
                
                /* Force override all phone input dropdown styles */
                :global(div[class*="PhoneInput"]) {
                  background-color: #131519 !important;
                }
                
                :global(select[class*="PhoneInput"]) {
                  background-color: #131519 !important;
                  color: white !important;
                  border: 1px solid #2B2D30 !important;
                  border-radius: 8px !important;
                }
                
                :global(option) {
                  background-color: #131519 !important;
                  color: white !important;
                }
                
                /* Target the actual dropdown container */
                :global([class*="react-phone-number-input__country-select"]) {
                  background-color: transparent !important;
                  color: white !important;
                }
                
                :global([class*="react-phone-number-input__country-select"] option) {
                  background-color: transparent !important;
                  color: white !important;
                  padding: 8px 12px !important;
                }
                
                /* Universal dropdown styling */
                :global(select),
                :global(select *),
                :global(option) {
                  background-color: transparent !important;
                  color: white !important;
                }
                
                /* PhoneInput library specific overrides */
                :global(.PhoneInputCountrySelect select) {
                  background-color: transparent !important;
                  color: white !important;
                  border: 1px solid #2B2D30 !important;
                }
                
                :global(.PhoneInputCountrySelect option) {
                  background-color: transparent !important;
                  color: white !important;
                }
                
                /* Windows Chrome/Edge specific fixes */
                @media screen and (min-width: 0px) {
                  :global(select) {
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    appearance: none !important;
                    background-color: transparent !important;
                    color: white !important;
                    padding: 8px 12px !important;
                    min-height: 40px !important;
                    line-height: 1.5 !important;
                  }
                  
                  :global(option) {
                    background-color: transparent !important;
                    color: white !important;
                    -webkit-text-fill-color: white !important;
                    padding: 12px 16px !important;
                    min-height: 40px !important;
                    line-height: 1.5 !important;
                    font-size: 14px !important;
                  }
                }
              `}</style>
              
              {/* OR Divider */}

              <div className='flex flex-col  gap-2'>
                       
                          <button 
                            onClick={handleContinueWithGoogle}
                            className='w-[320px] !px-4 !py-4  !rounded-full cursor-pointer  flex  justify-center items-center gap-4 text-white'
                          >
                            <div className="w-5 h-5 relative">
                              <Image src="/google-icon.svg" alt="Google" fill className="object-contain" />
                            </div>
                         {t.onboarding?.signUp?.continueWithGoogle || 'Continue with Google'}
                         </button>
                       
                    </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className='flex flex-col gap-4 justify-center items-center pb-4'>
          
            <button
    onClick={() => setIsReferralModalOpen(true)}
    className='text-white text-center cursor-pointer hover:text-[#40E0D0] transition-colors'
  >
    {t.onboarding?.signUp?.haveReferralCode || 'Have a referral code?'}
  </button>
<ReferralCodeModal
  isOpen={isReferralModalOpen}
  onClose={() => setIsReferralModalOpen(false)}
  onSubmit={(_code) => {

    // WAIT 1 SECOND BEFORE CLOSING
    setTimeout(() => {
      setIsReferralModalOpen(false);
    }, 300);
  }}
/>

          <div className="w-full max-w-[412px] h-px bg-gradient-to-r from-transparent via-[#2B2D30] to-transparent" />
          <div className='flex justify-center items-center flex-col gap-4'>
            <LegalNotice />
          </div>
           
        </div>
      </div>
    </div>
    </>
    
  );
};