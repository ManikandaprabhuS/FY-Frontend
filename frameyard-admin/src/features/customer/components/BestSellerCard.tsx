import React from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

import ReviewStars from '../../../components/reviews/ReviewStars';
import type { RatingSummary } from '../../../services/review.service';
import type { Product } from '../../../types';
import { primaryImage } from '../utils/bestSellers';
import { getCatalogPricing } from '../utils/catalog-product';
import '../styles/best-sellers.css';

const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;

/**
 * A gallery-style product tile: the photo, a centred spaced name and the starting price,
 * with the rating underneath. The photo and the name both open the product page; a small
 * eye button opens the Quick view when one is offered.
 */
const BestSellerCard: React.FC<{ product: Product; summary?: RatingSummary; onQuickView?: (product: Product) => void; priority?: boolean }> = ({ product, summary, onQuickView, priority = false }) => {
  const pricing = getCatalogPricing(product);
  const name = product.productName || product.name;
  const path = `/product/${product.id}`;
  const sizeCount = new Set(product.variants.filter((variant) => variant.isActive !== false).map((variant) => variant.frameSize?.trim())).size;

  return (
    <article className="fy-bs">
      <div className="fy-bs__media">
        <Link to={path} className="fy-bs__image" aria-label={name}>
          <img src={primaryImage(product)} alt="" decoding="async" loading={priority ? 'eager' : 'lazy'} draggable={false} />
        </Link>
        {pricing.discount > 0 && <span className="fy-bs__sale">Sale</span>}
        {onQuickView && (
          <button type="button" className="fy-bs__quick" onClick={() => onQuickView(product)} aria-label={`Quick view ${name}`}>
            <Eye className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </div>

      <h3 className="fy-bs__name"><Link to={path}>{name}</Link></h3>
      <p className="fy-bs__price">
        <span>{sizeCount > 1 ? 'From ' : ''}{formatPrice(pricing.currentPrice)}</span>
        {pricing.discount > 0 && <s>{formatPrice(pricing.originalPrice)}</s>}
      </p>
      {summary?.count ? (
        <p className="fy-bs__rating">
          <ReviewStars rating={summary.average} />
          <span>{summary.average.toFixed(1)} ({summary.count})</span>
        </p>
      ) : null}
    </article>
  );
};

export default BestSellerCard;
