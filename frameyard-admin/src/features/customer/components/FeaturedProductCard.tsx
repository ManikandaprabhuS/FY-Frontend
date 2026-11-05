import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from '../../../types';
import heroFallback from '../../../assets/hero.png';

export interface FeaturedProductPricing {
  currentPrice: number;
  originalPrice: number;
  discount: number;
}

interface FeaturedProductCardProps {
  product: Product;
  pricing: FeaturedProductPricing;
  isActive: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: () => void;
  wished?: boolean;
  onToggleWishlist?: () => void;
  onAddToCart?: () => void;
}

const FeaturedProductCard: React.FC<FeaturedProductCardProps> = ({
  product,
  pricing,
  isActive,
  className = '',
  style,
  onSelect,
  wished = false,
  onToggleWishlist,
  onAddToCart,
}) => {
  const imageUrl = product.images?.[0]?.imageUrl || heroFallback;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
      className={`group relative flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.10)] transition-[transform,box-shadow,border-color] duration-500 ease-in-out will-change-transform hover:-translate-y-2 hover:shadow-[0_24px_70px_rgba(0,0,0,0.16)] focus:outline-none focus:ring-4 focus:ring-black/15 ${
        isActive
          ? 'border-[6px] border-black shadow-[0_30px_90px_rgba(0,0,0,0.24)]'
          : 'border border-black/10'
      } ${className}`}
      style={style}
      aria-label={`Select ${product.name}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-black/15"
        aria-label={`${wished ? 'Remove' : 'Add'} ${product.name} ${wished ? 'from' : 'to'} wishlist`}
        aria-pressed={wished}
        onClick={(event) => { event.stopPropagation(); onToggleWishlist?.(); }}
      >
        <Heart className={`h-5 w-5 ${wished ? 'fill-black' : ''}`} aria-hidden="true" />
      </button>

      <div className="h-[58%] shrink-0 bg-[#f4f0ea]">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="relative z-10 -mt-3 flex min-h-0 flex-1 flex-col rounded-t-[1rem] bg-white px-4 pb-3 pt-3 shadow-[0_-10px_22px_rgba(0,0,0,0.04)]">
        <h3 className="truncate text-base font-black text-black">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            <p className="text-xl font-black text-black">
              {pricing.currentPrice > 0 ? `₹${pricing.currentPrice.toLocaleString('en-IN')}` : '₹0'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-black/45 line-through">
                ₹{pricing.originalPrice.toLocaleString('en-IN')}
              </span>
              {pricing.discount > 0 && (
                <span className="rounded-md bg-[#f7dfc8] px-2 py-1 text-[10px] font-black text-[#c55f12]">
                  {pricing.discount}% OFF
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/20 transition hover:bg-black hover:text-white focus:outline-none focus:ring-4 focus:ring-black/15 ${
              isActive ? 'bg-black text-white' : 'bg-white text-black'
            }`}
            aria-label={`Add ${product.name} to cart`}
            onClick={(event) => { event.stopPropagation(); onAddToCart?.(); }}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default FeaturedProductCard;
