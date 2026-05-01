'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '@/services/api';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { useT } from '@/i18n/I18nProvider';

interface CreatingWalletProps {
  onComplete?: () => void;
}

export const CreatingWallet: React.FC<CreatingWalletProps> = ({
  onComplete
}) => {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(true);
  const startedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple execution
    if (startedRef.current) return;
    startedRef.current = true;

    console.log('🚀 Starting wallet creation process...');

    const createWallet = async () => {
      try {
        console.log('🔍 All localStorage items:', {
          accessToken: localStorage.getItem('swarp_fd_access_token') ? 'present' : 'missing',
          isNewUser: localStorage.getItem('swarp_fd_is_new_user'),
          pendingPhoneNumber: localStorage.getItem('swarp_fd_pending_phone'),
          allKeys: Object.keys(localStorage)
        });
        
        console.log('🎯 CreateWallet function starting...');

        // Get token from localStorage
        const token = localStorage.getItem('swarp_fd_access_token');
        
        if (!token) {
          setError(t.onboarding?.creatingWallet?.errors?.tokenNotFound || 'Authentication token not found. Please log in again.');
          return;
        }

        // Check if token is expired
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (tokenPayload.exp && tokenPayload.exp < currentTime) {
            setError(t.onboarding?.creatingWallet?.errors?.sessionExpired || 'Your session has expired. Please go back and verify your phone number again.');
            return;
          }
        } catch (tokenError) {
          console.error('Error parsing token:', tokenError);
        }

        // Check if this is a new user or existing user
        const isNewUserValue = localStorage.getItem('swarp_fd_is_new_user');
        const userIsNew = isNewUserValue === 'true';
        setIsNewUser(userIsNew);
        console.log('🔍 Debug isNewUser:', {
          isNewUserValue,
          userIsNew,
          type: typeof isNewUserValue
        });
        console.log(userIsNew ? '🆕 New user - creating wallet...' : '👤 Existing user - fetching wallet...');

        // For existing users, also check if they have a wallet PIN
        let hasPIN = false;
        if (!userIsNew) {
          try {
            const pinResult = await apiService.hasWalletPIN(token);
            hasPIN = pinResult.hasPIN;
          } catch (error) {
            console.warn('Could not check PIN status:', error);
          }
        }

        let walletData;

        if (userIsNew) {
          // Create new wallet for new user
          console.log('🔄 Calling wallet creation API...');
          const result = await apiService.createWallet({
            name: 'Custodial Wallet',
            description: 'Swarp Foundation managed wallet'
          }, token);

          walletData = result.wallet;
          console.log('✅ Wallet created successfully:', {
            id: walletData.id,
            publicKey: walletData.publicKey,
            name: walletData.name,
            status: walletData.status,
            balance: walletData.balance
          });

        } else {
          // Fetch existing wallet for returning user
          console.log('🔄 Fetching existing wallets...');
          const wallets = await apiService.getUserWallets(token);
          
          if (wallets.length > 0) {
            walletData = wallets[0]; // Get the first (primary) wallet
            console.log('✅ Existing wallet found:', {
              id: walletData.id,
              publicKey: walletData.publicKey,
              name: walletData.name,
              status: walletData.status,
              balance: walletData.balance
            });
          } else {
            // Existing user but no wallet found - create one
            console.log('⚠️ Existing user has no wallet, creating one...');
            const result = await apiService.createWallet({
              name: 'Custodial Wallet',
              description: 'Swarp Foundation managed wallet'
            }, token);

            walletData = result.wallet;
            console.log('✅ Wallet created for existing user:', {
              id: walletData.id,
              publicKey: walletData.publicKey,
              name: walletData.name,
              status: walletData.status,
              balance: walletData.balance
            });
          }
        }

        console.log('📦 About to store wallet data and proceed to initialization...');
        
        // Store wallet info in localStorage for future use
        localStorage.setItem('swarp_fd_wallet', JSON.stringify(walletData));
        
        // Store user flow information for next screens
        localStorage.setItem('swarp_fd_user_has_pin', hasPIN.toString());
        
        console.log('💾 Wallet data stored, proceeding to initialization logic...');
        console.log('🔄 NEW VERSION LOADED - setTimeout should be removed!');
        
        // Initialize wallet on Solana blockchain for new users only
        console.log('💡 Wallet initialization decision:', {
          userIsNew,
          shouldInitialize: userIsNew,
          walletId: walletData.id
        });
        
        // Always try to initialize wallet on blockchain (for both new and existing users)
        // This ensures existing wallets that weren't previously initialized get set up
        console.log('🔄 Checking/initializing wallet on Solana blockchain...');
        try {
          const initResult = await apiService.initializeWallet(walletData.id, token);
          console.log('✅ Wallet initialized on Solana:', {
            balance: initResult.balance,
            signature: initResult.signature,
            explorerUrl: initResult.explorerUrl,
            walletUrl: initResult.walletUrl
          });
          
          // Update wallet data with new balance
          walletData.balance = initResult.balance;
          localStorage.setItem('swarp_fd_wallet', JSON.stringify(walletData));
          
        } catch (initError) {
          console.warn('⚠️ Wallet initialization on blockchain failed (wallet might already be initialized):', initError);
          // Don't fail the entire flow if blockchain initialization fails
          // This could mean the wallet is already initialized, which is fine
        }
        
        // Clean up temporary flags
        localStorage.removeItem('swarp_fd_is_new_user');
        localStorage.removeItem('swarp_fd_pending_phone');
        
        console.log('🏁 All operations complete, calling onComplete...');
        
        // Complete the flow
        if (onComplete) {
          onComplete();
        }

      } catch (error: unknown) {
        // Handle different error types
        const apiError = error as { statusCode?: number; message?: string };
        if (apiError.statusCode === 401 || (apiError.message && apiError.message.includes('Unauthorized'))) {
          setError(t.onboarding?.creatingWallet?.errors?.sessionExpired || 'Your session has expired. Please go back and verify your phone number again.');
        } else if (apiError.statusCode === 500) {
          setError(t.onboarding?.creatingWallet?.errors?.serverError || 'Server error occurred. Please try again or contact support if the issue persists.');
        } else {
          setError(apiError.message || t.onboarding?.creatingWallet?.errors?.failedToProcess || 'Failed to process wallet. Please try again.');
        }
      }
    };

    createWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  return (
    <div className="min-h-screen w-full bg-[#090A11] flex items-center justify-center overflow-hidden relative">
      {/* Animated Gradient Background */}
      <AnimatedGradientBackground />
      {/* Mobile-first container with max width for desktop */}
      <div className="w-full max-w-md mx-auto min-h-screen lg:max-w-lg xl:max-w-xl flex flex-col relative z-10">
        
        {/* Main Content - Centered */}
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-full max-w-[354px] text-center flex flex-col items-center gap-4">
            
            {/* Title */}
            <h1 className="text-xl text-white font-semibold">
              {error
                ? (t.onboarding?.creatingWallet?.titleError || 'Error')
                : (isNewUser
                    ? (t.onboarding?.creatingWallet?.titleCreating || 'Creating wallet...')
                    : (t.onboarding?.creatingWallet?.titleConnecting || 'Connecting to your wallet...'))}
            </h1>
            
            {/* Loading Animation - 3 dots - centered relative to title */}
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-1">
                <div 
                  className="w-[10px] h-[13px] bg-[#40E0D0] rounded-full animate-pulse"
                  style={{ animationDelay: '0ms', animationDuration: '1200ms' }}
                />
                <div 
                  className="w-[11px] h-[13px] bg-[#40E0D0] rounded-full animate-pulse"
                  style={{ animationDelay: '400ms', animationDuration: '1200ms' }}
                />
                <div 
                  className="w-[11px] h-[13px] bg-[#40E0D0] rounded-full animate-pulse"
                  style={{ animationDelay: '800ms', animationDuration: '1200ms' }}
                />
              </div>
            </div>
            
            {/* Subtitle or Error Message */}
            {error ? (
              <div className="text-center">
                <p className="text-red-500 text-sm mb-4">
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-[#40E0D0] text-sm underline"
                >
                  {t.onboarding?.creatingWallet?.tryAgain || 'Try again'}
                </button>
              </div>
            ) : (
              <p className="text-[#636466] text-sm text-center">
                {isNewUser
                  ? (t.onboarding?.creatingWallet?.subtitleCreating || 'Setting up your Swarp Foundation wallet. This will not take long.')
                  : (t.onboarding?.creatingWallet?.subtitleConnecting || 'Connecting to your Swarp Foundation wallet. This will not take long.')
                }
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};