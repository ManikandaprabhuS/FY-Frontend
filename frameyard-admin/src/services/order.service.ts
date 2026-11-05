import type { Order, OrderItem, OrderStatus, UserAddress } from '../types';
import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';

type BackendOrderItem = {
  id: string;
  productIdentifier: string;
  quantity: number;
  price: number | string;
  subtotal: number | string;
  product: {
    id: string;
    productName: string;
    variant?: { frameSize: string; mountType: string };
    images?: Array<{ id: string; imageUrl: string }>;
  };
};

type BackendOrder = {
  id: string;
  orderNumber: string;
  userId: string;
  userAddressId: string;
  totalPrice: number | string;
  status: OrderStatus;
  remark?: string | null;
  couponId?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string; phoneNumber?: string | null };
  userAddress: {
    id: string;
    addressLine: string;
    postalCode: string;
    city: string;
    state: string;
    country: string;
    contactPerson: string;
    contactNumber: string;
  };
  items: BackendOrderItem[];
};

export type OrderQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFilter?: string;
  userId?: string;
};

type OrdersResponse = {
  orders: Order[];
  pagination: Pagination;
  summary: {
    totalCount: number;
    pendingCount: number;
    processingCount: number;
    shippedCount: number;
    deliveredCount: number;
    cancelledCount: number;
  };
};

const normalizeAddress = (order: BackendOrder): UserAddress => ({
  id: order.userAddress.id,
  userId: order.userId,
  addressLine: order.userAddress.addressLine,
  postCode: order.userAddress.postalCode,
  city: order.userAddress.city,
  state: order.userAddress.state,
  country: order.userAddress.country,
  contactPerson: order.userAddress.contactPerson,
  contactNumber: order.userAddress.contactNumber,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const normalizeOrderItem = (item: BackendOrderItem, order: BackendOrder): OrderItem => ({
  id: item.id,
  orderId: order.id,
  orderNumber: order.orderNumber,
  productId: item.product.id,
  productIdentifier: item.productIdentifier,
  variantId: null,
  productName: item.product.productName,
  frameSize: item.product.variant?.frameSize ?? 'Not specified',
  mountType: item.product.variant?.mountType ?? 'Not specified',
  glassType: 'Not specified',
  quantity: item.quantity,
  price: Number(item.price),
  subtotal: Number(item.subtotal),
  imageUrl: item.product.images?.[0]?.imageUrl ?? null,
});

export const normalizeOrder = (order: BackendOrder): Order => ({
  id: order.id,
  userId: order.userId,
  userAddressId: order.userAddressId,
  couponId: order.couponId ?? null,
  orderNumber: order.orderNumber,
  totalAmount: Number(order.totalPrice),
  orderStatus: order.status,
  phoneNumber: order.user.phoneNumber ?? order.userAddress.contactNumber,
  addressLine: order.userAddress.addressLine,
  cityName: order.userAddress.city,
  stateName: order.userAddress.state,
  countryName: order.userAddress.country,
  postalCode: order.userAddress.postalCode,
  remark: order.remark ?? null,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  user: {
    name: order.user.name,
    email: order.user.email,
    phoneNumber: order.user.phoneNumber ?? order.userAddress.contactNumber,
  },
  userAddress: normalizeAddress(order),
  coupon: null,
  orderItems: order.items.map((item) => normalizeOrderItem(item, order)),
  incidents: [],
});

const summaryFor = (orders: Order[]): OrdersResponse['summary'] => ({
  totalCount: orders.length,
  pendingCount: orders.filter((order) => order.orderStatus === 'PLACED').length,
  processingCount: orders.filter((order) => ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'].includes(order.orderStatus)).length,
  shippedCount: orders.filter((order) => order.orderStatus === 'SHIPPED').length,
  deliveredCount: orders.filter((order) => order.orderStatus === 'DELIVERED').length,
  cancelledCount: orders.filter((order) => order.orderStatus === 'CANCELLED').length,
});

export const orderService = {
  getOrders: async (params: OrderQueryParams = {}): Promise<OrdersResponse> => {
    const response = await api.get<ApiEnvelope<{ orders: BackendOrder[]; pagination: Pagination; summary?: OrdersResponse['summary'] }>>('/orders', {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        status: params.status && params.status !== 'all' ? params.status : undefined,
        dateFilter: params.dateFilter && params.dateFilter !== 'all' ? params.dateFilter : undefined,
        userId: params.userId,
      },
    });
    const orders = response.data.data.orders.map(normalizeOrder);
    const pagination = response.data.data.pagination;
    return { orders, pagination, summary: response.data.data.summary ?? summaryFor(orders) };
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await api.get<ApiEnvelope<{ order: BackendOrder }>>(`/orders/${id}`);
    return normalizeOrder(response.data.data.order);
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const response = await api.patch<ApiEnvelope<{ order: BackendOrder }>>(`/orders/${id}/status`, { status });
    return normalizeOrder(response.data.data.order);
  },

  exportOrders: async (params: Omit<OrderQueryParams, 'page' | 'limit'> = {}): Promise<Blob> => {
    const { orders } = await orderService.getOrders({ ...params, page: 1, limit: 100 });
    const rows = [
      ['Order Number', 'Customer', 'Status', 'Total', 'Created At'],
      ...orders.map((order) => [
        order.orderNumber,
        order.user?.name ?? '',
        order.orderStatus,
        String(order.totalAmount),
        order.createdAt,
      ]),
    ];
    return new Blob([rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
  },
};
