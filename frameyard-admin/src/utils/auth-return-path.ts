export function safeAuthReturnPath(value: unknown, portal: 'admin' | 'customer'): string {
  const fallback = portal === 'admin' ? '/admin/overview' : '/profile';
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback;
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(value.split(/[?#]/)[0]); } catch { return fallback; }
  if (decodedPath.startsWith('//') || /[\\\r\n]/.test(decodedPath) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(decodedPath)) return fallback;
  if (portal === 'admin') return /^\/admin(?:\/|$)/.test(decodedPath) ? value : fallback;
  return /^\/(?:admin(?:\/|$)|fyadminlogin|login|forgot-password)/.test(decodedPath) ? fallback : value;
}
