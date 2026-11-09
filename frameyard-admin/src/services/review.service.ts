import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface RatingSummary { average: number; count: number; breakdown: Record<string, number> }
export interface PublicReview { id: string; name: string; rating: number; title: string | null; comment: string; verifiedPurchase: boolean; createdAt: string }
export interface AdminReview extends PublicReview { email: string; productId: string; product: { id: string; productName: string }; status: ReviewStatus; rejectionReason: string | null; reviewedAt: string | null; reviewedBy: { id: string; name: string; role: string } | null }
export interface ReviewInput { rating: number; name: string; email: string; title: string; comment: string; website: string }
export interface ReviewFilters { status?: string; rating?: string; productId?: string; search?: string; dateFilter?: string; from?: string; to?: string; id?: string }
export interface ReviewAdminData { reviews: AdminReview[]; pagination: Pagination; summary: { total: number; pending: number; approved: number; rejected: number; average: number } }
export const reviewService = {
  submit: async (id: string, input: ReviewInput) => (await api.post<ApiEnvelope<{ review: { id: string; status: string } }>>('/reviews/product/' + id, input, { timeout: 20000 })).data.data.review,
  publicList: async (id: string, page = 1, sort = 'newest') => (await api.get<ApiEnvelope<{ reviews: PublicReview[]; pagination: Pagination; summary: RatingSummary }>>('/reviews/product/' + id, { params: { page, sort }, timeout: 20000 })).data.data,
  summaries: async (ids: string[]) => (await api.get<ApiEnvelope<{ summaries: Record<string, RatingSummary> }>>('/reviews/summary', { params: { ids: ids.join(',') }, timeout: 15000 })).data.data.summaries,
  adminList: async (filters: ReviewFilters, page = 1) => (await api.get<ApiEnvelope<ReviewAdminData>>('/reviews/admin', { params: { ...filters, page, limit: 20 }, timeout: 20000 })).data.data,
  moderate: async (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => (await api.patch<ApiEnvelope<{ review: AdminReview }>>('/reviews/admin/' + id, { status, reason }, { timeout: 20000 })).data.data.review,
  remove: async (id: string) => { await api.delete('/reviews/admin/' + id, { timeout: 20000 }); },
  products: async (search = '') => (await api.get<ApiEnvelope<{ products: Array<{ id: string; productName: string }> }>>('/reviews/admin/products', { params: { search }, timeout: 15000 })).data.data.products,
  export: async (filters: ReviewFilters) => (await api.get<ApiEnvelope<{ reviews: AdminReview[]; generatedAt: string; filters: Record<string, unknown> }>>('/reviews/admin/export', { params: filters, timeout: 120000 })).data.data,
};
