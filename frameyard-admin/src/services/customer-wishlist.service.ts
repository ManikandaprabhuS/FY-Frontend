import api from './api';
import type { ApiEnvelope } from './contracts';

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

export const customerWishlistService = {
  list: async (): Promise<CustomerWishlistItem[]> => {
    const response = await api.get<ApiEnvelope<{ wishlist: CustomerWishlistItem[] }>>('/wishlist');
    return response.data.data.wishlist;
  },

  add: async (productIdentifier: string): Promise<CustomerWishlistItem> => {
    const response = await api.post<ApiEnvelope<{ wishlistItem: CustomerWishlistItem }>>('/wishlist', { productIdentifier });
    return response.data.data.wishlistItem;
  },

  moveFromCart: async (productIdentifier: string): Promise<CustomerWishlistItem> => {
    const response = await api.post<ApiEnvelope<{ wishlistItem: CustomerWishlistItem }>>('/cart/move-to-wishlist', { productIdentifier });
    return response.data.data.wishlistItem;
  },

  remove: async (wishlistItemId: string): Promise<void> => {
    await api.delete(`/wishlist/${wishlistItemId}`);
  },
};
