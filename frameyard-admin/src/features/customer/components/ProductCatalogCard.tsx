import React from 'react';
import ProductRating from '../../../components/reviews/ProductRating';
import { Link, useNavigate } from 'react-router-dom';

import heroFallback from '../../../assets/hero.png';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { getStockStatus } from '../../../utils/stock';
import type { Product } from '../../../types';
import type { CatalogPricing } from '../utils/catalog-product';
import AddToCartButton from './AddToCartButton';
import WishlistHeart from './WishlistHeart';
import '../styles/all-frames.css';

type ProductCatalogCardProps = {
  product: Product;
  pricing: CatalogPricing;
  totalStock: number;
  wished: boolean;
  priority?: boolean;
  onToggleWishlist: (product: Product) => void | Promise<void>;
  /** Returns whether the item went into the cart; drives the button's success state. */
  onAddToCart: (product: Product, variant: NonNullable<CatalogPricing['variant']>) => boolean | void;
};

/** Products added in the last 30 days carry a "New" badge. */
const NEW_FOR_MS = 30 * 24 * 60 * 60 * 1000;
/** Read once when the shop loads, so renders stay pure and badges never flicker. */
const LOADED_AT = Date.now();

const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;

/**
 * A shop card for a picture frame: the photo large and square-cornered, then what a shopper
 * scans for — material, name, rating, price with the saving, sizes — and Add to cart.
 */
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
  const stockStatus = getStockStatus(totalStock);
  const inStock = stockStatus.quantity > 0;
  const productPath = `/product/${product.id}`;
  const createdAt = Date.parse(product.createdAt);
  const isNew = Number.isFinite(createdAt) && LOADED_AT - createdAt < NEW_FOR_MS;
  const saving = pricing.originalPrice - pricing.currentPrice;
  const sizes = [...new Set(product.variants.filter((variant) => variant.isActive !== false).map((variant) => variant.frameSize?.trim()).filter(Boolean))];
  const wishPending = useCustomerCommerceStore((state) => Boolean(product.productIdentifier && state.wishlistPending[product.productIdentifier]));

  return (
    <article className="fy-card" data-sold-out={!inStock} onClick={() => navigate(productPath)}>
      <div className="fy-card__media">
        <img
          src={image}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="fy-card__img"
        />

        {(pricing.discount > 0 || isNew || !inStock) && (
          <span className="fy-card__badges">
            {!inStock && <span className="fy-card__badge fy-card__badge--muted">Sold out</span>}
            {inStock && pricing.discount > 0 && <span className="fy-card__badge">{pricing.discount}% off</span>}
            {isNew && <span className="fy-card__badge fy-card__badge--light">New</span>}
          </span>
        )}

        <WishlistHeart wished={wished} pending={wishPending} productName={product.name} onToggle={() => void onToggleWishlist(product)} />
      </div>

      <div className="fy-card__body">
        {product.material && <p className="fy-card__material">{product.material}</p>}
        <h2 className="fy-card__name" title={product.name}>
          <Link to={productPath} onClick={(event) => event.stopPropagation()} className="outline-none focus-visible:underline">
            {product.name}
          </Link>
        </h2>
        <ProductRating productId={product.id} />

        <p className="fy-card__price">
          <span className="fy-card__now">{formatPrice(pricing.currentPrice)}</span>
          {pricing.discount > 0 && <s className="fy-card__was">{formatPrice(pricing.originalPrice)}</s>}
          {saving > 0 && <span className="fy-card__save">Save {formatPrice(saving)}</span>}
        </p>

        <p className="fy-card__meta">
          {sizes.length > 0 && <span>{sizes.length === 1 ? sizes[0] : `${sizes.length} sizes`}</span>}
          {stockStatus.key === 'low' && <span className="fy-card__low">Only {stockStatus.quantity} left</span>}
        </p>
      </div>

      <AddToCartButton available={inStock && Boolean(pricing.variant)} onAdd={() => (pricing.variant ? onAddToCart(product, pricing.variant) : false)} />
    </article>
  );
};

export default React.memo(ProductCatalogCard);
