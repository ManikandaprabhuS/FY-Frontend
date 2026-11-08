import type { ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';
import { showWarning } from '../../utils/toast';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { issue?: string | null; busy?: boolean; focusSelector?: string };
export default function FormAction({ issue, busy = false, focusSelector, className = '', onClick, children, ...props }: Props) {
  return <button {...props} type={props.type ?? 'button'} disabled={busy} aria-disabled={busy || Boolean(issue)} aria-busy={busy}
    className={`${className} ${busy || issue ? 'cursor-not-allowed opacity-50' : ''}`}
    onClick={event => {
      if (busy) return;
      if (issue) {
        event.preventDefault();
        showWarning(issue);
        const scope = event.currentTarget.closest('[role="dialog"]') ?? event.currentTarget.closest('main') ?? document;
        const target = focusSelector ? scope.querySelector<HTMLElement>(focusSelector) : null;
        if (target) { target.focus(); return; }
        const inputs = Array.from(scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input:not([type="hidden"]):not([type="file"]):not([type="radio"]):not([type="checkbox"]), textarea, select'));
        const invalid = inputs.find(input => !input.disabled && (!input.value.trim() || !input.checkValidity()));
        (invalid ?? inputs.find(input => !input.disabled))?.focus();
        return;
      }
      onClick?.(event);
    }}>{children}</button>;
}

export function FormStatus({ busy, images = false }: { busy: boolean; images?: boolean }) {
  return busy ? <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs font-bold text-on-surface-variant"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{images ? 'Please wait, your images are being uploaded...' : 'Please wait, your details are being saved...'}</p> : null;
}
