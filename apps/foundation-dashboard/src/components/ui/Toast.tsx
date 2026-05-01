'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  position?: 'top-right' | 'bottom-left';
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 4000,
  position = 'bottom-left',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // ✅ Memoize the function so it doesn't re-create on every render
  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for slide-out animation
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      const animationTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);

      const dismissTimer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearTimeout(animationTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, duration, handleClose]); // ✅ Now include handleClose here

  const bgColor = type === 'success' ? 'bg-[#40E0D0]' : 'bg-red-500';
  const textColor = type === 'success' ? 'text-black' : 'text-white';

  const getPositionClasses = () => {
    if (position === 'top-right') {
      return {
        position: 'fixed top-4 right-4',
        animation:
          isVisible && isAnimating
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0',
      };
    } else {
      return {
        position: 'fixed bottom-4 left-4',
        animation:
          isVisible && isAnimating
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-full opacity-0',
      };
    }
  };

  const { position: positionClass, animation } = getPositionClasses();

  return (
    <div
      className={`${positionClass} transform transition-all duration-300 ease-in-out pointer-events-none ${animation}`}
      style={{ zIndex: 99999 }}
    >
      <div
        className={`${bgColor} ${textColor} rounded-sm !px-4 !py-3 shadow-lg flex items-center gap-3 min-w-[300px] max-w-[400px]`}
      >
        <div className="flex-grow">
          <p className="text-sm font-medium">{message}</p>
        </div>

        <button
          onClick={handleClose}
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity ${
            type === 'success' ? 'hover:bg-black/10' : 'hover:bg-white/20'
          }`}
        ></button>
      </div>
    </div>
  );
};
