export const normalizeOrderStatus = (status: unknown): string => typeof status === 'string' ? status.trim().replace(/[\s_-]+/g, '_').toUpperCase() : '';
export const orderStatusStyles = {
  PENDING: { backgroundColor: '#fffbeb', color: '#92400e', borderColor: '#fcd34d' },
  APPROVED: { backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#86efac' },
  REJECTED: { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' },
  PLACED: { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' },
  PROCESSING: { backgroundColor: '#ffffff', color: '#2563eb', borderColor: '#2563eb' },
  READY_TO_SHIP: { backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' },
  SHIPPED: { backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#dcfce7' },
  DELIVERED: { backgroundColor: '#16a34a', color: '#ffffff', borderColor: '#16a34a' },
  CANCELLED: { backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fee2e2' },
  UNKNOWN: { backgroundColor: '#e5e7eb', color: '#374151', borderColor: '#e5e7eb' },
} as const;
export const getOrderStatusStyle = (status: unknown) => orderStatusStyles[normalizeOrderStatus(status) as keyof typeof orderStatusStyles] ?? orderStatusStyles.UNKNOWN;
export const orderStatusLabel = (status: unknown) => normalizeOrderStatus(status).replaceAll('_', ' ') || 'UNKNOWN';
export const orderStatusValues = ['PLACED', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
