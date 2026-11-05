import api from './api';
import type { Pagination } from './contracts';

export type Coupon = {
  id: string; code: string; description?: string | null; couponType: string; discountType: string;
  discountValue: number | string; minimumOrderValue: number | string; usageLimit?: number | null;
  usagePerUser?: number | null; usageCount: number; newUserOnly: boolean; festivalCoupon: boolean;
  buyOneGetOne: boolean; buyTwoGetOne: boolean; isActive: boolean; startDate: string; endDate: string;
  expiresAt: string; createdBy?: { name: string; email: string } | null; createdAt: string; updatedAt: string;
};
export type CouponPayload = Omit<Coupon, 'id' | 'usageCount' | 'createdBy' | 'createdAt' | 'updatedAt'>;
export type CouponValidationResult = {
  coupon: { code: string; couponType: string; discountType: string; discountValue: number };
  subtotal: number;
  eligibleSubtotal: number;
  discountAmount: number;
  total: number;
};
export const couponService = {
  validate: async (payload: { code: string; items: Array<{ productVariantId: string; unitPrice: number; quantity: number }> }) =>
    (await api.post('/coupons/validate', payload)).data.data as CouponValidationResult,
  list: async (params: Record<string, unknown> = {}) => {
    const response = await api.get('/coupons', { params });
    return response.data.data as { coupons: Coupon[]; pagination: Pagination };
  },
  get: async (id: string) => (await api.get(`/coupons/${id}`)).data.data.coupon as Coupon,
  create: async (payload: CouponPayload) => (await api.post('/coupons', payload)).data.data.coupon as Coupon,
  update: async (id: string, payload: Partial<CouponPayload>) => (await api.put(`/coupons/${id}`, payload)).data.data.coupon as Coupon,
  setStatus: async (id: string, isActive: boolean) => (await api.patch(`/coupons/${id}/status`, { isActive })).data.data.coupon as Coupon,
  remove: async (id: string) => api.delete(`/coupons/${id}`),
};
