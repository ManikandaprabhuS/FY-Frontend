import { useEffect } from 'react';
import { useNotificationStore } from '../store/notificationStore';

export const useNotifications = (autoFetch = false) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const loading = useNotificationStore((state) => state.loading);
  const error = useNotificationStore((state) => state.error);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const toggleNotificationRead = useNotificationStore((state) => state.toggleNotificationRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  useEffect(() => {
    if (!autoFetch) return;

    if (useNotificationStore.getState().notifications.length === 0) {
      void fetchNotifications(false);
    }

    const refresh = () => {
      if (document.visibilityState === 'visible') void fetchNotifications(true);
    };
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [autoFetch, fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAllAsRead,
    toggleNotificationRead,
    removeNotification,
  };
};
export default useNotifications;
