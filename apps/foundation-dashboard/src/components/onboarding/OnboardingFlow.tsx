'use client';

import React, { useState, useEffect, useCallback } from 'react';
// import { useRouter } from 'next/navigation'; // Not used currently

import { SignUpEmailScreen } from './SignUpEmailScreen';
import { VerifyPhone } from './VerifyPhone';
import { SelectCitizenship } from './SelectCitizenship';
import { EmailSetup } from './EmailSetup';
import { ProfileSetup } from './ProfileSetup';
import { ProfilePhoto } from './ProfilePhoto';
import { CreatingWallet } from './CreatingWallet';
import { SetPasscode } from './SetPasscode';
import { ConfirmPasscode } from './ConfirmPasscode';
import { EnterPasscode } from './EnterPasscode';
import ReferralCodeModal from './ReferralCodeModal';
import { getAccessToken, setAccessToken } from '@/lib/session';

type OnboardingStep = 'splash' | 'welcome' | 'signup-options' | 'signup-email' | 'verify-phone' | 'select-citizenship' | 'email-setup' | 'profile-setup' | 'profile-photo' | 'creating-wallet' | 'set-passcode' | 'confirm-passcode' | 'enter-passcode';

type PendingProfileData = {
  email?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  profilePictureUrl?: string;
  isGoogleLogin?: boolean;
  [key: string]: unknown;
};

interface GoogleUserPayload {
  email?: string;
  [key: string]: unknown;
}

interface GoogleTokenPayload {
  email?: string;
  [key: string]: unknown;
}

interface OnboardingFlowProps {
  onComplete?: (data: { method: string; email?: string; password?: string }) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  // const router = useRouter(); // Not used currently

