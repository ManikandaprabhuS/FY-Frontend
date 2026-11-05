import React from 'react';

type BadgeType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  type?: BadgeType;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, type = 'neutral', className = '' }) => {
  const styles: Record<BadgeType, string> = {
    success: 'bg-transparent text-green-600 font-semibold',
    warning: 'bg-transparent text-amber-600 font-semibold',
    error: 'bg-transparent text-red-600 font-semibold',
    info: 'bg-secondary-container text-on-secondary-container dark:bg-blue-900/30 dark:text-blue-400',
    neutral: 'bg-surface-variant text-on-surface-variant dark:bg-gray-800 dark:text-gray-400',
  };

 return (
  <span
    className={`
      inline-flex
      items-center
      justify-center
      whitespace-nowrap
      px-3
      py-1
      rounded-full
      text-xs
      font-semibold
      tracking-wider
      uppercase
      ${styles[type]}
      ${className}
    `}
  >
    {children}
  </span>
);
};

export default Badge;
