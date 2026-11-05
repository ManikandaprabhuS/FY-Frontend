import { useEffect } from 'react';
import { useOrderStore } from '../store/orderStore';

export const useOrders = (autoFetch = false) => {
  const orders = useOrderStore((state) => state.orders);
  const loading = useOrderStore((state) => state.loading);
  const refreshing = useOrderStore((state) => state.refreshing);
  const error = useOrderStore((state) => state.error);
  const pagination = useOrderStore((state) => state.pagination);
  const summary = useOrderStore((state) => state.summary);
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const changeOrderStatus = useOrderStore((state) => state.changeOrderStatus);

  useEffect(() => {
    if (autoFetch && orders.length === 0) {
      fetchOrders();
    }
  }, [autoFetch, fetchOrders]);

  return {
    orders,
    loading,
    refreshing,
    error,
    pagination,
    summary,
    fetchOrders,
    changeOrderStatus,
  };
};
export default useOrders;
