import { getStockStatus, normalizeStock } from '../../utils/stock';
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import StatusBadge from '../../components/ui/StatusBadge';
import brandLogo from '../../assets/fy-logo-icon.jpeg';
import { dismissToast, showError, showLoading, showSuccess } from '../../utils/toast';
import { useNavigate, Link } from 'react-router-dom';
import useProducts from '../../hooks/useProducts';
import useOrders from '../../hooks/useOrders';
import useCustomers from '../../hooks/useCustomers';
import { useOrderStore } from '../../store/orderStore';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import { 
  ShoppingBag, 
  Users, 
  Package, 
  ArrowRight,
  IndianRupee,
  Download
} from 'lucide-react';

import {revenueDateParts,revenueDateRange,revenueChartData,revenueOrdersInRange,type RevenueRange as ReportRange} from "./revenue-calendar";
const RevenueChart = lazy(() => import('./RevenueChart'));

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const reportExportLock = useRef(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const { products, pagination: productPagination, fetchProducts } = useProducts(false);
  const { orders, pagination: orderPagination, summary: orderSummary, fetchOrders } = useOrders(false);
  const { total: customerTotal, fetchCustomers } = useCustomers(false);
  const [clock,setClock]=useState(()=>new Date());
  const today=revenueDateParts(clock);
  useEffect(()=>{
    const refresh=()=>setClock(new Date());
    const timer=window.setInterval(refresh,30000);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[]);
  const [reportRange, setReportRange] = useState<ReportRange>('month');
  const [reportFromDate, setReportFromDate] = useState(
    today.key.slice(0,7)+"-01"
  );
  const [reportToDate, setReportToDate] = useState(today.key);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts({ page: 1, limit: 50, isActive: true });
    }
  }, [fetchProducts, products.length]);

  useEffect(() => {
    fetchOrders({ page: 1, limit: 100, dateFilter: 'all' }, { silent: useOrderStore.getState().orders.length > 0 });
  }, [fetchOrders,today.key]);

  useEffect(() => {
    if (customerTotal === 0) {
      fetchCustomers(1, 1);
    }
  }, [customerTotal, fetchCustomers]);

  const reportDateRange=useMemo(()=>revenueDateRange(reportRange,clock,reportFromDate,reportToDate),[reportRange,clock,reportFromDate,reportToDate]);
  const reportOrders=useMemo(()=>revenueOrdersInRange(orders,reportDateRange),[orders,reportDateRange]);

  const calculatedRevenue = orders.reduce(
    (sum, o) => (o.orderStatus !== 'CANCELLED' ? sum + Number(o.totalAmount || 0) : sum),
    0
  );
  const calculatedOrders = orderPagination.total;
  const calculatedCustomers = customerTotal;
  const calculatedProducts = productPagination.total;

  const chartData=useMemo(()=>revenueChartData(reportOrders,reportRange,reportDateRange),[reportOrders,reportRange,reportDateRange]);

  const reportRevenue = reportOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  const handleDownloadRevenueReport = async () => {
    if (reportExportLock.current) return;
    reportExportLock.current = true;
    setGeneratingReport(true);
    const toastId = 'revenue-report-export';
    let notified = false;
    showLoading('Please wait, your report is being generated...', toastId);
    try {
      await new Promise(resolve => window.setTimeout(resolve, 30));
      const { createRevenueReportPdf } = await import('../../utils/revenue-report-pdf');
      const logoResponse = await fetch(brandLogo, { signal: AbortSignal.timeout(15_000) });
      if (!logoResponse.ok) throw new Error('Unable to load report branding');
      const logo = new Uint8Array(await logoResponse.arrayBuffer());
      const generatedAt = new Date();
      const doc = createRevenueReportPdf({
        range: reportDateRange.label, generatedAt, logo,
        totalRevenue: reportRevenue, paidActiveOrders: reportOrders.length,
        averageOrderValue: reportOrders.length ? reportRevenue / reportOrders.length : 0,
        orders: reportOrders,
      });
      doc.save(`revenue-report-${generatedAt.toISOString().slice(0, 10)}.pdf`);
      showSuccess('Revenue report downloaded successfully', { id: toastId });
      notified = true;
    } catch {
      showError('Unable to generate the revenue report. Please try again.', { id: toastId });
      notified = true;
    } finally {
      if (!notified) dismissToast(toastId);
      reportExportLock.current = false;
      setGeneratingReport(false);
    }
  };


  // Recent 4 orders
  const recentOrders = orders.slice(0, 4);

  // Filter low stock products from products store
  const lowStockAlerts = products
    .flatMap(p => p.variants.map(v => ({
      name: p.name,
      variantName: v.frameSize,
      stock: normalizeStock(v.stockQuantity),
      productId: p.id,
      status: getStockStatus(v.stockQuantity)
    })))
    .filter(item => item.status.key !== 'in')
    .slice(0, 4);

  const displayLowStock = lowStockAlerts;

  // Order Fulfillment quantities
  const pendingCount = orderSummary.pendingCount;
  const processingCount = orderSummary.processingCount;
  const shippedCount = orderSummary.shippedCount;
  const deliveredCount = orderSummary.deliveredCount;
  const cancelledCount = orderSummary.cancelledCount;
  const navigateToOrdersByStatus = (status: string) => {
    navigate(`/admin/orders?status=${status}`);
  };



  const getStockStatusBadge = (status: ReturnType<typeof getStockStatus>) => <Badge type={status.type} className="font-bold">{status.label}</Badge>;
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-on-surface mb-1">Overview</h2>
        <p className="text-sm text-on-surface-variant">Your store's performance at a glance.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Revenue"
          value={`₹${calculatedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={IndianRupee}
        />
        <KpiCard
          title="Total Orders"
          value={calculatedOrders.toLocaleString('en-US')}
          icon={ShoppingBag}
          onClick={() => navigate('/admin/orders')}
        />
        <KpiCard
          title="Total Customers"
          value={calculatedCustomers.toLocaleString('en-US')}
          icon={Users}
          onClick={() => navigate('/admin/customers')}
        />
        <KpiCard
          title="Active Products"
          value={calculatedProducts}
          icon={Package}
          onClick={() => navigate('/admin/products')}
        />
      </div>

      {/* Recharts Chart & Fulfillment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Revenue ({reportDateRange.label})</h3>
              <p className="mt-1 text-xs text-on-surface-variant">
                INR {reportRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from {reportOrders.length} orders
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
              <select
                value={reportRange}
                onChange={(event) => setReportRange(event.target.value as ReportRange)}
                className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-center text-xs font-semibold text-on-surface outline-none [text-align-last:center]"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              {reportRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(event) => setReportFromDate(event.target.value)}
                    className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface outline-none"
                  />
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(event) => setReportToDate(event.target.value)}
                    className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface outline-none"
                  />
                </>
              )}
              <button
                onClick={handleDownloadRevenueReport}
                disabled={generatingReport}
                aria-busy={generatingReport}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#111827] bg-[#111827] px-3 text-xs font-semibold text-white transition-colors hover:bg-black"
              >
                <Download className="h-3.5 w-3.5" />
                Report PDF
            </button>
            </div>
          </div>
          
          <div className="w-full h-64 mt-auto">
            <Suspense fallback={<div className="h-full w-full animate-pulse rounded-lg bg-black/[0.04]" />}>
              <RevenueChart data={chartData} />
            </Suspense>
          </div>
        </div>

        {/* Fulfillment Breakdown */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-6">Order Fulfillment</h3>
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('PLACED')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#f59e0b' }} />
                <span className="text-xs font-semibold text-on-surface">Pending Payment</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{pendingCount}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('PROCESSING')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#3b82f6' }} />
                <span className="text-xs font-semibold text-on-surface">Processing</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{processingCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('SHIPPED')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#16a34a' }} />
                <span className="text-xs font-semibold text-on-surface">Shipped</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{shippedCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('DELIVERED')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#1d4ed8' }} />
                <span className="text-xs font-semibold text-on-surface">Delivered</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{deliveredCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer mt-auto" onClick={() => navigateToOrdersByStatus('CANCELLED')}>
              <div className="flex items-center gap-3">
                <span className="block h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#ef3340' }} />
                <span className="text-xs font-semibold text-on-surface">Cancelled</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{cancelledCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Recent Orders Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-secondary text-xs font-semibold">
                  <th className="p-4 uppercase tracking-wider">Order Number</th>
                  <th className="p-4 uppercase tracking-wider">Customer</th>
                  <th className="p-4 uppercase tracking-wider">Address</th>
                  <th className="p-4 uppercase tracking-wider text-right">Amount</th>
                  <th className="p-4 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-outline-variant/30 text-on-surface">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-semibold text-primary">{order.orderNumber}</td>
                    <td className="p-4 text-on-surface-variant">{order.user?.name || 'Unknown Customer'}</td>
                    <td className="p-4 font-semibold text-primary">{order.addressLine}</td>
                    <td className="p-4 text-right font-semibold">₹{Number(order.totalAmount).toFixed(2)}</td>
                    <td className="p-4"><StatusBadge status={order.orderStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Low Stock Alerts</h3>
            <Link to="/admin/products" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Manage Inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-secondary text-xs font-semibold">
                  <th className="p-4 uppercase tracking-wider">Product Name</th>
                  <th className="p-4 uppercase tracking-wider">Variant</th>
                  <th className="p-4 uppercase tracking-wider text-right">Stock</th>
                  <th className="p-4 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-outline-variant/30 text-on-surface">
                {displayLowStock.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-semibold">{item.name}</td>
                    <td className="p-4 text-on-surface-variant">{item.variantName}</td>
                    <td className="p-4 text-right font-bold text-error">{item.stock}</td>
                    <td className="p-4">{getStockStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OverviewPage;

