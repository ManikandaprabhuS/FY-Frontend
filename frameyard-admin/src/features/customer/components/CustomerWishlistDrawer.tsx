import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

import WishlistGallery from './WishlistGallery';
import '../styles/wishlist.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * The wishlist opened from the navbar heart: a full-screen gallery over the store with the
 * same product cards as All Frames. Escape or the close button dismisses it; opening a
 * product (the card navigates) closes it on the way.
 */
const CustomerWishlistDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { pathname } = useLocation();
  const openedOn = useRef(pathname);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    openedOn.current = pathname;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
      previousFocus?.focus?.();
    };
    // The route is only recorded when the view opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, open]);

  // A card took the customer to a product page: get out of the way.
  useEffect(() => {
    if (open && pathname !== openedOn.current) onClose();
  }, [open, pathname, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fy-store fy-store-portal fy-wishview" role="dialog" aria-modal="true" aria-labelledby="customer-wishlist-title">
      <header className="fy-wishview__head">
        <div>
          <h2 id="customer-wishlist-title" className="fy-wishview__title">Your wishlist</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close wishlist" className="fy-wishview__close"><X strokeWidth={1.8} /></button>
        </div>
      </header>
      <div className="fy-wishview__body">
        <div><WishlistGallery onBrowse={onClose} /></div>
      </div>
    </div>,
    document.body,
  );
};

export default CustomerWishlistDrawer;
