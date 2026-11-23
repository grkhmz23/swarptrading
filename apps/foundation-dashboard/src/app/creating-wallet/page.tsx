'use client';

import { CreatingWallet } from '@/components/onboarding/CreatingWallet';
import { RequireSession } from '@/components/session/RequireSession';
import { useRouter } from 'next/navigation';

export default function CreatingWalletPage() {
  const router = useRouter();

  return (
    <RequireSession level="token">
      <CreatingWallet onComplete={() => router.push('/set-passcode')} />
    </RequireSession>
  );
}
