import type { Product, ProductVariant } from '../../../types';
import { getLowestVariantPricing } from './product-pricing';

export type CatalogPricing = {
  currentPrice: number;
  originalPrice: number;
  discount: number;
  variant?: ProductVariant;
};

export const getCatalogPricing = (product: Product): CatalogPricing => {
  return getLowestVariantPricing(product.variants);
};
