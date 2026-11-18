import { FrameLoader } from '../loaders/FrameLoader';

/** Shown while the session is checked or a route's code loads: the FrameYaad frame loader. */
export default function AuthPendingScreen({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  if (error) return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background px-5">
      <div className="max-w-sm space-y-4 text-center"><p role="alert" className="text-sm font-semibold text-on-surface">{error}</p><button type="button" onClick={onRetry} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary">Retry</button></div>
    </div>
  );
  return <FrameLoader variant="page" />;
}
