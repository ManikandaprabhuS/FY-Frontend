import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
}) => {
  const confirmBtnStyles = {
    danger: 'bg-error text-on-error hover:bg-red-700',
    warning: 'bg-amber-600 text-white hover:bg-amber-700',
    info: 'bg-primary text-on-primary hover:bg-primary/90',
  }[type];

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
      >
        {cancelText}
      </button>
      <button
        onClick={() => {
          onConfirm();
          onClose();
        }}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${confirmBtnStyles}`}
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} size="sm">
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-full ${
          type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
