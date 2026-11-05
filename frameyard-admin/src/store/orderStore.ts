import { create } from 'zustand';
import { Order, OrderStatus } from '../types';
import { orderService } from '../services/order.service';

const ORDER_CACHE_KEY = 'fy_admin_order_cache';
let ordersRequestId = 0;

const readOrderCache = () => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(ORDER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeOrderCache = (state: Pick<OrderState, 'orders' | 'pagination' | 'summary' | 'lastQuery'>) => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(state));
  } catch {
    // Ignore cache write failures.
  }
};

type OrderQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFilter?: string;
};

type OrderPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type OrderSummary = {
  totalCount: number;
  pendingCount: number;
  processingCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
};

interface OrderState {
  orders: Order[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  pagination: OrderPagination;
  summary: OrderSummary;
  lastQuery: OrderQueryParams;
  fetchOrders: (params?: OrderQueryParams, options?: { silent?: boolean }) => Promise<void>;
  changeOrderStatus: (id: string, status: OrderStatus) => Promise<boolean>;
}

const cached = readOrderCache() as Partial<Pick<OrderState, 'orders' | 'pagination' | 'summary' | 'lastQuery'>> | null;

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: cached?.orders ?? [],
  loading: false,
  refreshing: false,
  error: null,
  pagination: cached?.pagination ?? {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  summary: {
    totalCount: 0,
    pendingCount: 0,
    processingCount: 0,
    shippedCount: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    ...(cached?.summary ?? {}),
  },
  lastQuery: cached?.lastQuery ?? {
    page: 1,
    limit: 10,
    dateFilter: 'all',
  },

  fetchOrders: async (params = {}, options = {}) => {
    const requestId = ++ordersRequestId;
    const query = {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search ?? '',
      status: params.status ?? 'all',
      dateFilter: params.dateFilter ?? 'all',
    };
    const silent = options.silent ?? false;
    set({
      error: null,
      loading: silent ? false : true,
      refreshing: silent ? true : false,
    });
    try {
      const data = await orderService.getOrders(query);
      if (requestId !== ordersRequestId) return;
      set({
        orders: data.orders,
        pagination: data.pagination,
        summary: data.summary,
        lastQuery: query,
        loading: false,
        refreshing: false,
      });
      writeOrderCache({
        orders: data.orders,
        pagination: data.pagination,
        summary: data.summary,
        lastQuery: query,
      });
    } catch (err: any) {
      if (requestId !== ordersRequestId) return;
      set({
        error: err.response?.data?.message || 'Failed to fetch orders',
        loading: false,
        refreshing: false,
      });
    }
  },

  changeOrderStatus: async (id, status) => {
    try {
      const updatedOrder = await orderService.updateOrderStatus(id, status);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
      }));
      const nextOrders = get().orders.map((o) => (o.id === id ? updatedOrder : o));
      const nextState = {
        orders: nextOrders,
        pagination: get().pagination,
        summary: get().summary,
        lastQuery: get().lastQuery,
      };
      writeOrderCache(nextState);
      await get().fetchOrders(get().lastQuery, { silent: true });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update order status' });
      return false;
    }
  },
}));
