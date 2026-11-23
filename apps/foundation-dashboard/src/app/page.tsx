'use client';

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { getValidAccessToken } from '@/lib/session';
import { isSessionUnlocked } from '@/lib/pinGate';

export default function Home() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const token = getValidAccessToken();
    const onboardingComplete = localStorage.getItem('swarp_fd_onboarding_complete') === 'true';

    if (token && onboardingComplete) {
      router.replace(isSessionUnlocked(token) ? '/dashboard' : '/unlock?next=/dashboard');
      return;
    }
    setShowOnboarding(true);
  }, [router]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('swarp_fd_onboarding_complete', 'true');
    router.replace('/dashboard');
  };

  if (!showOnboarding) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090A11]" aria-busy="true">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#40E0D0]"></div>
      </div>
    );
  }

  return <OnboardingFlow onComplete={handleOnboardingComplete} />;
}
