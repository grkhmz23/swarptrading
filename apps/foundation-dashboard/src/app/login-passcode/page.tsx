'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnterPasscode } from '@/components/onboarding/EnterPasscode';

export default function LoginPasscodePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Passcode login needs the phone number entered on the previous screen.
    if (!localStorage.getItem('swarp_fd_pending_phone')) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return <EnterPasscode isDirectLogin onComplete={() => router.replace('/dashboard')} onBack={() => router.push('/')} />;
}
