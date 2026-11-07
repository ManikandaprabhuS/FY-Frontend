import type { Customer, Order, UserAddress } from '../types';
import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';
import { orderService } from './order.service';

type CustomerApi = Partial<Customer> & {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  createdById?: string | null;
  orderSummaries?: OrderSummaryApi[];
  orderStats?: { count: number; totalSpent: number; lastOrderAt: string | null };
};

export interface CustomerResponse {
  customers: Customer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerLookupResponse {
  id: string;
  name: string;
  phoneNumber: string;
}

export type CustomerDetailsResponse = Omit<Customer, 'orders'> & { orders: Order[]; orderPagination: Pagination; orderStats?: CustomerApi['orderStats'] };

const normalizeCustomer = (
  customer: CustomerApi,
  orders: Customer['orders'] = [],
  addresses: UserAddress[] = [],
): Customer => ({
  id: String(customer.id ?? ''),
  role: customer.role ?? 'CUSTOMER',
  name: String(customer.name ?? ''),
  email: String(customer.email ?? ''),
  phoneNumber: String(customer.phoneNumber ?? ''),
  isPhoneNumberVerified: customer.isPhoneNumberVerified ?? false,
  addressLine: customer.addressLine ?? null,
  postalCode: customer.postalCode ?? null,
  cityName: customer.city ?? customer.cityName ?? null,
  stateName: customer.state ?? customer.stateName ?? null,
  countryName: customer.country ?? customer.countryName ?? null,
  addresses,
  isEmailVerified: customer.isEmailVerified ?? false,
  isActive: customer.isActive ?? true,
  createdBy: customer.createdById ?? customer.createdBy ?? null,
  createdAt: String(customer.createdAt ?? new Date().toISOString()),
  updatedAt: String(customer.updatedAt ?? new Date().toISOString()),
  orders,
  customerIncidents: customer.customerIncidents ?? [],
});

type OrderSummaryApi = {
  id: string;
  userId: string;
  orderNumber: string;
  status: string;
  totalPrice: string | number;
  createdAt: string;
};

export const customerService = {
  getCustomerById: async (id: string, page = 1): Promise<CustomerDetailsResponse> => {
    const [userResponse, orderResponse] = await Promise.all([
      api.get<ApiEnvelope<{ user: CustomerApi }>>(`/users/${id}`),
      orderService.getOrders({ userId: id, page, limit: 10 }),
    ]);
    return {
      ...normalizeCustomer(userResponse.data.data.user, orderResponse.orders),
      orders: orderResponse.orders,
      orderPagination: orderResponse.pagination,
      orderStats: userResponse.data.data.user.orderStats,
    };
  },

  lookupCustomerByPhoneNumber: async (phoneNumber: string): Promise<CustomerLookupResponse> => {
    const response = await api.get<ApiEnvelope<{ customer: CustomerLookupResponse }>>('/users/lookup/phone', {
      params: { phone: phoneNumber },
    });
    return response.data.data.customer;
  },

  getCustomers: async (page = 1, limit = 10, search?: string): Promise<CustomerResponse> => {
    const userResponse = await api.get<ApiEnvelope<{ users: CustomerApi[]; pagination: Pagination }>>('/users', {
      params: { page, limit, ...(search ? { search } : {}) },
    });
    const customers = userResponse.data.data.users.map((customer) => {
      const orders = (customer.orderSummaries ?? [])
        .map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          totalAmount: Number(order.totalPrice),
          createdAt: order.createdAt,
        }));
      return normalizeCustomer(customer, orders);
    });
    return { customers, ...userResponse.data.data.pagination };
  },
};

export default customerService;
