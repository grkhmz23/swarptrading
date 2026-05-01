'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#090A11]">
      <p className="text-white">Redirecting to dashboard...</p>
    </div>
  );
}
