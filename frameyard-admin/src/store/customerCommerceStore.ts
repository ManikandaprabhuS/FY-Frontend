import { create } from 'zustand';
import { normalizeStock } from '../utils/stock';
import { showWarning } from '../utils/toast';

import { customerWishlistService, type CustomerWishlistItem } from '../services/customer-wishlist.service';

const LEGACY_CART_STORAGE_KEY = 'frameyaad-customer-cart-v1';
const GUEST_CART_OWNER = 'guest';
const pendingWishlistMutations = new Set<string>();
const wishlistVersions = new Map<string, number>();
const touchWishlist = (owner: string, identifier: string) => {
  const key = owner + ':' + identifier;
  wishlistVersions.set(key, (wishlistVersions.get(key) ?? 0) + 1);
};
let wishlistOperationQueue: Promise<void> = Promise.resolve();
const wishlistWriteQueues = new Map<string, Promise<void>>();
const enqueueWishlistWrite = <T,>(owner: string, operation: () => Promise<T>): Promise<T> => {
  const previous = wishlistWriteQueues.get(owner) ?? Promise.resolve();
  const result = previous.then(operation, operation);
  const tail = result.then(() => undefined, () => undefined);
  wishlistWriteQueues.set(owner, tail);
  void tail.then(() => { if (wishlistWriteQueues.get(owner) === tail) wishlistWriteQueues.delete(owner); });
  return result;
};

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
  colorName?: string | null;
  colorHex?: string | null;
  mountType: string;
  glassType: string;
  unitPrice: number;
  quantity: number;
  stockQuantity: number;
};

const selectionKey = (item: Pick<CustomerCartItem, 'productId' | 'variantId' | 'color' | 'colorHex'>) => `${item.productId}:${item.variantId}:${(item.colorHex || item.color || '').trim().toLowerCase()}`;
const readCart = (ownerId: string | null): CustomerCartItem[] => {
  try {
    const stored = window.localStorage.getItem(cartStorageKey(ownerId));
    return stored ? (JSON.parse(stored) as CustomerCartItem[]).map(item => ({ ...item, key: selectionKey(item) })) : [];
  } catch {
    return [];
  }
};

const readLegacyCart = (): CustomerCartItem[] => {
  try {
    const stored = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CustomerCartItem[]).map(item => ({ ...item, key: selectionKey(item) })) : [];
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
  addCartItem: (item: Omit<CustomerCartItem, 'key'>) => boolean;
  updateCartQuantity: (key: string, quantity: number) => void;
  removeCartItem: (key: string) => void;
  clearCart: () => void;
  setCartOwner: (userId: string | null, claimGuestCart?: boolean) => void;
  loadWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (productIdentifier: string, preview?: CustomerWishlistItem["product"]) => Promise<boolean | "exists" | null>;
  wishlistPending: Record<string, boolean>;
  moveCartItemToWishlist: (key: string, productIdentifier: string) => Promise<"moved" | "exists" | null>;
  clearWishlist: () => void;
};

