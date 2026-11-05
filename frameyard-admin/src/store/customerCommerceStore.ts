import { create } from 'zustand';

import { customerWishlistService, type CustomerWishlistItem } from '../services/customer-wishlist.service';

const LEGACY_CART_STORAGE_KEY = 'frameyaad-customer-cart-v1';
const GUEST_CART_OWNER = 'guest';
const pendingWishlistMutations = new Set<string>();
let wishlistOperationQueue: Promise<void> = Promise.resolve();

const enqueueWishlistOperation = <T,>(operation: () => Promise<T>): Promise<T> => {
  const result = wishlistOperationQueue.then(operation, operation);
  wishlistOperationQueue = result.then(() => undefined, () => undefined);
  return result;
};

const cartStorageKey = (ownerId: string | null) =>
  `${LEGACY_CART_STORAGE_KEY}:${ownerId ? `customer:${ownerId}` : GUEST_CART_OWNER}`;

export type CustomerCartItem = {
  key: string;
  productId: string;
  productIdentifier?: string | null;
  variantId: string;
  name: string;
  imageUrl?: string | null;
  material: string;
  frameSize: string;
  color?: string | null;
  mountType: string;
  glassType: string;
  unitPrice: number;
  quantity: number;
  stockQuantity: number;
};

const readCart = (ownerId: string | null): CustomerCartItem[] => {
  try {
    const stored = window.localStorage.getItem(cartStorageKey(ownerId));
    return stored ? (JSON.parse(stored) as CustomerCartItem[]) : [];
  } catch {
    return [];
  }
};

const readLegacyCart = (): CustomerCartItem[] => {
  try {
    const stored = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CustomerCartItem[]) : [];
  } catch {
    return [];
  }
};

const writeCart = (ownerId: string | null, items: CustomerCartItem[]) => {
  try {
    window.localStorage.setItem(cartStorageKey(ownerId), JSON.stringify(items));
  } catch {
    // Keep the cart available for this session if browser storage is unavailable.
  }
};

const mergeCartItems = (...groups: CustomerCartItem[][]): CustomerCartItem[] => {
  const merged = new Map<string, CustomerCartItem>();
  groups.flat().forEach((item) => {
    const existing = merged.get(item.key);
    merged.set(item.key, existing
      ? { ...existing, quantity: Math.min(existing.stockQuantity, existing.quantity + item.quantity) }
      : item);
  });
  return [...merged.values()];
};

type CommerceState = {
  cartOwnerId: string | null;
  cartItems: CustomerCartItem[];
  wishlistByProductIdentifier: Record<string, string>;
  wishlistItems: CustomerWishlistItem[];
  wishlistLoadedForUserId: string | null;
  wishlistLoading: boolean;
  addCartItem: (item: Omit<CustomerCartItem, 'key'>) => void;
  updateCartQuantity: (key: string, quantity: number) => void;
  removeCartItem: (key: string) => void;
  clearCart: () => void;
  setCartOwner: (userId: string | null, claimGuestCart?: boolean) => void;
  loadWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (productIdentifier: string) => Promise<boolean | null>;
  moveCartItemToWishlist: (key: string, productIdentifier: string) => Promise<boolean>;
  clearWishlist: () => void;
};

