import api from './api';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type Session = { userId: string; role: string; accessToken: string; url: string; anonKey: string };
type Listener = () => void;
type Connection = { listeners: Set<Listener>; close: () => void };
const connections = new Map<string, Connection>();
export const NOTIFICATIONS_CHANGED = 'fy:notifications-changed';

// One connection per signed-in identity, shared by the bell and notification history.
// Realtime invalidates the existing REST stores; payloads never bypass API authorization.
export function subscribeNotificationEvents(userId: string, role: string, listener: Listener) {
  const key = `${role}:${userId}`;
  let connection = connections.get(key);
  if (!connection) {
    const listeners = new Set<Listener>();
    let disposed = false, connected = false, connecting = false;
    let client: SupabaseClient | undefined, channel: RealtimeChannel | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let renewal: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 5000;
    const refresh = () => {
      if (disposed || document.hidden) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (disposed) return;
        for (const notify of listeners) notify();
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED, { detail: { userId } }));
      }, 120);
    };
    const retryConnect = () => {
      if (disposed || retry) return;
      retry = setTimeout(() => { retry = undefined; void connect(); }, retryDelay);
      retryDelay = Math.min(60000, retryDelay * 2);
    };
    const connect = async () => {
      if (disposed || connecting) return;
      connecting = true;
      try {
        const { data } = await api.get<{ data: Session }>('/auth/notification-realtime-session', { timeout: 15000 });
        const session = data.data;
        if (disposed) return;
        if (session.userId !== userId || session.role !== role) { connection?.close(); return; }
        const { createClient } = await import('@supabase/supabase-js');
        if (disposed) return;
        if (channel && client) await client.removeChannel(channel);
        client ??= createClient(session.url, session.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        await client.realtime.setAuth(session.accessToken);
        if (disposed) return;
        channel = client.channel(`fy-notifications:${key}`);
        const filter = role === 'CUSTOMER' ? `userId=eq.${userId}` : 'userId=is.null';
        for (const event of ['INSERT', 'UPDATE'] as const) {
          channel.on('postgres_changes', { event, schema: 'public', table: 'notifications', filter }, refresh);
          if (role === 'CUSTOMER') channel.on('postgres_changes', { event, schema: 'public', table: 'customer_notifications', filter }, refresh);
        }
        // Channel join can precede the PostgreSQL replication subscription. Reconcile
        // again when CDC is actually ready so changes in that startup gap aren't lost.
        channel.on('system', {}, payload => {
          if (disposed || payload.extension !== 'postgres_changes') return;
          connected = payload.status === 'ok';
          if (connected) { retryDelay = 5000; clearTimeout(retry); retry = undefined; refresh(); }
          else retryConnect();
        });
        channel.subscribe(status => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') refresh();
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { connected = false; retryConnect(); }
        });
        clearTimeout(renewal);
        let expiry = Date.now() + 30 * 60000;
        try { expiry = Number(JSON.parse(atob(session.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp) * 1000; } catch { /* Timing hint only; authentication is verified by backend/Supabase. */ }
        renewal = setTimeout(() => void connect(), Math.max(30000, Math.min(30 * 60000, expiry - Date.now() - 60000)));
      } catch { connected = false; retryConnect(); }
      finally { connecting = false; }
    };
    const visible = () => { if (!document.hidden) { refresh(); if (!connected) void connect(); } };
    const fallback = setInterval(() => { if (!connected) refresh(); }, 60000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    connection = { listeners, close: () => {
      if (disposed) return;
      disposed = true; connected = false;
      clearTimeout(debounce); clearTimeout(renewal); clearTimeout(retry); clearInterval(fallback);
      document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible);
      if (client) { void client.removeAllChannels(); client.realtime.disconnect(); }
      listeners.clear(); connections.delete(key);
    } };
    connections.set(key, connection);
    void connect();
  }
  const notify = () => listener();
  connection.listeners.add(notify);
  const current = connection;
  return () => { current.listeners.delete(notify); if (!current.listeners.size) current.close(); };
}
