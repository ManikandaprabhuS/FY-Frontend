import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import toast, { resolveValue, type Toast } from 'react-hot-toast';

import { FrameSpinner } from '../loaders/FrameLoader';
import './toast.css';

export type ToastKind = 'success' | 'info' | 'warning' | 'error' | 'loading';

const icons = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: AlertCircle } as const;

/** Used when a message is a single sentence, so every toast still has a title and a description. */
const kindTitles: Record<Exclude<ToastKind, 'loading'>, string> = {
  success: 'All set',
  info: 'Good to know',
  warning: 'Needs your attention',
  error: 'Something went wrong',
};

const kindOf = (t: Toast): ToastKind => {
  const named = /fy-toast--(success|info|warning|error)/.exec(t.className ?? '')?.[1] as ToastKind | undefined;
  if (named) return named;
  if (t.type === 'success' || t.type === 'error' || t.type === 'loading') return t.type;
  return 'info';
};

/**
 * The words inside a toast. "Offers could not be loaded. Please try again." becomes a bold
 * title ("Offers could not be loaded") over a smaller description ("Please try again.").
 */
export function ToastText({ kind, message, retry, onRetry }: { kind: ToastKind; message: string; retry?: boolean; onRetry?: () => void }) {
  const text = message.trim().replace(/\s+/g, ' ');
  const split = /^(.+?)[.!]\s+(\S.*)$/.exec(text);
  const title = kind === 'loading' ? text : split ? split[1] : kindTitles[kind];
  const description = kind === 'loading' ? '' : split ? split[2] : text;
  return (
    <>
      <span className="fy-toast__title">{title}</span>
      {(description || retry) && (
        <span className="fy-toast__description">
          {description}
          {retry && (
            <button type="button" className="fy-toast__retry" onClick={onRetry}>
              Retry
            </button>
          )}
        </span>
      )}
    </>
  );
}

/**
 * One notification card, rendered by the app's single <Toaster>. react-hot-toast keeps the
 * queue, stacking, auto-dismiss and pause-on-hover; this card draws the look and the motion.
 */
export function ToastCard({ t }: { t: Toast }) {
  const kind = kindOf(t);
  const Icon = kind === 'loading' ? null : icons[kind];
  const content = resolveValue(t.message, t);
  const urgent = kind === 'error';
  return (
    <div
      className={`fy-toast fy-toast--${kind}`}
      data-visible={t.visible}
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="fy-toast__icon" aria-hidden="true">
        {Icon ? <Icon size={20} strokeWidth={2} /> : <FrameSpinner className="fy-toast-spin" />}
      </span>
      <span className="fy-toast__body">
        {typeof content === 'string' ? <ToastText kind={kind} message={content} /> : content}
      </span>
      {kind !== 'loading' && (
        <button type="button" className="fy-toast__close" aria-label="Dismiss notification" onClick={() => toast.dismiss(t.id)}>
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
