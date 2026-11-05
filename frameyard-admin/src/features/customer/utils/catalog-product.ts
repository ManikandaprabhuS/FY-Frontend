import type { Product, ProductVariant } from '../../../types';

export type CatalogPricing = {
  currentPrice: number;
  originalPrice: number;
  discount: number;
  variant?: ProductVariant;
};

export const getCatalogPricing = (product: Product): CatalogPricing => {
  const variants = (product.variants ?? []).filter((variant) => variant.isActive !== false);
  const variant = variants.reduce<ProductVariant | undefined>((lowest, candidate) => {
    if (!lowest) return candidate;
    const lowestPrice = Number(lowest.offerPrice ?? lowest.price ?? 0);
    const candidatePrice = Number(candidate.offerPrice ?? candidate.price ?? 0);
    return candidatePrice < lowestPrice ? candidate : lowest;
  }, undefined);
  const currentPrice = Number(variant?.offerPrice ?? variant?.price ?? 0);
  const originalPrice = Number(variant?.mrp ?? variant?.price ?? currentPrice);
  const discount = originalPrice > currentPrice && originalPrice > 0
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  return { currentPrice, originalPrice, discount, variant };
};
