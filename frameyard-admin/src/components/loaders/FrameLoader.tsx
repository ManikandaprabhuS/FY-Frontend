import { useEffect, useState, type CSSProperties } from 'react';
import './loaders.css';

/*
 * The FrameYaad loading system, built on one idea: an empty picture frame that fills with a
 * memory.
 *   FrameLoader   — main loader: a frame draws itself, then its inner area is revealed from the
 *                   bottom up like a print developing; it loops only while work is running.
 *   FrameSpinner  — inline loader for buttons and toasts: a small frame whose edge is traced.
 *   Skeleton      — content placeholders with a soft light sweep, sized like the real content
 *                   so nothing shifts when it arrives.
 * Reduced motion: every part holds still (a complete frame, a static placeholder).
 */

type FrameLoaderProps = {
  /** page: fills the screen; section: fills the space a page or panel would take. */
  variant?: 'page' | 'section';
  label?: string;
  /** Waits this long before appearing, so fast loads never flash a loader. */
  delayMs?: number;
  className?: string;
};

export function FrameLoader({ variant = 'section', label = 'Loading', delayMs = 150, className = '' }: FrameLoaderProps) {
  const [visible, setVisible] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return (
    <div className={`fy-ld fy-ld--${variant} ${className}`} role="status" aria-live="polite" aria-busy="true">
      {visible ? (
        <div className="fy-ld__inner">
          <svg className="fy-ld__frame" viewBox="0 0 64 80" aria-hidden="true">
            {/* The memory: revealed inside the mat, bottom to top. */}
            <rect className="fy-ld__photo" x="13" y="13" width="38" height="54" />
            {/* The mat's fine inner edge, then the moulding drawn around it. */}
            <rect className="fy-ld__mat" x="13" y="13" width="38" height="54" pathLength="100" />
            <rect className="fy-ld__moulding" x="3" y="3" width="58" height="74" pathLength="100" />
          </svg>
          <span className="fy-ld__label">{label}</span>
        </div>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

/** Inline loader: a small frame whose edge is traced round, sized to the text around it. */
export function FrameSpinner({ className = '', label }: { className?: string; label?: string }) {
  return (
    <span className={`fy-spin ${className}`} role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 16 20" aria-hidden="true">
        <rect className="fy-spin__track" x="1.25" y="1.25" width="13.5" height="17.5" />
        <rect className="fy-spin__trace" x="1.25" y="1.25" width="13.5" height="17.5" pathLength="100" />
      </svg>
    </span>
  );
}

/** A placeholder block; size it with className or style to match the content it stands in for. */
export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span className={`fy-skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** A product card's placeholder: the 4:5 photo on its mat, then material, name and price lines. */
export function ProductCardSkeleton() {
  return (
    <div className="fy-skel-card" aria-hidden="true">
      <Skeleton className="fy-skel-card__media" />
      <Skeleton className="fy-skel-card__line fy-skel-card__line--short" />
      <Skeleton className="fy-skel-card__line" />
      <Skeleton className="fy-skel-card__line fy-skel-card__line--price" />
    </div>
  );
}
