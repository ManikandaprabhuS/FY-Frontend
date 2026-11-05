import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> & {
  Table: React.FC<{ rows?: number; cols?: number }>;
  Card: React.FC;
  Text: React.FC<{ lines?: number }>;
} = ({ className = '' }) => {
  return (
    <div className={`animate-pulse rounded bg-gradient-to-r from-outline-variant/20 via-outline-variant/50 to-outline-variant/20 shadow-sm ${className}`} />
  );
};

// Table Skeleton helper
Skeleton.Table = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, idx) => (
          <div key={idx} className="flex-1 h-6 bg-outline-variant/30 animate-pulse rounded" />
        ))}
      </div>
      <hr className="border-outline-variant/20" />
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={`flex-1 h-8 bg-outline-variant/20 animate-pulse rounded ${
                colIdx === 0 ? 'w-3/4' : ''
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Card Skeleton helper
Skeleton.Card = () => {
  return (
    <div className="border border-outline-variant bg-surface-container-lowest p-6 rounded-xl space-y-4">
      <div className="flex justify-between items-center">
        <div className="w-1/3 h-4 bg-outline-variant/20 animate-pulse rounded" />
        <div className="w-8 h-8 bg-outline-variant/30 animate-pulse rounded-lg" />
      </div>
      <div className="w-1/2 h-8 bg-outline-variant/20 animate-pulse rounded" />
      <div className="w-2/3 h-3 bg-outline-variant/20 animate-pulse rounded" />
    </div>
  );
};

// Text Lines Skeleton helper
Skeleton.Text = ({ lines = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`h-4 bg-outline-variant/20 animate-pulse rounded ${
            idx === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export default Skeleton;