  const getInitialStep = (): OnboardingStep => {
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('swarp_fd_onboarding_step') as OnboardingStep;
      const token = getAccessToken();
      const wallet = localStorage.getItem('swarp_fd_wallet');
      
      if (savedStep && savedStep !== 'signup-email') {
        if (token && wallet && (savedStep === 'set-passcode' || savedStep === 'confirm-passcode' || savedStep === 'enter-passcode')) {
          return savedStep;
        } else {
        }
      }
    } 
    return 'signup-email';
  };

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(getInitialStep());
  const [passcode, setPasscode] = useState('');
  const [isReferralCodeOpen, setIsReferralCodeOpen] = useState(false);

  // Save current step to localStorage only for passcode steps (to prevent bypass)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentStep === 'set-passcode' || currentStep === 'confirm-passcode' || currentStep === 'enter-passcode') {
        localStorage.setItem('swarp_fd_onboarding_step', currentStep);
        // Replace browser history to prevent going back to previous screens during passcode flow
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        localStorage.removeItem('swarp_fd_onboarding_step');
      }
    }
  }, [currentStep]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we're on a passcode screen and user tries to go back, prevent it
      if (currentStep === 'set-passcode' || currentStep === 'confirm-passcode' || currentStep === 'enter-passcode') {
        event.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
        return false;
      }
    };

    if (currentStep === 'set-passcode' || currentStep === 'confirm-passcode' || currentStep === 'enter-passcode') {
      window.addEventListener('popstate', handlePopState);
      // Push a state to prevent back navigation
      window.history.pushState(null, '', window.location.pathname);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [currentStep]);

  const handleEmailContinue = (_phoneNumber: string) => {
    setCurrentStep('verify-phone');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'confirm-passcode':
        setCurrentStep('set-passcode');
        break;
      case 'set-passcode':
        setCurrentStep('creating-wallet');
        break;
      case 'enter-passcode':
        setCurrentStep('creating-wallet');
        break;
      case 'creating-wallet':
        setCurrentStep('profile-photo');
        break;
      case 'profile-photo':
        setCurrentStep('profile-setup');
        break;
      case 'profile-setup': {
        try {
          const raw = localStorage.getItem('swarp_fd_pending_profile');
          const pending: PendingProfileData | null = raw ? JSON.parse(raw) : null;
          if (pending?.email && pending.isGoogleLogin) {
            setCurrentStep('select-citizenship');
            break;
          }
        } catch (err) {
          console.warn('Failed to parse pendingProfileData in handleBack', err);
        }
        setCurrentStep('email-setup');
        break;
      }
      case 'email-setup':
        setCurrentStep('select-citizenship');
        break;
      case 'select-citizenship':
        setCurrentStep('verify-phone');
        break;
      case 'verify-phone':
        setCurrentStep('signup-email');
        break;
      case 'signup-email':
        setCurrentStep('signup-options');
        break;
      case 'signup-options':
        setCurrentStep('welcome');
        break;
      case 'welcome':
        setCurrentStep('splash');
        break;
      default:
        break;
    }
  };

  const handleVerifyComplete = () => {
    setCurrentStep('select-citizenship');
  };

  const handleCitizenshipComplete = (country: string) => {
    // Persist selected country to the pending profile data so later screens
    // (profile-setup / profile-photo) can read it.
    const existingData = localStorage.getItem('swarp_fd_pending_profile');
    const mergedData = {
      ...JSON.parse(existingData || '{}'),
      country
    };
    localStorage.setItem('swarp_fd_pending_profile', JSON.stringify(mergedData));

    // If an email is already present (for example when user continued with Google),
    // skip the EmailSetup screen and go directly to profile setup.
    if (mergedData.isGoogleLogin && mergedData.email) {
      setCurrentStep('profile-setup');
    } else {
      setCurrentStep('email-setup');
    }
  };

  const handleEmailSetupComplete = (emailData: { email: string }) => {
    // Merge with existing pending profile data
    const existingData = localStorage.getItem('swarp_fd_pending_profile');
    const mergedData: PendingProfileData = {
      ...JSON.parse(existingData || '{}'),
      ...emailData,
      isGoogleLogin: false,
    };
    localStorage.setItem('swarp_fd_pending_profile', JSON.stringify(mergedData));
    setCurrentStep('profile-setup');
  };

  const handleProfileSetupComplete = (profileData: { firstName: string; lastName: string }) => {
    // Merge with existing pending profile data
    const existingData = localStorage.getItem('swarp_fd_pending_profile');
    const mergedData = {
      ...JSON.parse(existingData || '{}'),
      ...profileData
    };
    localStorage.setItem('swarp_fd_pending_profile', JSON.stringify(mergedData));
    setCurrentStep('profile-photo');
  };

  const handleProfilePhotoComplete = (_photoData: { profilePictureUrl?: string }) => {
    // Profile photo component already persisted all data to backend
    setCurrentStep('creating-wallet');
  };

  const handleWalletCreated = () => {
    // Check if user already has a PIN (existing user)
    const userHasPIN = localStorage.getItem('swarp_fd_user_has_pin') === 'true';
    
    if (userHasPIN) {
      setCurrentStep('enter-passcode');
    } else {
      setCurrentStep('set-passcode');
    }
  };

  const handlePasscodeSet = (userPasscode: string) => {
    setPasscode(userPasscode);
    setCurrentStep('confirm-passcode');
  };

  const handlePasscodeConfirmed = () => {
    localStorage.removeItem('swarp_fd_user_has_pin');
    localStorage.removeItem('swarp_fd_onboarding_step');
    onComplete?.({ method: 'onboarding-complete' });
  };

  const handleEnterPasscodeComplete = () => {
    localStorage.removeItem('swarp_fd_user_has_pin');
    localStorage.removeItem('swarp_fd_onboarding_step');
    onComplete?.({ method: 'onboarding-complete' });
  };

  const handleReferralCode = () => {
    setIsReferralCodeOpen(true);
  };
const isGoogleUserPayload = (value: unknown): value is GoogleUserPayload => {
  return typeof value === 'object' && value !== null && 'email' in value;
};

interface GoogleContinueData {
  token: string;
  isNewUser?: boolean;
  user?: unknown;
}

