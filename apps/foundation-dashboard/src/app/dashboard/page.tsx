'use client';

import { HomeScreen } from '@/components/home/HomeScreen';
import { RequireSession } from '@/components/session/RequireSession';
import { clearSession } from '@/lib/session';

export default function DashboardPage() {
  const handleLogout = () => {
    clearSession();
    window.location.replace('/');
  };

  return (
    <RequireSession level="unlocked">
      <HomeScreen onLogout={handleLogout} />
    </RequireSession>
  );
}
