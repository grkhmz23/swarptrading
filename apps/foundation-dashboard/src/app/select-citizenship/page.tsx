'use client';

import { SelectCitizenship } from '@/components/onboarding/SelectCitizenship';
import { RequireSession } from '@/components/session/RequireSession';
import { useRouter } from 'next/navigation';

export default function SelectCitizenshipPage() {
  const router = useRouter();

  return (
    <RequireSession level="token">
      <SelectCitizenship onBack={() => router.back()} onComplete={() => router.push('/creating-wallet')} />
    </RequireSession>
  );
}
