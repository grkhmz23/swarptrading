'use client';

import { useEffect } from "react";
import { useRouter } from 'next/navigation';

/** Legacy route: the wallet lives at /dashboard. */
export default function HomeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
