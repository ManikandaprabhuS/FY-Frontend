import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
export default function AuthPendingScreen({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(true), 150); return () => window.clearTimeout(timer); }, []);
  return <div className="flex min-h-svh w-full items-center justify-center bg-background px-5" aria-busy={!error}>
    {error ? <div className="max-w-sm space-y-4 text-center"><p role="alert" className="text-sm font-semibold text-on-surface">{error}</p><button type="button" onClick={onRetry} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary">Retry</button></div>
      : visible ? <div role="status" aria-live="polite" className="flex flex-col items-center gap-3"><LoaderCircle className="h-7 w-7 animate-spin text-on-surface motion-reduce:animate-none" aria-hidden="true" /><span className="text-sm font-medium text-secondary">Loading...</span></div> : <span className="sr-only" role="status">Loading...</span>}
  </div>;
}
