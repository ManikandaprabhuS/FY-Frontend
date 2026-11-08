import type { CSSProperties } from 'react';
import { getOrderStatusStyle, normalizeOrderStatus, orderStatusLabel, orderStatusValues } from './order-status';
import './StatusBadge.css';

const pill = 'inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider';
const optionStyle: CSSProperties = { backgroundColor: '#ffffff', color: '#111827' };
type Props = { status: string; onStatusChange?: (status: string) => void; className?: string; label?: string };
export default function StatusBadge({ status, onStatusChange, className = '', label = 'Order status' }: Props) {
  const style = getOrderStatusStyle(status);
  if (!onStatusChange) return <span className={`${pill} ${className}`} style={style}>{orderStatusLabel(status)}</span>;
  const value = normalizeOrderStatus(status);
  return <select aria-label={label} value={value} onChange={event => onStatusChange(event.target.value)}
    className={`frameyard-order-status ${pill} cursor-pointer appearance-none text-center outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${className}`} style={{ ...style, colorScheme: 'light' }}>
    {!orderStatusValues.some(option => option === value) && <option value={value} style={optionStyle}>{orderStatusLabel(status)}</option>}
    {orderStatusValues.map(option => <option key={option} value={option} style={optionStyle}>{orderStatusLabel(option)}</option>)}
  </select>;
}
export function OrderStatusFilter({ value, onChange, className = '' }: { value: string; onChange: (status: string) => void; className?: string }) {
  return <select aria-label="Filter orders by status" value={value} onChange={event => onChange(event.target.value)}
    className={`frameyard-order-status ${className}`} style={{ ...optionStyle, colorScheme: 'light' }}>
    <option value="all" style={optionStyle}>All Statuses</option>
    {orderStatusValues.map(status => <option key={status} value={status} style={optionStyle}>{orderStatusLabel(status)}</option>)}
  </select>;
}
