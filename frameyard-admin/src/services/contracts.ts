export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const emptyPagination = (limit = 10): Pagination => ({
  page: 1,
  limit,
  total: 0,
  totalPages: 0,
});
