'use client';

import React from 'react';

interface SimpleGradientBackgroundProps {
  className?: string;
}

export const SimpleGradientBackground: React.FC<SimpleGradientBackgroundProps> = ({ 
  className = "" 
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Simple CSS gradient animation that mimics the Figma design */}
      <div className="absolute inset-0 animate-pulse">
        <div 
          className="absolute rounded-full"
          style={{
            left: '20%',
            top: '15%',
            width: '300px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(64, 224, 208, 0.12) 0%, transparent 70%)',
            filter: 'blur(96px)',
            animation: 'gradientMove1 8s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute rounded-full"
          style={{
            right: '20%',
            top: '20%',
            width: '250px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(64, 224, 208, 0.08) 0%, transparent 70%)',
            filter: 'blur(96px)',
            animation: 'gradientMove2 8s ease-in-out infinite',
            animationDelay: '1s',
          }}
        />
        <div 
          className="absolute rounded-full"
          style={{
            left: '10%',
            bottom: '20%',
            width: '200px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(64, 224, 208, 0.06) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'gradientMove3 10s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Debug indicator */}
      <div 
        className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 text-xs z-50"
        style={{ display: process.env.NODE_ENV === 'development' ? 'block' : 'none' }}
      >
        Simple Gradient Active
      </div>
    </div>
  );
};