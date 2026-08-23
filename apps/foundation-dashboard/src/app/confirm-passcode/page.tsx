'use client';

import { useEffect, useState } from "react";
import { ConfirmPasscode } from '@/components/onboarding/ConfirmPasscode';
import { useRouter } from 'next/navigation';

export default function ConfirmPasscodePage() {
  const router = useRouter();
  const [originalPasscode, setOriginalPasscode] = useState('');

  useEffect(() => {
    const tempPasscode = sessionStorage.getItem('swarp_fd_temp_passcode');
    if (!tempPasscode) {
      // If no passcode found, redirect back to set passcode
      router.push('/set-passcode');
      return;
    }
    setOriginalPasscode(tempPasscode);
  }, [router]);
  const handleBack = () => {
    router.back();
  };

  const handleComplete = () => {
    sessionStorage.removeItem('swarp_fd_temp_passcode');
    router.replace('/dashboard');
  };

  if (!originalPasscode) {
    return <div>Loading...</div>;
  }

  return (
    <ConfirmPasscode
      onBack={handleBack}
      onComplete={handleComplete}
      originalPasscode={originalPasscode}
    />
  );
}
