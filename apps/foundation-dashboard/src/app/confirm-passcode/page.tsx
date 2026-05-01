'use client';

import React, { useEffect, useState } from 'react';
import { ConfirmPasscode } from '@/components/onboarding/ConfirmPasscode';
import { useRouter } from 'next/navigation';

export default function ConfirmPasscodePage() {
  const router = useRouter();
  const [originalPasscode, setOriginalPasscode] = useState('');

  useEffect(() => {
    // Get the original passcode from sessionStorage
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
    // Clear temporary passcode
    sessionStorage.removeItem('swarp_fd_temp_passcode');
    // TODO: Navigate to dashboard or next step
    alert('Onboarding completed successfully!');
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