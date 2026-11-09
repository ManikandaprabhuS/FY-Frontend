import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';

export type CustomerWishlistItem = {
  id: string;
  productIdentifier: string;
  createdAt?: string;
  product: {
    id: string;
    productIdentifier: string;
    productName: string;
    material?: {
      brandName?: string;
      material?: string;
      isActive?: boolean;
    } | null;
    variants?: Array<{
      id: string;
      productId?: string;
      color?: string | null;
      frameSize: string;
      mountType?: string;
      glassType?: string;
      price: number | string;
      mrp?: number | string | null;
      offerPrice?: number | string | null;
      stockQuantity?: number | string;
      isActive?: boolean;
    }>;
    images?: Array<{
      id: string;
      imageUrl: string;
      isPrimary?: boolean;
    }>;
  };
};

export type WishlistMutationResult = { wishlistItem: CustomerWishlistItem; wishlistCount: number; alreadySaved: boolean };

export const customerWishlistService = {
  listPage: async (page = 1, limit = 20) => {
    const response = await api.get<ApiEnvelope<{ wishlist: CustomerWishlistItem[]; pagination: Pagination }>>('/wishlist', { params: { page, limit } });
    return response.data.data;
  },
  lookup: async (productIdentifiers: string[]): Promise<Array<{ id: string; productIdentifier: string }>> => {
    const response = await api.post<ApiEnvelope<{ items: Array<{ id: string; productIdentifier: string }> }>>('/wishlist/lookup', { productIdentifiers });
    return response.data.data.items;
  },
  list: async (): Promise<CustomerWishlistItem[]> => {
    return (await customerWishlistService.listPage()).wishlist;
  },

  add: async (productIdentifier: string): Promise<WishlistMutationResult> => {
    const response = await api.post<ApiEnvelope<WishlistMutationResult>>('/wishlist', { productIdentifier }, { timeout: 20_000 });
    return response.data.data;
  },

  moveFromCart: async (productIdentifier: string, variantId?: string, color?: string): Promise<WishlistMutationResult> => {
    const response = await api.post<ApiEnvelope<WishlistMutationResult>>('/cart/move-to-wishlist', { productIdentifier, variantId, color }, { timeout: 20_000 });
    return response.data.data;
  },

  remove: async (wishlistItemId: string): Promise<void> => {
    await api.delete(`/wishlist/${wishlistItemId}`);
  },
};
