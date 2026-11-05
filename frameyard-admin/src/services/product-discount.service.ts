import api from './api';
import type { Pagination } from './contracts';

export type DiscountAssignment = {
  id: string; productVariantId: string; couponId: string; expiresAt?: string | null; createdAt: string; updatedAt: string;
  variant: { id: string; color?: string | null; frameSize: string; mountType: string; glassType: string; product: { id: string; productName?: string | null; productIdentifier?: string | null } };
  coupon: { id: string; code: string; couponType: string; discountType: string; discountValue: number | string; isActive: boolean; startDate: string; endDate: string };
};
export type DiscountPayload = { productVariantId: string; couponId: string; expiresAt?: string | null };
export const productDiscountService = {
  list: async (params: Record<string, unknown> = {}) => (await api.get('/product-discounts', { params })).data.data as { assignments: DiscountAssignment[]; pagination: Pagination },
  get: async (id: string) => (await api.get(`/product-discounts/${id}`)).data.data.assignment as DiscountAssignment,
  create: async (payload: DiscountPayload) => (await api.post('/product-discounts', payload.expiresAt ? payload : { productVariantId: payload.productVariantId, couponId: payload.couponId })).data.data.assignment as DiscountAssignment,
  update: async (id: string, payload: { expiresAt?: string | null }) => (await api.put(`/product-discounts/${id}`, payload)).data.data.assignment as DiscountAssignment,
  remove: async (id: string) => api.delete(`/product-discounts/${id}`),
};
