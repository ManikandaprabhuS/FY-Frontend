import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, MoveRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  trendText?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendType = 'neutral',
  trendText,
  onClick,
}) => {
  const trendColor = {
    up: 'text-tertiary dark:text-green-400',
    down: 'text-error dark:text-red-400',
    neutral: 'text-secondary dark:text-gray-400',
  };

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: MoveRight,
  }[trendType];

  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col justify-between transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md hover:scale-[1.01]' : 'hover:border-primary-fixed-dim'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-semibold uppercase text-on-surface-variant tracking-wider">{title}</span>
        <div className="rounded-lg border border-outline-variant bg-white p-2 text-black shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-on-surface tracking-tight">{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor[trendType]}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{trend}</span>
            {trendText && <span className="text-on-surface-variant/70 font-normal"> {trendText}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
