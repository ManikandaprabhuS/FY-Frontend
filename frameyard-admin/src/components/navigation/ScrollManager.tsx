import { useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';

/**
 * One place for window scroll on navigation, for every route (storefront and admin):
 *
 * - A link or redirect to a different page (push/replace with a new pathname) opens at the top.
 * - Back/forward returns to where that history entry was left, retrying for a moment while a
 *   lazily loaded page grows tall enough, and giving up as soon as the user scrolls themselves.
 * - A refresh returns to where the page was (positions live in sessionStorage, keyed by the
 *   history entry); a direct load with no saved position stays at the top.
 * - Same-page changes are left alone: query changes (product tabs, the selected order) and
 *   hash changes (#reviews, #get-in-touch, account sections), which those pages scroll to
 *   themselves after render.
 *
 * The reset runs in a layout effect, so it lands before paint and before any page's own
 * effects (hash scrolling), which therefore still win.
 */
const STORE_KEY = 'fy-scroll-positions';
const MAX_ENTRIES = 60;
const RESTORE_MS = 2500;

const readStore = (): [string, number][] => {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((row): row is [string, number] => Array.isArray(row) && typeof row[0] === 'string' && typeof row[1] === 'number') : [];
  } catch { return []; }
};
const positions = new Map<string, number>(typeof window === 'undefined' ? [] : readStore());
const remember = (key: string, y: number) => {
  positions.delete(key);
  positions.set(key, y);
  if (positions.size > MAX_ENTRIES) positions.delete(positions.keys().next().value as string);
};
const persist = () => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify([...positions])); } catch { /* Private mode or full storage: positions still work in memory. */ } };
const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef(location.key);
  const pathRef = useRef<string | null>(null);

  // The app restores positions itself; the browser's own attempt fires before lazy pages render.
  useLayoutEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  // Remember where each history entry is scrolled to, and write it to storage on leave. Saved
  // straight from the scroll event (a number in a Map), not in a frame callback: background
  // tabs pause frames, which would lose the position.
  useEffect(() => {
    const save = () => remember(keyRef.current, window.scrollY);
    const flush = () => { save(); persist(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('scroll', save);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useLayoutEffect(() => {
    const previousPath = pathRef.current;
    pathRef.current = location.pathname;
    keyRef.current = location.key;
    const pageChanged = previousPath !== null && previousPath !== location.pathname;

    if (navigationType !== 'POP') {
      if (pageChanged) toTop();
      return;
    }

    // Back/forward, or the first load (a refresh keeps its history key).
    const saved = positions.get(location.key);
    if (saved === undefined || saved <= 0) {
      if (pageChanged) toTop();
      return;
    }
    let frame = 0;
    const deadline = performance.now() + RESTORE_MS;
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
    const attempt = () => {
      const reachable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(saved, reachable), left: 0, behavior: 'instant' as ScrollBehavior });
      if (reachable >= saved - 1 || performance.now() > deadline) { stop(); return; }
      frame = requestAnimationFrame(attempt);
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    attempt();
    return stop;
  }, [location.key, location.pathname, navigationType]);

  return null;
}

/** The root route's element: the scroll manager, then whichever page is matched. */
export default function RouteRoot() {
  return <><ScrollManager /><Outlet /></>;
}
