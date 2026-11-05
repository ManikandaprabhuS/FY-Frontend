import { useCouponStore } from '../store/couponStore';
export const useCoupons = () => ({
  coupons: useCouponStore((state) => state.coupons),
  current: useCouponStore((state) => state.current),
  pagination: useCouponStore((state) => state.pagination),
  loading: useCouponStore((state) => state.loading),
  error: useCouponStore((state) => state.error),
  fetch: useCouponStore((state) => state.fetch),
  get: useCouponStore((state) => state.get),
  create: useCouponStore((state) => state.create),
  update: useCouponStore((state) => state.update),
  status: useCouponStore((state) => state.status),
  remove: useCouponStore((state) => state.remove),
});
