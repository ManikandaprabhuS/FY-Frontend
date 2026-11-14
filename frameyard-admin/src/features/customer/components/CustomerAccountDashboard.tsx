import React, { useEffect, useRef, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  KeyRound,
  LayoutGrid,
  LogOut,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Trash2,
  UserRound,
} from 'lucide-react';

import ProductRating from '../../../components/reviews/ProductRating';
import StatusBadge from '../../../components/ui/StatusBadge';
import { normalizeOrderStatus } from '../../../components/ui/order-status';
import femaleCustomerAvatar from '../../../assets/customer-avatar-female.svg';
import maleCustomerAvatar from '../../../assets/customer-avatar-male.svg';
import { cachedCustomerOrders, customerOrdersPage, type CustomerOrderSummary } from '../../../services/customer-orders.service';
import type { CustomerWishlistItem } from '../../../services/customer-wishlist.service';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import type { User } from '../../../types';
import { normalizeStock } from '../../../utils/stock';
import { showError, showSuccess, showWarning } from '../../../utils/toast';
import { getLowestVariantPricing, getVariantPricing } from '../utils/product-pricing';
import CustomerOrderSummaries from './CustomerOrderSummaries';
import '../styles/account.css';

type ProfileValues = {
  name: string;
  email: string;
  phoneNumber: string;
  addressLine: string;
  cityName: string;
  stateName: string;
  countryName: string;
  postalCode: string;
};

type PasswordValues = { currentPassword: string; newPassword: string; confirmPassword: string };

type Props = {
  user: User;
  loading: boolean;
  error: string | null;
  onUpdate: (values: ProfileValues) => Promise<boolean>;
  onLogout: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
};

type View = 'overview' | 'orders' | 'wishlist' | 'details' | 'address' | 'password';

const views: Record<View, string> = {
  overview: 'Overview',
  orders: 'Your orders',
  wishlist: 'Wishlist',
  details: 'Personal details',
  address: 'Delivery address',
  password: 'Password',
};

