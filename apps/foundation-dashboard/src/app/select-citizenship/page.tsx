'use client';

import { SelectCitizenship } from '@/components/onboarding/SelectCitizenship';
import { useRouter } from 'next/navigation';

export default function SelectCitizenshipPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleComplete = (_country: string) => {
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