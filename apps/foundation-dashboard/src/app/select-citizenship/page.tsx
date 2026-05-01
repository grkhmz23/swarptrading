'use client';

import React from 'react';
import { SelectCitizenship } from '@/components/onboarding/SelectCitizenship';
import { useRouter } from 'next/navigation';

export default function SelectCitizenshipPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleComplete = (country: string) => {
    console.log('Citizenship selected:', country);
    console.log('Navigating to creating wallet...');
    // Navigate to creating wallet screen
    router.push('/creating-wallet');
  };

  return (
    <SelectCitizenship
      onBack={handleBack}
      onComplete={handleComplete}
    />
  );
}