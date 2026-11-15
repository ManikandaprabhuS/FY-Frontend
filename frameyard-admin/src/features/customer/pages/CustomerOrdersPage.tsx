import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bell, ChevronLeft, Clock, MapPin, Package, PackageCheck, Search, Truck, Wallet, XCircle } from 'lucide-react';

import { orderService } from '../../../services/order.service';
import { useAuthStore } from '../../../store/authStore';
import { useOrderFlow } from '../../../store/orderFlowStore';
import type { Order } from '../../../types';
import { showError } from '../../../utils/toast';
import { trackerSteps } from '../../../utils/order-tracker';
import { customerRefundMessage } from '../../../utils/refund-message';
import { orderStatusLabel, orderStatusValues } from '../../../components/ui/order-status';
import CancelOrder from '../../../components/orders/CancelOrder';
import OrderPhotoDownload from '../../../components/orders/OrderPhotoDownload';
import OrderItemReview from '../../../components/reviews/OrderItemReview';
import '../styles/orders.css';

/*
 * My orders: a month-grouped list with search and a status filter, and the chosen order's
 * detail (tracker, items, address, payment, totals). Wide screens show both side by side;
 * below 1024px the detail is its own view, kept in the URL (?order=…) so Back and the
 * iOS swipe return to the list. All data comes from the customer order API.
 */

const PAGE_SIZE = 10;
const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
const stampFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const valid = (value?: string) => Boolean(value && Number.isFinite(Date.parse(value)));
const day = (value?: string) => (valid(value) ? dayFmt.format(new Date(value!)) : '-');
const narrowQuery = '(max-width: 1023.98px)';

const statusIcon = (status: string) =>
  status === 'DELIVERED' ? <PackageCheck aria-hidden="true" /> : status === 'SHIPPED' ? <Truck aria-hidden="true" /> : status === 'CANCELLED' ? <XCircle aria-hidden="true" /> : status === 'PLACED' ? <Clock aria-hidden="true" /> : <Package aria-hidden="true" />;

/** Status in black and white: the icon and fill carry the meaning, not colour alone. */
const StatusTag = ({ status }: { status: string }) =>
  <span className="fy-oh-tag" data-status={status}>{statusIcon(status)}{orderStatusLabel(status).toLowerCase()}</span>;

