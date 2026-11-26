import { create } from 'zustand';
import { Notification, type NotificationReader } from '../types';
import { notificationService } from '../services/notification.service';
import { showSuccess, showError } from '../utils/toast';

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
  owner: string | null;
  setOwner: (owner: string | null) => void;
  notifications: Notification[];
  unreadCount: number;
  ingestPage: (notifications: Notification[], unreadCount: number) => void;
  loading: boolean;
  error: string | null;
  fetchNotifications: (isBackground?: boolean) => Promise<void>;
  markAllAsRead: (reader?: NotificationReader) => Promise<void>;
  toggleNotificationRead: (id: string, reader?: NotificationReader) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}

let notificationFetchPromise: Promise<void> | null = null;
let readVersion = 0;
let ownerGeneration = 0;
const pendingReads = new Set<string>();
let eventRefreshRunning = false, eventRefreshPending = false;
export const refreshAdminNotifications = () => {
  if (document.hidden || !useNotificationStore.getState().owner) return;
  eventRefreshPending = true;
  if (eventRefreshRunning) return;
  eventRefreshRunning = true;
  const generation = ownerGeneration;
  void (async () => {
    try {
      while (eventRefreshPending && !document.hidden && generation === ownerGeneration) {
        if (pendingReads.size) { await new Promise(resolve => setTimeout(resolve, 200)); continue; }
        eventRefreshPending = false;
        await useNotificationStore.getState().fetchNotifications(true);
      }
    } finally {
      eventRefreshRunning = false;
      if (eventRefreshPending && !document.hidden && useNotificationStore.getState().owner) refreshAdminNotifications();
    }
  })();
};
const mergeNotifications = (current: Notification[], incoming: Notification[], preserveRead = false) => {
  const merged = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) {
    const previous = merged.get(item.id);
    merged.set(item.id, preserveRead && previous?.read && !item.read ? previous : item);
  }
  return [...merged.values()].sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()) || a.id.localeCompare(b.id));
};

export const useNotificationStore = create<NotificationState>((set) => ({
  owner: null,
  setOwner: owner => {
    if (useNotificationStore.getState().owner === owner) return;
    ownerGeneration++; readVersion++; pendingReads.clear(); notificationFetchPromise = null;
    set({ owner, notifications: [], unreadCount: 0, loading: false, error: null });
  },
  notifications: [],
  unreadCount: 0,
  ingestPage: (notifications, unreadCount) => set(state => ({
    notifications: mergeNotifications(state.notifications, notifications, true),
    unreadCount: pendingReads.size ? state.unreadCount : Math.max(0, unreadCount - notifications.filter(item => !item.read && state.notifications.some(current => current.id === item.id && current.read)).length),
  })),
  loading: false,
  error: null,

  fetchNotifications: async (isBackground = false) => {
    const generation = ownerGeneration;
    if (notificationFetchPromise) return notificationFetchPromise;
    if (!isBackground) {
      set({ loading: true, error: null });
    }
    notificationFetchPromise = (async () => {
      try {
        const version = readVersion;
        const snapshot = await notificationService.listPage(1, undefined, 100);
        if (generation !== ownerGeneration) return;
        if (version !== readVersion || pendingReads.size) { set({ loading: false }); return; }
        const data = snapshot.notifications;
        set({ unreadCount: snapshot.summary.unreadCount });
        const currentNotifications = useNotificationStore.getState().notifications;
      
      if (currentNotifications.length > 0) {
        const currentIds = new Set(currentNotifications.map(n => n.id));
        const hasNewUnread = data.some(n => !n.read && !currentIds.has(n.id));
        if (hasNewUnread) {
          playNotificationSound();
        }
      }
      
        const merged = mergeNotifications(currentNotifications, data);
        const changed = JSON.stringify(currentNotifications) !== JSON.stringify(merged);
        if (changed) set({ notifications: merged, loading: false, error: null });
        else if (!isBackground) set({ loading: false, error: null });
      } catch (err: any) {
        if (!isBackground && generation === ownerGeneration) set({ error: err.response?.data?.message || 'Failed to fetch notifications', loading: false });
      } finally {
        if (generation === ownerGeneration) notificationFetchPromise = null;
      }
    })();

    return notificationFetchPromise;
  },

  markAllAsRead: async (reader) => {
    const generation = ownerGeneration;
    if (pendingReads.size) return;
    const state = useNotificationStore.getState();
    const ids = new Set(state.notifications.filter(n => !n.read).map(n => n.id));
    const previousCount = state.unreadCount;
    if (!previousCount) return;
    pendingReads.add('*'); readVersion++;
    set({ notifications: state.notifications.map(n => n.read ? n : ({ ...n, read: true, readBy: reader ?? n.readBy })), unreadCount: 0 });
    const toastId = 'notifications-read-all';
    showSuccess('Marked as read', { id: toastId });
    try {
      const unreadCount = await notificationService.markAllRead();
      if (generation !== ownerGeneration) return;
      set({ unreadCount });
    } catch {
      if (generation !== ownerGeneration) return;
      set(current => ({ notifications: current.notifications.map(n => ids.has(n.id) ? state.notifications.find(original => original.id === n.id) ?? n : n), unreadCount: previousCount }));
      showError('Failed to mark notifications as read', { id: toastId, retry: () => { void useNotificationStore.getState().markAllAsRead(reader); } });
    } finally { if (generation === ownerGeneration) { pendingReads.delete('*'); readVersion++; } }
  },

  toggleNotificationRead: async (id: string, reader) => {
    const generation = ownerGeneration;
    if (pendingReads.has(id) || pendingReads.has('*')) return;
    const target = useNotificationStore.getState().notifications.find(n => n.id === id);
    if (!target || target.read) return;
    pendingReads.add(id); readVersion++;
    set(state => ({ notifications: state.notifications.map(n => n.id === id ? { ...n, read: true, readBy: reader ?? n.readBy } : n), unreadCount: Math.max(0, state.unreadCount - 1) }));
    const toastId = 'notification-read-' + id;
    showSuccess('Marked as read', { id: toastId });
    try {
      const result = await notificationService.toggleRead(id);
      if (generation !== ownerGeneration) return;
      set(state => ({ notifications: state.notifications.map(n => n.id === id ? result.notification : n), ...(pendingReads.size === 1 ? { unreadCount: Math.min(state.unreadCount, result.unreadCount) } : {}) }));
    } catch {
      if (generation !== ownerGeneration) return;
      set(state => ({ notifications: state.notifications.map(n => n.id === id ? target : n), unreadCount: state.unreadCount + 1 }));
      showError('Failed to update notification read status', { id: toastId, retry: () => { void useNotificationStore.getState().toggleNotificationRead(id, reader); } });
    } finally { if (generation === ownerGeneration) { pendingReads.delete(id); readVersion++; } }
  },
  removeNotification: async (id: string) => {
    const generation = ownerGeneration;
    const originalNotifications = useNotificationStore.getState().notifications;

    // Optimistically filter out the removed notification
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    const toastId = showSuccess("Notification removed");

    try {
      await notificationService.deleteNotification(id);
    } catch (err: any) {
      if (generation !== ownerGeneration) return;
      // Revert on error
      set({ notifications: originalNotifications });
      showError(err.response?.data?.message || 'Failed to delete notification', { id: toastId });
    }
  },
}));
