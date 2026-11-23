'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Confirmation now happens inside /set-passcode; keep old links working. */
export default function ConfirmPasscodePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/set-passcode');
  }, [router]);

  return null;
}
