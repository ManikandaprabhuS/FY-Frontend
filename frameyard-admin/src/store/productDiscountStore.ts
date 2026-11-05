import { create } from 'zustand';
import { productDiscountService, type DiscountAssignment, type DiscountPayload } from '../services/product-discount.service';
import type { Pagination } from '../services/contracts';
type State = { assignments: DiscountAssignment[]; current: DiscountAssignment | null; pagination: Pagination; loading: boolean; error: string | null; fetch: (params?: Record<string, unknown>) => Promise<void>; get: (id: string) => Promise<void>; create: (p: DiscountPayload) => Promise<DiscountAssignment | null>; update: (id: string, p: { expiresAt?: string | null }) => Promise<DiscountAssignment | null>; remove: (id: string) => Promise<boolean> };
let assignmentListRequestId = 0;
let assignmentDetailRequestId = 0;
export const useProductDiscountStore = create<State>((set) => ({
  assignments: [], current: null, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }, loading: false, error: null,
  fetch: async (params = {}) => { const requestId = ++assignmentListRequestId; set({ loading: true, error: null }); try { const data = await productDiscountService.list(params); if (requestId === assignmentListRequestId) set({ assignments: data.assignments, pagination: data.pagination, loading: false }); } catch (e: any) { if (requestId === assignmentListRequestId) set({ loading: false, error: e.response?.data?.error?.details || e.response?.data?.error?.message || 'Failed to load product discounts' }); } },
  get: async (id) => { const requestId = ++assignmentDetailRequestId; set({ loading: true, error: null }); try { const current = await productDiscountService.get(id); if (requestId === assignmentDetailRequestId) set({ current, loading: false }); } catch (e: any) { if (requestId === assignmentDetailRequestId) set({ loading: false, error: e.response?.data?.error?.details || e.response?.data?.error?.message || 'Failed to load assignment' }); } },
  create: async (p) => { try { return await productDiscountService.create(p); } catch (e: any) { set({ error: e.response?.data?.error?.details || e.response?.data?.error?.message || 'Failed to assign coupon' }); return null; } },
  update: async (id, p) => { try { return await productDiscountService.update(id, p); } catch (e: any) { set({ error: e.response?.data?.error?.message || 'Failed to update assignment' }); return null; } },
  remove: async (id) => { try { await productDiscountService.remove(id); return true; } catch (e: any) { set({ error: e.response?.data?.error?.message || 'Failed to remove assignment' }); return false; } },
}));
