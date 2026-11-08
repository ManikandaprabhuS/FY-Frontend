import api from './api';
export interface SearchOrder { id: string; orderNumber: string; status: string; user: { name: string } }
export interface SearchCustomer { id: string; name: string; email: string; phoneNumber?: string | null }
export interface AdminSearchResults { query: string; kind: 'order' | 'phone' | 'text'; orders: SearchOrder[]; customers: SearchCustomer[]; counts: { orders: number; customers: number } }
export const adminSearch = async (q: string, signal?: AbortSignal): Promise<AdminSearchResults> => (await api.get('/admin/search', { params: { q: q.trim() }, signal, timeout: 15000 })).data.data;
export type SearchChoice = { kind: 'order'; value: SearchOrder } | { kind: 'customer'; value: SearchCustomer };
export function adminSearchPath(data: AdminSearchResults, choice?: SearchChoice): string | null {
  if (!data.counts.orders && !data.counts.customers) return null;
  if (choice?.kind === 'order') return '/admin/orders?' + new URLSearchParams({ search: choice.value.orderNumber, openOrder: choice.value.id });
  if (choice?.kind === 'customer') return '/admin/customers/' + encodeURIComponent(choice.value.id) + '?' + new URLSearchParams({ search: data.query });
  if (data.kind === 'order' || !data.counts.customers) return data.counts.orders === 1 && data.orders[0] ? adminSearchPath(data, { kind: 'order', value: data.orders[0] }) : '/admin/orders?' + new URLSearchParams({ search: data.query });
  if (data.kind === 'phone' || !data.counts.orders) return data.counts.customers === 1 && data.customers[0] ? adminSearchPath(data, { kind: 'customer', value: data.customers[0] }) : '/admin/customers?' + new URLSearchParams({ search: data.query });
  return null;
}
