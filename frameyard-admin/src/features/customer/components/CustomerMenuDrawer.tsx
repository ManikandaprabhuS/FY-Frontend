import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, ChevronRight, Heart, MessageCircle, Package, X } from 'lucide-react';

import fyLogoIcon from '../../../assets/fy-logo-icon.jpeg';
import { BRAND_NAME, STUDIO_PATH } from '../navigation';
import { ButtonLink } from '../ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenWishlist: () => void;
  wishlistCount: number;
  customerName: string | null;
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
};

const exploreLinks = [
  { name: 'Home', path: '/' },
  { name: 'Shop all frames', path: '/products' },
  { name: 'Customize a frame', path: STUDIO_PATH },
];

const serviceLinks = [
  { name: 'Your orders', path: '/orders', icon: Package },
  { name: 'Book appointment', path: '/book-appointment', icon: CalendarDays },
  { name: 'Contact us', path: '/contact-us', icon: MessageCircle },
];

/** Left-side slide-out menu for secondary navigation on mobile. */
const CustomerMenuDrawer: React.FC<Props> = ({ open, onClose, onOpenWishlist, wishlistCount, customerName, returnFocusTo }) => {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = returnFocusTo.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus({ preventScroll: true });
    };
  }, [onClose, open, returnFocusTo]);

  const enter = open ? 'fy-menu-item' : '';

  const exploreClass = ({ isActive }: { isActive: boolean }) =>
    `fy-display flex min-h-14 items-center justify-between border-b border-rule text-[26px] leading-tight transition-colors ${isActive ? 'text-ink' : 'text-ink/70 hover:text-ink'}`;

  const serviceClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-12 items-center gap-3 text-[15px] transition-colors ${isActive ? 'font-semibold text-ink' : 'text-ink/75 hover:text-ink'}`;

  return (
    <div className="lg:hidden" inert={!open}>
      <div
        className={`fixed inset-0 z-[150] bg-ink/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-[160] flex w-[min(88vw,380px)] flex-col overflow-y-auto bg-white pb-[calc(24px+env(safe-area-inset-bottom,0px))] shadow-[18px_0_48px_rgba(17,17,17,0.16)] transition-transform duration-[650ms] ${open ? 'translate-x-0 ease-[var(--fy-ease-spring)]' : '-translate-x-[105%] ease-[var(--fy-ease-out)]'}`}
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between px-5">
          <span className="flex items-center gap-2.5">
            <img src={fyLogoIcon} alt="" className="h-8 w-8 rounded-full object-contain" />
            <span className="fy-display text-[20px]">{BRAND_NAME}</span>
          </span>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 grid h-11 w-11 place-items-center rounded-full transition-transform duration-300 active:scale-90"
          >
            <X className="h-[22px] w-[22px]" strokeWidth={1.6} />
          </button>
        </div>

        {/* Entrance classes are applied only while open, so the stagger replays on each open
            and the content stays visible while the panel slides out. */}
        <div className="flex flex-1 flex-col px-5">
            <p className={`${enter} mt-4 text-[15px] text-mute`} style={{ animationDelay: '60ms' }}>
              {customerName ? `Hello, ${customerName}` : 'Sign in to save frames and track orders.'}
            </p>

            <nav aria-label="Explore" className="mt-4">
              {exploreLinks.map((link, index) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === '/'}
                  onClick={onClose}
                  className={(state) => `${enter} ${exploreClass(state)}`}
                  style={{ animationDelay: `${100 + index * 45}ms` }}
                >
                  {link.name}
                  <ChevronRight className="h-5 w-5 text-mute" strokeWidth={1.5} aria-hidden="true" />
                </NavLink>
              ))}
            </nav>

            <nav aria-label="Your account and services" className={`${enter} mt-6`} style={{ animationDelay: '300ms' }}>
              <button type="button" onClick={onOpenWishlist} className="flex min-h-12 w-full items-center gap-3 text-left text-[15px] text-ink/75 transition-colors hover:text-ink">
                <Heart className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
                <span className="flex-1">Wishlist</span>
                {wishlistCount > 0 && <span className="text-[13px] text-mute">{wishlistCount} saved</span>}
              </button>
              {serviceLinks.map((link) => (
                <NavLink key={link.path} to={link.path} onClick={onClose} className={serviceClass}>
                  <link.icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
                  {link.name}
                </NavLink>
              ))}
            </nav>

            <div className={`${enter} mt-auto pt-8`} style={{ animationDelay: '360ms' }}>
              <ButtonLink to="/profile" onClick={onClose} variant={customerName ? 'secondary' : 'primary'} className="w-full">
                {customerName ? 'Your account' : 'Sign in or create account'}
              </ButtonLink>
            </div>
          </div>
      </aside>
    </div>
  );
};

export default CustomerMenuDrawer;
