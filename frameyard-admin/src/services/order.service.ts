import type { Order, OrderItem, OrderStatus, UserAddress } from '../types';
import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';

type BackendOrderItem = {
  id: string;
  productId?: string | null; productName?: string; frameSize?: string; variantId?: string | null;
  colorName?: string | null; colorHex?: string | null; material?: string | null;
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
  statusHistory?: unknown;
  remark?: string | null;
  couponId?: string | null;
  couponCode?: string | null; couponTitle?: string | null; discountPercent?: number|string|null;
  discountAmount?: number|string|null; subtotal?: number|string|null;
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
  productId: item.productId ?? item.product.id,
  productIdentifier: item.productIdentifier,
  variantId: item.variantId ?? null,
  productName: item.productName ?? item.product.productName,
  frameSize: item.frameSize ?? item.product.variant?.frameSize ?? '-',
  colorName: item.colorName ?? '-', colorHex: item.colorHex ?? null, material: item.material ?? '-',
  mountType: item.product.variant?.mountType ?? '-',
  glassType: '-',
  quantity: item.quantity,
  price: Number(item.price),
  subtotal: Number(item.subtotal),
  imageUrl: item.product.images?.[0]?.imageUrl ?? null,
});

const historyFrom=(value:unknown):NonNullable<Order["statusHistory"]>=>Array.isArray(value)?value.flatMap(entry=>{
 if(!entry||typeof entry!=="object")return[];
 const e=entry as Record<string,unknown>,by=e.changedBy;
 if(typeof e.status!=="string"||typeof e.changedAt!=="string"||!by||typeof by!=="object"||!("id" in by)||typeof by.id!=="string"||!("role" in by)||typeof by.role!=="string")return[];
 return[{status:e.status,changedAt:e.changedAt,changedBy:{id:by.id,role:by.role},...(typeof e.note==="string"?{note:e.note}:{}),...(typeof e.previousStatus==="string"?{previousStatus:e.previousStatus}:{})}];
}):[];
export const normalizeOrder = (order: BackendOrder): Order => ({
  statusHistory:historyFrom(order.statusHistory),
  id: order.id,
  userId: order.userId,
  userAddressId: order.userAddressId,
  couponId: order.couponId ?? null,
  couponCode: order.couponCode ?? null, couponTitle: order.couponTitle ?? null,
  exportCoupon: order.couponTitle ? order.couponTitle + (Number(order.discountPercent)>0 ? " ("+Number(order.discountPercent)+"%)" : "") : order.couponId ?? "-",
  discount: order.discountAmount==null?undefined:Number(order.discountAmount),
  discountPercent: order.discountPercent==null?null:Number(order.discountPercent),
  discountAmount: order.discountAmount==null?null:Number(order.discountAmount),
  subtotal: order.subtotal==null?undefined:Number(order.subtotal),
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
  coupon: order.couponId ? {id:order.couponId,couponCode:order.couponId} : null,
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
  getExportReport: async (params: Omit<OrderQueryParams, 'page' | 'limit'> = {}) => {
    type ExportReport = { range: string; generatedAt: string; summary: { totalRevenue: number; orderCount: number; averageOrderValue: number }; orders: import('../utils/revenue-report-pdf').RevenueReportOrder[] };
    const response = await api.get<ApiEnvelope<ExportReport>>('/orders/export', { params: { ...params, status: params.status === 'all' ? undefined : params.status, search: params.search?.trim() || undefined }, timeout: 60_000 });
    return response.data.data;
  },
  getOrdersByIds: async (ids: string[]): Promise<Order[]> => {
    const uniqueIds = [...new Set(ids)];
    const orders: Order[] = [];
    // Bound both request size and concurrency; exports retain every requested order.
    for (let offset = 0; offset < uniqueIds.length; offset += 100) {
      const response = await api.post<ApiEnvelope<{ orders: BackendOrder[] }>>('/orders/batch', { ids: uniqueIds.slice(offset, offset + 100) });
      orders.push(...response.data.data.orders.map(normalizeOrder));
    }
    return orders;
  },
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
    const response = await api.get<ApiEnvelope<{ order: BackendOrder }>>(`/orders/${id}`,{timeout:20000});
    return normalizeOrder(response.data.data.order);
  },

  updateOrderStatus: async (id: string, status: OrderStatus, expectedStatus?:OrderStatus): Promise<Order> => {
    const response = await api.patch<ApiEnvelope<{ order: BackendOrder }>>(`/orders/${id}/status`, { status, expectedStatus });
    return normalizeOrder(response.data.data.order);
  },

  cancelOrder:async(id:string,note?:string,expectedStatus?:OrderStatus):Promise<Order>=>{
    const response=await api.post<ApiEnvelope<{order:BackendOrder}>>('/orders/'+id+'/cancel',{note,expectedStatus},{timeout:20000});
    if(typeof window!=="undefined")window.dispatchEvent(new Event("fy:customer-orders-changed"));
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
