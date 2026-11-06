import type { Product, ProductVariant } from '../../../types';

export type ImageSelection = 'default' | 'color' | 'variant';

export const productOptionImage = (product: Product | null | undefined, variant: ProductVariant | undefined, color: string, selection: ImageSelection): string => {
  const images = product?.images ?? [];
  const fallback = images.find(image => image.isPrimary && !image.color)?.imageUrl
    ?? images.find(image => !image.color)?.imageUrl ?? '';
  if (selection === 'color') {
    return images.find(image => image.color?.trim().toLowerCase() === color.trim().toLowerCase())?.imageUrl || fallback;
  }
  if (selection === 'variant') return variant?.imageUrl || fallback;
  return fallback;
};
