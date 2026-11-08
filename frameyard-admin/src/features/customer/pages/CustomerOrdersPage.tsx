import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../../services/order.service';
import { useAuthStore } from '../../../store/authStore';
import type { Order } from '../../../types';
import StatusBadge from '../../../components/ui/StatusBadge';
import OrderItemOptions from '../../../components/orders/OrderItemOptions';
const CustomerOrdersPage = () => {
  const user = useAuthStore(state => state.user);
  const [orders, setOrders] = useState<Order[]>([]); const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    if (user?.role !== 'CUSTOMER') return;
    let active = true;
    void Promise.resolve().then(async () => { if (!active) return; setLoading(true); setError(''); const result = await orderService.getOrders({ page, limit: 10 }); if (active) { setOrders(result.orders); setPages(result.pagination.totalPages); } }).catch(() => { if (active) setError('Your orders could not be loaded. Please try again.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?.role, page]);
  return <div className="space-y-5 rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-5 sm:p-8">
    <h1 className="text-3xl font-black text-on-surface">My orders</h1>
    {user?.role !== 'CUSTOMER' ? <Link to="/profile" state={{ returnTo: '/orders' }} className="font-bold underline">Login to view your orders</Link> : loading ? <p role="status">Loading your orders...</p> : error ? <p role="alert">{error}</p> : orders.length === 0 ? <p>No orders found.</p> : orders.map(order => <article key={order.id} className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{order.orderNumber}</h2><StatusBadge status={order.orderStatus} /></div>
      {order.orderItems.map(item => <div key={item.id} className="border-t pt-3"><h3 className="text-sm font-bold">{item.productName}</h3><OrderItemOptions item={item} /><p className="mt-2 text-xs">Qty: {item.quantity} · Price: ₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>)}
      <p className="text-right text-sm font-bold">Total: ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
    </article>)}
    {user?.role === 'CUSTOMER' && <div className="flex items-center justify-end gap-3"><button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Previous</button><span className="text-xs">Page {page} of {Math.max(1, pages)}</span><button disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Next</button></div>}
  </div>;
};
export default CustomerOrdersPage;
