import React from 'react';
import { Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import heroFallback from '../../../assets/hero.png';
import type { Product } from '../../../types';
import type { CatalogPricing } from '../utils/catalog-product';
import '../styles/all-frames.css';

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

const LOW_STOCK = 3;
const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;

/** A product hung on a grey mat, with a gallery-style label underneath. */
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
  const lowStock = inStock && totalStock <= LOW_STOCK;
  const details = [pricing.variant?.frameSize, product.material, getColorName(pricing.variant?.color)].filter(Boolean).join(', ');
  const productPath = `/product/${product.id}`;

  return (
    <article
      className="fy-card group flex min-w-0 cursor-pointer flex-col"
      data-sold-out={!inStock}
      onClick={() => navigate(productPath)}
    >
      <div className="fy-mat">
        <img
          src={image}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="fy-art"
        />

        {pricing.discount > 0 && (
          <span className="absolute left-2.5 top-2.5 bg-ink px-2 py-1 text-[11px] font-medium leading-none text-white">
            {pricing.discount}% off
          </span>
        )}

        <button
          type="button"
          aria-label={`${wished ? 'Remove' : 'Add'} ${product.name} ${wished ? 'from' : 'to'} wishlist`}
          aria-pressed={wished}
          onClick={(event) => {
            event.stopPropagation();
            onToggleWishlist(product);
          }}
          className="group/wish absolute right-0 top-0 z-[1] grid h-11 w-11 place-items-start justify-items-end p-1.5 text-ink outline-none"
        >
          {/* 44px tap area; the visible chip sits in the mat corner, clear of the photo's edge. */}
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-[0_1px_4px_rgba(17,17,17,0.18)] transition-transform duration-300 group-active/wish:scale-90 group-focus-visible/wish:outline-2 group-focus-visible/wish:outline-offset-2 group-focus-visible/wish:outline-ink">
            <Heart className={`h-4 w-4 ${wished ? 'fill-ink' : ''}`} strokeWidth={1.7} />
          </span>
        </button>
      </div>

      <div className="pt-3">
        <h2 className={`fy-display line-clamp-2 text-[17px] leading-tight sm:text-[19px] ${inStock ? '' : 'text-mute'}`} title={product.name}>
          <Link to={productPath} onClick={(event) => event.stopPropagation()} className="outline-none focus-visible:underline">
            {product.name}
          </Link>
        </h2>
        <p className="mt-1 truncate text-[13px] text-mute">{details || 'Frame'}</p>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className={`text-[15px] font-medium ${inStock ? '' : 'text-mute'}`}>
            {formatPrice(pricing.currentPrice)}
            {pricing.discount > 0 && <s className="ml-2 text-[13px] font-normal text-mute">{formatPrice(pricing.originalPrice)}</s>}
          </p>
          <button
            type="button"
            disabled={!inStock}
            onClick={(event) => {
              event.stopPropagation();
              if (pricing.variant) onAddToCart(product, pricing.variant);
            }}
            className="fy-card__add min-h-8 text-[13px] font-medium underline decoration-1 underline-offset-4 disabled:cursor-not-allowed disabled:no-underline disabled:text-mute"
          >
            {inStock ? 'Add to bag' : 'Sold out'}
          </button>
        </div>
        {lowStock && <p className="mt-1 text-[12px] text-mute">Only {totalStock} left</p>}
      </div>
    </article>
  );
};

export default React.memo(ProductCatalogCard);
