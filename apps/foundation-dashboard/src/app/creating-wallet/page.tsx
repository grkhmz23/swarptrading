'use client';

import { CreatingWallet } from '@/components/onboarding/CreatingWallet';
import { useRouter } from 'next/navigation';

export default function CreatingWalletPage() {
  const router = useRouter();

  const handleComplete = () => {
    // Navigate to set passcode screen
    router.push('/set-passcode');
  };

  return (
    <CreatingWallet
      onComplete={handleComplete}
    />
  );
}