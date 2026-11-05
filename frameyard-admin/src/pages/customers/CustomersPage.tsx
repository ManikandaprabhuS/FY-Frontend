import React, { useState, useEffect } from 'react';
import { useCustomers } from '../../hooks/useCustomers';
import { Link, useSearchParams } from 'react-router-dom';
import { DataTable } from '../../components/tables/DataTable';
import Badge from '../../components/ui/Badge';
import { Search, Download,Mail, Phone, ShoppingBag, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Customer } from '../../types';
import { showError, showSuccess } from '../../utils/toast';
import { orderService } from '../../services/order.service';



const getCustomerStatus = (customer: Customer): 'new' | 'active' | 'inactive' => {
  const daysSinceJoin = (Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceJoin <= 30) return 'new';
  if (!customer.isActive) return 'inactive';
  return 'active';
};

const getStatusBadgeType = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'new': return 'info';
    case 'inactive': return 'neutral';
    default: return 'neutral';
  }
};

const formatOrderId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;
const getTotalSpent = (customer: Customer) =>
  customer.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

export const CustomersPage: React.FC = () => {
 const { customers, loading, totalPages, fetchCustomers } = useCustomers(false);
  const [searchParams] = useSearchParams();
  const requestedSearch = searchParams.get('search') ?? '';
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(requestedSearch);
  const PAGE_SIZE = 8;
  useEffect(() => {
  fetchCustomers(currentPage, PAGE_SIZE, requestedSearch);}, [currentPage, fetchCustomers, requestedSearch]);
  useEffect(() => { setSearchTerm(requestedSearch); setCurrentPage(1); }, [requestedSearch]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const exportCustomerReport = async () => {
  try {
  const orderIds = [...new Set(customers.flatMap((customer) => customer.orders.map((order) => order.id)))];
  const detailedOrders = await Promise.all(orderIds.map((orderId) => orderService.getOrderById(orderId)));
  const detailsById = new Map(detailedOrders.map((order) => [order.id, order]));
  const rows = customers.flatMap((customer) => {

    if (customer.orders.length === 0) {
      return [{
        CustomerName: customer.name,
        Email: customer.email,
        Phone: customer.phoneNumber,
        Address: customer.addressLine,
        City: customer.cityName,
        State: customer.stateName,
        OrderNumber: "",
        OrderStatus: "",
        ProductName: "",
        FrameSize: "",
        MountType: "",
        GlassType: "",
        Quantity: "",
        Price: "",
        Subtotal: "",
      }];
    }

    return customer.orders.flatMap((summaryOrder: any) => {
      const order: any = detailsById.get(summaryOrder.id) || summaryOrder;
      const items = Array.isArray(order.orderItems) && order.orderItems.length > 0
        ? order.orderItems
        : [null];
      return items.map((item: any) => ({
        CustomerName: customer.name,
        Email: customer.email,
        Phone: customer.phoneNumber,
        Address: customer.addressLine,
        City: customer.cityName,
        State: customer.stateName,

        OrderNumber: order.orderNumber || order.id || '',
        OrderStatus: order.orderStatus,

        ProductName: item?.productName || '',
        FrameSize: item?.frameSize || '',
        MountType: item?.mountType || '',
        GlassType: item?.glassType || '',
        Quantity: item?.quantity ?? '',
        Price: item?.price ?? order.totalAmount ?? '',
        Subtotal: item?.subtotal ?? order.totalAmount ?? '',
      }));

    });

  });

  const columns = ['CustomerName', 'Email', 'Phone', 'Address', 'City', 'State', 'OrderNumber', 'OrderStatus', 'ProductName', 'FrameSize', 'MountType', 'GlassType', 'Quantity', 'Price', 'Subtotal'];
  const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csvContent = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCsv((row as Record<string, unknown>)[column]))
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(
    [csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `customers-report-${Date.now()}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
  showSuccess('Customer export downloaded successfully');
  } catch (error) {
    console.error('Customer export failed:', error);
    showError('Unable to export customers');
  }
};

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phoneNumber || '').includes(searchTerm)
  );

  const headers = [
    { key: 'customer', label: 'Customer' },
    { key: 'contact', label: 'Contact' },
    { key: 'location', label: 'Location' },
    { key: 'orders', label: 'Orders', align: 'center' as const },
    { key: 'spent', label: 'Total Spent', align: 'center' as const },
    { key: 'verified', label: 'Verified', align: 'center' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
    { key: 'joined', label: 'Joined' },
  ];

  const renderRow = (customer: Customer) => {
    const status = getCustomerStatus(customer);
    const totalSpent = getTotalSpent(customer);
    const isExpanded = expandedId === customer.id;
    const hasOrders = customer.orders.length > 0;
    const location = [customer.cityName, customer.stateName, customer.countryName]
      .filter(Boolean).join(', ') || '—';

    return (
      <React.Fragment key={customer.id}>
        <tr
          className="hover:bg-surface/40 transition-colors group cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : customer.id)}
        >
          {/* Customer Name + Avatar */}
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 uppercase">
                {customer.name.charAt(0)}
              </div>
              <div>
  <Link
    to={`/admin/customers/${customer.id}`}
    state={{ customer }}
    onClick={(e) => e.stopPropagation()}
    className="font-semibold text-primary hover:underline text-sm"
  >
    {customer.name}
  </Link>

  <div className="text-[11px] text-on-surface-variant">
    ID: {customer.id.slice(0, 8)}…
  </div>
</div>
            </div>
          </td>

          {/* Contact */}
          <td className="px-6 py-4">
            <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[180px]">{customer.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{customer.phoneNumber || '—'}</span>
              </div>
            </div>
          </td>

          {/* Location */}
          <td className="px-6 py-4">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{location}</span>
            </div>
          </td>

          {/* Orders count */}
          <td className="px-6 py-4 text-center">
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              hasOrders
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}>
              {customer.orders.length}
            </span>
          </td>

          {/* Total Spent */}
          <td className="px-6 py-4 text-center">
            <span className={`text-sm font-semibold ${totalSpent > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
              {totalSpent > 0 ? `₹${totalSpent.toFixed(2)}` : '—'}
            </span>
          </td>

          {/* Email Verified */}
          <td className="px-6 py-4 text-center">
            {customer.isEmailVerified
              ? <CheckCircle className="w-4 h-4 text-success inline" />
              : <XCircle className="w-4 h-4 text-error inline" />
            }
          </td>

          {/* Status */}
          <td className="px-6 py-4 text-center">
            <Badge type={getStatusBadgeType(status) as any}>
              {status === 'new' ? '🌱 New' : status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </td>

          {/* Joined Date */}
          <td className="px-6 py-4 text-xs text-on-surface-variant">
            {new Date(customer.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </td>
        </tr>

        {/* Expanded Order IDs Row */}
        {isExpanded && (
          <tr className="bg-surface-container/40">
            <td colSpan={8} className="px-6 py-4">
              <div className="flex items-start gap-3">
                <ShoppingBag className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                    Order History
                  </p>
                  {hasOrders ? (
                    <div className="flex flex-wrap gap-2">
                      {customer.orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center gap-2 bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-xs"
                        >
                          <span className="font-mono font-semibold text-primary">
                            {formatOrderId(order.id)}
                          </span>
                          <span className="text-on-surface-variant">·</span>
                          <span className={`font-medium capitalize ${
                            order.orderStatus === 'DELIVERED' ? 'text-success' :
                            order.orderStatus === 'CANCELLED' ? 'text-error' :
                            order.orderStatus === 'SHIPPED' ? 'text-primary' :
                            'text-on-surface-variant'
                          }`}>
                            {order.orderStatus.toLowerCase()}
                          </span>
                          <span className="text-on-surface-variant">·</span>
                          <span className="font-semibold text-on-surface">₹{Number(order.totalAmount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant italic">
                      <span className="text-lg">🖼️</span>
                      <span>No frames ordered yet — their wall is waiting for some art!</span>
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderCard = (customer: Customer) => {
    const status = getCustomerStatus(customer);
    const totalSpent = getTotalSpent(customer);
    const hasOrders = customer.orders.length > 0;

    return (
      <div key={customer.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 text-primary flex items-center justify-center font-bold uppercase">
              {customer.name.charAt(0)}
            </div>
            <div>
            <Link
              to={`/admin/customers/${customer.id}`}
              state={{ customer }}
              className="font-semibold text-sm text-primary hover:underline"
            >
                {customer.name}
              </Link>
              <Badge type={getStatusBadgeType(status) as any} className="mt-1 text-[10px]">
                {status === 'new' ? '🌱 New' : status}
              </Badge>
            </div>
          </div>
          {customer.isEmailVerified
            ? <CheckCircle className="w-4 h-4 text-success" />
            : <XCircle className="w-4 h-4 text-error" />
          }
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{customer.email}</div>
          <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{customer.phoneNumber || '—'}</div>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center pt-3 border-t border-outline-variant">
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Orders</span>
            <span className="font-bold text-sm text-on-surface">{customer.orders.length}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Spent</span>
            <span className="font-bold text-sm text-primary">{totalSpent > 0 ? `₹${totalSpent.toFixed(2)}` : '—'}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Joined</span>
            <span className="text-xs text-on-surface">{new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
          </div>
        </div>

        {/* Orders */}
        <div className="pt-2 border-t border-outline-variant/50">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Orders</p>
            <Link
              to={`/admin/customers/${customer.id}`}
              state={{ customer }}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              View details
            </Link>
          </div>
          {hasOrders ? (
            <div className="flex flex-wrap gap-1.5">
              {customer.orders.slice(0, 3).map((order) => (
                <span
                  key={order.id}
                  className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold"
                >
                  {formatOrderId(order.id)}
                </span>
              ))}
              {customer.orders.length > 3 && (
                <span className="text-[10px] text-on-surface-variant px-1 py-0.5">+{customer.orders.length - 3} more</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-on-surface-variant italic">🖼️ No frames ordered yet</p>
          )}
        </div>
      </div>
    );
  };

  // Summary metrics
  const totalCustomers = customers.length;
  const withOrders = customers.filter(c => c.orders.length > 0).length;
  const now = new Date();

const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

const previousMonth =
  currentMonth === 0 ? 11 : currentMonth - 1;

const previousMonthYear =
  currentMonth === 0
    ? currentYear - 1
    : currentYear;

const newThisMonth = customers.filter((c) => {
  const date = new Date(c.createdAt);

  return (
    date.getMonth() === currentMonth &&
    date.getFullYear() === currentYear
  );
}).length;

const newLastMonth = customers.filter((c) => {
  const date = new Date(c.createdAt);

  return (
    date.getMonth() === previousMonth &&
    date.getFullYear() === previousMonthYear
  );
}).length;

const growthPercentage =
  newLastMonth === 0
    ? 100
    : Math.round(
        ((newThisMonth - newLastMonth) /
          newLastMonth) *
          100
      );
  const verifiedCount = customers.filter(c => c.isEmailVerified).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-1">
            <span className="text-primary font-semibold">Customers</span>
          </nav>
          <h2 className="text-3xl font-bold text-on-surface">Customers</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            All registered customers — click a row to expand order history.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface-variant">Total Customers</span>
          <span className="text-2xl font-bold text-on-surface">{totalCustomers}</span>
          <span className="text-[11px] text-tertiary font-medium">All registered users</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface-variant">Have Ordered</span>
          <span className="text-2xl font-bold text-primary">{withOrders}</span>
          <span className="text-[11px] text-on-surface-variant/80">Placed at least 1 order</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface-variant">New This Month</span>
          <span className="text-2xl font-bold text-secondary">{newThisMonth}</span>
          <span className={`text-[11px] font-medium ${growthPercentage >= 0? 'text-success': 'text-error'}`}
>
  {growthPercentage >= 0 ? '↑' : '↓'}{' '}
  {Math.abs(growthPercentage)}%
  vs last month
</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface-variant">Email Verified</span>
          <span className="text-2xl font-bold text-on-surface">{verifiedCount}</span>
          <span className="text-[11px] text-success font-medium">Confirmed accounts</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-[18px] h-[18px]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-sm font-semibold text-secondary hover:text-on-surface transition-colors"
          >
            Clear
          </button>
        )}
  <button onClick={exportCustomerReport} className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface transition-colors flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        <span className="ml-auto text-xs text-on-surface-variant hidden md:block">
          {filteredCustomers.length} of {totalCustomers} customers
        </span>
      </div>
      {/* Data Table */}
      <DataTable
        headers={headers}
        items={filteredCustomers}
        renderRow={renderRow}
        renderCard={renderCard}
        loading={loading}
        emptyTitle="No customers found"
        emptyMessage={
          searchTerm
            ? `No customers match "${searchTerm}".`
            : "No customers have registered yet. Share your store link to get started!"
        }
      />
      <div className="flex items-center justify-center gap-3 mt-6">
  <button
    onClick={() =>
      setCurrentPage((prev) =>
        Math.max(prev - 1, 1)
      )
    }
    disabled={currentPage === 1}
    className="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-50"
  >
    Previous
  </button>

  <span className="text-sm font-medium">
    Page {currentPage} of {totalPages}
  </span>

  <button
    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
    disabled={currentPage >= totalPages}
    className="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-50"
  >
    Next
  </button>
</div>
    </div>
  );
  
};



export default CustomersPage;
