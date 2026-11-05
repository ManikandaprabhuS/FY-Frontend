import api from './api';
import type { Pagination } from './contracts';

export type NewsletterStatus = 'ACTIVE' | 'UNSUBSCRIBED';

export type NewsletterSubscriber = {
  id: string;
  email: string;
  status: NewsletterStatus;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
};

export type NewsletterListResult = {
  subscribers: NewsletterSubscriber[];
  summary: { total: number; active: number; unsubscribed: number };
  pagination: Pagination;
};

export const newsletterService = {
  subscribe: async (email: string) => {
    const response = await api.post('/newsletter/subscribe', { email });
    return {
      message: response.data.message as string,
      resubscribed: Boolean(response.data.data?.resubscribed),
    };
  },
  unsubscribe: async (email: string) => {
    const response = await api.post('/newsletter/unsubscribe', { email });
    return response.data.message as string;
  },
  list: async (params: { page: number; limit: number; search?: string; status?: NewsletterStatus }) => {
    const response = await api.get('/newsletter/subscribers', { params });
    return response.data.data as NewsletterListResult;
  },
  exportCsv: async (params: { search?: string; status?: NewsletterStatus }) => {
    const response = await api.get('/newsletter/subscribers/export', { params, responseType: 'blob' });
    return response.data as Blob;
  },
};

