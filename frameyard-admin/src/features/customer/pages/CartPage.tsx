import { cartStockIssue, LOW_STOCK_THRESHOLD, normalizeStock } from '../../../utils/stock';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Heart, Minus, Plus, ShoppingBag, Trash2, Truck, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../store/authStore';
import { useCustomerCommerceStore, type CustomerCartItem } from '../../../store/customerCommerceStore';
import { showError, showSuccess, showWarning } from '../../../utils/toast';

import BuyNowButton from '../components/BuyNowButton';
import ColorSwatch from '../components/ColorSwatch';
import { useCartOffers } from '../hooks/useCartOffers';
import { useTweened } from '../hooks/useTweened';
import { checkoutService } from '../../../services/checkout.service';
import emptyCartArt from '../../../assets/empty-cart-frames.webp';
import '../styles/cart.css';

const prefetchCheckout = () => {
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated || auth.user?.role !== 'CUSTOMER') return;
  const items = useCustomerCommerceStore.getState().cartItems;
  if (!items.length) return;
  void checkoutService.offers(items.map(i => ({ productIdentifier: i.productIdentifier ?? '', variantId: i.variantId, quantity: i.quantity, ...(i.colorName ? { colorName: i.colorName } : {}), ...(i.colorHex ? { colorHex: i.colorHex } : {}) }))).catch(() => undefined);
};

/** How long a row takes to fold away, and how long Undo stays offered. */
const EXIT_MS = 380;
const HEART_MS = 420;
const UNDO_MS = 5000;

const inr = (value: number) => '₹' + Math.round(value).toLocaleString('en-IN');

const Money = ({ value, className }: { value: number; className?: string }) => {
  const shown = useTweened(value);
  // Screen readers get the final figure, not every step of the count.
  return <span className={className}><span aria-hidden="true">{inr(shown)}</span><span className="sr-only">{inr(value)}</span></span>;
};

type Leaving = 'remove' | 'wish';

