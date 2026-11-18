import { createElement } from 'react';
import toast, { type DefaultToastOptions, type ToastOptions } from 'react-hot-toast';
import axios from 'axios';
import { ToastText } from '../components/ui/ToastCard';

// The look, icons and motion live in components/ui/ToastCard.tsx, which the app's one <Toaster> renders.
type Kind = 'success' | 'info' | 'warning' | 'error';
type Options = Pick<ToastOptions, 'id'> & { retry?: () => void };
const durations: Record<Kind, number> = { success: 3500, info: 4000, warning: 4500, error: 4500 };
export const toastOptions: DefaultToastOptions = { duration: 3500 };

const notify = (kind: Kind, message: string, options?: Options) => {
  const config: ToastOptions = {
    id: options?.id ?? `frameyaad:${kind}:${message.trim().replace(/\s+/g, ' ')}`,
    duration: durations[kind],
    className: `fy-toast--${kind}`,
  };
  const content = createElement(ToastText, {
    kind,
    message,
    retry: Boolean(options?.retry),
    onRetry: () => { toast.dismiss(config.id); options?.retry?.(); },
  });
  return kind === 'success' ? toast.success(content, config) : kind === 'error' ? toast.error(content, config) : toast(content, config);
};
export const showSuccess = (message: string, options?: Options) => notify('success', message, options);
export const showInfo = (message: string, options?: Options) => notify('info', message, options);
export const showError = (message: string, options?: Options) => notify('error', message, options);
export const showWarning = (message: string, options?: Options) => notify('warning', message, options);
// Loading shows the FrameYaad frame spinner on a neutral card until it is replaced or dismissed.
export const showLoading = (message: string, id: string) => toast.loading(message, { id, duration: 30_000 });
export const dismissToast = (id: string) => toast.dismiss(id);

// Use response metadata, not guesses based on message wording, for API validation.
export const showApiError = (failure: unknown, message: string, options?: Options) => {
  const response = axios.isAxiosError<{ error?: { code?: string } }>(failure) ? failure.response : undefined;
  const code = response?.data?.error?.code ?? '';
  const correctable = !['INVALID_CREDENTIALS', 'UNAUTHORIZED', 'FORBIDDEN'].includes(code) && (
    [400, 413, 415, 422].includes(response?.status ?? 0) ||
    (response?.status === 404 && code === 'RECOVERY_ACCOUNT_NOT_FOUND') ||
    (response?.status === 429 && ['PASSWORD_RESET_RATE_LIMITED', 'OTP_ATTEMPTS_EXCEEDED', 'REVIEW_RATE_LIMITED'].includes(code)) ||
    (response?.status === 409 && ['DUPLICATE_RECORD', 'ACCOUNT_ALREADY_EXISTS', 'INSUFFICIENT_STOCK', 'QUANTITY_LIMIT_EXCEEDED', 'REVIEW_DUPLICATE', 'WISHLIST_UPDATE_CONFLICT', 'OFFER_UNAVAILABLE', 'OFFER_CONFLICT', 'ORDER_STATUS_CONFLICT', 'REFUND_CONFLICT'].includes(code)) ||
    (response?.status === 410 && /OTP|RESET_TOKEN|RECOVERY_CODE/.test(code)));
  return correctable ? showWarning(message, options) : showError(message, options);
};
export const showValidationWarning = (errors: unknown) => {
  const fields = errors && typeof errors === 'object' ? Object.values(errors) : [];
  const message = fields.flatMap(field => field && typeof field === 'object' && 'message' in field && typeof field.message === 'string' ? [field.message] : [])[0];
  return showWarning(message || 'Please complete the required fields.');
};
