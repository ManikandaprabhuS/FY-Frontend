import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from '../../../types';
import heroFallback from '../../../assets/hero.png';

export interface ProductPricing {
  currentPrice: number;
  originalPrice: number;
  discount: number;
}

interface CurvedProductCardProps {
  product: Product;
  pricing: ProductPricing;
  isActive: boolean;
  style?: React.CSSProperties;
}

const CurvedProductCard: React.FC<CurvedProductCardProps> = ({ product, pricing, isActive, style }) => {
  const imageUrl = product.images?.[0]?.imageUrl || heroFallback;

  return (
    <article
      className={`group absolute left-1/2 top-1/2 w-[260px] origin-center overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.10)] outline outline-transparent transition-[box-shadow,outline-color] duration-500 will-change-transform focus-within:outline-black sm:w-[300px] ${
        isActive ? 'outline-[6px] outline-black shadow-[0_30px_90px_rgba(0,0,0,0.24)]' : ''
      }`}
      style={style}
      aria-label={`${product.name} featured frame`}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-black/15"
        aria-label={`Add ${product.name} to wishlist`}
      >
        <Heart className="h-7 w-7" aria-hidden="true" />
      </button>

      <div className="aspect-[4/3] bg-[#f4f0ea]">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-6">
        <h3 className="text-xl font-black text-black">{product.name}</h3>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-black text-black">
              {pricing.currentPrice > 0 ? `₹${pricing.currentPrice.toLocaleString('en-IN')}` : '₹0'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-lg font-bold text-black/45 line-through">
                ₹{pricing.originalPrice.toLocaleString('en-IN')}
              </span>
              {pricing.discount > 0 && (
                <span className="rounded-lg bg-[#f7dfc8] px-3 py-1.5 text-sm font-black text-[#c55f12]">
                  {pricing.discount}% OFF
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className={`flex h-14 w-14 items-center justify-center rounded-xl border border-black/20 transition duration-300 hover:-translate-y-1 hover:bg-black hover:text-white focus:outline-none focus:ring-4 focus:ring-black/15 ${
              isActive ? 'bg-black text-white' : 'bg-white text-black'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default CurvedProductCard;
