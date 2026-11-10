export class ResourceNotFoundError extends Error {
  readonly status = 404;
  constructor() { super('Requested resource was not found'); this.name = 'ResourceNotFoundError'; }
}
export const isResourceId = (id: unknown): id is string => typeof id === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id);
type Listener = (path: string) => void;
const listeners = new Set<Listener>();
export const resourcePath = (url: string) => url.split('?')[0].replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api\/v1(?=\/)/, '').replace(/\/$/, '');
export const subscribeToMissingResources = (listener: Listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const reportMissingResource = (url: string) => { const path = resourcePath(url); listeners.forEach(listener => listener(path)); };
export const resourceResponseKey = (url: string): string | undefined => {
  const path = resourcePath(url);
  if (path === '/products/public' || path === '/orders/status-flow') return undefined;
  if (/^\/products\/(?:public\/)?[^/]+$/.test(path)) return 'product';
  const match = path.match(/^\/(users|orders|appointments|employees)\/[^/]+$/);
  return match ? ({ users:'user', orders:'order', appointments:'appointment', employees:'employee' } as Record<string,string>)[match[1]] : undefined;
};
export const isEmptyResourceResponse = (url: string, body: unknown): boolean => {
  const key = resourceResponseKey(url);
  if (!key) return false;
  const envelope = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const data = envelope.data && typeof envelope.data === 'object' ? envelope.data as Record<string, unknown> : {};
  const record = data[key] ?? envelope[key];
  return !record || typeof record !== 'object' || !('id' in record) || typeof record.id !== 'string' || !record.id;
};
