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
  wishlistTotal: number;
  wishlistPage: number;
  wishlistHasMore: boolean;
  loadMoreWishlist: () => Promise<void>;
  hydrateWishlist: (userId: string, identifiers: string[]) => Promise<void>;
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
  wishlistTotal: 0,
  wishlistPage: 1,
  wishlistHasMore: false,

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

    set({ cartOwnerId: userId, cartItems, wishlistByProductIdentifier: {}, wishlistItems: [], wishlistLoadedForUserId: null, wishlistLoading: false, wishlistTotal: 0, wishlistPage: 1, wishlistHasMore: false });
  },

  loadWishlist: async (userId) => {
    if (get().wishlistLoadedForUserId === userId || get().wishlistLoading) return;
    set({ wishlistLoading: true, wishlistLoadedForUserId: userId });
    try {
      const data = await enqueueWishlistOperation(() => customerWishlistService.listPage());
      const items = data.wishlist;
      if (get().wishlistLoadedForUserId !== userId) return;
      set({
        wishlistByProductIdentifier: { ...get().wishlistByProductIdentifier, ...Object.fromEntries(items.map((item) => [item.productIdentifier, item.id])) },
        wishlistItems: items,
        wishlistLoading: false,
        wishlistTotal: data.pagination.total,
        wishlistPage: data.pagination.page,
        wishlistHasMore: data.pagination.page < data.pagination.totalPages,
      });
    } catch {
      if (get().wishlistLoadedForUserId === userId) set({ wishlistLoading: false, wishlistLoadedForUserId: null });
    }
  },

  loadMoreWishlist: async () => {
    const current = get();
    if (current.wishlistLoading || !current.wishlistHasMore || !current.wishlistLoadedForUserId) return;
    const userId = current.wishlistLoadedForUserId;
    set({ wishlistLoading: true });
    try {
      // Mutations shift offset pages; overlap the last partial page and deduplicate
      // instead of skipping an item after a removal.
      const data = await enqueueWishlistOperation(() => customerWishlistService.listPage(Math.floor(current.wishlistItems.length / 20) + 1));
      if (get().wishlistLoadedForUserId !== userId) return;
      set(state => ({ wishlistItems: [...new Map([...state.wishlistItems, ...data.wishlist].map(item => [item.id, item])).values()],
        wishlistByProductIdentifier: { ...state.wishlistByProductIdentifier, ...Object.fromEntries(data.wishlist.map(item => [item.productIdentifier, item.id])) },
        wishlistPage: data.pagination.page, wishlistTotal: data.pagination.total, wishlistHasMore: data.pagination.page < data.pagination.totalPages }));
    } finally { if (get().wishlistLoadedForUserId === userId) set({ wishlistLoading: false }); }
  },

  hydrateWishlist: async (userId, identifiers) => {
    if (get().cartOwnerId !== userId || identifiers.length === 0) return;
    await enqueueWishlistOperation(async () => {
      const items = await customerWishlistService.lookup(identifiers.slice(0, 100));
      if (get().cartOwnerId !== userId) return;
      set(state => {
        const next = { ...state.wishlistByProductIdentifier };
        identifiers.forEach(id => { delete next[id]; });
        items.forEach(item => { next[item.productIdentifier] = item.id; });
        return { wishlistByProductIdentifier: next };
      });
    });
  },

  toggleWishlist: async (productIdentifier) => {
    if (pendingWishlistMutations.has(productIdentifier)) return null;
    pendingWishlistMutations.add(productIdentifier);

    try {
      return await enqueueWishlistOperation(async () => {
        const existingId = get().wishlistByProductIdentifier[productIdentifier]
          ?? (await customerWishlistService.lookup([productIdentifier]))[0]?.id;
        if (existingId) {
          await customerWishlistService.remove(existingId);
          set((state) => {
            const next = { ...state.wishlistByProductIdentifier };
            delete next[productIdentifier];
            return {
              wishlistByProductIdentifier: next,
              wishlistItems: state.wishlistItems.filter((item) => item.id !== existingId),
              wishlistTotal: Math.max(0, state.wishlistTotal - 1),
            };
          });
          return false;
        }

        const created = await customerWishlistService.add(productIdentifier);
        set((state) => ({
          wishlistByProductIdentifier: { ...state.wishlistByProductIdentifier, [productIdentifier]: created.id },
          wishlistItems: [created, ...state.wishlistItems.filter((item) => item.id !== created.id)],
          wishlistTotal: state.wishlistTotal + 1,
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
        const wasSaved = Boolean(get().wishlistByProductIdentifier[productIdentifier]) || (await customerWishlistService.lookup([productIdentifier])).length > 0;
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
            wishlistTotal: state.wishlistTotal + (wasSaved ? 0 : 1),
          };
        });
      });
      return true;
    } finally {
      pendingWishlistMutations.delete(productIdentifier);
    }
  },

  clearWishlist: () => set({ wishlistByProductIdentifier: {}, wishlistItems: [], wishlistLoadedForUserId: null, wishlistLoading: false, wishlistTotal: 0, wishlistPage: 1, wishlistHasMore: false }),
}));