const without = <T,>(record: Record<string, T>, key: string) => {
  const next = { ...record };
  delete next[key];
  return next;
};

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const customerLoggedIn = useAuthStore(state => state.isAuthenticated && state.user?.role === 'CUSTOMER');

  const items = useCustomerCommerceStore((state) => state.cartItems);
  const updateQuantity = useCustomerCommerceStore((state) => state.updateCartQuantity);
  const removeItem = useCustomerCommerceStore((state) => state.removeCartItem);
  const moveCartItemToWishlist = useCustomerCommerceStore((state) => state.moveCartItemToWishlist);

  // Rows on their way out (folding), and rows removed but still undoable (hidden, not yet deleted).
  const [leaving, setLeaving] = useState<Record<string, Leaving>>({});
  const [undoable, setUndoable] = useState<Record<string, { name: string; at: number }>>({});
  const [entering, setEntering] = useState<string | null>(null);
  const undoTimers = useRef(new Map<string, number>());
  const timers = useRef<number[]>([]);
  const moveInFlight = useRef(new Set<string>());

  const visibleItems = useMemo(() => items.filter(item => !undoable[item.key]), [items, undoable]);
  const subtotal = useMemo(() => visibleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [visibleItems]);
  const itemCount = useMemo(() => visibleItems.reduce((total, item) => total + item.quantity, 0), [visibleItems]);
  const offers = useCartOffers(visibleItems, customerLoggedIn);

  /** Deletes every row still waiting on Undo: before checkout, on leaving the page. */
  const commitRemovals = useCallback(() => {
    undoTimers.current.forEach((timer, key) => { window.clearTimeout(timer); removeItem(key); });
    undoTimers.current.clear();
    setUndoable({});
  }, [removeItem]);

  useEffect(() => {
    const flush = () => commitRemovals();
    window.addEventListener('pagehide', flush);
    const pending = timers.current;
    return () => {
      window.removeEventListener('pagehide', flush);
      pending.forEach(timer => window.clearTimeout(timer));
      flush();
    };
  }, [commitRemovals]);

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const remove = (item: CustomerCartItem) => {
    if (leaving[item.key]) return;
    setLeaving(current => ({ ...current, [item.key]: 'remove' }));
    later(() => {
      setLeaving(current => without(current, item.key));
      setUndoable(current => ({ ...current, [item.key]: { name: item.name, at: Date.now() } }));
      undoTimers.current.set(item.key, window.setTimeout(() => {
        undoTimers.current.delete(item.key);
        removeItem(item.key);
        setUndoable(current => without(current, item.key));
      }, UNDO_MS));
    }, EXIT_MS);
  };

  const undo = (key: string) => {
    const timer = undoTimers.current.get(key);
    if (timer) window.clearTimeout(timer);
    undoTimers.current.delete(key);
    setUndoable(current => without(current, key));
    setEntering(key);
    later(() => setEntering(current => (current === key ? null : current)), 600);
  };

  const moveToWishlist = async (item: CustomerCartItem) => {
    if (moveInFlight.current.has(item.key) || leaving[item.key]) return;
    if (useAuthStore.getState().status === 'checking') await useAuthStore.getState().checkAuth();
    const verified = useAuthStore.getState();
    if (verified.status === 'checking') return;
    if (!verified.isAuthenticated || verified.user?.role !== 'CUSTOMER') {
      showWarning('Please login / create an account to add products to wishlist');
      navigate('/profile', { state: { returnTo: '/cart' } });
      return;
    }
    if (!item.productIdentifier) {
      showError('This product cannot be added to the wishlist right now.');
      return;
    }
    if (useCustomerCommerceStore.getState().wishlistPending[item.productIdentifier]) return;
    moveInFlight.current.add(item.key);
    // The heart fills and rings first, then the row folds and the store moves it.
    setLeaving(current => ({ ...current, [item.key]: 'wish' }));
    await new Promise(resolve => later(() => resolve(null), HEART_MS + EXIT_MS));
    const toastId = 'cart-move:' + item.key;
    const alreadySaved = Boolean(useCustomerCommerceStore.getState().wishlistByProductIdentifier[item.productIdentifier]);
    try {
      // The store applies the optimistic state before its first await.
      const request = moveCartItemToWishlist(item.key, item.productIdentifier);
      if (!useCustomerCommerceStore.getState().cartItems.some(row => row.key === item.key)) {
        if (alreadySaved) showWarning('Already in your wishlist. Removed from cart.', { id: toastId });
        else showSuccess('Moved to wishlist', { id: toastId });
      }
      const moved = await request;
      if (moved === 'exists' && !alreadySaved) showWarning('Already in your wishlist. Removed from cart.', { id: toastId });
    } catch {
      // Store rollback restores the cart and counts before this replacement.
      showError('Could not move to wishlist. Please try again.', { id: toastId });
    } finally {
      moveInFlight.current.delete(item.key);
      setLeaving(current => without(current, item.key));
    }
  };

  const checkoutAsync = async () => {
    if (useAuthStore.getState().status === 'checking') await useAuthStore.getState().checkAuth();
    if (startCheckout()) navigate('/checkout');
  };

  /** Checks run before the Checkout animation; returning false keeps the customer here. */
  const startCheckout = (): boolean => {
    const verified = useAuthStore.getState();
    if (verified.status === 'checking') { void checkoutAsync(); return false; }
    if (!(verified.isAuthenticated && verified.user?.role === 'CUSTOMER')) {
      showWarning('Please login to continue to checkout');
      navigate('/profile', { state: { returnTo: '/checkout' } });
      return false;
    }
    commitRemovals();
    const remaining = useCustomerCommerceStore.getState().cartItems;
    if (!remaining.length) return false;
    const issue = cartStockIssue(remaining);
    if (issue) { showWarning(issue, { id: 'cart-stock' }); return false; }
    prefetchCheckout();
    return true;
  };

  // The phone bar shows while the summary's own Checkout is off screen.
  const summaryCta = useRef<HTMLDivElement>(null);
  const [summaryInView, setSummaryInView] = useState(false);
  const hasRows = visibleItems.length > 0;
  useEffect(() => {
    const target = summaryCta.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setSummaryInView(entry.isIntersecting), { rootMargin: '0px 0px -40px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasRows]);

  const undoRows = Object.entries(undoable);

  if (visibleItems.length === 0 && !Object.keys(leaving).length) return (
    <section className="fy-bag fy-bag--empty">
      {undoRows.map(([key, row]) => <UndoStrip key={key} name={row.name} onUndo={() => undo(key)} />)}
      <div className="fy-empty">
        <figure className="fy-empty__art">
          <img src={emptyCartArt} alt="A shopping cart holding two empty black picture frames" width={1312} height={1199} decoding="async" fetchPriority="high" />
        </figure>
        <div className="fy-empty__copy">
          <p className="fy-empty__status">Your cart is empty</p>
          <h1 className="fy-empty__title">Every memory deserves a frame.</h1>
          <p className="fy-empty__lede">Your cart is waiting for something special. Discover frames that turn your favourite moments into lasting memories.</p>
          <Link to="/products" className="fy-empty__cta">Explore Frames</Link>
        </div>
      </div>
    </section>
  );

  const photo = visibleItems[0]?.imageUrl ?? undefined;
  const best = offers.best && (!offers.bigOrder?.threshold || offers.best.code !== 'BIG_ORDER' || subtotal > offers.bigOrder.threshold) ? offers.best : null;
  const total = Math.max(0, subtotal - (best?.discountAmount ?? 0));

  const checkoutButton = (variant: 'panel' | 'bar') => (
    <BuyNowButton
      available={visibleItems.length > 0}
      photo={photo}
      onAdd={startCheckout}
      onDone={() => navigate('/checkout')}
      label="Checkout"
      framingText="Preparing your order…"
      doneText="Opening checkout"
      framingAnnouncement="Preparing checkout"
      className={`fy-bag__checkout fy-bag__checkout--${variant}`}
    />
  );

  return (
    <section className="fy-bag">
      <header className="fy-bag__head">
        <h1 className="fy-bag__title">Your cart</h1>
        <p className="fy-bag__count" aria-live="polite">{itemCount} {itemCount === 1 ? 'frame' : 'frames'}</p>
        <Link to="/products" className="fy-bag__back">Continue shopping</Link>
      </header>

      <div className="fy-bag__grid">
        <div className="fy-bag__list">
          <div className="fy-bag__cols" aria-hidden="true"><span>Product</span><span>Price</span><span>Quantity</span><span>Total</span></div>
          <ul>
            {items.map(item => undoable[item.key]
              ? <li key={item.key}><UndoStrip name={undoable[item.key].name} onUndo={() => undo(item.key)} /></li>
              : (
                <CartRow
                  key={item.key}
                  item={item}
                  items={items}
                  leaving={leaving[item.key]}
                  entering={entering === item.key}
                  onQuantity={(quantity) => updateQuantity(item.key, quantity)}
                  onRemove={() => remove(item)}
                  onWishlist={() => void moveToWishlist(item)}
                />
              ))}
          </ul>
        </div>

        <aside className="fy-bag__aside" aria-label="Order summary">
          <DeliveryTrack subtotal={subtotal} loggedIn={customerLoggedIn} offers={offers} />

          <div className="fy-bag__summary">
            <div className="fy-bag__summary-head">
              <h2 className="fy-bag__summary-title">Order summary</h2>
              <ul className="fy-bag__stack" aria-hidden="true">
                {visibleItems.slice(0, 4).map(item => (
                  <li key={item.key}>{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" /> : null}</li>
                ))}
                {visibleItems.length > 4 && <li className="fy-bag__stack-more">+{visibleItems.length - 4}</li>}
              </ul>
            </div>
            <dl className="fy-bag__rows">
              <div><dt>Subtotal</dt><dd><Money value={subtotal} /></dd></div>
              <div><dt>Delivery</dt><dd>Free</dd></div>
              {best && (
                <div className="fy-bag__offer-row" key={best.code}>
                  <dt>{best.title}<small>Applied at checkout</small></dt>
                  <dd>−<Money value={best.discountAmount} /></dd>
                </div>
              )}
            </dl>
            <div className="fy-bag__total">
              <span>{best ? 'Estimated total' : 'Total'}</span>
              <Money value={total} className="fy-bag__total-value" />
            </div>
            <div ref={summaryCta}>{checkoutButton('panel')}</div>
            <p className="fy-bag__assure"><Wallet aria-hidden="true" />Pay cash when your frames arrive</p>
          </div>
        </aside>
      </div>

      <div className="fy-bag__bar" data-show={!summaryInView || undefined} aria-hidden={summaryInView || undefined}>
        <div>
          <Money value={total} className="fy-bag__bar-total" />
          <p className="fy-bag__bar-meta">{itemCount} {itemCount === 1 ? 'frame' : 'frames'}{best ? ' · offer at checkout' : ' · free delivery'}</p>
        </div>
        {checkoutButton('bar')}
      </div>
    </section>
  );
};

type CartRowProps = {
  item: CustomerCartItem;
  items: CustomerCartItem[];
  leaving?: Leaving;
  entering: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onWishlist: () => void;
};

const CartRow = ({ item, items, leaving, entering, onQuantity, onRemove, onWishlist }: CartRowProps) => {
  // Which way the number slides: compared with the quantity at the last render.
  const [seen, setSeen] = useState(item.quantity);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  if (seen !== item.quantity) {
    setDirection(item.quantity > seen ? 'up' : 'down');
    setSeen(item.quantity);
  }

  const stock = normalizeStock(item.stockQuantity);
  const sameVariant = items.filter(entry => entry.productId === item.productId && entry.variantId === item.variantId).reduce((sum, entry) => sum + entry.quantity, 0);
  const canAdd = sameVariant < stock;
  const lineTotal = item.unitPrice * item.quantity;
  const details = [item.frameSize, item.material].filter(Boolean).join(' · ');
  const extras = [`Mount ${optionLabel(item.mountType).toLowerCase()}`, `Glass ${optionLabel(item.glassType).toLowerCase()}`];

  return (
    <li className="fy-bag__row" data-leaving={leaving} data-entering={entering || undefined}>
      <div className="fy-bag__row-inner">
        <article className="fy-bag__item" data-single={item.quantity === 1 || undefined}>
          <div className="fy-bag__thumb">
            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" /> : <ShoppingBag aria-hidden="true" strokeWidth={1.4} />}
          </div>

          <div className="fy-bag__info">
            <h2 className="fy-bag__name">{item.name}</h2>
            {details && <p className="fy-bag__meta">{details}</p>}
            <p className="fy-bag__meta fy-bag__meta--opts">
              {item.color && <span className="fy-bag__swatch"><ColorSwatch color={item.color} className="h-3.5 w-3.5" />{item.colorName && !item.colorName.startsWith('#') ? item.colorName : 'Color'}</span>}
              {extras.map(text => <span key={text}>{text}</span>)}
            </p>
            {stock > 0 && stock <= LOW_STOCK_THRESHOLD && <p className="fy-bag__stock">Only {stock} left</p>}
          </div>

          <p className="fy-bag__unit"><span className="fy-bag__label">Price</span>{inr(item.unitPrice)}</p>

          <div className="fy-bag__qty" role="group" aria-label={`Quantity of ${item.name}`}>
            <button type="button" onClick={() => onQuantity(item.quantity - 1)} disabled={item.quantity <= 1 || Boolean(leaving)} aria-label="Decrease quantity"><Minus /></button>
            <span className="fy-bag__qty-n" aria-live="polite"><span key={item.quantity} data-dir={direction}>{item.quantity}</span></span>
            <button type="button" onClick={() => onQuantity(item.quantity + 1)} disabled={!canAdd || Boolean(leaving)} aria-label="Increase quantity"><Plus /></button>
          </div>

          <p className="fy-bag__line"><span className="fy-bag__label">Total</span><Money value={lineTotal} /></p>

          <div className="fy-bag__actions">
            <button type="button" className="fy-bag__link fy-bag__wish" data-on={leaving === 'wish' || undefined} onClick={onWishlist} disabled={Boolean(leaving)}>
              <span className="fy-bag__wish-icon" aria-hidden="true"><span className="fy-bag__wish-ring" /><Heart strokeWidth={1.8} /></span>
              <span className="fy-bag__link-text">{leaving === 'wish' ? 'Saved to wishlist' : 'Move to wishlist'}</span>
            </button>
            <button type="button" className="fy-bag__link fy-bag__remove" onClick={onRemove} disabled={Boolean(leaving)}>
              <Trash2 className="fy-bag__remove-icon" strokeWidth={1.7} aria-hidden="true" />
              <span className="fy-bag__link-text">Remove</span>
            </button>
          </div>
        </article>
      </div>
    </li>
  );
};

const UndoStrip = ({ name, onUndo }: { name: string; onUndo: () => void }) => (
  <div className="fy-bag__undo" role="status">
    <p><span className="fy-bag__undo-name">{name}</span> removed</p>
    <button type="button" onClick={onUndo}>Undo</button>
    <span className="fy-bag__undo-timer" aria-hidden="true" data-motion-timer style={{ animationDuration: `${UNDO_MS}ms` }} />
  </div>
);

/**
 * The delivery card above the summary. A black truck chip rides a road line: towards the Big
 * Order offer when the customer has one to reach (it bumps along each time the spend moves),
 * otherwise it drives in once and parks at the end, since delivery is free.
 */
const DeliveryTrack = ({ subtotal, loggedIn, offers }: { subtotal: number; loggedIn: boolean; offers: ReturnType<typeof useCartOffers> }) => {
  const rule = loggedIn ? offers.bigOrder : null;
  const unlocked = rule ? (rule.threshold ? subtotal > rule.threshold : true) : true;
  const ratio = rule && rule.threshold && !unlocked ? Math.min(0.94, Math.max(0.06, subtotal / rule.threshold)) : 1;
  const progress = rule ? Math.round(ratio * 100) : 100;
  return (
    <div className="fy-bag__deliver" data-arrived={unlocked || undefined} style={{ '--p': ratio } as React.CSSProperties}>
      <div
        className="fy-bag__road"
        {...(rule ? { role: 'progressbar', 'aria-label': `Progress towards ${rule.title}`, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress } : { 'aria-hidden': true })}
      >
        <span className="fy-bag__road-fill" />
        <span className="fy-bag__road-end" aria-hidden="true" />
        <span className="fy-bag__truck" aria-hidden="true">
          <span className="fy-bag__truck-chip" key={progress}><Truck strokeWidth={1.8} /></span>
        </span>
      </div>
      <p className="fy-bag__deliver-text" aria-live="polite">
        {!rule && <><strong>Free delivery</strong> across India</>}
        {rule && unlocked && <><strong>{rule.percent}% off unlocked.</strong> Choose {rule.title} at checkout.</>}
        {rule && !unlocked && <>Add <strong>{inr(Math.max(1, rule.threshold! - subtotal))}</strong> more for {rule.percent}% off. Delivery is free.</>}
      </p>
      {!loggedIn && (
        <p className="fy-bag__deliver-note"><Link to="/profile" state={{ returnTo: '/checkout' }}>Log in</Link> to check your first-order offer and claim eligible checkout offers.</p>
      )}
    </div>
  );
};

/** Admin option codes (OPTION_1, MATTE_BLACK) read as words. */
const optionLabel = (value?: string | null) => {
  if (!value) return 'None';
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export default CartPage;
