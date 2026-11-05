import { create } from 'zustand';
import { Notification } from '../types';
import { notificationService } from '../services/notification.service';
import { toast } from 'react-hot-toast';

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(523.25, audioCtx.currentTime, 0.35); // C5
    playTone(659.25, audioCtx.currentTime + 0.1, 0.4); // E5
  } catch (err) {
    console.error("Failed to play notification sound", err);
  }
};

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  fetchNotifications: (isBackground?: boolean) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleNotificationRead: (id: string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}

let notificationFetchPromise: Promise<void> | null = null;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  loading: false,
  error: null,

  fetchNotifications: async (isBackground = false) => {
    if (notificationFetchPromise) return notificationFetchPromise;
    if (!isBackground) {
      set({ loading: true, error: null });
    }
    notificationFetchPromise = (async () => {
      try {
        const data = await notificationService.getNotifications();
        const currentNotifications = useNotificationStore.getState().notifications;
      
      if (currentNotifications.length > 0) {
        const currentIds = new Set(currentNotifications.map(n => n.id));
        const hasNewUnread = data.some(n => !n.read && !currentIds.has(n.id));
        if (hasNewUnread) {
          playNotificationSound();
        }
      }
      
        const changed = JSON.stringify(currentNotifications) !== JSON.stringify(data);
        if (changed) set({ notifications: data, loading: false, error: null });
        else if (!isBackground) set({ loading: false, error: null });
      } catch (err: any) {
        if (!isBackground) set({ error: err.response?.data?.message || 'Failed to fetch notifications', loading: false });
      } finally {
        notificationFetchPromise = null;
      }
    })();

    return notificationFetchPromise;
  },

  markAllAsRead: async () => {
    const originalNotifications = useNotificationStore.getState().notifications;
    // Optimistically update all to read: true
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    const toastId = toast.success("All notifications marked as read");

    try {
      const updated = await notificationService.markAllRead();
      set({ notifications: updated });
    } catch (err: any) {
      // Revert on error
      set({ notifications: originalNotifications });
      toast.error(err.response?.data?.message || 'Failed to mark notifications as read', { id: toastId });
    }
  },

  toggleNotificationRead: async (id: string) => {
    const originalNotifications = useNotificationStore.getState().notifications;
    const target = originalNotifications.find((n) => n.id === id);
    if (!target) return;

    const newReadStatus = true;

    // Optimistically toggle read status
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: newReadStatus } : n)),
    }));
    
    const message = "Marked as read";
    const toastId = toast.success(message);

    try {
      const updated = await notificationService.toggleRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
      }));
    } catch (err: any) {
      // Revert on error
      set({ notifications: originalNotifications });
      toast.error(err.response?.data?.message || 'Failed to update notification read status', { id: toastId });
    }
  },

  removeNotification: async (id: string) => {
    const originalNotifications = useNotificationStore.getState().notifications;

    // Optimistically filter out the removed notification
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    const toastId = toast.success("Notification removed");

    try {
      await notificationService.deleteNotification(id);
    } catch (err: any) {
      // Revert on error
      set({ notifications: originalNotifications });
      toast.error(err.response?.data?.message || 'Failed to delete notification', { id: toastId });
    }
  },
}));
