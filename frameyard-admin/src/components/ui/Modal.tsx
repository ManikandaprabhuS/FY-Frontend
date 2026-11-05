import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }[size];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 overflow-x-hidden overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content container */}
      <div className={`relative w-full max-h-[calc(100vh-1.5rem)] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl z-10 overflow-hidden transform transition-all duration-300 ${sizeClasses}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant bg-surface-container-low">
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 max-h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 bg-surface border-t border-outline-variant">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
