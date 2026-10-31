import React from 'react';

interface BlueTickBadgeProps {
  size?: number;
  className?: string;
  title?: string;
}

export const BlueTickBadge: React.FC<BlueTickBadgeProps> = ({
  size = 16,
  className = '',
  title = 'Official Verified Safwa Publishers Account'
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      title={title}
      aria-label="Verified Blue Tick"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
          fill="#1D9BF0"
        />
        <path
          d="M9.8 16.2L5.85 12.25l1.41-1.41 2.54 2.54 6.53-6.53 1.41 1.41L9.8 16.2z"
          fill="#FFFFFF"
        />
      </svg>
    </span>
  );
};
