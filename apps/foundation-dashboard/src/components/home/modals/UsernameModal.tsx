'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '@/services/api';
import { useT } from '@/i18n/I18nProvider';
import { getAccessToken } from '@/lib/session';

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsernameSet: (username: string) => void;
  onShowSuccess: (message: string) => void;
  onShowError: (message: string) => void;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({
  isOpen,
  onClose,
  onUsernameSet,
  onShowSuccess,
  onShowError,
}) => {
  const t = useT();
  const [customName, setCustomName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: ''
  });
  
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    } else {
      // Reset form when modal closes
      setCustomName('');
      setSuggestions([]);
      setSelectedUsername('');
      setError(null);
      setValidationStatus({
        isChecking: false,
        isAvailable: null,
        message: ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadSuggestions = async (name?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAccessToken();
      if (!token) {
        setError(t.modals?.username?.errors?.authRequired || 'Authentication required');
        return;
      }

      const result = await apiService.suggestUsernames(token, name);
      
      // Clean any "@" symbols from suggestions if they exist
      const cleanSuggestions = (result.suggestions || []).map(username => 
        username.startsWith('@') ? username.slice(1) : username
      );
      
      setSuggestions(cleanSuggestions);
    } catch (error: unknown) {
      console.error('Error loading username suggestions:', error);
      const apiError = error as { message?: string };
      setError(apiError.message || t.modals?.username?.errors?.failedToLoadSuggestions || 'Failed to load username suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const validateUsernameFormat = (username: string): { isValid: boolean; message: string } => {
    if (!username.trim()) {
      return { isValid: false, message: '' };
    }
    
    if (username.length < 3) {
      return { isValid: false, message: t.modals?.username?.errors?.tooShort || 'Username must be at least 3 characters long' };
    }

    if (username.length > 30) {
      return { isValid: false, message: t.modals?.username?.errors?.tooLong || 'Username must be less than 30 characters long' };
    }
    
    return { isValid: true, message: '' };
  };

  const checkUsernameAvailability = async (username: string) => {
    // First validate format
    const formatValidation = validateUsernameFormat(username);
    if (!formatValidation.isValid) {
      setValidationStatus({
        isChecking: false,
        isAvailable: null,
        message: formatValidation.message
      });
      return;
    }

    try {
      setValidationStatus({
        isChecking: true,
        isAvailable: null,
        message: ''
      });

      const token = getAccessToken();
      if (!token) {
        setValidationStatus({
          isChecking: false,
          isAvailable: false,
          message: t.modals?.username?.errors?.authRequired || 'Authentication required'
        });
        return;
      }

      const result = await apiService.checkUsernameAvailability(username.trim(), token);
      setValidationStatus({
        isChecking: false,
        isAvailable: result.available,
        message: result.message
      });
    } catch (error: unknown) {
      console.error('Error checking username:', error);
      setValidationStatus({
        isChecking: false,
        isAvailable: false,
        message: t.modals?.username?.errors?.checkingFailed || 'Error checking username availability'
      });
    }
  };

  const handleCustomNameChange = (value: string) => {
    setCustomName(value);
    setSelectedUsername('');
    setError(null);
    
    // Clear any existing timeouts
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    
    // Debounce username validation
    validationTimeoutRef.current = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);

    // Debounce the API call for suggestions
    suggestionTimeoutRef.current = setTimeout(() => {
      if (value.trim() && value.length > 2) {
        loadSuggestions(value.trim());
      } else if (!value.trim()) {
        loadSuggestions(); // Load default suggestions
      }
    }, 500);
  };

  const handleUsernameSelect = (username: string) => {
    setSelectedUsername(username);
    setCustomName(username);
    // Immediately validate the selected username
    checkUsernameAvailability(username);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const usernameToSubmit = customName.trim();
    if (!usernameToSubmit) {
      setError(t.modals?.username?.errors?.pleaseEnter || 'Please enter a username');
      return;
    }

    const formatValidation = validateUsernameFormat(usernameToSubmit);
    if (!formatValidation.isValid) {
      setError(formatValidation.message);
      return;
    }

    // Check if username is validated and available
    if (validationStatus.isAvailable !== true) {
      if (validationStatus.isChecking) {
        setError(t.modals?.username?.errors?.pleaseWait || 'Please wait while we check username availability');
        return;
      }
      setError(validationStatus.message || t.modals?.username?.errors?.chooseAvailable || 'Please choose an available username');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const token = getAccessToken();
      if (!token) {
        setError(t.modals?.username?.errors?.authRequired || 'Authentication required');
        return;
      }

      // Ensure we never send "@" symbol to the API
      const cleanUsername = usernameToSubmit.startsWith('@') ? usernameToSubmit.slice(1) : usernameToSubmit;
      
      await apiService.updateUsername(cleanUsername, token);
      onUsernameSet(cleanUsername);
      onClose();
      
      // Show success toast after modal closes
      setTimeout(() => {
        onShowSuccess(t.modals?.username?.success || 'Username set successfully!');
      }, 50);
    } catch (error: unknown) {
      console.error('Error setting username:', error);
      const apiError = error as { message?: string };
      const errorMessage = apiError.message || t.modals?.username?.errors?.failedToSet || 'Failed to set username';
      setError(errorMessage);
      onShowError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 !p-4">
        <div className="bg-[#1A1B23] rounded-3xl !p-6 w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between !mb-6">
            <h2 className="text-xl font-bold text-white">
              {t.modals?.username?.title || 'Create Username'}
            </h2>
            <button
              onClick={onClose}
              className="!p-2 text-[#636466] hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="!space-y-4">
            {/* Custom Name Input */}
            <div>
              <label className="block text-white text-sm font-medium !mb-2">
                {t.modals?.username?.enterLabel || 'Enter username or name for suggestions'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => handleCustomNameChange(e.target.value)}
                  placeholder={t.modals?.username?.placeholder || "e.g., john_doe or just 'john' for suggestions..."}
                  className={`w-full bg-[#090A11] border rounded-xl !px-4 !py-3 !pr-10 text-white placeholder-[#636466] focus:outline-none transition-colors ${
                    validationStatus.isAvailable === true ? 'border-green-500 focus:border-green-500' :
                    validationStatus.isAvailable === false ? 'border-red-500 focus:border-red-500' :
                    'border-[#2B2D30] focus:border-[#40E0D0]'
                  }`}
                  disabled={isSubmitting}
                />
                {/* Validation Status Icon */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {validationStatus.isChecking ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#40E0D0]"></div>
                  ) : validationStatus.isAvailable === true ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : validationStatus.isAvailable === false ? (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : null}
                </div>
              </div>
              
              {/* Validation Message */}
              {validationStatus.message && (
                <p className={`text-xs !mt-2 ${
                  validationStatus.isAvailable === true ? 'text-green-500' :
                  validationStatus.isAvailable === false ? 'text-red-500' :
                  'text-[#636466]'
                }`}>
                  {validationStatus.message}
                </p>
              )}
              
              {!validationStatus.message && (
                <p className="text-[#636466] text-xs !mt-2">
                  {t.modals?.username?.hint || 'Type your desired username or a name to get suggestions below'}
                </p>
              )}
            </div>

            {/* Username Suggestions */}
            <div>
              <label className="block text-white text-sm font-medium !mb-3">
                {t.modals?.username?.chooseLabel || 'Choose a username or enter your own'}
              </label>
              
              {isLoading ? (
                <div className="flex justify-center !py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40E0D0]"></div>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {suggestions.map((username) => (
                    <button
                      key={username}
                      type="button"
                      onClick={() => handleUsernameSelect(username)}
                      className={`!p-3 rounded-xl border text-left transition-colors ${
                        selectedUsername === username
                          ? 'bg-[#40E0D0]/10 border-[#40E0D0] text-[#40E0D0]'
                          : 'bg-[#090A11] border-[#2B2D30] text-white hover:border-[#40E0D0]'
                      }`}
                      disabled={isSubmitting}
                    >
                      <span className="font-medium">@{username}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center !py-8">
                  <p className="text-[#636466] text-sm">
                    {customName ? (t.modals?.username?.noSuggestions || 'No suggestions available for this name') : (t.modals?.username?.loadingSuggestions || 'Loading suggestions...')}
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl !p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!customName.trim() || validationStatus.isAvailable !== true || isSubmitting}
              className="w-full bg-[#40E0D0] text-black font-semibold !py-3 rounded-xl hover:bg-[#40E0D0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (t.modals?.username?.setting || 'Setting Username...') : (t.modals?.username?.setButton || 'Set Username')}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full bg-transparent border border-[#2B2D30] text-white font-semibold !py-3 rounded-xl hover:bg-[#2B2D30] transition-colors disabled:opacity-50"
            >
              {t.common?.cancel || 'Cancel'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};