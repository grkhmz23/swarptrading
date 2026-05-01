'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useT } from '@/i18n/I18nProvider';

export default function Home() {
  const t = useT();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('swarp_fd_access_token');
    const wallet = localStorage.getItem('swarp_fd_wallet');
    const onboardingComplete = localStorage.getItem('swarp_fd_onboarding_complete');

    if (token && wallet && onboardingComplete === 'true') {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        if (tokenPayload.exp && tokenPayload.exp > currentTime) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('swarp_fd_access_token');
          localStorage.removeItem('swarp_fd_wallet');
          localStorage.removeItem('swarp_fd_onboarding_complete');
        }
      } catch {
        localStorage.removeItem('swarp_fd_access_token');
        localStorage.removeItem('swarp_fd_wallet');
        localStorage.removeItem('swarp_fd_onboarding_complete');
      }
    }
    setIsLoading(false);
  }, []);

  const handleOnboardingComplete = (data: { method: string; email?: string; password?: string }) => {
    localStorage.setItem('swarp_fd_onboarding_complete', 'true');
    setIsAuthenticated(true);
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090A11]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#40E0D0]"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    router.replace('/dashboard');
    return (
      <div className="flex items-center justify-center h-screen bg-[#090A11]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#40E0D0]"></div>
      </div>
    );
  }

  return <OnboardingFlow onComplete={handleOnboardingComplete} />;
}
