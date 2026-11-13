import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { notificationService } from '../../services/notification.service';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import type { Notification } from '../../types';
import type { Pagination } from '../../services/contracts';
import PaginationControls from '../../components/ui/PaginationControls';
import { showError, showSuccess } from '../../utils/toast';
import { Bell, CheckCircle2, Info, Check, XCircle } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({ totalCount: 0, unreadCount: 0, readCount: 0 });
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');

  const storedNotifications = useNotificationStore(state => state.notifications);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const { totalCount } = summary;
  const readCount = Math.max(0, totalCount - unreadCount);
  const filteredNotifications = notifications.map(item => storedNotifications.find(stored => stored.id === item.id) ?? item)
    .filter(item => filter === 'all' || item.read === (filter === 'read'));
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await notificationService.listPage(page, filter === 'all' ? undefined : filter === 'read');
        if (active) { useNotificationStore.getState().ingestPage(data.notifications, data.summary.unreadCount); setNotifications(data.notifications); setPagination(data.pagination); setSummary(data.summary); setError(''); }
      } catch (failure) {
        if (active) setError(axios.isAxiosError(failure) ? failure.response?.data?.error?.message ?? 'Could not load notifications.' : 'Could not load notifications.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [page, filter, revision]);
  const mutate = async (action: () => Promise<unknown>, message: string) => {
    try { await action(); showSuccess(message); setRevision(value => value + 1); void useNotificationStore.getState().fetchNotifications(true); }
    catch (failure) { showError(axios.isAxiosError(failure) ? failure.response?.data?.error?.message ?? 'Notification could not be updated.' : 'Notification could not be updated.'); }
  };
  const markAllAsRead = () => { void useNotificationStore.getState().markAllAsRead(useAuthStore.getState().user ?? undefined); };
  const toggleNotificationRead = (id: string) => { void useNotificationStore.getState().toggleNotificationRead(id, useAuthStore.getState().user ?? undefined); };
  const removeNotification = (id: string) => { void mutate(async () => { await notificationService.deleteNotification(id); if (notifications.length === 1 && page > 1) setPage(page - 1); }, 'Notification removed'); };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ORDER_CANCELLED': return <XCircle className="w-5 h-5 text-red-700"/>;
      case 'ORDER_PLACED':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'ACCOUNT_CREATED':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-6 w-full h-full animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Notifications</h1>
          <p className="text-sm text-on-surface-variant mt-1">Stay updated with alerts and activities.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <button
              onClick={() => { setFilter('all'); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-surface shadow-sm text-on-surface font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => { setFilter('unread'); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'unread' ? 'bg-surface shadow-sm text-on-surface font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => { setFilter('read'); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'read' ? 'bg-surface shadow-sm text-on-surface font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Read ({readCount})
            </button>
          </div>
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Mark all as read</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {error && <p role="alert" className="rounded-lg border border-error/20 p-3 text-sm text-error">{error}</p>}
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-container-lowest border border-outline-variant rounded-xl" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4 text-on-surface-variant">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-on-surface">All caught up!</h3>
            <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
              You don't have any new notifications right now. Check back later.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 md:p-5 rounded-xl border transition-all ${
                notification.read
                  ? 'bg-surface-container-lowest border-outline-variant'
                  : 'bg-primary/5 border-primary/30 shadow-sm'
              } flex gap-4`}
            >
              <div className="flex-shrink-0 mt-1">
                {getIconForType(notification.type)}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`font-semibold ${notification.type==='ORDER_CANCELLED'?'text-red-700 font-bold':notification.read ? 'text-on-surface' : 'text-primary'}`}>
                    {notification.actionUrl ? <Link to={notification.actionUrl} onClick={() => toggleNotificationRead(notification.id)} className="underline-offset-4 hover:underline">{notification.title}</Link> : notification.title}
                  </h4>
                  <span className="text-xs text-on-surface-variant whitespace-nowrap">
                    {new Date(notification.date).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${notification.type==='ORDER_CANCELLED'?'text-red-700 font-bold':notification.read ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                  {notification.message}
                </p>
                {notification.readBy && (
                  <p className="mt-2 text-xs font-medium text-on-surface-variant">
                    Read by {notification.readBy.name} ({notification.readBy.role})
                  </p>
                )}
                <div className="flex gap-4 mt-3">
                  {!notification.read && (
                    <button
                      onClick={() => toggleNotificationRead(notification.id)}
                      className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-xs font-semibold text-error hover:text-error/80 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
              )}
            </div>
          ))
        )}
      </div>
      <PaginationControls pagination={{ ...pagination, total: filter === 'all' ? totalCount : filter === 'read' ? readCount : unreadCount, totalPages: Math.ceil((filter === 'all' ? totalCount : filter === 'read' ? readCount : unreadCount) / pagination.limit) }} busy={loading} onPageChange={setPage} />
    </div>
  );
};

export default NotificationsPage;
