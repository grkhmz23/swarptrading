'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { AnimatedGradientBackground } from '../ui/AnimatedGradientBackground';
import { apiService } from '../../services/api';
import { useT } from '@/i18n/I18nProvider';
import { LanguageSelector } from '../ui/LanguageSelector';

interface ProfilePhotoProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  onBack?: () => void;
  onComplete?: (data: { profilePictureUrl?: string }) => void;
}

export const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  firstName,
  lastName,
  email,
  onComplete,
}) => {
  const t = useT();
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('swarp_fd_access_token') : null;
  localStorage.removeItem('swarp_fd_login_method');

  // Store refs for Enter key handler
  const isLoadingRef = useRef(isLoading);
  const profilePicturePreviewRef = useRef(profilePicturePreview);
  const profilePictureFileRef = useRef(profilePictureFile);

  // Keep refs updated
  useEffect(() => {
    isLoadingRef.current = isLoading;
    profilePicturePreviewRef.current = profilePicturePreview;
    profilePictureFileRef.current = profilePictureFile;
  }, [isLoading, profilePicturePreview, profilePictureFile]);

  // Fetch existing profile picture if any
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!token) return;
      try {
        const { url } = await apiService.getProfilePicture(token);
        if (url) setProfilePicturePreview(url);
      } catch (err) {
        console.warn('Failed to fetch profile picture', err);
      }
    };
    fetchProfilePicture();
  }, [token]);

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError(t.onboarding?.profilePhoto?.errors?.invalidImage || 'Please upload a valid image file');
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        setError(t.onboarding?.profilePhoto?.errors?.imageTooLarge || 'Image size must be less than 1MB');
        return;
      }

      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkipPicture = async () => {
    setIsLoading(true);
    setError('');
    try {
      const payload = { firstName, lastName, email, profilePictureUrl: undefined };
      localStorage.setItem('swarp_fd_pending_profile', JSON.stringify(payload));
      onComplete?.({ profilePictureUrl: undefined });
    } catch {
      setError('Failed to save profile data locally.');
    } finally {
      setIsLoading(false);
    }
  };

const handleSavePicture = async () => {
  if (!token) {
    setError(t.onboarding?.profilePhoto?.errors?.authRequired || 'Authentication required.');
    return;
  }
  if (!profilePictureFile) {
    setError(t.onboarding?.profilePhoto?.errors?.noPicture || 'No picture selected.');
    return;
  }

  setIsLoading(true);
  setError('');

  try {
    // Upload to backend S3
    const uploadRes = await apiService.uploadProfilePicture(profilePictureFile, token);
    const pictureKey = uploadRes.key;

    // Call onComplete
    onComplete?.({ profilePictureUrl: pictureKey });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 413) {
      setError(t.onboarding?.profilePhoto?.errors?.fileSizeLimit || 'File size must be less than 1 MB. Please select a smaller image.');
    } else if (error instanceof Error) {
      setError(error.message);
    } else {
      setError(t.onboarding?.profilePhoto?.errors?.failedToUpload || 'Failed to upload or save profile picture. Please try again.');
    }
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoadingRef.current) {
        e.preventDefault();
        if (profilePicturePreviewRef.current && profilePictureFileRef.current) {
          handleSavePicture();
        } else {
          handleSkipPicture();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='w-full h-screen overflow-hidden !p-8 relative bg-[#090A11]'>
      <AnimatedGradientBackground />
      <div className='flex flex-col h-full relative z-10'>
        {/* Language Selector */}
        <div className='flex justify-center !py-4'>
          <LanguageSelector />
        </div>

        {/* Main Content */}
        <div className='flex-1 flex flex-col justify-center items-center'>
          <div className='w-full max-w-[358px] text-center flex flex-col items-center gap-7'>
            {/* Profile Picture Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
            >
              {profilePicturePreview ? (
                <>
                  <Image
                    src={profilePicturePreview}
                    alt="Profile"
                    fill
                    className="object-cover group-hover:opacity-70 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs">{t.onboarding?.profilePhoto?.change || 'Change'}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-[#40E0D0] flex items-center justify-center rounded-full">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              )}
            </div>

            {/* Text */}
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl text-white font-bold'>
                {t.onboarding?.profilePhoto?.title || 'Add Your Photo'}
              </h1>
              <p className='text-[#636466] text-sm text-center'>
                {profilePicturePreview
                  ? (t.onboarding?.profilePhoto?.subtitleWithPhoto || 'Change your profile picture?')
                  : (t.onboarding?.profilePhoto?.subtitleNoPhoto || 'Optional but recommended')}
              </p>
            </div>

            {/* Error */}
            {error && <p className='text-sm text-red-400'>{error}</p>}

            {/* Buttons */}
            <div className='flex flex-col gap-3 w-full'>
              {profilePicturePreview && (
                <button
                  onClick={handleSavePicture}
                  disabled={isLoading}
                  className='w-full !py-3 bg-[#40E0D0] text-[#090A11] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoading ? (t.onboarding?.profilePhoto?.saving || 'Saving...') : (t.onboarding?.profilePhoto?.continueWithPhoto || 'Continue with Photo')}
                </button>
              )}

              <button
                onClick={handleSkipPicture}
                disabled={isLoading}
                className='w-full !py-3 bg-[#131519] border border-[#2B2D30] cursor-pointer text-white font-semibold rounded-xl hover:border-[#40E0D0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? (t.onboarding?.profilePhoto?.processing || 'Processing...') : (t.onboarding?.profilePhoto?.skipForNow || 'Skip for Now')}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              onChange={handlePictureChange}
              className='hidden'
            />
          </div>
        </div>

        {/* Footer */}
        <div className='flex flex-col gap-2 justify-center items-center pb-4'>
          <div className='flex flex-col gap-4 justify-center items-center mt-4'>
            <div className="w-full max-w-[412px] h-px bg-gradient-to-r from-transparent via-[#2B2D30] to-transparent" />
            <p className='text-[#636466] text-xs text-center max-w-sm mx-auto px-6'>
              {t.onboarding?.signUp?.termsText || 'You acknowledge that you have read and agree to'}{' '}
              <a href="https://www.swarpfoundation.com/terms" target="_blank" rel="noopener noreferrer" className='text-white underline hover:text-[#40E0D0] transition-colors cursor-pointer'>
                {t.onboarding?.signUp?.termsLink || "Swarp Foundation's Terms"}
              </a> {t.onboarding?.signUp?.and || 'and'}{' '}
              <a href="https://www.swarpfoundation.com/privacy" target="_blank" rel="noopener noreferrer" className='text-white underline hover:text-[#40E0D0] transition-colors cursor-pointer'>
                {t.onboarding?.signUp?.privacyLink || 'Privacy Policy'}
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
