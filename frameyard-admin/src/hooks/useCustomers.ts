import { useEffect } from 'react';
import { useCustomerStore } from '../store/customerStore';

export const useCustomers = (
  autoFetch = false
) => {

  const customers =
    useCustomerStore(
      (state) => state.customers
    );

  const loading =
    useCustomerStore(
      (state) => state.loading
    );

  const error =
    useCustomerStore(
      (state) => state.error
    );

  const page =
    useCustomerStore(
      (state) => state.page
    );

  const totalPages =
    useCustomerStore(
      (state) => state.totalPages
    );

  const total =
    useCustomerStore(
      (state) => state.total
    );

  const fetchCustomers =
    useCustomerStore(
      (state) => state.fetchCustomers
    );

  useEffect(() => {
    if (
      autoFetch &&
      customers.length === 0
    ) {
      fetchCustomers(1, 2);
    }
  }, [
    autoFetch,
    fetchCustomers,
  ]);

  return {
    customers,
    loading,
    error,
    page,
    totalPages,
    total,
    fetchCustomers,
  };
};

export default useCustomers;
