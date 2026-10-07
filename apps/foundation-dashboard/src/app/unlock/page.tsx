'use client';

import { RequireSession, safeNextPath } from '@/components/session/RequireSession';
import { EnterPasscode } from '@/components/onboarding/EnterPasscode';

export default function UnlockPage() {
  const handleComplete = () => {
    const next = new URLSearchParams(window.location.search).get('next');
    window.location.replace(safeNextPath(next));
  };

  return (
    <RequireSession level="token">
      <EnterPasscode onComplete={handleComplete} />
    </RequireSession>
  );
}