export const useCustomerCommerceStore = create<CommerceState>((set, get) => ({
  cartOwnerId: null,
  cartItems: readCart(null),
  wishlistByProductIdentifier: {},
  wishlistItems: [],
  wishlistLoadedForUserId: null,
  wishlistLoading: false,

  addCartItem: (item) => set((state) => {
    const key = `${item.productId}:${item.variantId}`;
    const existing = state.cartItems.find((cartItem) => cartItem.key === key);
    const cartItems = existing
      ? state.cartItems.map((cartItem) => cartItem.key === key
        ? { ...cartItem, quantity: Math.min(cartItem.stockQuantity, cartItem.quantity + item.quantity) }
        : cartItem)
      : [...state.cartItems, { ...item, key, quantity: Math.min(item.stockQuantity, item.quantity) }];
    writeCart(state.cartOwnerId, cartItems);
    return { cartItems };
  }),

  updateCartQuantity: (key, quantity) => set((state) => {
    const cartItems = state.cartItems.map((item) => item.key === key
      ? { ...item, quantity: Math.max(1, Math.min(item.stockQuantity, quantity)) }
      : item);
    writeCart(state.cartOwnerId, cartItems);
    return { cartItems };
  }),

  removeCartItem: (key) => set((state) => {
    const cartItems = state.cartItems.filter((item) => item.key !== key);
    writeCart(state.cartOwnerId, cartItems);
    return { cartItems };
  }),

  clearCart: () => {
    writeCart(get().cartOwnerId, []);
    set({ cartItems: [] });
  },

  setCartOwner: (userId, claimGuestCart = false) => {
    const currentOwnerId = get().cartOwnerId;
    if (currentOwnerId === userId) return;

    let cartItems = readCart(userId);
    if (userId && claimGuestCart) {
      cartItems = mergeCartItems(cartItems, readCart(null), readLegacyCart());
      writeCart(userId, cartItems);
      try {
        window.localStorage.removeItem(cartStorageKey(null));
        window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
      } catch {
        // The customer cart is still available in memory when storage is unavailable.
      }
    }

    set({ cartOwnerId: userId, cartItems });
  },

  loadWishlist: async (userId) => {
    if (get().wishlistLoadedForUserId === userId || get().wishlistLoading) return;
    set({ wishlistLoading: true, wishlistLoadedForUserId: userId });
    try {
      const items = await enqueueWishlistOperation(() => customerWishlistService.list());
      if (get().wishlistLoadedForUserId !== userId) return;
      set({
        wishlistByProductIdentifier: Object.fromEntries(items.map((item) => [item.productIdentifier, item.id])),
        wishlistItems: items,
        wishlistLoading: false,
      });
    } catch {
      if (get().wishlistLoadedForUserId === userId) set({ wishlistLoading: false, wishlistLoadedForUserId: null });
    }
  },

  toggleWishlist: async (productIdentifier) => {
    if (pendingWishlistMutations.has(productIdentifier)) return null;
    pendingWishlistMutations.add(productIdentifier);

    try {
      return await enqueueWishlistOperation(async () => {
        const existingId = get().wishlistByProductIdentifier[productIdentifier];
        if (existingId) {
          await customerWishlistService.remove(existingId);
          set((state) => {
            const next = { ...state.wishlistByProductIdentifier };
            delete next[productIdentifier];
            return {
              wishlistByProductIdentifier: next,
              wishlistItems: state.wishlistItems.filter((item) => item.id !== existingId),
            };
          });
          return false;
        }

        const created = await customerWishlistService.add(productIdentifier);
        set((state) => ({
          wishlistByProductIdentifier: { ...state.wishlistByProductIdentifier, [productIdentifier]: created.id },
          wishlistItems: [created, ...state.wishlistItems.filter((item) => item.id !== created.id)],
        }));
        return true;
      });
    } finally {
      pendingWishlistMutations.delete(productIdentifier);
    }
  },

  moveCartItemToWishlist: async (key, productIdentifier) => {
    if (pendingWishlistMutations.has(productIdentifier)) return false;
    pendingWishlistMutations.add(productIdentifier);

    try {
      await enqueueWishlistOperation(async () => {
        const wishlistItem = await customerWishlistService.moveFromCart(productIdentifier);
        set((state) => {
          const cartItems = state.cartItems.filter((item) => item.key !== key);
          writeCart(state.cartOwnerId, cartItems);
          return {
            cartItems,
            wishlistByProductIdentifier: {
              ...state.wishlistByProductIdentifier,
              [productIdentifier]: wishlistItem.id,
            },
            wishlistItems: [
              wishlistItem,
              ...state.wishlistItems.filter((item) => item.id !== wishlistItem.id),
            ],
          };
        });
      });
      return true;
    } finally {
      pendingWishlistMutations.delete(productIdentifier);
    }
  },

  clearWishlist: () => set({ wishlistByProductIdentifier: {}, wishlistItems: [], wishlistLoadedForUserId: null, wishlistLoading: false }),
}));