const reconcileWishlistPage = (state: CommerceState, data: Awaited<ReturnType<typeof customerWishlistService.listPage>>, versions: Map<string, number>, append = false) => {
  const merged = new Map((append ? state.wishlistItems : data.wishlist).map(item => [item.productIdentifier, item]));
  if (append) data.wishlist.forEach(item => merged.set(item.productIdentifier, item));
  const mapping = { ...state.wishlistByProductIdentifier, ...Object.fromEntries(data.wishlist.map(item => [item.productIdentifier, item.id])) };
  let total = data.pagination.total;
  const prefix = state.cartOwnerId + ':';
  for (const [key, version] of wishlistVersions) {
    if (!key.startsWith(prefix)) continue;
    const identifier = key.slice(prefix.length);
    if (version === versions.get(key) && !state.wishlistPending[identifier]) continue;
    const incoming = data.wishlist.some(item => item.productIdentifier === identifier);
    const saved = Boolean(state.wishlistByProductIdentifier[identifier]);
    total += Number(saved) - Number(incoming);
    if (!saved) { merged.delete(identifier); delete mapping[identifier]; }
    else {
      mapping[identifier] = state.wishlistByProductIdentifier[identifier];
      const current = state.wishlistItems.find(item => item.productIdentifier === identifier);
      if (current) merged.set(identifier, current);
    }
  }
  return { wishlistItems: [...merged.values()], wishlistByProductIdentifier: mapping, wishlistTotal: Math.max(0, total), wishlistLoading: false,
    wishlistPage: data.pagination.page, wishlistHasMore: data.pagination.page < data.pagination.totalPages };
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
  wishlistPending: {},

  addCartItem: (item) => {
    const state = get();
    const stock = normalizeStock(item.stockQuantity);
    const requested = state.cartItems.filter(entry => entry.productId === item.productId && entry.variantId === item.variantId).reduce((sum, entry) => sum + entry.quantity, 0) + item.quantity;
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || requested > stock) {
      showWarning('Requested quantity exceeds available stock (' + stock + ')', { id: 'cart-stock' }); return false;
    }
    const key = selectionKey(item);
    const existing = state.cartItems.find(entry => entry.key === key);
    const cartItems = existing ? state.cartItems.map(entry => entry.key === key ? { ...entry, stockQuantity: stock, quantity: entry.quantity + item.quantity } : entry) : [...state.cartItems, { ...item, stockQuantity: stock, key }];
    writeCart(state.cartOwnerId, cartItems); set({ cartItems }); return true;
  },

  updateCartQuantity: (key, quantity) => {
    const state = get(), target = state.cartItems.find(item => item.key === key);
    if (!target) return;
    const nextQuantity = Math.max(1, quantity);
    const requested = state.cartItems.filter(item => item.key !== key && item.productId === target.productId && item.variantId === target.variantId).reduce((sum, item) => sum + item.quantity, 0) + nextQuantity;
    const stock = normalizeStock(target.stockQuantity);
    if (!Number.isSafeInteger(nextQuantity) || requested > stock) { showWarning('Requested quantity exceeds available stock (' + stock + ')', { id: 'cart-stock' }); return; }
    const cartItems = state.cartItems.map(item => item.key === key ? { ...item, quantity: nextQuantity } : item);
    writeCart(state.cartOwnerId, cartItems); set({ cartItems });
  },
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

    set({ cartOwnerId: userId, cartItems, wishlistPending: {}, wishlistByProductIdentifier: {}, wishlistItems: [], wishlistLoadedForUserId: null, wishlistLoading: false, wishlistTotal: 0, wishlistPage: 1, wishlistHasMore: false });
  },

  loadWishlist: async (userId) => {
    if (get().wishlistLoadedForUserId === userId || get().wishlistLoading) return;
    set({ wishlistLoading: true, wishlistLoadedForUserId: userId });
    try {
      const { data, versions } = await enqueueWishlistOperation(async () => {
        const versions = new Map(wishlistVersions);
        return { data: await customerWishlistService.listPage(), versions };
      });
      if (get().cartOwnerId !== userId || get().wishlistLoadedForUserId !== userId) return;
      set(state => reconcileWishlistPage(state, data, versions));    } catch {
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
      const { data, versions } = await enqueueWishlistOperation(async () => {
        const versions = new Map(wishlistVersions);
        return { data: await customerWishlistService.listPage(Math.floor(current.wishlistItems.length / 20) + 1), versions };
      });
      if (get().cartOwnerId !== userId || get().wishlistLoadedForUserId !== userId) return;
      set(state => reconcileWishlistPage(state, data, versions, true));    } finally { if (get().wishlistLoadedForUserId === userId) set({ wishlistLoading: false }); }
  },

  hydrateWishlist: async (userId, identifiers) => {
    if (get().cartOwnerId !== userId || identifiers.length === 0) return;
    await enqueueWishlistOperation(async () => {
      const versions = new Map(wishlistVersions);
      const eligible = identifiers.filter(id => !get().wishlistPending[id]).slice(0, 100);
      if (!eligible.length) return;
      const items = await customerWishlistService.lookup(eligible);
      if (get().cartOwnerId !== userId) return;
      set(state => {
        const next = { ...state.wishlistByProductIdentifier };
        const stable = eligible.filter(id => !state.wishlistPending[id] && wishlistVersions.get(userId + ':' + id) === versions.get(userId + ':' + id));
        stable.forEach(id => { delete next[id]; });
        items.forEach(item => { if (stable.includes(item.productIdentifier)) next[item.productIdentifier] = item.id; });
        return { wishlistByProductIdentifier: next };
      });
    });
  },

  toggleWishlist: async (productIdentifier, preview) => {
    const owner = get().cartOwnerId;
    if (!owner || pendingWishlistMutations.has(owner + ':' + productIdentifier)) return null;
    pendingWishlistMutations.add(owner + ':' + productIdentifier); touchWishlist(owner, productIdentifier);
    const previous = get();
    const existingId = previous.wishlistByProductIdentifier[productIdentifier];
    const previousItem = previous.wishlistItems.find(item => item.productIdentifier === productIdentifier);
    const tempId = 'pending:' + productIdentifier;
    const optimistic: CustomerWishlistItem = { id: tempId, productIdentifier, product: preview ?? { id: productIdentifier, productIdentifier, productName: 'Frame' } };
    set(state => {
      const next = { ...state.wishlistByProductIdentifier };
      if (existingId) delete next[productIdentifier]; else next[productIdentifier] = tempId;
      return { wishlistPending: { ...state.wishlistPending, [productIdentifier]: true }, wishlistByProductIdentifier: next,
        wishlistItems: existingId ? state.wishlistItems.filter(item => item.productIdentifier !== productIdentifier) : [optimistic, ...state.wishlistItems],
        wishlistTotal: Math.max(0, state.wishlistTotal + (existingId ? -1 : 1)) };
    });
    try {
      if (existingId) {
        await enqueueWishlistWrite(owner, () => {
          if (get().cartOwnerId !== owner) throw new Error("Customer session changed");
          return customerWishlistService.remove(existingId);
        });
        return false;
      }
      const result = await enqueueWishlistWrite(owner, () => {
        if (get().cartOwnerId !== owner) throw new Error("Customer session changed");
        return customerWishlistService.add(productIdentifier);
      });
      if (get().cartOwnerId !== owner) return null;
      set(state => ({ wishlistByProductIdentifier: { ...state.wishlistByProductIdentifier, [productIdentifier]: result.wishlistItem.id },
        wishlistItems: [result.wishlistItem, ...state.wishlistItems.filter(item => item.productIdentifier !== productIdentifier)],
        wishlistTotal: pendingWishlistMutations.size === 1 ? result.wishlistCount : Math.max(0, state.wishlistTotal - (result.alreadySaved ? 1 : 0)) }));
      return result.alreadySaved ? 'exists' : true;
    } catch (error) {
      if (get().cartOwnerId === owner) set(state => {
        const next = { ...state.wishlistByProductIdentifier }; if (existingId) next[productIdentifier] = existingId; else delete next[productIdentifier];
        return { wishlistByProductIdentifier: next, wishlistItems: [...(previousItem ? [previousItem] : []), ...state.wishlistItems.filter(item => item.productIdentifier !== productIdentifier)],
          wishlistTotal: Math.max(0, state.wishlistTotal + (existingId ? 1 : -1)) };
      });
      throw error;
    } finally {
      pendingWishlistMutations.delete(owner + ':' + productIdentifier); touchWishlist(owner, productIdentifier);
      if (get().cartOwnerId === owner) set(state => { const next = { ...state.wishlistPending }; delete next[productIdentifier]; return { wishlistPending: next }; });
    }
  },

  moveCartItemToWishlist: async (key, productIdentifier) => {
    const owner = get().cartOwnerId;
    const cartItem = get().cartItems.find(item => item.key === key);
    if (!owner || !cartItem || pendingWishlistMutations.has(owner + ':' + productIdentifier)) return null;
    pendingWishlistMutations.add(owner + ':' + productIdentifier); touchWishlist(owner, productIdentifier);
    const existingId = get().wishlistByProductIdentifier[productIdentifier];
    const optimistic: CustomerWishlistItem = {
      id: existingId ?? 'pending:' + productIdentifier, productIdentifier,
      product: { id: cartItem.productId, productIdentifier, productName: cartItem.name, material: { material: cartItem.material }, images: cartItem.imageUrl ? [{ id: 'preview', imageUrl: cartItem.imageUrl, isPrimary: true }] : [],
        variants: [{ id: cartItem.variantId, frameSize: cartItem.frameSize, color: cartItem.color, price: cartItem.unitPrice, stockQuantity: cartItem.stockQuantity, isActive: true }] },
    };
    set(state => {
      const cartItems = state.cartItems.filter(item => item.key !== key); writeCart(owner, cartItems);
      return { cartItems, wishlistPending: { ...state.wishlistPending, [productIdentifier]: true },
        wishlistByProductIdentifier: { ...state.wishlistByProductIdentifier, [productIdentifier]: optimistic.id },
        wishlistItems: existingId ? state.wishlistItems : [optimistic, ...state.wishlistItems],
        wishlistTotal: state.wishlistTotal + (existingId ? 0 : 1) };
    });
    try {
      const result = await enqueueWishlistWrite(owner, () => {
        if (get().cartOwnerId !== owner) throw new Error("Customer session changed");
        return customerWishlistService.moveFromCart(productIdentifier, cartItem.variantId, cartItem.colorHex || cartItem.color || undefined);
      });
      if (get().cartOwnerId !== owner) return null;
      set(state => ({ wishlistByProductIdentifier: { ...state.wishlistByProductIdentifier, [productIdentifier]: result.wishlistItem.id },
        wishlistItems: [result.wishlistItem, ...state.wishlistItems.filter(item => item.productIdentifier !== productIdentifier)],
        wishlistTotal: pendingWishlistMutations.size === 1 ? result.wishlistCount : Math.max(0, state.wishlistTotal - (!existingId && result.alreadySaved ? 1 : 0)) }));
      return result.alreadySaved ? 'exists' : 'moved';
    } catch (error) {
      const current = get();
      // Restore even if the customer logged out while the request was pending.
      const ownedCart = current.cartOwnerId === owner ? current.cartItems : readCart(owner);
      const restored = ownedCart.some(item => item.key === key) ? ownedCart.map(item => item.key === key ? { ...cartItem, quantity: item.quantity + cartItem.quantity } : item) : [...ownedCart, cartItem];
      writeCart(owner, restored);
      if (current.cartOwnerId === owner) set(state => {
        const next = { ...state.wishlistByProductIdentifier }; if (existingId) next[productIdentifier] = existingId; else delete next[productIdentifier];
        return { cartItems: restored, wishlistByProductIdentifier: next,
          wishlistItems: existingId ? state.wishlistItems : state.wishlistItems.filter(item => item.productIdentifier !== productIdentifier),
          wishlistTotal: Math.max(0, state.wishlistTotal - (existingId ? 0 : 1)) };
      });
      throw error;
    } finally {
      pendingWishlistMutations.delete(owner + ':' + productIdentifier); touchWishlist(owner, productIdentifier);
      if (get().cartOwnerId === owner) set(state => { const next = { ...state.wishlistPending }; delete next[productIdentifier]; return { wishlistPending: next }; });
    }
  },
  clearWishlist: () => set({ wishlistPending: {}, wishlistByProductIdentifier: {}, wishlistItems: [], wishlistLoadedForUserId: null, wishlistLoading: false, wishlistTotal: 0, wishlistPage: 1, wishlistHasMore: false }),
}));
