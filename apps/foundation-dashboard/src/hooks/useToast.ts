import { useState } from 'react';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  position?: 'top-right' | 'bottom-left';
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    isVisible: false,
    position: 'bottom-left',
  });

  const showToast = (message: string, type: 'success' | 'error', position?: 'top-right' | 'bottom-left') => {
    setToast({
      message,
      type,
      isVisible: true,
      position: position || 'bottom-left',
    });
  };

  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      isVisible: false,
    }));
  };

  const showSuccess = (message: string, position?: 'top-right' | 'bottom-left') => showToast(message, 'success', position);
  const showError = (message: string, position?: 'top-right' | 'bottom-left') => showToast(message, 'error', position);

  return {
    toast,
    showSuccess,
    showError,
    hideToast,
  };
};