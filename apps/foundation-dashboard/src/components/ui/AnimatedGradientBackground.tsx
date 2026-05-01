'use client';

import React from 'react';

interface AnimatedGradientBackgroundProps {
  className?: string;
  enableAnimation?: boolean;
}

export const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({ 
  className = "",
  enableAnimation = true
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden gradient-container ${className}`}>
      {/* Vector 1 - Circular motion around center */}
      <div 
        className={`absolute gradient-vector ${enableAnimation ? 'animate-circular-motion-1' : ''}`}
        style={{
          left: '50%',
          top: '50%',
          width: '400px',
          height: '600px',
          marginLeft: '-200px',
          marginTop: '-300px',
          backgroundImage: 'url(/gradient-assets/gradient-vector-1-frame1.svg)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          filter: 'blur(96px)',
          opacity: 0.8,
          transformOrigin: '50% 50%',
        }}
      />
      
      {/* Vector 2 - Circular motion around center (offset) */}
      <div 
        className={`absolute gradient-vector ${enableAnimation ? 'animate-circular-motion-2' : ''}`}
        style={{
          left: '50%',
          top: '50%',
          width: '300px',
          height: '450px',
          marginLeft: '-150px',
          marginTop: '-225px',
          backgroundImage: 'url(/gradient-assets/gradient-vector-2-frame1.svg)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          filter: 'blur(96px)',
          opacity: 0.6,
          transformOrigin: '50% 50%',
        }}
      />
    </div>
  );
};