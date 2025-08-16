import React from 'react';

export const Logo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
  >
    <circle cx="50" cy="50" r="40" stroke="hsl(var(--primary))" />
    <path
      d="M50,10 A40,40 0 0,1 50,90"
      stroke="hsl(var(--primary))"
      strokeDasharray="5,15"
    />
    <path
      d="M10,50 A40,40 0 0,1 90,50"
      stroke="hsl(var(--primary))"
      strokeDasharray="5,5"
    />
    <path
      d="M50 25 C45 25 40 30 40 37.5 C40 48 50 60 50 60 C50 60 60 48 60 37.5 C60 30 55 25 50 25 Z"
      fill="hsl(var(--accent))"
      stroke="hsl(var(--accent))"
    />
    <circle cx="50" cy="37.5" r="5" fill="hsl(var(--background))" stroke="none" />
  </svg>
);
