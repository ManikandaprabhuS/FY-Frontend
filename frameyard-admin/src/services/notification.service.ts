import type { Notification, NotificationReader, NotificationType } from '../types';
import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';

type BackendNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  readById?: string | null;
  readBy?: NotificationReader | null;
  createdAt: string;
};

const normalizeNotification = (notification: BackendNotification): Notification => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  read: notification.read,
  readBy: notification.readBy ?? null,
  date: notification.createdAt,
});

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get<ApiEnvelope<{ notifications: BackendNotification[]; pagination: Pagination }>>('/notifications', {
      params: { page: 1, limit: 100 },
    });
    const notifications = response.data.data.notifications.map(normalizeNotification);
    return notifications;
  },

  markAllRead: async (): Promise<Notification[]> => {
    await api.patch('/notifications/read-all');
    return notificationService.getNotifications();
  },

  toggleRead: async (id: string): Promise<Notification> => {
    const response = await api.patch<ApiEnvelope<{ notification: BackendNotification }>>(`/notifications/${id}/read`);
    return normalizeNotification(response.data.data.notification);
  },

  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    await api.delete(`/notifications/${id}`);
    return { success: true };
  },
};
