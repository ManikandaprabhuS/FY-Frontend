import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp, Mail, MapPin, Phone, ShoppingCart, UserRound } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { Customer, Order } from '../../types';
import { customerService } from '../../services/customer.service';

type CustomerDetails = Omit<Customer, 'orders'> & {
  role: 'CUSTOMER' | 'ADMIN';
  orders: Order[];
};

const normalizeCustomerDetails = (value: CustomerDetails): CustomerDetails => ({
  ...value,
  orders: Array.isArray(value.orders)
    ? value.orders.map((order) => ({
      ...order,
      orderNumber: order.orderNumber || order.id,
      orderItems: Array.isArray(order.orderItems) ? order.orderItems : [],
    }))
    : [],
});

const CustomerDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const initialCustomer = (location.state as { customer?: CustomerDetails } | null)?.customer ?? null;
  const [customer, setCustomer] = useState<CustomerDetails | null>(initialCustomer ? normalizeCustomerDetails(initialCustomer) : null);
  const [loading, setLoading] = useState(!initialCustomer);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const data = await customerService.getCustomerById(id as string);
        setCustomer(normalizeCustomerDetails(data as CustomerDetails));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    // The customer list passes a lightweight order summary in route state.
    // Always hydrate the detail view so expanded orders include their items.
    if (id) loadCustomer();
  }, [id]);

  const totalSpent = useMemo(
    () => customer?.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) || 0,
    [customer]
  );

  const lastOrderDate = useMemo(() => {
    if (!customer?.orders.length) return null;
    return [...customer.orders]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
      ?.createdAt;
  }, [customer]);

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

  const buildAddress = () =>
    [customer?.addressLine, customer?.cityName, customer?.stateName, customer?.countryName, customer?.postalCode]
      .filter(Boolean)
      .join(', ') || 'Not available';

  const statusTone = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'PROCESSING':
      case 'SHIPPED':
        return 'info';
      case 'CANCELLED':
        return 'error';
      case 'CONFIRMED':
      case 'PENDING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl border border-outline-variant bg-surface-container-lowest" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-24 rounded-2xl border border-outline-variant bg-surface-container-lowest" />
          <div className="h-24 rounded-2xl border border-outline-variant bg-surface-container-lowest" />
          <div className="h-24 rounded-2xl border border-outline-variant bg-surface-container-lowest" />
        </div>
        <div className="h-96 rounded-2xl border border-outline-variant bg-surface-container-lowest" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-on-surface">Customer not found.</p>
        <button
          onClick={() => navigate('/admin/customers')}
          className="mt-4 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-secondary hover:bg-surface"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-5">
        <button
          onClick={() => navigate('/admin/customers')}
          className="rounded-xl border border-outline-variant p-2 hover:bg-surface-container-low transition-colors"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <nav className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            <Link to="/admin/customers" className="hover:text-primary">
              Customers
            </Link>
            <span>&gt;</span>
            <span className="text-primary font-medium">{customer.name}</span>
          </nav>
          <h2 className="mt-0.5 text-2xl font-bold text-on-surface">Customer Profile</h2>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface/70 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-on-surface">{customer.name}</h1>
                  <Badge type={customer.isActive ? 'success' : 'neutral'}>
                    {customer.role}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">Customer ID: {customer.id}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">
                  <CalendarDays className="h-4 w-4" />
                  Joined on {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-2">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-on-surface">{customer.email}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-on-surface">{customer.phoneNumber}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </div>
                <p className="mt-2 break-words text-sm font-semibold leading-snug text-on-surface">{buildAddress()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Orders</span>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-bold text-on-surface">{customer.orders.length}</div>
            <p className="mt-1 text-xs text-on-surface-variant">Completed and active orders</p>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Spent</span>
              <UserRound className="h-4 w-4 text-secondary" />
            </div>
            <div className="mt-3 text-3xl font-bold text-secondary">{formatCurrency(totalSpent)}</div>
            <p className="mt-1 text-xs text-on-surface-variant">Lifetime spending</p>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Last Order</span>
              <CalendarDays className="h-4 w-4 text-tertiary" />
            </div>
            <div className="mt-3 text-lg font-bold text-on-surface">
              {lastOrderDate ? formatDate(lastOrderDate) : 'No orders yet'}
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">Most recent purchase date</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface px-6 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">Order History</h3>
            <p className="mt-1 text-xs text-on-surface-variant">Expandable rows with purchased items and order summary.</p>
          </div>
          <div className="text-xs font-medium text-on-surface-variant">
            {customer.orders.length} order{customer.orders.length === 1 ? '' : 's'}
          </div>
        </div>

        {customer.orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-on-surface">No orders found.</p>
            <p className="mt-1 text-xs text-on-surface-variant">This customer has not placed any orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface/60 text-xs font-semibold uppercase tracking-wider text-secondary">
                  <th className="px-6 py-4">Order Number</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/35">
                {customer.orders.map((order) => {
                  const isExpanded = expandedOrder === order.id;

                  return (
                    <React.Fragment key={order.id}>
                      <tr className="group hover:bg-surface/40 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="font-semibold text-primary hover:underline"
                          >
                            {order.orderNumber || order.id}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <Badge type={statusTone(order.orderStatus)}>
                            {order.orderStatus}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-semibold text-on-surface">{formatCurrency(Number(order.totalAmount))}</td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDate(order.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface"
                          >
                            <span>{isExpanded ? 'Hide' : 'Show'}</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-surface-container-low px-6 py-5">
                            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
                              <div className="flex flex-col gap-2 border-b border-outline-variant pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface">Order Items</h4>
                                  <p className="mt-1 text-xs text-on-surface-variant">
                                    Summary: {order.orderNumber || order.id} · {order.orderStatus} · {formatCurrency(Number(order.totalAmount))} · {formatDate(order.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-outline-variant text-xs font-semibold uppercase tracking-wider text-secondary">
                                      <th className="px-3 py-3">Product Name</th>
                                      <th className="px-3 py-3">Frame Size</th>
                                      <th className="px-3 py-3">Mount Type</th>
                                      <th className="px-3 py-3">Glass Type</th>
                                      <th className="px-3 py-3">Qty</th>
                                      <th className="px-3 py-3">Unit Price</th>
                                      <th className="px-3 py-3">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-outline-variant/25">
                                    {(Array.isArray(order.orderItems) ? order.orderItems : []).map((item) => (
                                      <tr key={item.id} className="hover:bg-surface/40">
                                        <td className="px-3 py-3 font-semibold text-on-surface">{item.productName}</td>
                                        <td className="px-3 py-3 text-on-surface-variant">{item.frameSize}</td>
                                        <td className="px-3 py-3 text-on-surface-variant">{item.mountType}</td>
                                        <td className="px-3 py-3 text-on-surface-variant">{item.glassType}</td>
                                        <td className="px-3 py-3 text-on-surface-variant">{item.quantity}</td>
                                        <td className="px-3 py-3 font-medium text-on-surface">{formatCurrency(Number(item.price))}</td>
                                        <td className="px-3 py-3 font-semibold text-on-surface">{formatCurrency(Number(item.subtotal))}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default CustomerDetailsPage;
