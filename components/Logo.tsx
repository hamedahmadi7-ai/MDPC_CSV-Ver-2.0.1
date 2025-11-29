
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark'; // 'light' for light backgrounds (colored text), 'dark' for dark backgrounds (white text)
}

export const Logo: React.FC<LogoProps> = ({ className = "w-64 h-auto", variant = 'light' }) => {
  const primaryColor = variant === 'light' ? '#6D28D9' : '#A78BFA'; // Purple
  const secondaryColor = variant === 'light' ? '#1E40AF' : '#60A5FA'; // Blue
  const textColor = variant === 'light' ? '#1F2937' : '#F3F4F6'; // Dark Gray or White
  const subTextColor = variant === 'light' ? '#4B5563' : '#9CA3AF';

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 300 100" 
      className={className} 
      fill="none"
      role="img"
      aria-label="Masoon Darou Logo"
    >
      {/* Abstract DNA / Helix Icon */}
      <path 
        d="M30 20 C 45 20, 45 80, 60 80 C 75 80, 75 20, 90 20" 
        stroke={primaryColor} 
        strokeWidth="8" 
        strokeLinecap="round"
        fill="none"
      />
      <path 
        d="M30 80 C 45 80, 45 20, 60 20 C 75 20, 75 80, 90 80" 
        stroke={secondaryColor} 
        strokeWidth="8" 
        strokeLinecap="round" 
        fill="none"
        opacity="0.8"
      />
      
      {/* Connection points in DNA */}
      <circle cx="45" cy="50" r="4" fill={primaryColor} />
      <circle cx="75" cy="50" r="4" fill={secondaryColor} />

      {/* Text: MDPC */}
      <text 
        x="110" 
        y="55" 
        fontFamily="sans-serif" 
        fontWeight="bold" 
        fontSize="48" 
        fill={primaryColor}
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.1))' }}
      >
        MDPC
      </text>

      {/* Subtext: Masoon Darou Co. */}
      <text 
        x="112" 
        y="85" 
        fontFamily="sans-serif" 
        fontWeight="500" 
        fontSize="14" 
        letterSpacing="1"
        fill={textColor}
      >
        Masoon Darou Co.
      </text>
      
      {/* Tagline or CSV Indicator */}
      <text 
        x="220" 
        y="35" 
        fontFamily="sans-serif" 
        fontWeight="bold" 
        fontSize="10" 
        fill={secondaryColor}
        opacity="0.8"
      >
        BioPharma
      </text>
    </svg>
  );
};
