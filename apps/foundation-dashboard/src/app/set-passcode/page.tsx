'use client';

import { SetPasscode } from '@/components/onboarding/SetPasscode';
import { useRouter } from 'next/navigation';

export default function SetPasscodePage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleComplete = (passcode: string) => {
    // Store passcode in sessionStorage temporarily for confirmation
    sessionStorage.setItem('swarp_fd_temp_passcode', passcode);
    // Navigate to confirm passcode screen
    router.push('/confirm-passcode');
  };

  return (
    <SetPasscode
      onBack={handleBack}
      onComplete={handleComplete}
    />
  );
}