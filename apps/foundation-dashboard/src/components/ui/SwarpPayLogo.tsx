import React from 'react';

interface SwarpFoundationLogoProps {
  size?: number;
  className?: string;
}

export const SwarpFoundationLogo: React.FC<SwarpFoundationLogoProps> = ({ 
  size = 64, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Main hexagonal shape */}
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 64 64" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexagon background */}
          <path
            d="M32 4L52 16V48L32 60L12 48V16L32 4Z"
            fill="url(#hexGradient)"
            stroke="url(#strokeGradient)"
            strokeWidth="2"
          />
          
          {/* Inner S shape */}
          <path
            d="M24 20C24 18.8954 24.8954 18 26 18H34C37.3137 18 40 20.6863 40 24C40 27.3137 37.3137 30 34 30H30C26.6863 30 24 32.6863 24 36C24 39.3137 26.6863 42 30 42H38C39.1046 42 40 42.8954 40 44C40 45.1046 39.1046 46 38 46H30C23.3726 46 18 40.6274 18 34C18 27.3726 23.3726 22 30 22H34C35.1046 22 36 21.1046 36 20C36 18.8954 35.1046 18 34 18H26C24.8954 18 24 18.8954 24 20Z"
            fill="white"
          />

          <defs>
            <linearGradient id="hexGradient" x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4ECDC4" />
              <stop offset="0.5" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4ECDC4" stopOpacity="0.8"/>
              <stop offset="1" stopColor="#8B5CF6" stopOpacity="0.8"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export const SwarpFoundationWordmark: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`text-white font-bold text-2xl tracking-wide ${className}`}>
      Swarp Foundation
    </div>
  );
};