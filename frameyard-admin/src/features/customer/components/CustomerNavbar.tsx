import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, UserRound } from 'lucide-react';

import fyLogoIcon from '../../../assets/fy-logo-icon.jpeg';
import { useAuthStore } from '../../../store/authStore';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { showWarning } from '../../../utils/toast';
import { BRAND_NAME, primaryNavLinks } from '../navigation';
import CustomerMenuDrawer from './CustomerMenuDrawer';
import CustomerWishlistDrawer from './CustomerWishlistDrawer';

const iconButton =
  'relative grid h-11 w-11 place-items-center rounded-full text-ink transition-[background-color,transform] duration-300 hover:bg-mat active:scale-90';

const CustomerNavbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  return (
    <>
      <header
        className={`sticky top-0 z-[100] border-b bg-white/90 backdrop-blur-xl transition-[border-color] duration-300 ${scrolled ? 'border-rule' : 'border-transparent'}`}
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
              <img src={fyLogoIcon} alt="" className="h-9 w-9 rounded-full object-contain" />
              <span className="fy-display text-[24px] leading-none">{BRAND_NAME}</span>
            </Link>
          </div>

          <Link to="/" aria-label={`${BRAND_NAME} home`} className="flex items-center gap-2 lg:hidden">
            <img src={fyLogoIcon} alt="" className="h-7 w-7 rounded-full object-contain" />
            <span className="fy-display text-[21px] leading-none">{BRAND_NAME}</span>
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

          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <Link to="/products" aria-label="Search frames" className={iconButton}>
              <Search className="h-5 w-5" strokeWidth={1.6} />
            </Link>

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
