import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../types';
import { orderService } from '../../services/order.service';
import { showWarning, showError } from '../../utils/toast';

/** Text nodes only: notification content is never interpreted as HTML. */
export default function NotificationOrderText({ text, notification, onRead, onNavigate }: {
  text: string; notification: Notification & { orderId?: string }; onRead: () => void; onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const busy = useRef(false);
  const stored = notification.orderId;
  const number = stored && /^FY-[A-Za-z0-9]+$/.test(stored)
    ? stored : `${notification.title} ${notification.message}`.match(/\bFY-[A-Za-z0-9]+\b/)?.[0];
  if (!number) return <>{text}</>;
  const parts = text.split(number);
  const href = '/admin/orders?search=' + encodeURIComponent(number);
  return <>{parts.map((part, index) => <span key={index}>{index > 0 && <a href={href}
    className="font-bold hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    onClick={async event => {
      event.stopPropagation();
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (busy.current) return;
      busy.current = true;
      onRead();
      try {
        const result = await orderService.getOrders({ search: number, page: 1, limit: 5 });
        const order = result.orders.find(item => item.orderNumber === number);
        onNavigate?.();
        navigate(href + (order ? '&openOrder=' + encodeURIComponent(order.id) : ''));
        if (!order) showWarning('This order is no longer available.');
      } catch {
        showError('Could not open this order. Please try again.');
      } finally { busy.current = false; }
    }}>{number}</a>}{part}</span>)}</>;
}
