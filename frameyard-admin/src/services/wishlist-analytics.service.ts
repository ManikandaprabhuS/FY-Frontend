import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';

export interface WishlistProductAnalytics {
  productIdentifier: string;
  productName: string;
  wishlistUserCount: number;
}

export const wishlistAnalyticsService = {
  listPage: async (page = 1) => {
    const response = await api.get<ApiEnvelope<{ products: WishlistProductAnalytics[]; pagination: Pagination }>>('/wishlist/analytics', { params: { page, limit: 20 } });
    return response.data.data;
  },
  list: async (): Promise<WishlistProductAnalytics[]> => {
    const response = await api.get<ApiEnvelope<{ products: WishlistProductAnalytics[] }>>('/wishlist/analytics');
    return response.data.data.products;
  },
};
