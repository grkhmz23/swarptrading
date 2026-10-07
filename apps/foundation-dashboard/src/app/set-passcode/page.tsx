'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPasscode } from '@/components/onboarding/SetPasscode';
import { ConfirmPasscode } from '@/components/onboarding/ConfirmPasscode';
import { RequireSession } from '@/components/session/RequireSession';
import { apiService } from '@/services/api';
import { getValidAccessToken } from '@/lib/session';

/**
 * Choose and confirm a wallet PIN. The chosen PIN only lives in component
 * state between the two steps. Users who already have a PIN are sent to the
 * unlock screen: an existing PIN can only be changed from Settings with the
 * old PIN.
 */
function SetPasscodeFlow() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState('');
  const [chosenPin, setChosenPin] = useState<string | null>(null);

  useEffect(() => {
    const token = getValidAccessToken();
    if (!token) return;
    let cancelled = false;
    apiService
      .hasWalletPIN(token)
      .then(({ hasPIN }) => {
        if (cancelled) return;
        if (hasPIN) router.replace('/unlock?next=/dashboard');
        else setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setCheckError('Could not check your wallet status. Please reload the page.');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checkError) {
    return (
      <div className="min-h-screen bg-[#090A11] flex items-center justify-center p-8">
        <p className="text-red-500 text-sm text-center" role="alert">{checkError}</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#090A11] flex items-center justify-center" aria-busy="true">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#40E0D0]" />
      </div>
    );
  }

  if (chosenPin === null) {
    return <SetPasscode onBack={() => router.back()} onComplete={setChosenPin} />;
  }

  return (
    <ConfirmPasscode
      originalPasscode={chosenPin}
      onBack={() => setChosenPin(null)}
      onComplete={() => {
        localStorage.setItem('swarp_fd_onboarding_complete', 'true');
        router.replace('/dashboard');
      }}
    />
  );
}

export default function SetPasscodePage() {
  return (
    <RequireSession level="token">
      <SetPasscodeFlow />
    </RequireSession>
  );
}
