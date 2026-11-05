import React from 'react';
import { Database, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl shadow-sm">
      <div className="p-4 bg-surface rounded-full text-secondary mb-4 border border-outline-variant">
        <Database className="w-8 h-8 opacity-80" />
      </div>
      <h3 className="text-base font-bold text-on-surface mb-1">{title}</h3>
      <p className="text-xs text-on-surface-variant/80 max-w-sm mb-6">{message}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/95 transition-all shadow-sm h-10"
        >
          <Plus className="w-4 h-4" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
