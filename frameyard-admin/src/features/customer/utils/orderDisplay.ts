import { orderStatusLabel } from "../../../components/ui/order-status";

/** Shared formatting for the customer order views (My Orders and the order page). */
export const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const valid = (value?: string) => Boolean(value && Number.isFinite(Date.parse(value)));
export const day = (value?: string) => (valid(value) ? dayFmt.format(new Date(value!)) : '-');

/**
 * Customer-facing names for the backend's statuses. Only statuses the backend sends are ever
 * shown; Out for Delivery is listed so it appears as soon as the backend starts using it.
 */
const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Order Initiated',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_TO_SHIP: 'Ready to Ship',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};
export const statusText = (status: string) => STATUS_LABELS[status] ?? orderStatusLabel(status).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
