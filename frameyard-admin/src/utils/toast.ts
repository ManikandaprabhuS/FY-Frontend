import { createElement, type CSSProperties } from 'react';
import toast, { type DefaultToastOptions, type ToastOptions } from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';

type Kind = 'success' | 'error' | 'warning';
type Options = Pick<ToastOptions, 'id'> & { retry?: () => void };
const baseStyle: CSSProperties = {
  borderRadius: '12px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.14)',
  fontSize: '14px', fontWeight: 700,
};
const themes = {
  success: { background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', icon: '#16a34a', duration: 3500, component: CheckCircle2 },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', icon: '#dc2626', duration: 4500, component: XCircle },
  warning: { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', icon: '#d97706', duration: 4500, component: AlertTriangle },
} as const;
export const toastOptions: DefaultToastOptions = { duration: 3500, style: baseStyle };

const notify = (kind: Kind, message: string, options?: Options) => {
  const theme = themes[kind];
  const config: ToastOptions = {
    id: options?.id ?? `frameyaad:${kind}:${message.trim().replace(/\s+/g, ' ')}`,
    duration: theme.duration,
    style: { ...baseStyle, background: theme.background, color: theme.color, border: theme.border },
    icon: createElement(theme.component, { size: 21, color: theme.icon, strokeWidth: 2.5, 'aria-hidden': true }),
  };
  const content = options?.retry ? createElement('span', null, message, ' ', createElement('button', { type: 'button', className: 'ml-2 underline font-bold', onClick: () => { toast.dismiss(config.id); options.retry?.(); } }, 'Retry')) : message;
  return kind === 'success' ? toast.success(content, config) : kind === 'error' ? toast.error(content, config) : toast(content, config);
};
export const showSuccess = (message: string, options?: Options) => notify('success', message, options);
export const showError = (message: string, options?: Options) => notify('error', message, options);
export const showWarning = (message: string, options?: Options) => notify('warning', message, options);
export const showLoading = (message: string, id: string) => toast.loading(message, { id, duration: 30_000, style: { ...baseStyle, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' } });
export const dismissToast = (id: string) => toast.dismiss(id);

// Use response metadata, not guesses based on message wording, for API validation.
export const showApiError = (failure: unknown, message: string, options?: Options) => {
  const response = axios.isAxiosError<{ error?: { code?: string } }>(failure) ? failure.response : undefined;
  const code = response?.data?.error?.code ?? '';
  const correctable = !['INVALID_CREDENTIALS', 'UNAUTHORIZED', 'FORBIDDEN'].includes(code) && (
    [400, 413, 415, 422].includes(response?.status ?? 0) ||
    (response?.status === 404 && code === 'RECOVERY_ACCOUNT_NOT_FOUND') ||
    (response?.status === 429 && ['PASSWORD_RESET_RATE_LIMITED', 'OTP_ATTEMPTS_EXCEEDED', 'REVIEW_RATE_LIMITED'].includes(code)) ||
    (response?.status === 409 && ['DUPLICATE_RECORD', 'ACCOUNT_ALREADY_EXISTS', 'INSUFFICIENT_STOCK', 'QUANTITY_LIMIT_EXCEEDED', 'REVIEW_DUPLICATE', 'WISHLIST_UPDATE_CONFLICT', 'OFFER_UNAVAILABLE', 'OFFER_CONFLICT'].includes(code)) ||
    (response?.status === 410 && /OTP|RESET_TOKEN|RECOVERY_CODE/.test(code)));
  return correctable ? showWarning(message, options) : showError(message, options);
};
export const showValidationWarning = (errors: unknown) => {
  const fields = errors && typeof errors === 'object' ? Object.values(errors) : [];
  const message = fields.flatMap(field => field && typeof field === 'object' && 'message' in field && typeof field.message === 'string' ? [field.message] : [])[0];
  return showWarning(message || 'Please complete the required fields.');
};
