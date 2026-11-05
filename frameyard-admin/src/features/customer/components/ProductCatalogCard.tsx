import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import heroFallback from '../../../assets/hero.png';
import type { Product } from '../../../types';
import type { CatalogPricing } from '../utils/catalog-product';

type ProductCatalogCardProps = {
  product: Product;
  pricing: CatalogPricing;
  totalStock: number;
  wished: boolean;
  priority?: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, variant: NonNullable<CatalogPricing['variant']>) => void;
};

const COLOR_NAMES: Record<string, string> = {
  '#0f172a': 'Black',
  '#fef3c7': 'Natural Oak',
  '#ffffff': 'White',
  '#4a3728': 'Dark Walnut',
  '#94a3b8': 'Silver',
  '#ca8a04': 'Gold',
};

const getColorName = (color?: string | null) => {
  const value = color?.trim();
  if (!value) return undefined;
  return COLOR_NAMES[value.toLowerCase()] ?? (value.startsWith('#') ? 'Custom Color' : value);
};

const ProductCatalogCard: React.FC<ProductCatalogCardProps> = ({
  product,
  pricing,
  totalStock,
  wished,
  priority = false,
  onToggleWishlist,
  onAddToCart,
}) => {
  const navigate = useNavigate();
  const image = product.images?.find((item) => item.isPrimary)?.imageUrl
    ?? product.images?.[0]?.imageUrl
    ?? heroFallback;
  const inStock = totalStock > 0;

  const openProduct = () => navigate(`/product/${product.id}`);

  return (
    <article
      className="group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_26px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:border-black/25 hover:shadow-[0_16px_38px_rgba(0,0,0,0.12)] focus-within:ring-2 focus-within:ring-black"
      onClick={openProduct}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f2eee8]">
        <img
          src={image}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.035]"
        />

        {pricing.discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-black px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
            {pricing.discount}% off
          </span>
        )}

        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <button
            type="button"
            aria-label={`${wished ? 'Remove' : 'Add'} ${product.name} ${wished ? 'from' : 'to'} wishlist`}
            aria-pressed={wished}
            onClick={(event) => {
              event.stopPropagation();
              onToggleWishlist(product);
            }}
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white/95 text-black shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <Heart className={`h-4 w-4 ${wished ? 'fill-black' : ''}`} />
          </button>
          <span
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white/95 text-black shadow-sm"
            title={inStock ? `${totalStock} in stock` : 'Out of stock'}
          >
            <ShoppingBag className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <h2 className="line-clamp-2 min-h-10 text-[13px] font-extrabold leading-5 text-black sm:min-h-0 sm:truncate sm:text-sm" title={product.name}>{product.name}</h2>
        <p className="mt-1 truncate text-[11px] font-medium text-black/55">
          {[pricing.variant?.frameSize, product.material, getColorName(pricing.variant?.color)].filter(Boolean).join(' · ') || 'Frame'}
        </p>

        <div className="mt-2 flex min-h-5 items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-black/30'}`} />
          <span className="text-[10px] font-semibold text-black/55">{inStock ? 'In stock' : 'Out of stock'}</span>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between">
          <div className="min-w-0">
            <p className="text-base font-black text-black">₹{pricing.currentPrice.toLocaleString('en-IN')}</p>
            {pricing.discount > 0 && (
              <p className="text-[10px] font-semibold text-black/40 line-through">
                ₹{pricing.originalPrice.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!inStock}
            onClick={(event) => {
              event.stopPropagation();
              if (pricing.variant) onAddToCart(product, pricing.variant);
            }}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-black px-2 text-[10px] font-bold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/25 min-[420px]:h-8 min-[420px]:w-auto min-[420px]:px-3"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {inStock ? 'Add to Bag' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default React.memo(ProductCatalogCard);
