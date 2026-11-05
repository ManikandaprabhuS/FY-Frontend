import { useProductDiscountStore } from '../store/productDiscountStore';
export const useProductDiscounts = () => ({
  assignments: useProductDiscountStore((state) => state.assignments),
  current: useProductDiscountStore((state) => state.current),
  pagination: useProductDiscountStore((state) => state.pagination),
  loading: useProductDiscountStore((state) => state.loading),
  error: useProductDiscountStore((state) => state.error),
  fetch: useProductDiscountStore((state) => state.fetch),
  get: useProductDiscountStore((state) => state.get),
  create: useProductDiscountStore((state) => state.create),
  update: useProductDiscountStore((state) => state.update),
  remove: useProductDiscountStore((state) => state.remove),
});
