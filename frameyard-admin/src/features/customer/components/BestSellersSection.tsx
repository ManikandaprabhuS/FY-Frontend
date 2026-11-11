import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import useProducts from '../../../hooks/useProducts';
import { requestReviewRating, useReviewRatingStore } from '../../../store/reviewRatingStore';
import type { Product } from '../../../types';
import { rankBestSellers, shoppableProducts } from '../utils/bestSellers';
import BestSellerCard from './BestSellerCard';
import ProductQuickView from './ProductQuickView';
import '../styles/best-sellers.css';

/** Full rows only: eight when there are enough, otherwise four. */
const shownCount = (available: number) => (available >= 8 ? 8 : Math.min(4, available));

/**
 * Homepage best sellers, gallery style: a centred spaced heading, up to eight frames on
 * white, and one button to the shop. Ranked by customer reviews, from the products the
 * homepage already loads.
 */
const BestSellersSection: React.FC = () => {
  const { products } = useProducts(false);
  const summaries = useReviewRatingStore((state) => state.summaries);
  const [preview, setPreview] = useState<Product | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);

  useEffect(() => { shoppableProducts(products).forEach((product) => requestReviewRating(product.id)); }, [products]);

  const best = useMemo(() => {
    const ranked = rankBestSellers(products, summaries);
    return ranked.slice(0, shownCount(ranked.length));
  }, [products, summaries]);

  if (best.length === 0) return null;

  return (
    <section className="fy-bsec mx-auto w-full max-w-[1440px] px-5 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-12 lg:px-10 lg:pb-16 lg:pt-14" aria-labelledby="fy-bsec-title">
      <h2 id="fy-bsec-title" className="fy-bsec__title">Best sellers</h2>

      <ul className="fy-bsec__grid" role="list">
        {best.map(({ product, summary }, index) => (
          <li key={product.id}>
            <BestSellerCard product={product} summary={summary} onQuickView={setPreview} priority={index < 4} />
          </li>
        ))}
      </ul>

      <div className="fy-bsec__more">
        <Link to="/products" className="fy-bsec__button">View all frames</Link>
      </div>

      {preview && <ProductQuickView product={preview} onClose={closePreview} />}
    </section>
  );
};

export default BestSellersSection;