const useNarrow = () => {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(narrowQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(narrowQuery);
    const change = () => setNarrow(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return narrow;
};

const CustomerOrdersPage = () => {
  const user = useAuthStore(state => state.user);
  const narrow = useNarrow();
  const { flow } = useOrderFlow();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('order');
  const fullScreen = narrow && Boolean(selectedId);

  // Phones and tablets: the open order covers the screen, so the page behind it stops scrolling
  // (and keeps its place for when the customer comes back to the list).
  useEffect(() => {
    if (!fullScreen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, [fullScreen]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [extra, setExtra] = useState<Order | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Search runs on the server, a moment after typing stops.
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (user?.role !== 'CUSTOMER') return;
    let active = true;
    const request = () => orderService.getOrders({ page, limit: PAGE_SIZE, search, status });
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true); setError('');
      const result = await request();
      if (active) { setOrders(result.orders); setPages(result.pagination.totalPages); setTotal(result.pagination.total ?? result.orders.length); }
    }).catch(() => { if (active) setError('Your orders could not be loaded. Please try again.'); }).finally(() => { if (active) setLoading(false); });
    let refreshing = false;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || refreshing) return;
      refreshing = true;
      void request().then(result => { if (active) { setOrders(result.orders); setPages(result.pagination.totalPages); } })
        .catch(() => { if (active) showError('Your order status could not be refreshed. Please try again.', { id: 'customer-orders-refresh' }); })
        .finally(() => { refreshing = false; });
    };
    const timer = setInterval(refresh, 45000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [user?.id, user?.role, page, search, status, revision]);

  // A linked order that is not on this page of results is fetched on its own.
  const inList = orders.find(order => order.id === selectedId);
  useEffect(() => {
    if (!selectedId || inList || loading || user?.role !== 'CUSTOMER') return;
    let active = true;
    orderService.getOrderById(selectedId).then(order => { if (active) setExtra(order); }).catch(() => { if (active) setExtra(null); });
    return () => { active = false; };
  }, [selectedId, inList, loading, user?.role]);

  const select = useCallback((id: string | null, push = narrow) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (id) next.set('order', id); else next.delete('order');
      return next;
    }, { replace: !push });
  }, [narrow, setParams]);

  // Wide screens open the newest order when none is chosen; phones start on the list.
  const firstId = orders[0]?.id;
  useEffect(() => {
    if (!narrow && !selectedId && firstId) select(firstId, false);
  }, [narrow, selectedId, firstId, select]);
  // After a search or filter change, a wide screen moves to the first match if the open order left the list.
  const filterKey = search + '|' + status;
  const shownFilter = useRef(filterKey);
  useEffect(() => {
    if (loading || shownFilter.current === filterKey) return;
    shownFilter.current = filterKey;
    if (!narrow && firstId && !inList) select(firstId, false);
  }, [loading, filterKey, narrow, firstId, inList, select]);

  // "/" focuses the search from anywhere on the page.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== '/' || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      event.preventDefault(); searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selected = inList ?? (extra?.id === selectedId ? extra : undefined);
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      const key = valid(order.createdAt) ? monthFmt.format(new Date(order.createdAt)) : 'Earlier';
      map.set(key, [...(map.get(key) ?? []), order]);
    }
    return [...map.entries()];
  }, [orders]);

  const replaceOrder = (updated: Order) => {
    setOrders(list => list.map(order => (order.id === updated.id ? updated : order)));
    if (extra?.id === updated.id) setExtra(updated);
  };
  const filtered = Boolean(search) || status !== 'all';
  const clearFilters = () => { setQuery(''); setSearch(''); setStatus('all'); setPage(1); };

  // Arrow keys move between orders, Home and End jump; Enter or Space opens (native button).
  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const rows = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('.fy-oh-card') ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (!rows.length) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : Math.min(rows.length - 1, Math.max(0, at + (event.key === 'ArrowDown' ? 1 : -1)));
    rows[next].focus();
  };

  if (user?.role !== 'CUSTOMER') return (
    <section className="fy-oh"><h1 className="fy-oh__title">My orders</h1><Link to="/profile" state={{ returnTo: '/orders' }} className="fy-oh-link">Log in to view your orders</Link></section>
  );

  const showDetail = Boolean(selectedId);
  return (
    <section className="fy-oh" data-view={narrow && showDetail ? 'detail' : 'list'}>
      <div className="fy-oh__list-view">
        <header className="fy-oh__head">
          <div>
            <h1 className="fy-oh__title">My orders</h1>
            <p className="fy-oh__sub" aria-live="polite">{loading ? 'Loading…' : `${total} ${total === 1 ? 'order' : 'orders'}${filtered ? ' found' : ''}`}</p>
          </div>
          <Link to="/notifications" className="fy-oh-link"><Bell aria-hidden="true" />Order notifications</Link>
        </header>

        <div className="fy-oh__toolbar">
          <label className="fy-oh-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search orders</span>
            <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search order number or frame" enterKeyHint="search" />
            <kbd aria-hidden="true">/</kbd>
          </label>
          <label className="fy-oh-filter">
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
              <option value="all">All statuses</option>
              {orderStatusValues.map(value => <option key={value} value={value}>{orderStatusLabel(value).toLowerCase().replace(/^./, c => c.toUpperCase())}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="fy-oh__body">
        <div className="fy-oh__list" ref={listRef} onKeyDown={onListKey}>
          {loading && !orders.length ? (
            <ul className="fy-oh-skel" aria-label="Loading your orders" role="status">{[0, 1, 2, 3].map(i => <li key={i} />)}</ul>
          ) : error ? (
            <div className="fy-oh-state" role="alert"><p>{error}</p><button type="button" className="fy-oh-btn" onClick={() => setRevision(v => v + 1)}>Try again</button></div>
          ) : !orders.length ? (
            filtered ? (
              <div className="fy-oh-state"><p className="fy-oh-state__title">No orders match</p><p>Try another order number or frame name, or clear the filters.</p><button type="button" className="fy-oh-btn" onClick={clearFilters}>Clear filters</button></div>
            ) : (
              <div className="fy-oh-state"><p className="fy-oh-state__title">No orders yet</p><p>Your framed memories will appear here once you place an order.</p><Link to="/products" className="fy-oh-btn fy-oh-btn--solid">Start shopping</Link></div>
            )
          ) : (
            <>
              {groups.map(([month, rows], g) => (
                <section key={month} className="fy-oh-group" aria-label={month}>
                  <h2 className="fy-oh-group__title">{month}</h2>
                  <ul className="fy-oh-cards">
                    {rows.map((order, i) => {
                      const count = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
                      const images = order.orderItems.filter(item => item.imageUrl).slice(0, 3);
                      const active = order.id === selectedId;
                      const steps = flow ? trackerSteps(order, flow) : [];
                      const reached = steps.filter(step => step.done).length;
                      const cancelled = order.orderStatus === 'CANCELLED';
                      return (
                        <li key={order.id} style={{ '--d': `${(g * 3 + i) * 45}ms` } as CSSProperties}>
                          <button type="button" className="fy-oh-card" data-active={active || undefined} data-status={order.orderStatus} aria-current={active || undefined} onClick={() => select(order.id)}>
                            {/* The order's frames hung like a small gallery wall: one large, two small. */}
                            <span className="fy-oh-card__wall" data-count={images.length} aria-hidden="true">
                              {images.length ? images.map(item => <span key={item.id} className="fy-oh-card__pic"><img src={item.imageUrl!} alt="" loading="lazy" decoding="async" /></span>) : <span className="fy-oh-card__pic fy-oh-card__pic--blank"><Package /></span>}
                            </span>
                            <span className="fy-oh-card__body">
                              <span className="fy-oh-card__top"><strong>{order.orderNumber}</strong><span className="fy-oh-card__total">{money(order.totalAmount)}</span></span>
                              <span className="fy-oh-card__meta">{day(order.createdAt)} · {count} {count === 1 ? 'frame' : 'frames'}</span>
                              <span className="fy-oh-card__foot">
                                <StatusTag status={order.orderStatus} />
                                {!cancelled && steps.length > 0 && (
                                  <span className="fy-oh-card__progress" aria-label={`Step ${reached} of ${steps.length}`}>
                                    {steps.map(step => <i key={step.status} data-done={step.done || undefined} />)}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              {pages > 1 && (
                <nav className="fy-oh-pager" aria-label="Order pages">
                  <button type="button" disabled={loading || page <= 1} onClick={() => setPage(v => v - 1)}>Previous</button>
                  <span>Page {page} of {Math.max(1, pages)}</span>
                  <button type="button" disabled={loading || page >= pages} onClick={() => setPage(v => v + 1)}>Next</button>
                </nav>
              )}
              <Link to="/products" className="fy-oh-link fy-oh-list__shop">Continue shopping</Link>
            </>
          )}
        </div>

        <div className="fy-oh__detail" role={fullScreen ? 'dialog' : undefined} aria-modal={fullScreen || undefined} aria-label={fullScreen ? 'Order details' : undefined}>
          {fullScreen && (
            <div className="fy-oh-topbar">
              <button type="button" className="fy-oh-back" onClick={() => (window.history.length > 1 ? window.history.back() : select(null, false))}><ChevronLeft aria-hidden="true" />Orders</button>
              {selected && <span className="fy-oh-topbar__title">{selected.orderNumber}</span>}
            </div>
          )}
          <div className="fy-oh__detail-inner">
            {selected ? <OrderDetail key={selected.id} order={selected} onChanged={replaceOrder} /> : showDetail ? <div className="fy-oh-skel fy-oh-skel--detail" role="status" aria-label="Loading order" /> : orders.length ? <p className="fy-oh-pick">Choose an order to see its details.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
};

/** The open order: tracker, items, delivery and payment, and the totals. */
const OrderDetail = ({ order, onChanged }: { order: Order; onChanged: (order: Order) => void }) => {
  const subtotal = order.subtotal ?? order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const offer = order.couponTitle ?? order.coupon?.couponCode ?? null;
  const contact = order.userAddress?.contactPerson ?? order.user?.name;
  return (
    <article className="fy-oh-detail" aria-labelledby={'order-' + order.id}>
      <header className="fy-oh-detail__head">
        <div>
          <p className="fy-oh-detail__kicker">Placed {day(order.createdAt)}</p>
          <h2 id={'order-' + order.id}>Order {order.orderNumber}</h2>
        </div>
        <StatusTag status={order.orderStatus} />
      </header>

      {order.orderStatus === 'DELIVERED' && <DeliveredMoment order={order} />}
      <Timeline order={order} />

      <section className="fy-oh-block" aria-label="Items">
        <h3>Items</h3>
        <ul className="fy-oh-items">
          {order.orderItems.map(item => (
            <li key={item.id}>
              <span className="fy-oh-items__img">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" /> : <Package aria-hidden="true" />}</span>
              <span className="fy-oh-items__info">
                <strong>{item.productName}</strong>
                <span>{[item.frameSize, item.material].filter(v => v && !/^(not specified|undefined|null|-)$/i.test(v)).join(' · ')}</span>
                {(item.colorName || item.colorHex) && <span className="fy-oh-items__color">{item.colorHex && /^#[a-f0-9]{6}$/i.test(item.colorHex) && <i style={{ backgroundColor: item.colorHex }} aria-hidden="true" />}{item.colorName && !item.colorName.startsWith('#') ? item.colorName : 'Color'}</span>}
                <span>Qty {item.quantity} × {money(item.price)}</span>
                {item.productId && item.productId !== '-' && <OrderItemReview productId={item.productId} productName={item.productName} productImage={item.imageUrl} className="fy-oh-items__review" />}
              </span>
              <span className="fy-oh-items__price">{money(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="fy-oh-pair">
        <section className="fy-oh-block" aria-label="Delivery address">
          <h3><MapPin aria-hidden="true" />Delivery address</h3>
          <address>
            {contact && <strong>{contact}</strong>}
            <span>{order.addressLine}</span>
            <span>{[order.cityName, order.stateName, order.postalCode].filter(Boolean).join(', ')}</span>
            <span>{order.countryName}</span>
            {(order.userAddress?.contactNumber || order.phoneNumber) && <span>{order.userAddress?.contactNumber || order.phoneNumber}</span>}
          </address>
        </section>
        <section className="fy-oh-block" aria-label="Payment and delivery">
          <h3><Wallet aria-hidden="true" />Payment</h3>
          <p className="fy-oh-plain">Cash on delivery</p>
          <h3 className="fy-oh-block__sub"><Truck aria-hidden="true" />Delivery</h3>
          <p className="fy-oh-plain">Standard delivery · Free</p>
        </section>
      </div>

      <section className="fy-oh-block" aria-label="Order summary">
        <h3>Summary</h3>
        <dl className="fy-oh-sum">
          <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
          {offer && <div><dt>{offer}{order.discountPercent ? ` (${order.discountPercent}%)` : ''}</dt><dd>−{money(order.discountAmount ?? 0)}</dd></div>}
          <div><dt>Delivery</dt><dd>Free</dd></div>
          <div className="fy-oh-sum__total"><dt>Total</dt><dd>{money(order.totalAmount)}</dd></div>
        </dl>
      </section>

      <div className="fy-oh-photo"><OrderPhotoDownload order={order} /></div>

      <footer className="fy-oh-detail__foot">
        <CancelOrder order={order} onChanged={onChanged} />
        <Link to={'/orders/' + order.id} className="fy-oh-link">Open order page<ArrowUpRight aria-hidden="true" /></Link>
      </footer>
    </article>
  );
};

/**
 * Delivered: the first frame of the order is hung on a nail and swings gently to rest, the
 * way it would on the customer's wall. It plays once when a delivered order is opened.
 */
const DeliveredMoment = ({ order }: { order: Order }) => {
  const picture = order.orderItems.find(item => item.imageUrl)?.imageUrl;
  const delivered = [...(order.statusHistory ?? [])].reverse().find(entry => entry.status === 'DELIVERED')?.changedAt;
  return (
    <div className="fy-oh-hung">
      <div className="fy-oh-hung__wall" aria-hidden="true">
        <span className="fy-oh-hung__nail" />
        <span className="fy-oh-hung__swing">
          <svg className="fy-oh-hung__wire" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M6 30 L50 1 L94 30" /></svg>
          <span className="fy-oh-hung__frame">{picture ? <img src={picture} alt="" decoding="async" /> : <Package />}</span>
        </span>
      </div>
      <div className="fy-oh-hung__text">
        <p className="fy-oh-hung__title">Delivered{valid(delivered) ? ' on ' + day(delivered) : ''}</p>
        <p>We hope it looks perfect on your wall.</p>
      </div>
    </div>
  );
};

/**
 * The shipment timeline, from the store's own status flow. The line draws down to the current
 * step and each mark lands in turn; any note the store added at a step (a courier name, a
 * tracking number) is shown under that step.
 */
const Timeline = ({ order }: { order: Order }) => {
  const { flow, error, retry } = useOrderFlow();
  if (!flow) return <div className="fy-oh-track fy-oh-track--wait" role="status">{error ? <button type="button" className="fy-oh-link" onClick={() => void retry()}>Retry loading order tracker</button> : 'Loading order tracker…'}</div>;
  const steps = trackerSteps(order, flow);
  const history = order.statusHistory ?? [];
  const cancel = [...history].reverse().find(entry => entry.status === 'CANCELLED');
  const done = steps.filter(step => step.done).length;
  const current = steps.find(step => step.current);
  return (
    <section className="fy-oh-track" aria-label="Shipment timeline" style={{ '--p': steps.length > 1 ? Math.max(0, done - 1) / (steps.length - 1) : 1 } as CSSProperties}>
      <h3 className="fy-oh-track__title">{order.orderStatus === 'CANCELLED' ? 'Order cancelled' : current ? current.label : 'Shipment'}</h3>
      {current?.description && order.orderStatus !== 'DELIVERED' && <p className="fy-oh-track__lede">{current.description}</p>}
      <ol>
        {steps.map((step, index) => {
          const notes = history.filter(entry => (entry.status === step.status || (flow.legacyDisplay[entry.status] === step.status)) && entry.note?.trim());
          return (
            <li key={step.status} data-done={step.done || undefined} data-link={steps[index + 1]?.done || undefined} aria-current={step.current ? 'step' : undefined} style={{ '--i': index } as CSSProperties}>
              <span className="fy-oh-track__mark" aria-hidden="true" />
              <span className="fy-oh-track__row">
                <span className="fy-oh-track__label">{step.label}<span className="sr-only">{step.current ? ', current step' : step.done ? ', completed' : ', upcoming'}</span></span>
                {step.done && valid(step.timestamp) && <time dateTime={step.timestamp}>{stampFmt.format(new Date(step.timestamp!))}</time>}
              </span>
              {notes.map(entry => <p key={entry.changedAt + (entry.note ?? '')} className="fy-oh-track__update"><span>Update from FrameYaad</span>{entry.note}</p>)}
            </li>
          );
        })}
      </ol>
      {order.orderStatus === 'CANCELLED' && (
        <div className="fy-oh-cancelled">
          <p><XCircle aria-hidden="true" />Cancelled{valid(cancel?.changedAt) ? ' on ' + stampFmt.format(new Date(cancel!.changedAt)) : ''}{cancel?.changedBy.role === 'CUSTOMER' ? ' by you' : cancel?.changedBy.role ? ' by the store' : ''}</p>
          <p>{customerRefundMessage(order)}</p>
          {order.refundStatus && <p>Refund: {order.refundStatus.toLowerCase()}</p>}
          {cancel?.note && <p className="fy-oh-cancelled__note">{cancel.note}</p>}
        </div>
      )}
    </section>
  );
};

export default CustomerOrdersPage;
