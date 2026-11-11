import type { RatingSummary } from '../../../services/review.service';
import type { Product } from '../../../types';

export type RankedProduct = { product: Product; summary?: RatingSummary };

export const primaryImage = (product: Product) =>
  product.images?.find((image) => image.isPrimary)?.imageUrl ?? product.images?.[0]?.imageUrl;

/** Active products with a photo and at least one active variant: the ones a shopper can buy. */
export const shoppableProducts = (products: Product[]) =>
  products.filter((product) => product.isActive && primaryImage(product) && product.variants?.some((variant) => variant.isActive !== false));

/**
 * Best sellers from customer reviews (the public data available today): most reviews,
 * then the higher average, then catalogue order. Products without reviews follow, so the
 * section is never empty.
 */
export const rankBestSellers = (products: Product[], summaries: Record<string, RatingSummary>): RankedProduct[] =>
  shoppableProducts(products)
    .map((product, order) => ({ product, summary: summaries[product.id], order }))
    .sort((a, b) => (b.summary?.count ?? 0) - (a.summary?.count ?? 0) || (b.summary?.average ?? 0) - (a.summary?.average ?? 0) || a.order - b.order)
    .map(({ product, summary }) => ({ product, summary }));
