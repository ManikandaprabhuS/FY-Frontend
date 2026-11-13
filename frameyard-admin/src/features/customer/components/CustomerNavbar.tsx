import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, ShoppingBag, UserRound } from 'lucide-react';

import fyLogoIcon from '../../../assets/fy-logo-mark.png';
import { useAuthStore } from '../../../store/authStore';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { showWarning } from '../../../utils/toast';
import { BRAND_NAME, primaryNavLinks } from '../navigation';
import CustomerMenuDrawer from './CustomerMenuDrawer';
import CustomerWishlistDrawer from './CustomerWishlistDrawer';
import CustomerNotificationBell from './CustomerNotificationBell';

const iconButton =
  'relative grid h-11 w-11 place-items-center rounded-full text-ink transition-[background-color,transform] duration-300 hover:bg-mat active:scale-90';

const CustomerNavbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [onVideo, setOnVideo] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const customerLoggedIn = useAuthStore((state) => state.isAuthenticated) && user?.role === 'CUSTOMER';
  const authStatus = useAuthStore(state => state.status);
  const firstName = customerLoggedIn ? user.name.split(' ')[0] || 'Account' : null;
  // While the session is being checked, show a neutral label instead of flashing "Sign in".
  const accountLabel = authStatus === 'checking' ? 'Account' : firstName ?? 'Sign in';
  const cartCount = useCustomerCommerceStore((state) => state.cartItems.reduce((total, item) => total + item.quantity, 0));
  const wishlistTotal = useCustomerCommerceStore((state) => state.wishlistTotal);
  const wishlistOwnerId = useCustomerCommerceStore((state) => state.cartOwnerId);
  const wishlistCount = customerLoggedIn && wishlistOwnerId === user.id ? wishlistTotal : 0;

  useEffect(() => {
    let frame = 0;
    const updateHeader = () => {
      frame = 0;
      setScrolled(window.scrollY > 4);
      const hero = document.querySelector<HTMLElement>('.fy-hero');
      const header = document.querySelector<HTMLElement>('.fy-customer-header');
      const headerBottom = header?.getBoundingClientRect().bottom ?? 76;
      const bounds = hero?.getBoundingClientRect();
      setOnVideo(location.pathname === '/' &&
        document.documentElement.dataset.heroTone === 'dark' &&
        Boolean(bounds && bounds.top < headerBottom && bounds.bottom > headerBottom));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(updateHeader); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Reuse the hero's active-slide signal without altering its video or carousel.
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hero-tone'] });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [location.pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Waits for an in-progress session check before deciding whether to ask the customer to log in.
  const openWishlist = useCallback(async () => {
    if (useAuthStore.getState().status === 'checking') await useAuthStore.getState().checkAuth();
    const verified = useAuthStore.getState();
    if (verified.status === 'checking') return;
    if (!verified.isAuthenticated || verified.user?.role !== 'CUSTOMER') {
      showWarning('Please login to add product to wishlist');
      navigate('/profile', { state: { returnTo: location.pathname + location.search + location.hash } });
      return;
    }
    setMenuOpen(false);
    setWishlistOpen(true);
  }, [location.hash, location.pathname, location.search, navigate]);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative py-2 text-[14px] font-medium transition-colors duration-200 ${isActive ? 'text-ink' : 'text-ink/60 hover:text-ink'}`;

  // Homepage, before scrolling: a transparent bar laid over the hero (logo, centred name,
  // three icons). Once scrolled, or on any other page, the regular white bar.
  const isHome = location.pathname === '/';
  // The shop also opens on a full-bleed hero (a dark photo), so it gets the same see-through
  // bar, with white icons and wordmark until the page scrolls.
  const isShop = location.pathname === '/products';
  const overHero = isHome || isShop;
  const overlay = overHero && !scrolled;
  const overlayTheme = onVideo ? 'on-video' : isShop ? 'on-dark' : 'default';

  if (overlay) {
    const overlayIcon = 'fy-nav-overlay__icon relative grid h-9 w-9 place-items-center rounded-full transition-[background-color,transform] duration-300 active:scale-90 sm:h-11 sm:w-11';
    return (
      <>
        {/* Sticky with a negative bottom margin: it overlays the hero, and sticks at the top once the announcement bar scrolls away. */}
        <header data-header-theme={overlayTheme} className="fy-customer-header fy-nav-overlay sticky top-0 z-[100] -mb-[60px] lg:-mb-[76px]">
          {/* Equal side columns keep the centre exactly mid-screen, whatever is on either side. */}
          <div className="mx-auto grid h-[60px] w-full max-w-[1440px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-2.5 sm:gap-3 sm:px-6 lg:h-[76px] lg:px-10">
            <div className="flex items-center justify-self-start">
              {/* Opens the same slide-in menu as on other pages. */}
              <button
                ref={menuButton}
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className={`${overlayIcon} lg:hidden`}
              >
                <Menu className="h-[22px] w-[22px]" strokeWidth={1.6} />
              </button>
              <Link to="/" aria-label={`${BRAND_NAME} home`} className="hidden items-center lg:flex">
                <img src={fyLogoIcon} alt="" className="fy-logo-mark h-[30px] w-[30px] object-contain" />
              </Link>
            </div>

            {/* Phones: logo and name together in the centre. Desktop: the name alone. */}
            <Link to="/" aria-label={`${BRAND_NAME} home`} className="flex items-center gap-1.5">
              <img src={fyLogoIcon} alt="" className="fy-logo-mark fy-nav-overlay__mark h-5 w-5 object-contain lg:hidden" />
              <span className="fy-display fy-nav-overlay__name fy-nav-wordmark leading-none">{BRAND_NAME}</span>
            </Link>

            {/* Phones get cart, wishlist and account from the bottom dock, so the bar keeps only the menu and name. */}
            <div className="hidden items-center justify-end sm:gap-1 lg:flex">
              <button type="button" onClick={openWishlist} aria-label={wishlistCount ? `Wishlist, ${wishlistCount} saved` : 'Wishlist'} className={overlayIcon}>
                <Heart className={`h-5 w-5 ${wishlistCount ? 'fill-current' : ''}`} strokeWidth={1.6} />
              </button>
              <Link to="/profile" aria-label={firstName ? 'Your account' : accountLabel} className={overlayIcon}>
                <UserRound className="h-5 w-5" strokeWidth={1.6} />
              </Link>
              <Link to="/cart" aria-label={`Bag, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`} className={overlayIcon}>
                <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
                {cartCount > 0 && (
                  <span data-header-badge className="fy-nav-overlay__badge absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold leading-none sm:right-1 sm:top-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>
        <CustomerMenuDrawer
          open={menuOpen}
          onClose={closeMenu}
          onOpenWishlist={openWishlist}
          wishlistCount={wishlistCount}
          customerName={firstName}
          returnFocusTo={menuButton}
        />
        <CustomerWishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
      </>
    );
  }

  return (
    <>
      <header
        data-header-theme={onVideo ? "on-video" : "default"}
        className={`${overHero ? 'fy-nav-solid -mb-[60px] lg:-mb-[76px]' : ''} fy-customer-header sticky top-0 z-[100] border-b bg-white/90 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ${scrolled ? 'border-rule shadow-[0_1px_14px_rgba(17,17,17,0.06)]' : 'border-transparent'}`}
      >
        <div className="mx-auto grid h-[60px] w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 sm:px-6 lg:h-[76px] lg:grid-cols-[1fr_auto_1fr] lg:px-10">
          <div className="flex items-center">
            <button
              ref={menuButton}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className={`${iconButton} lg:hidden`}
            >
              <Menu className="h-[22px] w-[22px]" strokeWidth={1.6} />
            </button>
            <Link to="/" aria-label={`${BRAND_NAME} home`} className="hidden items-center gap-3 lg:flex">
              <img src={fyLogoIcon} alt="" className="fy-logo-mark h-[30px] w-[30px] object-contain" />
              <span className="fy-display fy-nav-wordmark leading-none">{BRAND_NAME}</span>
            </Link>
          </div>

          <Link to="/" aria-label={`${BRAND_NAME} home`} className="flex items-center gap-2 lg:hidden">
            <img src={fyLogoIcon} alt="" className="fy-logo-mark h-6 w-6 object-contain" />
            <span className="fy-display fy-nav-wordmark leading-none">{BRAND_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary navigation">
            {primaryNavLinks.map((link) => (
              <NavLink key={link.path} to={link.path} end={link.path === '/'} className={desktopLinkClass}>
                {({ isActive }) => (
                  <>
                    {link.name}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-px origin-left bg-ink transition-transform duration-500 ease-[var(--fy-ease-out)] ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Desktop only (phones use the bottom dock); no search icon. The bell comes from main. */}
          <div className="hidden items-center justify-end gap-0.5 sm:gap-1 lg:flex">
            {customerLoggedIn && <CustomerNotificationBell key={user.id} />}

            <button
              type="button"
              onClick={openWishlist}
              aria-label={wishlistCount ? `Wishlist, ${wishlistCount} saved` : 'Wishlist'}
              className={`${iconButton} hidden lg:grid`}
            >
              <Heart className={`h-5 w-5 ${wishlistCount ? 'fill-ink' : ''}`} strokeWidth={1.6} />
            </button>

            <Link
              to="/profile"
              aria-label={firstName ? 'Your account' : accountLabel}
              className="hidden h-11 items-center gap-2 rounded-full px-3 text-[14px] font-medium text-ink transition-colors duration-300 hover:bg-mat lg:inline-flex"
            >
              <UserRound className="h-5 w-5" strokeWidth={1.6} />
              <span>{accountLabel}</span>
            </Link>

            <Link to="/cart" aria-label={`Bag, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`} className={iconButton}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  data-header-badge
                  className="absolute right-1 top-1 grid h-[18px] min-w-[18px] animate-[fy-badge-pop_500ms_var(--fy-ease-spring)] place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold leading-none text-white"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <CustomerMenuDrawer
        open={menuOpen}
        onClose={closeMenu}
        onOpenWishlist={openWishlist}
        wishlistCount={wishlistCount}
        customerName={firstName}
        returnFocusTo={menuButton}
      />
      <CustomerWishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </>
  );
};

export default CustomerNavbar;
