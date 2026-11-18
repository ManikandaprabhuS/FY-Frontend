import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Package, Search } from 'lucide-react';

import { orderService } from '../../../services/order.service';
import { useAuthStore } from '../../../store/authStore';
import { useOrderFlow } from '../../../store/orderFlowStore';
import type { Order } from '../../../types';
import { showError } from '../../../utils/toast';
import { trackerSteps } from '../../../utils/order-tracker';
import { orderStatusValues } from '../../../components/ui/order-status';
import OrderDetailView, { StatusTag } from '../components/OrderDetailView';
import { FrameLoader, Skeleton } from '../../../components/loaders/FrameLoader';
import { day, money, statusText, valid } from '../utils/orderDisplay';
import '../styles/orders.css';

/*
 * My orders: a month-grouped list with search and a status filter, and the chosen order's
 * detail (tracker, items, address, payment, totals). Wide screens show both side by side;
 * below 1024px the detail is its own view, kept in the URL (?order=…) so Back and the
 * iOS swipe return to the list. All data comes from the customer order API.
 */

const PAGE_SIZE = 10;
const monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
const narrowQuery = '(max-width: 1023.98px)';

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
              {orderStatusValues.map(value => <option key={value} value={value}>{statusText(value)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="fy-oh__body">
        <div className="fy-oh__list" ref={listRef} onKeyDown={onListKey}>
          {loading && !orders.length ? (
            <ul className="fy-oh-skel" aria-label="Loading your orders" role="status">{[0, 1, 2, 3].map(i => <li key={i} className="fy-oh-skel__card"><Skeleton className="fy-oh-skel__wall" /><span className="fy-oh-skel__lines"><Skeleton className="fy-oh-skel__l1" /><Skeleton className="fy-oh-skel__l2" /><Skeleton className="fy-oh-skel__l3" /></span></li>)}</ul>
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
            {selected ? <OrderDetailView key={selected.id} order={selected} onChanged={replaceOrder} /> : showDetail ? <FrameLoader label="Loading order" /> : orders.length ? <p className="fy-oh-pick">Choose an order to see its details.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerOrdersPage;
