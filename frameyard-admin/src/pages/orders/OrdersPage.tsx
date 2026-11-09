import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useOrders from '../../hooks/useOrders';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/ui/Modal';
import { Search, Calendar, ArrowRight, Eye, Mail, Phone, ShoppingCart, Download, Clock, Package, CheckCircle2, XCircle } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import StatusBadge, { OrderStatusFilter } from '../../components/ui/StatusBadge';
import OrderItemOptions from '../../components/orders/OrderItemOptions';
import { dismissToast, showError, showLoading, showSuccess, showWarning } from '../../utils/toast';
import { orderService } from '../../services/order.service';
import brandLogo from '../../assets/fy-logo-icon.jpeg';

const getSearchTermFromQueryString = (search: string) => {
  const params = new URLSearchParams(search);
  return params.get('search')?.trim() || params.get('q')?.trim() || '';
};

const orderStatuses: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const getStatusFilterFromQueryString = (search: string): 'all' | OrderStatus => {
  const status = new URLSearchParams(search).get('status')?.trim().toUpperCase();
  return orderStatuses.includes(status as OrderStatus) ? (status as OrderStatus) : 'all';
};

export const OrdersPage: React.FC = () => {
  const location = useLocation();
  const exportLock = useRef(false);
  const [exporting, setExporting] = useState(false);
  const { orders, loading, refreshing, fetchOrders, changeOrderStatus, pagination, summary } = useOrders(false);
  const [searchTerm, setSearchTerm] = useState(() => getSearchTermFromQueryString(location.search));
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => getSearchTermFromQueryString(location.search));
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>(() => getStatusFilterFromQueryString(location.search));
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const openedSearchResult = useRef('');
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('openOrder');
    const key = location.key + location.search;
    if (!id || loading || refreshing || openedSearchResult.current === key) return;
    const order = orders.find(value => value.id === id);
    if (!order) return;
    const timer = window.setTimeout(() => { openedSearchResult.current = key; setSelectedOrder(order); setDetailsModalOpen(true); }, 0);
    return () => window.clearTimeout(timer);
  }, [location.key, location.search, orders, loading, refreshing]);

  useEffect(() => {
    const nextSearchTerm = getSearchTermFromQueryString(location.search);
    const nextStatusFilter = getStatusFilterFromQueryString(location.search);
    setSearchTerm(nextSearchTerm);
    setDebouncedSearchTerm(nextSearchTerm);
    setStatusFilter(nextStatusFilter);
    setDateFilter('all');
    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchOrders({
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      status: statusFilter,
      dateFilter,
    }, {
      silent: orders.length > 0,
    });
  }, [currentPage, dateFilter, debouncedSearchTerm, fetchOrders, itemsPerPage, statusFilter]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const updated = await changeOrderStatus(orderId, newStatus);
    if (updated) {
      showSuccess('Order status updated successfully');
    } else {
      showError('Failed to update order status');
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
  };

  const exportOrdersReport = async () => {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    const toastId = 'orders-report-export';
    let notified = false;
    showLoading('Please wait, your report is being generated...', toastId);
    try {
      const report = await orderService.getExportReport({ search: debouncedSearchTerm, status: statusFilter, dateFilter });
      if (!report.orders.length) { showWarning('No records match the selected filters', { id: toastId }); notified = true; return; }
      const { createRevenueReportPdf } = await import('../../utils/revenue-report-pdf');
      const logoResponse = await fetch(brandLogo, { signal: AbortSignal.timeout(15_000) });
      if (!logoResponse.ok) throw new Error('Unable to load report branding');
      const logo = new Uint8Array(await logoResponse.arrayBuffer());
      const doc = createRevenueReportPdf({
        range: report.range, generatedAt: new Date(report.generatedAt), logo,
        totalRevenue: report.summary.totalRevenue, paidActiveOrders: report.summary.orderCount,
        averageOrderValue: report.summary.averageOrderValue, orders: report.orders,
      });
      doc.save(`orders-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      showSuccess('Orders export downloaded successfully', { id: toastId });
      notified = true;
    } catch {
      showError('Unable to export orders', { id: toastId });
      notified = true;
    } finally {
      if (!notified) dismissToast(toastId);
      exportLock.current = false;
      setExporting(false);
    }
  };


  const getCustomerName = (order: Order) => order.user?.name || 'Unknown Customer';
  const getCustomerEmail = (order: Order) => order.user?.email || 'No email';
  const getCustomerPhone = (order: Order) => order.user?.phoneNumber || order.phoneNumber;
  const getCustomerAddress = (order: Order) =>
    [order.addressLine, order.cityName, order.stateName, order.countryName, order.postalCode]
      .filter(Boolean)
      .join(', ') || 'No address';
  const getItemsCount = (order: Order) => order.orderItems.reduce((sum, item) => sum + item.quantity, 0);



  const headers = [
    { key: 'id', label: 'Order ID' },
    { key: 'customer', label: 'Customer Details' },
    { key: 'phone', label: 'Phone' },
    { key: 'items', label: 'Items', align: 'right' as const },
    { key: 'amount', label: 'Amount', align: 'right' as const },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Order Date' },
    { key: 'actions', label: 'Actions', align: 'right' as const },
  ];

  const totalPages = pagination.totalPages;
  const totalItems = pagination.total;
  const startItem = totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, totalItems);
  const isFiltered = searchTerm.trim() !== '' || statusFilter !== 'all' || dateFilter !== 'all';
  // Apply the selected status immediately while the server refreshes. This
  // keeps the table responsive on slower API/database connections.
  const visibleOrders = useMemo(
    () => statusFilter === 'all' ? orders : orders.filter((order) => order.orderStatus === statusFilter),
    [orders, statusFilter],
  );
  const emptyTitle = 'No orders found for the selected filters';
  const emptyMessage = isFiltered
    ? 'No orders match the current filters. Try clearing one of the filters or search terms.'
    : 'There are no orders to display yet.';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-outline-variant/60 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Orders Management</h2>
          <p className="mt-1 text-sm text-secondary">View, track, and manage all customer orders.</p>
        </div>

        <button
          onClick={exportOrdersReport}
          disabled={exporting || refreshing || debouncedSearchTerm !== searchTerm.trim()}
          aria-busy={exporting}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-secondary">Total Orders</span>
            <ShoppingCart className="h-4 w-4 text-secondary" />
          </div>
          <div className="text-xl font-bold text-on-surface">{summary.totalCount.toLocaleString('en-US')}</div>
          <div className="mt-1 text-[10px] text-tertiary">Total orders</div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-secondary">Pending</span>
            <Clock className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <div className="text-xl font-bold text-on-surface">{summary.pendingCount}</div>
          <div className="mt-1 text-[10px] text-secondary">Requires review</div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-secondary">Processing</span>
            <Package className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <div className="text-xl font-bold text-on-surface">{summary.processingCount}</div>
          <div className="mt-1 text-[10px] text-secondary">In fulfillment</div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-secondary">Delivered</span>
            <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <div className="text-xl font-bold text-on-surface">{summary.deliveredCount}</div>
          <div className="mt-1 text-[10px] text-secondary">Completed</div>
        </div>

        <div className="col-span-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm md:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-secondary">Cancelled</span>
            <XCircle className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <div className="text-xl font-bold text-on-surface">{summary.cancelledCount}</div>
          <div className="mt-1 text-[10px] text-secondary">Refunded</div>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-4 border-b border-outline-variant bg-surface-bright p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex w-full items-center rounded-lg border border-outline-variant bg-surface px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 sm:w-72">
              <Search className="mr-2 h-4 w-4 text-outline-variant" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border-none bg-transparent p-0 text-xs text-on-surface placeholder:text-outline-variant/80 outline-none focus:ring-0"
                placeholder="Order ID, customer, phone..."
              />
            </div>

            <div className="w-full sm:w-44">
              <OrderStatusFilter value={statusFilter} onChange={value => { setStatusFilter(value as 'all' | OrderStatus); setCurrentPage(1); }} className="w-full cursor-pointer rounded-lg border border-outline-variant px-3 py-2 text-center text-xs outline-none focus:border-primary" />
            </div>

            <div className="w-full sm:w-44">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline-variant" />
                <select
                  value={dateFilter}
                  onChange={(event) => {
                    setDateFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full cursor-pointer rounded-lg border border-outline-variant bg-surface px-10 text-center text-sm text-on-surface outline-none [text-align-last:center]"
                >
                  <option value="today">Today</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">Last 1 Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>
          {refreshing && (
            <div className="text-xs font-medium text-primary lg:ml-auto">
              Updating results...
            </div>
          )}
        </div>

        <DataTable
          headers={headers}
          items={visibleOrders}
          loading={loading}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
          renderRow={(order) => (
            <tr key={order.orderNumber} className="group border-b border-outline-variant hover:bg-surface/30 transition-colors">
              <td
                onClick={() => openOrderDetails(order)}
                className="cursor-pointer px-6 py-4 font-semibold text-primary hover:underline"
              >
                {order.orderNumber}
              </td>
              <td className="px-6 py-4">
                <div className="font-semibold text-on-surface">{getCustomerName(order)}</div>
                <div className="mt-0.5 text-[11px] text-secondary">{getCustomerEmail(order)}</div>
                <div className="mt-0.5 text-[10px] text-secondary">{getCustomerAddress(order)}</div>
              </td>
              <td className="px-6 py-4 text-on-surface-variant">{getCustomerPhone(order)}</td>
              <td className="px-6 py-4 text-right font-medium">{getItemsCount(order)}</td>
              <td className="px-6 py-4 text-right font-bold text-on-surface">₹{Number(order.totalAmount).toFixed(2)}</td>
              <td className="px-6 py-4">
                <StatusBadge status={order.orderStatus} label={`Order status for ${order.orderNumber}`} onStatusChange={status => handleStatusChange(order.id, status as OrderStatus)} />
              </td>
              <td className="px-6 py-4 text-on-surface-variant">{new Date(order.createdAt).toLocaleDateString()}</td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => openOrderDetails(order)}
                  className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-surface-container hover:text-primary"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </td>
            </tr>
          )}
          renderCard={(order) => (
            <div key={order.orderNumber} className="group relative space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    onClick={() => openOrderDetails(order)}
                    className="text-left text-xs font-bold text-primary hover:underline"
                  >
                    {order.orderNumber}
                  </button>
                  <div className="mt-1 text-sm font-semibold text-on-surface">{getCustomerName(order)}</div>
                </div>
                <StatusBadge status={order.orderStatus} label={`Order status for ${order.orderNumber}`} onStatusChange={status => handleStatusChange(order.id, status as OrderStatus)} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-on-surface-variant">
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-on-surface-variant/60">Date</span>
                  <span className="font-medium text-on-surface">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-on-surface-variant/60">Total Amount</span>
                  <span className="font-bold text-on-surface">₹{Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-outline-variant/40 pt-2">
                <span className="text-xs text-on-surface-variant">{getItemsCount(order)} items purchased</span>
                <button
                  onClick={() => openOrderDetails(order)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        />

        <div className="flex flex-col gap-3 border-t border-outline-variant px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span>
              Showing {startItem}-{endItem} of {totalItems} orders
            </span>
            {isFiltered && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter('all');
                  setCurrentPage(1);
                }}
                className="font-semibold text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={pagination.page === 1}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>

            <div className="flex items-center">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                      pagination.page === pageNum
                        ? 'bg-primary font-bold text-on-primary'
                        : 'text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={pagination.page === totalPages}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Order Details: ${selectedOrder?.orderNumber}`}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <StatusBadge status={(orders.find(order => order.id === selectedOrder.id) ?? selectedOrder).orderStatus} />
            <div className="rounded-xl border border-outline-variant bg-surface p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Customer Information</h4>
              <div className="space-y-4">
                <div className="min-w-0">
                  <span className="block text-xs text-on-surface-variant/70">Name</span>
                  <span className="mt-0.5 block font-semibold text-on-surface">{getCustomerName(selectedOrder)}</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs text-on-surface-variant/70">Email Address</span>
                  <span className="mt-0.5 flex min-w-0 items-start gap-1.5 break-words font-semibold leading-snug text-on-surface">
                    <Mail className="h-3.5 w-3.5 text-on-surface-variant" />
                    {getCustomerEmail(selectedOrder)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs text-on-surface-variant/70">Phone Number</span>
                  <span className="mt-0.5 flex min-w-0 items-start gap-1.5 break-words font-semibold leading-snug text-on-surface">
                    <Phone className="h-3.5 w-3.5 text-on-surface-variant" />
                    {getCustomerPhone(selectedOrder)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs text-on-surface-variant/70">Address</span>
                  <span className="mt-0.5 block break-words font-semibold leading-snug text-on-surface">
                    {getCustomerAddress(selectedOrder)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Items Purchased</h4>
              <div className="divide-y divide-outline-variant/40 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                {selectedOrder.orderItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{item.productName}</p>
                      <OrderItemOptions item={item} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-on-surface">₹{item.price.toFixed(2)}</p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant pt-4">
              <div>
                <span className="block text-xs text-on-surface-variant">Order Date</span>
                <span className="mt-0.5 block text-sm font-medium text-on-surface">
                  {new Date(selectedOrder.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-xs text-on-surface-variant">Total Price</span>
                <span className="mt-0.5 block text-lg font-bold text-primary">
                  ₹{Number(selectedOrder.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;

