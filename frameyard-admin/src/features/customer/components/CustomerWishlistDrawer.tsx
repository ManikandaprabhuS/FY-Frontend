import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

import WishlistGallery from './WishlistGallery';
import '../styles/wishlist.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Matches the panel's slide-out in wishlist.css; the drawer unmounts after it. */
const EXIT_MS = 340;

/**
 * The wishlist opened from the navbar heart or the menu: a panel that slides in from the right
 * over the store, with the same product cards as All Frames. The close button, a click on the
 * dimmed page or Escape dismisses it; opening a product (the card navigates) closes it on the way.
 */
const CustomerWishlistDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { pathname } = useLocation();
  const openedOn = useRef(pathname);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The navbar passes a new onClose each render; the open/close setup must not re-run for that.
  const closeLatest = useRef(onClose);
  useEffect(() => { closeLatest.current = onClose; }, [onClose]);
  // Stays mounted through the slide-out, then leaves the DOM.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);

  useEffect(() => {
    if (open) {
      // One frame at the off-screen position first, so the slide-in has somewhere to start.
      let second = 0;
      const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    openedOn.current = pathname;
    // Lock the page where it is (iOS ignores overflow:hidden on body), and put it back on close
    // unless a product link took the customer to another page.
    const y = Math.max(0, window.scrollY), page = window.location.pathname;
    const body = document.body;
    const old = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `${-y}px`, width: '100%' });
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]') ?? []).filter((node) => node.getClientRects().length > 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeLatest.current(); return; }
      if (event.key !== 'Tab') return;
      // Keep keyboard focus inside the drawer while it is open.
      const nodes = focusable();
      if (!nodes.length) { event.preventDefault(); return; }
      const index = nodes.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? (event.shiftKey ? nodes.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length;
      event.preventDefault();
      nodes[next].focus();
    };
    document.addEventListener('keydown', keydown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', keydown);
      Object.assign(body.style, old);
      if (window.location.pathname === page) window.scrollTo(0, y);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
    // The route is only recorded when the drawer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A card took the customer to a product page: get out of the way.
  useEffect(() => {
    if (open && pathname !== openedOn.current) onClose();
  }, [open, pathname, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fy-store fy-store-portal fy-wishdrawer" data-open={shown || undefined}>
      <button type="button" className="fy-wishdrawer__backdrop" aria-label="Close wishlist" tabIndex={-1} onClick={onClose} />
      <aside
        ref={panelRef}
        className="fy-wishdrawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-wishlist-title"
        inert={!open || undefined}
      >
        <header className="fy-wishdrawer__head">
          <h2 id="customer-wishlist-title" className="fy-wishdrawer__title">Wishlist</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close wishlist" className="fy-wishdrawer__close"><X strokeWidth={1.8} aria-hidden="true" /></button>
        </header>
        <div className="fy-wishdrawer__body">
          <WishlistGallery onBrowse={onClose} />
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default CustomerWishlistDrawer;
