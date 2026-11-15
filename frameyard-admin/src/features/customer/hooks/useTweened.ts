import { useEffect, useRef, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts a number towards its new value (ease-out cubic). A timer lands it on the exact value
 * even if animation frames pause (a background tab); reduced motion jumps straight there.
 */
export function useTweened(value: number, duration = 420) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    const ms = reducedMotion() ? 0 : duration;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * (1 - Math.pow(1 - t, 3));
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    if (ms) frame = requestAnimationFrame(step);
    const settle = window.setTimeout(() => { current.current = value; setShown(value); }, ms ? ms + 60 : 0);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(settle); };
  }, [value, duration]);
  return shown;
}
