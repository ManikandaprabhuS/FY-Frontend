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

export type CustomerDetailsResponse = Omit<Customer, 'orders'> & { orders: Order[] };

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
  getCustomerById: async (id: string): Promise<CustomerDetailsResponse> => {
    const [userResponse, orderResponse] = await Promise.all([
      api.get<ApiEnvelope<{ user: CustomerApi }>>(`/users/${id}`),
      orderService.getOrders({ userId: id, page: 1, limit: 100 }),
    ]);
    return {
      ...normalizeCustomer(userResponse.data.data.user, orderResponse.orders),
      orders: orderResponse.orders,
    };
  },

  lookupCustomerByPhoneNumber: async (phoneNumber: string): Promise<CustomerLookupResponse> => {
    const normalizedInput = phoneNumber.replace(/\D/g, '');
    const first = await api.get<ApiEnvelope<{ users: CustomerApi[]; pagination: Pagination }>>('/users', {
      params: { search: normalizedInput || phoneNumber, page: 1, limit: 100 },
    });
    let users = first.data.data.users;
    // Search can miss numbers formatted with a country code. Walk remaining
    // pages only when the indexed search returned no candidate.
    if (!users.some((user) => String(user.phoneNumber ?? '').replace(/\D/g, '').endsWith(normalizedInput))) {
      const totalPages = first.data.data.pagination.totalPages;
      if (totalPages > 1) {
        const responses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) => api.get<ApiEnvelope<{ users: CustomerApi[] }>>('/users', {
            params: { page: index + 2, limit: 100 },
          }))
        );
        users = users.concat(responses.flatMap((response) => response.data.data.users));
      }
    }
    const customer = users.find((user) => {
      const normalizedUserPhone = String(user.phoneNumber ?? '').replace(/\D/g, '');
      return normalizedUserPhone === normalizedInput || normalizedUserPhone.endsWith(normalizedInput) || String(user.phoneNumber ?? '') === phoneNumber;
    });
    if (!customer?.id) throw new Error('Customer not found');
    return {
      id: customer.id,
      name: String(customer.name ?? ''),
      phoneNumber: String(customer.phoneNumber ?? ''),
    };
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