const handleContinueWithGoogle = useCallback(
  ({ token, isNewUser, user }: GoogleContinueData) => {

    let email = '';
    if (isGoogleUserPayload(user) && typeof user.email === 'string') {
      email = user.email;
    } else {
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as GoogleTokenPayload;
        email = typeof payload.email === 'string' ? payload.email : '';
      } catch (error) {
        console.error('Failed to decode Google token for email:', error);
      }
    }

    const existingDataRaw = localStorage.getItem('swarp_fd_pending_profile');

    let existingData: PendingProfileData = {};
    try {
      const parsedData = existingDataRaw ? JSON.parse(existingDataRaw) : {};
      if (parsedData && typeof parsedData === 'object') {
        existingData = parsedData;
      }
    } catch (error) {
      console.warn('Invalid pendingProfileData, resetting.', error);
    }

    const mergedData = {
      ...existingData,
      email,
      isGoogleLogin: true,
    };

    localStorage.setItem('swarp_fd_pending_profile', JSON.stringify(mergedData));

    if (isNewUser === false) {
      setCurrentStep('enter-passcode');
      return;
    }

    setCurrentStep('select-citizenship');
  },
  [] // no external dependencies
);

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email');
  const firstName = urlParams.get('firstName');
  const lastName = urlParams.get('lastName');
  const newUser = urlParams.get('newUser');

  if (token && email) {

    setAccessToken(token);

    const userData = {
      email,
      firstName: firstName || '',
      lastName: lastName || '',
    };

    localStorage.setItem('swarp_fd_user', JSON.stringify(userData));
    localStorage.setItem('swarp_fd_pending_profile', JSON.stringify(userData));

    const isNewUser = newUser === 'true';

    window.history.replaceState({}, document.title, window.location.pathname);

    handleContinueWithGoogle({
      token,
      isNewUser,
      user: userData,
    });
  }
}, [handleContinueWithGoogle]);

  switch (currentStep) {
    case 'signup-email':
      return (
        <>
          <SignUpEmailScreen
            onBack={handleBack}
            onContinue={handleEmailContinue}
            onContinueWithGoogle={handleContinueWithGoogle}
            onReferralCode={handleReferralCode}
          />
          <ReferralCodeModal
            isOpen={isReferralCodeOpen}
            onClose={() => setIsReferralCodeOpen(false)}
            onSubmit={() => setIsReferralCodeOpen(false)}
          />
        </>
      );
    
    case 'verify-phone':
      return (
        <VerifyPhone
          onBack={handleBack}
          onComplete={handleVerifyComplete}
        />
      );

    case 'select-citizenship':
      return (
        <SelectCitizenship
          onBack={handleBack}
          onComplete={handleCitizenshipComplete}
        />
      );

    case 'email-setup':
      return (
        <EmailSetup
          onBack={handleBack}
          onComplete={handleEmailSetupComplete}
        />
      );

    case 'profile-setup':
      const profileSetupData = localStorage.getItem('swarp_fd_pending_profile');
      const profileSetupProfile = profileSetupData ? JSON.parse(profileSetupData) : {};
      return (
        <ProfileSetup
          email={profileSetupProfile.email}
          onBack={handleBack}
          onComplete={handleProfileSetupComplete}
        />
      );

    case 'profile-photo':
      const profilePhotoData = localStorage.getItem('swarp_fd_pending_profile');
      const photoProfile = profilePhotoData ? JSON.parse(profilePhotoData) : {};
      return (
        <ProfilePhoto
          firstName={photoProfile.firstName}
          lastName={photoProfile.lastName}
          email={photoProfile.email}
          onBack={handleBack}
          onComplete={handleProfilePhotoComplete}
        />
      );

    case 'creating-wallet':
      return (
        <CreatingWallet
          onComplete={handleWalletCreated}
        />
      );

    case 'set-passcode':
      return (
        <SetPasscode
          onBack={handleBack}
          onComplete={handlePasscodeSet}
        />
      );

    case 'confirm-passcode':
      return (
        <ConfirmPasscode
          onBack={handleBack}
          onComplete={handlePasscodeConfirmed}
          originalPasscode={passcode}
        />
      );

    case 'enter-passcode':
      return (
        <EnterPasscode
          onBack={handleBack}
          onComplete={handleEnterPasscodeComplete}
        />
      );
    
    default:
      return (
        <>
          <SignUpEmailScreen
            onBack={handleBack}
            onContinue={handleEmailContinue}
            onReferralCode={handleReferralCode}
          />
          <ReferralCodeModal
            isOpen={isReferralCodeOpen}
            onClose={() => setIsReferralCodeOpen(false)}
            onSubmit={() => setIsReferralCodeOpen(false)}
          />
        </>
      );
  }
};
