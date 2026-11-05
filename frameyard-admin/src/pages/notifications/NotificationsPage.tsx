import React, { useMemo, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, CheckCircle2, Info, Check } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, loading, markAllAsRead, toggleNotificationRead, removeNotification } = useNotifications(false);
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');

  const { totalCount, unreadCount, readCount } = useMemo(() => ({
    totalCount: notifications.length,
    unreadCount: notifications.filter((n) => !n.read).length,
    readCount: notifications.filter((n) => n.read).length,
  }), [notifications]);

  const filteredNotifications = useMemo(() => notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  }), [notifications, filter]);

  const getIconForType = (type: string) => {
    switch (type) {
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
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-surface shadow-sm text-on-surface font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'unread' ? 'bg-surface shadow-sm text-on-surface font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
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
                  <h4 className={`font-semibold ${notification.read ? 'text-on-surface' : 'text-primary'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-xs text-on-surface-variant whitespace-nowrap">
                    {new Date(notification.date).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${notification.read ? 'text-on-surface-variant' : 'text-on-surface'}`}>
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
    </div>
  );
};

export default NotificationsPage;
