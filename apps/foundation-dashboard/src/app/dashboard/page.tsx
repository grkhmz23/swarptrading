'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HomeScreen } from '../../components/home/HomeScreen';
import { useT } from '@/i18n/I18nProvider';

export default function HomePage() {
  const t = useT();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('swarp_fd_access_token');
    
    if (!token) {
      router.push('/');
      return;
    }

    try {
      // Validate token
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (tokenPayload.exp && tokenPayload.exp > currentTime) {
        setIsAuthenticated(true);
      } else {
        // Token expired, redirect to login
        // SECURITY: Replaced broad clear with targeted cleanup
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('swarp_fd_'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
        router.push('/');
        return;
      }
    } catch {
      // Invalid token, redirect to login
      // SECURITY: Replaced broad clear with targeted cleanup
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('swarp_fd_'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
      router.push('/');
      return;
    }
    
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    // Clear all stored data
    // SECURITY: Replaced broad clear with targeted cleanup
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('swarp_fd_'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090A11] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#40E0D0] mx-auto mb-4"></div>
          <p className="text-white">{t.common?.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <HomeScreen onLogout={handleLogout} />;
}