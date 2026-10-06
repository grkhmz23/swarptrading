'use client';

import { useRouter } from 'next/navigation';
import { EnterPasscode } from '../../components/onboarding/EnterPasscode';

export default function LoginPasscodePage() {
  const router = useRouter();

  const handleComplete = () => {
    // After successful passcode login, redirect to home
    router.push('/dashboard');
  };

  const handleBack = () => {
    // Go back to phone number entry
    router.push('/');
  };

  return (
    <EnterPasscode 
      isDirectLogin={true}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
}