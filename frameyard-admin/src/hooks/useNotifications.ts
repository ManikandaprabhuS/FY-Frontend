import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, refreshAdminNotifications } from '../store/notificationStore';
import { subscribeNotificationEvents } from '../services/notification-realtime';

export const useNotifications = (autoFetch = false) => {
  const owner = useAuthStore(state => state.user && state.user.role !== 'CUSTOMER' ? `${state.user.role}:${state.user.id}` : null);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const loading = useNotificationStore((state) => state.loading);
  const error = useNotificationStore((state) => state.error);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const toggleNotificationRead = useNotificationStore((state) => state.toggleNotificationRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  useEffect(() => {
    if (!autoFetch) return;
    useNotificationStore.getState().setOwner(owner);
    const stopAuth = useAuthStore.subscribe(state => useNotificationStore.getState().setOwner(state.user && state.user.role !== 'CUSTOMER' ? `${state.user.role}:${state.user.id}` : null));
    if (!owner) return stopAuth;

    if (useNotificationStore.getState().notifications.length === 0) {
      void fetchNotifications(false);
    }

    const refresh = () => {
      if (document.visibilityState === 'visible') refreshAdminNotifications();
    };
    const user = useAuthStore.getState().user!;
    const unsubscribe = subscribeNotificationEvents(user.id, user.role, refresh);

    return () => {
      unsubscribe(); stopAuth();
    };
  }, [autoFetch, fetchNotifications, owner]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAllAsRead: () => markAllAsRead(useAuthStore.getState().user ?? undefined),
    toggleNotificationRead: (id: string) => toggleNotificationRead(id, useAuthStore.getState().user ?? undefined),
    removeNotification,
  };
};
export default useNotifications;
