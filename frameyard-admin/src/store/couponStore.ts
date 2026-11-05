import { create } from 'zustand';
import { couponService, type Coupon, type CouponPayload } from '../services/coupon.service';
import type { Pagination } from '../services/contracts';
type CouponState = { coupons: Coupon[]; current: Coupon | null; pagination: Pagination; loading: boolean; error: string | null; fetch: (params?: Record<string, unknown>) => Promise<void>; get: (id: string) => Promise<void>; create: (p: CouponPayload) => Promise<Coupon | null>; update: (id: string, p: Partial<CouponPayload>) => Promise<Coupon | null>; status: (id: string, active: boolean) => Promise<boolean>; remove: (id: string) => Promise<boolean> };
let couponListRequestId = 0;
let couponDetailRequestId = 0;
export const useCouponStore = create<CouponState>((set) => ({
  coupons: [], current: null, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }, loading: false, error: null,
  fetch: async (params = {}) => { const requestId = ++couponListRequestId; set({ loading: true, error: null }); try { const data = await couponService.list(params); if (requestId === couponListRequestId) set({ coupons: data.coupons, pagination: data.pagination, loading: false }); } catch (e: any) { if (requestId === couponListRequestId) set({ loading: false, error: e.response?.data?.error?.message || 'Failed to load coupons' }); } },
  get: async (id) => { const requestId = ++couponDetailRequestId; set({ loading: true, error: null }); try { const current = await couponService.get(id); if (requestId === couponDetailRequestId) set({ current, loading: false }); } catch (e: any) { if (requestId === couponDetailRequestId) set({ loading: false, error: e.response?.data?.error?.message || 'Failed to load coupon' }); } },
  create: async (p) => { try { return await couponService.create(p); } catch (e: any) { set({ error: e.response?.data?.error?.message || 'Failed to create coupon' }); return null; } },
  update: async (id, p) => { try { return await couponService.update(id, p); } catch (e: any) { set({ error: e.response?.data?.error?.message || 'Failed to update coupon' }); return null; } },
  status: async (id, active) => { try { await couponService.setStatus(id, active); return true; } catch (e: any) { set({ error: e.response?.data?.error?.message || 'Failed to update coupon status' }); return false; } },
  remove: async (id) => { try { await couponService.remove(id); return true; } catch (e: any) { set({ error: e.response?.data?.error?.message || 'Failed to delete coupon' }); return false; } },
}));
