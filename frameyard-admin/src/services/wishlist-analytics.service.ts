import api from './api';
import type { ApiEnvelope } from './contracts';

export interface WishlistProductAnalytics {
  productIdentifier: string;
  productName: string;
  wishlistUserCount: number;
}

export const wishlistAnalyticsService = {
  list: async (): Promise<WishlistProductAnalytics[]> => {
    const response = await api.get<ApiEnvelope<{ products: WishlistProductAnalytics[] }>>('/wishlist/analytics');
    return response.data.data.products;
  },
};
