'use client';

import React from 'react';
import { VerifyPhone } from '@/components/onboarding/VerifyPhone';
import { useRouter } from 'next/navigation';

export default function VerifyPhonePage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleComplete = () => {
    console.log('Phone verification completed');
    router.push('/select-citizenship');
  };

  return (
    <VerifyPhone
      onBack={handleBack}
      onComplete={handleComplete}
    />
  );
}