/** The section a link opens, from the URL hash; earlier hashes still land in the right place. */
const legacyViews: Record<string, View> = {
  'orders-history': 'orders',
  'profile-information': 'details',
  addresses: 'address',
  'change-password': 'password',
};
const viewFromHash = (hash: string): View => {
  const key = hash.replace(/^#/, '');
  if (key in views) return key as View;
  return legacyViews[key] ?? 'overview';
};

const profileValues = (user: User): ProfileValues => ({
  name: user.name || '',
  email: user.email || '',
  phoneNumber: user.phoneNumber || '',
  addressLine: user.addressLine || '',
  cityName: user.cityName || '',
  stateName: user.stateName || '',
  countryName: user.countryName || '',
  postalCode: user.postalCode || '',
});

/**
 * The customer's account: a hub (greeting with live counts, quick access, account and
 * support rows, log out) and one section at a time. On phones and tablets the hub is the
 * page and each row opens its section as a screen with a back arrow; from 1024px the hub
 * stays as a left column and the section opens beside it. Sections follow the URL hash,
 * so the browser's back button and shared links work.
 */
const CustomerAccountDashboard: React.FC<Props> = ({ user, loading, error, onUpdate, onLogout, onChangePassword }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const view = viewFromHash(location.hash);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstView = useRef(true);

  const wishlistItems = useCustomerCommerceStore((state) => state.wishlistItems);
  const wishlistLoading = useCustomerCommerceStore((state) => state.wishlistLoading);
  const loadWishlist = useCustomerCommerceStore((state) => state.loadWishlist);
  const toggleWishlist = useCustomerCommerceStore((state) => state.toggleWishlist);
  const addCartItem = useCustomerCommerceStore((state) => state.addCartItem);

  const [orders, setOrders] = useState(() => cachedCustomerOrders(user.id));
  const [ordersFailed, setOrdersFailed] = useState(false);
  const [ordersRetry, setOrdersRetry] = useState(0);

  useEffect(() => { void loadWishlist(user.id); }, [loadWishlist, user.id]);

  useEffect(() => {
    let active = true;
    void customerOrdersPage(user.id, 1, ordersRetry > 0)
      .then((page) => { if (active) { setOrders(page); setOrdersFailed(false); } })
      .catch(() => { if (active) setOrdersFailed(true); });
    return () => { active = false; };
  }, [user.id, ordersRetry]);
  const retryOrders = () => { setOrdersFailed(false); setOrdersRetry((count) => count + 1); };

  // A newly opened section starts at its top, with focus on its heading.
  useEffect(() => {
    if (firstView.current) { firstView.current = false; return; }
    const heading = headingRef.current;
    if (!heading) return;
    if (heading.getBoundingClientRect().top < 0 || window.matchMedia('(max-width: 1023.98px)').matches) window.scrollTo({ top: 0 });
    heading.focus({ preventScroll: true });
  }, [view]);

  const open = (next: View) => ({ pathname: location.pathname, hash: next === 'overview' ? '' : `#${next}` });
  const goBack = () => navigate(open('overview'));

  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '';
  const avatar = user.gender === 'FEMALE' ? femaleCustomerAvatar : user.gender === 'MALE' ? maleCustomerAvatar : null;
  const orderCount = orders?.pagination.total;
  const addressParts = [user.addressLine, user.cityName, user.stateName, user.postalCode, user.countryName].filter((part) => part && part.trim());

  const removeWishlistItem = async (productIdentifier: string) => {
    try {
      const removed = await toggleWishlist(productIdentifier);
      if (removed === null) return;
      showSuccess('Product removed from wishlist');
    } catch {
      showError('Wishlist could not be updated. Please try again.');
    }
  };

  const moveWishlistItemToCart = async (item: CustomerWishlistItem) => {
    const variant = item.product.variants?.find((entry) => entry.isActive !== false && Number(entry.stockQuantity ?? 0) > 0);
    if (!variant) {
      showWarning('This product is currently out of stock.');
      return;
    }
    const inCart = useCustomerCommerceStore.getState().cartItems.filter((entry) => entry.productId === item.product.id && entry.variantId === variant.id).reduce((sum, entry) => sum + entry.quantity, 0);
    const available = normalizeStock(variant.stockQuantity);
    if (inCart >= available) { showWarning('Requested quantity exceeds available stock (' + available + ')', { id: 'cart-stock' }); return; }
    try {
      const removed = await toggleWishlist(item.productIdentifier);
      if (removed === null) return;
      addCartItem({
        productId: item.product.id,
        productIdentifier: item.productIdentifier,
        variantId: variant.id,
        name: item.product.productName,
        imageUrl: item.product.images?.find((image) => image.isPrimary)?.imageUrl ?? item.product.images?.[0]?.imageUrl,
        material: item.product.material?.material || 'Frame',
        frameSize: variant.frameSize,
        color: variant.color,
        mountType: variant.mountType || 'NONE',
        glassType: variant.glassType || 'NONE',
        unitPrice: getVariantPricing(variant).currentPrice,
        quantity: 1,
        stockQuantity: Number(variant.stockQuantity ?? 0),
      });
      showSuccess('Product moved to cart');
    } catch {
      showError('Product could not be moved to cart. Please try again.');
    }
  };

  const saveProfile = async (changes: Partial<ProfileValues>) => onUpdate({ ...profileValues(user), ...changes });

  const row = (target: View, icon: React.ReactNode, label: string, hint: string, desktopOnly = false) => (
    <li className={desktopOnly ? 'fy-acct__desk-only' : undefined}>
      <Link to={open(target)} className="fy-acct__row" aria-current={view === target ? 'page' : undefined}>
        <span className="fy-acct__icon" aria-hidden="true">{icon}</span>
        <span className="fy-acct__row-text"><strong>{label}</strong><small>{hint}</small></span>
        <ChevronRight className="fy-acct__chev" aria-hidden="true" />
      </Link>
    </li>
  );

  return (
    <section className="fy-acct" data-view={view}>
      <div className="fy-acct__wrap">
        {/* The hub: always on wide screens; the page itself on phones and tablets. */}
        <div className="fy-acct__hub">
          <h1 className="fy-acct__title">Profile</h1>

          <div className="fy-acct__hello">
            <div className="fy-acct__who">
              {avatar
                ? <img src={avatar} alt="" className="fy-acct__avatar" />
                : <span className="fy-acct__avatar fy-acct__avatar--initial" aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span>}
              <div className="fy-acct__who-text">
                <p className="fy-acct__hi">Hi, {firstName}</p>
                {memberSince && <p className="fy-acct__since">Member since {memberSince}</p>}
                <Link to={open('details')} className="fy-acct__edit">Edit profile</Link>
              </div>
            </div>
            <div className="fy-acct__stats">
              <Link to={open('orders')} className="fy-acct__stat">
                <span className="fy-acct__icon" aria-hidden="true"><ShoppingBag /></span>
                <span><strong>{orderCount ?? '–'}</strong><small>{orderCount === 1 ? 'Order' : 'Orders'}</small></span>
              </Link>
              <Link to={open('wishlist')} className="fy-acct__stat">
                <span className="fy-acct__icon" aria-hidden="true"><Heart /></span>
                <span><strong>{wishlistLoading && wishlistItems.length === 0 ? '–' : wishlistItems.length}</strong><small>Saved</small></span>
              </Link>
            </div>
          </div>

          <h2 className="fy-acct__group-title fy-acct__mobile-only">Quick access</h2>
          <div className="fy-acct__quick fy-acct__mobile-only">
            <Link to={open('orders')} className="fy-acct__card">
              <span className="fy-acct__icon" aria-hidden="true"><ShoppingBag /></span>
              <strong>My orders</strong><small>Track your recent orders</small>
              <ArrowRight className="fy-acct__card-arrow" aria-hidden="true" />
            </Link>
            <Link to={open('wishlist')} className="fy-acct__card">
              <span className="fy-acct__icon" aria-hidden="true"><Heart /></span>
              <strong>Wishlist</strong><small>Your saved frames</small>
              <ArrowRight className="fy-acct__card-arrow" aria-hidden="true" />
            </Link>
          </div>

          <nav aria-label="Your account">
            <h2 className="fy-acct__group-title">Account</h2>
            <ul className="fy-acct__group">
              {row('overview', <LayoutGrid />, 'Overview', 'Orders, wishlist and address', true)}
              {row('orders', <ShoppingBag />, 'Orders', 'Track your recent orders', true)}
              {row('wishlist', <Heart />, 'Wishlist', 'Your saved frames', true)}
              {row('details', <UserRound />, 'Personal details', 'Name, phone and email')}
              {row('address', <MapPin />, 'Delivery address', addressParts.length ? addressParts.slice(0, 2).join(', ') : 'Add where frames are sent')}
              {row('password', <KeyRound />, 'Password', 'Change your password')}
              <li>
                <Link to="/notifications" className="fy-acct__row">
                  <span className="fy-acct__icon" aria-hidden="true"><Bell /></span>
                  <span className="fy-acct__row-text"><strong>Notifications</strong><small>Updates on your orders</small></span>
                  <ChevronRight className="fy-acct__chev" aria-hidden="true" />
                </Link>
              </li>
            </ul>

            <h2 className="fy-acct__group-title">Support</h2>
            <ul className="fy-acct__group">
              <li>
                <Link to="/contact-us" className="fy-acct__row">
                  <span className="fy-acct__icon" aria-hidden="true"><MessageCircle /></span>
                  <span className="fy-acct__row-text"><strong>Help and contact</strong><small>Talk to the FrameYaad team</small></span>
                  <ChevronRight className="fy-acct__chev" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/book-appointment" className="fy-acct__row">
                  <span className="fy-acct__icon" aria-hidden="true"><CalendarDays /></span>
                  <span className="fy-acct__row-text"><strong>Book an appointment</strong><small>Plan a framing consultation</small></span>
                  <ChevronRight className="fy-acct__chev" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </nav>

          <button type="button" onClick={() => void onLogout()} disabled={loading} className="fy-acct__logout">
            <LogOut aria-hidden="true" /> Log out
          </button>
        </div>

        {/* The open section. */}
        <div className="fy-acct__panel">
          <div className="fy-acct__panel-head">
            <button type="button" onClick={goBack} className="fy-acct__back" aria-label="Back to profile">
              <ChevronLeft aria-hidden="true" />
            </button>
            <h2 ref={headingRef} tabIndex={-1} className="fy-acct__panel-title">{views[view]}</h2>
          </div>

          {view === 'overview' && (
            <Overview
              user={user}
              orders={orders?.orders}
              ordersFailed={ordersFailed}
              onRetryOrders={retryOrders}
              wishlistItems={wishlistItems}
              wishlistLoading={wishlistLoading}
              addressParts={addressParts}
              linkTo={open}
            />
          )}

          {view === 'orders' && (
            <div className="fy-acct__stack">
              <CustomerOrderSummaries key={user.id} userId={user.id} />
              <Link to="/orders" className="fy-acct__link">Open the orders page</Link>
            </div>
          )}

          {view === 'wishlist' && (
            wishlistLoading && wishlistItems.length === 0 ? (
              <div className="fy-acct__wish-grid">{Array.from({ length: 3 }, (_, index) => <div key={index} className="fy-acct__skeleton" />)}</div>
            ) : wishlistItems.length === 0 ? (
              <div className="fy-acct__empty">
                <Heart aria-hidden="true" />
                <p><strong>Your wishlist is empty</strong>Save frames you love and they will appear here.</p>
                <Link to="/products" className="fy-acct__primary">Explore frames</Link>
              </div>
            ) : (
              <div className="fy-acct__wish-grid">
                {wishlistItems.map((item) => {
                  const image = item.product.images?.find((entry) => entry.isPrimary)?.imageUrl ?? item.product.images?.[0]?.imageUrl;
                  const activeVariants = item.product.variants?.filter((variant) => variant.isActive !== false) ?? [];
                  const price = getLowestVariantPricing(activeVariants).currentPrice;
                  const canMoveToCart = activeVariants.some((variant) => Number(variant.stockQuantity ?? 0) > 0);
                  return (
                    <article key={item.id} className="fy-acct__wish">
                      <Link to={`/product/${item.product.id}`} className="fy-acct__wish-image">
                        {image ? <img src={image} alt={item.product.productName} loading="lazy" /> : <span>Image unavailable</span>}
                      </Link>
                      <div className="fy-acct__wish-body">
                        <div className="fy-acct__wish-top">
                          <div className="min-w-0">
                            <Link to={`/product/${item.product.id}`} className="fy-acct__wish-name">{item.product.productName}</Link>
                            <p className="fy-acct__wish-meta">{item.product.material?.material || 'Frame'}{activeVariants[0]?.frameSize ? ` · ${activeVariants[0].frameSize}` : ''}</p>
                          </div>
                          <button type="button" onClick={() => void removeWishlistItem(item.productIdentifier)} aria-label={`Remove ${item.product.productName} from wishlist`} className="fy-acct__icon-btn"><Trash2 aria-hidden="true" /></button>
                        </div>
                        <ProductRating productId={item.product.id} />
                        <div className="fy-acct__wish-foot">
                          {price > 0 ? <p className="fy-acct__price">₹{price.toLocaleString('en-IN')}</p> : <span />}
                          <button type="button" disabled={!canMoveToCart} onClick={() => void moveWishlistItemToCart(item)} className="fy-acct__primary fy-acct__primary--small">
                            <ShoppingBag aria-hidden="true" />{canMoveToCart ? 'Move to cart' : 'Out of stock'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          )}

          {view === 'details' && <DetailsForm user={user} loading={loading} onSave={saveProfile} />}
          {view === 'address' && <AddressForm user={user} loading={loading} onSave={saveProfile} />}
          {view === 'password' && <PasswordForm loading={loading} error={error} onChangePassword={onChangePassword} />}
        </div>
      </div>
    </section>
  );
};

const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const orderDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const itemCount = (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`;

/** The order's journey in four plain steps; every in-between status counts as "Preparing". */
const journey: readonly string[] = ['Placed', 'Preparing', 'Shipped', 'Delivered'];
const journeyStep = (status: string) => {
  const value = normalizeOrderStatus(status);
  if (value === 'PLACED') return 0;
  if (['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'].includes(value)) return 1;
  if (value === 'SHIPPED') return 2;
  if (value === 'DELIVERED') return 3;
  return -1;
};

type OverviewProps = {
  user: User;
  orders?: CustomerOrderSummary[];
  ordersFailed: boolean;
  onRetryOrders: () => void;
  wishlistItems: CustomerWishlistItem[];
  wishlistLoading: boolean;
  addressParts: Array<string | null | undefined>;
  linkTo: (view: View) => { pathname: string; hash: string };
};

/**
 * The wide-screen overview: where the latest order is (a feature card with its journey),
 * earlier orders as compact rows, saved frames with their prices, and the address and
 * contact details checkout uses. Every value comes from the account's own data; empty and
 * failed states say what to do next.
 */
const Overview: React.FC<OverviewProps> = ({ user, orders, ordersFailed, onRetryOrders, wishlistItems, wishlistLoading, addressParts, linkTo }) => {
  const [latest, ...earlier] = orders ?? [];
  return (
    <div className="fy-ov">
      {/* Latest order */}
      <section className="fy-ov__section" aria-labelledby="fy-ov-latest">
        <div className="fy-acct__sub-head">
          <h3 id="fy-ov-latest">Latest order</h3>
          {latest && <Link to={linkTo('orders')} className="fy-acct__link">All orders</Link>}
        </div>
        {ordersFailed ? (
          <div className="fy-ov__notice" role="status">
            <p><strong>Your orders couldn't load.</strong> Check your connection and try again.</p>
            <button type="button" onClick={onRetryOrders} className="fy-acct__primary fy-acct__primary--small">Retry</button>
          </div>
        ) : !orders ? (
          <div className="fy-acct__skeleton fy-ov__skeleton" aria-label="Loading your latest order" />
        ) : !latest ? (
          <div className="fy-ov__invite">
            <p className="fy-ov__invite-title">Your first frame starts here</p>
            <p className="fy-ov__invite-text">Pick a frame for a photo you love, or design one around it in the studio.</p>
            <div className="fy-ov__invite-actions">
              <Link to="/products" className="fy-acct__primary">Shop frames</Link>
              <Link to="/studio" className="fy-acct__link">Design your own</Link>
            </div>
          </div>
        ) : (
          <LatestOrder order={latest} />
        )}
      </section>

      {/* Earlier orders */}
      {earlier.length > 0 && (
        <section className="fy-ov__section" aria-labelledby="fy-ov-earlier">
          <div className="fy-acct__sub-head"><h3 id="fy-ov-earlier">Earlier orders</h3></div>
          <ul className="fy-ov__rows">
            {earlier.slice(0, 3).map((order) => (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="fy-ov__row">
                  <span className="fy-ov__row-image">{order.items[0]?.imageUrl ? <img src={order.items[0].imageUrl} alt="" loading="lazy" /> : <ShoppingBag aria-hidden="true" />}</span>
                  <span className="fy-ov__row-main"><strong>#{order.orderNumber}</strong><small>{orderDate(order.createdAt)} · {itemCount(order.itemCount)}</small></span>
                  <span className="fy-ov__row-total">{rupees(order.total)}</span>
                  <StatusBadge status={order.status} />
                  <ChevronRight className="fy-acct__chev" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Saved frames */}
      <section className="fy-ov__section" aria-labelledby="fy-ov-saved">
        <div className="fy-acct__sub-head">
          <h3 id="fy-ov-saved">Saved frames{wishlistItems.length > 0 && <span className="fy-ov__count">{wishlistItems.length}</span>}</h3>
          {wishlistItems.length > 0 && <Link to={linkTo('wishlist')} className="fy-acct__link">View all</Link>}
        </div>
        {wishlistItems.length === 0 ? (
          wishlistLoading
            ? <div className="fy-ov__saved">{Array.from({ length: 4 }, (_, index) => <div key={index} className="fy-acct__skeleton fy-ov__saved-skeleton" />)}</div>
            : <p className="fy-ov__quiet">Tap the heart on any frame to keep it here. <Link to="/products" className="fy-acct__link">Explore frames</Link></p>
        ) : (
          <div className="fy-ov__saved">
            {wishlistItems.slice(0, 4).map((item) => {
              const image = item.product.images?.find((entry) => entry.isPrimary)?.imageUrl ?? item.product.images?.[0]?.imageUrl;
              const price = getLowestVariantPricing(item.product.variants?.filter((variant) => variant.isActive !== false) ?? []).currentPrice;
              return (
                <Link key={item.id} to={`/product/${item.product.id}`} className="fy-ov__frame">
                  <span className="fy-ov__frame-image">{image ? <img src={image} alt="" loading="lazy" /> : null}</span>
                  <span className="fy-ov__frame-name">{item.product.productName}</span>
                  {price > 0 && <span className="fy-ov__frame-price">from {rupees(price)}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Delivery and contact */}
      <div className="fy-ov__pair">
        <section className="fy-ov__card" aria-labelledby="fy-ov-address">
          <div className="fy-ov__card-head">
            <span className="fy-acct__icon" aria-hidden="true"><MapPin /></span>
            <h3 id="fy-ov-address">Delivery address</h3>
          </div>
          {addressParts.length > 0
            ? <p className="fy-ov__card-text">{addressParts.join(', ')}</p>
            : <p className="fy-ov__card-text fy-ov__quiet">Add an address and checkout fills it in for you.</p>}
          <Link to={linkTo('address')} className="fy-acct__link">{addressParts.length ? 'Edit address' : 'Add address'}</Link>
        </section>
        <section className="fy-ov__card" aria-labelledby="fy-ov-contact">
          <div className="fy-ov__card-head">
            <span className="fy-acct__icon" aria-hidden="true"><UserRound /></span>
            <h3 id="fy-ov-contact">Your details</h3>
          </div>
          <dl className="fy-ov__details">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Phone</dt><dd>{user.phoneNumber?.trim() ? user.phoneNumber : <span className="fy-ov__quiet">Not added yet</span>}</dd></div>
          </dl>
          <Link to={linkTo('details')} className="fy-acct__link">{user.phoneNumber?.trim() ? 'Edit details' : 'Add phone number'}</Link>
        </section>
      </div>
    </div>
  );
};

const LatestOrder: React.FC<{ order: CustomerOrderSummary }> = ({ order }) => {
  const [first, ...rest] = order.items;
  const step = journeyStep(order.status);
  const cancelled = normalizeOrderStatus(order.status) === 'CANCELLED';
  return (
    <article className="fy-ov__latest">
      <div className="fy-ov__latest-top">
        <Link to={`/orders/${order.id}`} className="fy-ov__latest-image" tabIndex={-1} aria-hidden="true">
          {first?.imageUrl ? <img src={first.imageUrl} alt="" loading="lazy" /> : <ShoppingBag />}
        </Link>
        <div className="fy-ov__latest-main">
          <p className="fy-ov__latest-meta">#{order.orderNumber} · {orderDate(order.createdAt)}</p>
          <p className="fy-ov__latest-name">{first?.name ?? 'Your order'}{rest.length > 0 && <span> and {rest.length} more</span>}</p>
          <p className="fy-ov__latest-sum"><strong>{rupees(order.total)}</strong> · {itemCount(order.itemCount)}</p>
        </div>
        <StatusBadge status={order.status} className="fy-ov__latest-badge" />
      </div>

      {cancelled ? (
        <p className="fy-ov__journey-note">This order was cancelled.</p>
      ) : step >= 0 ? (
        <ol className="fy-ov__journey" aria-label={`Order progress: ${journey[step]}`}>
          {journey.map((label, index) => (
            <li key={label} data-done={index <= step || undefined} aria-current={index === step ? 'step' : undefined}>
              <span className="fy-ov__dot" aria-hidden="true" />
              <span className="fy-ov__step">{label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="fy-ov__latest-foot">
        <Link to={`/orders/${order.id}`} className="fy-acct__primary fy-acct__primary--small">View order <ArrowRight aria-hidden="true" /></Link>
      </div>
    </article>
  );
};

type SaveProfile = (changes: Partial<ProfileValues>) => Promise<boolean>;

const DetailsForm: React.FC<{ user: User; loading: boolean; onSave: SaveProfile }> = ({ user, loading, onSave }) => {
  const form = useForm<Pick<ProfileValues, 'name' | 'email' | 'phoneNumber'>>({ defaultValues: { name: user.name || '', email: user.email || '', phoneNumber: user.phoneNumber || '' } });
  const { errors, isDirty } = form.formState;
  return (
    <form className="fy-acct__form" noValidate onSubmit={form.handleSubmit(async ({ name, phoneNumber }) => { if (await onSave({ name, phoneNumber })) form.reset({ name, phoneNumber, email: user.email || '' }); })}>
      <Field label="Full name" autoComplete="name" error={errors.name?.message} registration={form.register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must contain at least 2 characters' } })} />
      <Field label="Email address" type="email" hint="Your sign-in email can't be changed here." disabled registration={form.register('email')} />
      <Field label="Phone number" type="tel" autoComplete="tel" error={errors.phoneNumber?.message} registration={form.register('phoneNumber', { validate: (value) => !value || (value.trim().length >= 7 && value.trim().length <= 20) || 'Phone number must contain 7–20 characters' })} />
      <button type="submit" disabled={loading || !isDirty} className="fy-acct__primary">{loading ? 'Saving…' : 'Save details'}</button>
    </form>
  );
};

const AddressForm: React.FC<{ user: User; loading: boolean; onSave: SaveProfile }> = ({ user, loading, onSave }) => {
  const initial = { addressLine: user.addressLine || '', cityName: user.cityName || '', stateName: user.stateName || '', postalCode: user.postalCode || '', countryName: user.countryName || '' };
  const form = useForm<typeof initial>({ defaultValues: initial });
  const { errors, isDirty } = form.formState;
  return (
    <form className="fy-acct__form" noValidate onSubmit={form.handleSubmit(async (values) => { if (await onSave(values)) form.reset(values); })}>
      <p className="fy-acct__note">Frames you order are delivered here.</p>
      <Field label="Address" autoComplete="street-address" error={errors.addressLine?.message} registration={form.register('addressLine', { maxLength: { value: 255, message: 'Address cannot exceed 255 characters' } })} />
      <div className="fy-acct__pair">
        <Field label="City" autoComplete="address-level2" error={errors.cityName?.message} registration={form.register('cityName', { maxLength: { value: 100, message: 'City name is too long' } })} />
        <Field label="State" autoComplete="address-level1" error={errors.stateName?.message} registration={form.register('stateName', { maxLength: { value: 100, message: 'State name is too long' } })} />
      </div>
      <div className="fy-acct__pair">
        <Field label="Postal code" autoComplete="postal-code" error={errors.postalCode?.message} registration={form.register('postalCode', { maxLength: { value: 20, message: 'Postal code is too long' } })} />
        <Field label="Country" autoComplete="country-name" error={errors.countryName?.message} registration={form.register('countryName', { maxLength: { value: 100, message: 'Country name is too long' } })} />
      </div>
      <button type="submit" disabled={loading || !isDirty} className="fy-acct__primary">{loading ? 'Saving…' : 'Save address'}</button>
    </form>
  );
};

const PasswordForm: React.FC<{ loading: boolean; error: string | null; onChangePassword: Props['onChangePassword'] }> = ({ loading, error, onChangePassword }) => {
  const form = useForm<PasswordValues>({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const { errors } = form.formState;
  return (
    <form className="fy-acct__form" noValidate onSubmit={form.handleSubmit(async (values) => { if (await onChangePassword(values.currentPassword, values.newPassword)) form.reset(); })}>
      <p className="fy-acct__note">After changing it you'll be asked to log in again.</p>
      <Field label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} registration={form.register('currentPassword', { required: 'Current password is required' })} />
      <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." error={errors.newPassword?.message} registration={form.register('newPassword', { required: 'New password is required', minLength: { value: 8, message: 'Password must contain at least 8 characters' }, maxLength: { value: 72, message: 'Password cannot exceed 72 characters' } })} />
      <Field label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} registration={form.register('confirmPassword', { required: 'Confirm your new password', validate: (value) => value === form.getValues('newPassword') || 'Passwords do not match' })} />
      {error && <p role="alert" className="fy-acct__alert">{error}</p>}
      <button type="submit" disabled={loading} className="fy-acct__primary">{loading ? 'Updating…' : 'Update password'}</button>
    </form>
  );
};

const Field: React.FC<{ label: string; type?: string; hint?: string; autoComplete?: string; disabled?: boolean; error?: string; registration: UseFormRegisterReturn }> = ({ label, type = 'text', hint, autoComplete, disabled, error, registration }) => {
  const id = `fy-acct-${registration.name}`;
  return (
    <div className="fy-acct__field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...registration} type={type} autoComplete={autoComplete} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
      {error ? <p id={`${id}-error`} className="fy-acct__error">{error}</p> : hint ? <p id={`${id}-hint`} className="fy-acct__hint">{hint}</p> : null}
    </div>
  );
};

export default CustomerAccountDashboard;
