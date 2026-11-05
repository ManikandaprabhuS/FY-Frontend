import React, { useMemo } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../../../assets/hero.png';
import { Product } from '../../../types';
import { heroCopy } from '../data/heroData';
import './HeroSplit.css';

interface HeroSplitProps {
  products: Product[];
  loading?: boolean;
  error?: string | null;
}

const mountColors = ['#141414', '#d8c9b7', '#8b512d', '#4a2414'];
const mountLayers = ['#111318', '#3a3a3a', '#efe6d8', '#8e7f55', '#8f1732', '#23395f', '#f2e6d0'];

const formatCurrency = (value?: number | null) => {
  if (!value || Number.isNaN(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN')}`;
};

const getProductPrice = (product?: Product) => {
  const variant = product?.variants?.find((item) => item.isActive !== false) || product?.variants?.[0];
  const currentPrice = variant?.offerPrice || variant?.price || 0;
  const originalPrice = variant?.mrp && variant.mrp > currentPrice ? variant.mrp : null;

  return { currentPrice, originalPrice };
};

const HeroSplit: React.FC<HeroSplitProps> = ({ products, loading = false, error = null }) => {
  const featuredProduct = useMemo(
    () => products.find((product) => product.isActive && product.images?.length) || products.find((product) => product.isActive) || products[0],
    [products],
  );

  const productImage = featuredProduct?.images?.find((image) => image.isPrimary)?.imageUrl || featuredProduct?.images?.[0]?.imageUrl;
  const { currentPrice, originalPrice } = getProductPrice(featuredProduct);
  const productSlug = featuredProduct?.productIdentifier || featuredProduct?.id || 'classic-wooden-frame';
  const productName = featuredProduct?.name || featuredProduct?.productName || 'Classic Wooden Frame';
  const productDescription = featuredProduct?.description || 'Timeless wooden frame perfect for your cherished memories.';
  const productColors = featuredProduct?.availableColors?.length ? featuredProduct.availableColors : mountColors;

  return (
    <section className="fy-editorial-hero" aria-labelledby="fy-hero-title">
      <div className="fy-editorial-hero__feature">
        <img className="fy-editorial-hero__image" src={heroImage} alt="A family memory displayed inside premium FrameYaad frames" fetchPriority="high" />
        <div className="fy-editorial-hero__shade" />

        <div className="fy-editorial-hero__copy">
          <p className="fy-editorial-hero__eyebrow">FrameYaad</p>
          <h1 id="fy-hero-title">Turn Moments Into Timeless Memories</h1>
          <span className="fy-editorial-hero__rule" aria-hidden="true" />
          <p>{heroCopy.slogan || 'Premium frames for the stories that matter.'}</p>
          <Link to="/products" className="fy-editorial-hero__button">
            Explore Frames
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <aside className="fy-editorial-hero__side" aria-label="FrameYaad highlights">
        <article className="fy-mount-tile">
          <div className="fy-mount-tile__content">
            <p className="fy-editorial-hero__eyebrow">Colored Mounts</p>
            <h2>Add a Touch of Personality</h2>
            <p>A wide range of premium mount colors to match your style.</p>
            <Link to="/products" className="fy-editorial-hero__button fy-editorial-hero__button--compact">
              View Mount Colors
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="fy-mount-stack" aria-hidden="true">
            {mountLayers.map((color, index) => (
              <span key={color} style={{ '--mount-color': color, '--mount-index': index } as React.CSSProperties} />
            ))}
          </div>
        </article>

        <article className="fy-backend-product-tile" aria-live="polite">
          {loading && !featuredProduct ? (
            <div className="fy-backend-product-tile__empty">Loading featured product…</div>
          ) : error && !featuredProduct ? (
            <div className="fy-backend-product-tile__empty">Unable to load product from backend.</div>
          ) : (
            <>
              <Link to={`/products/${productSlug}`} className="fy-backend-product-tile__visual" aria-label={`View ${productName}`}>
                {productImage ? (
                  <img src={productImage} alt={productName} loading="lazy" />
                ) : (
                  <div className="fy-backend-product-tile__mock" aria-hidden="true">
                    <div />
                  </div>
                )}
              </Link>

              <div className="fy-backend-product-tile__details">
                <p className="fy-backend-product-tile__label">Bestseller</p>
                <h2>{productName}</h2>
                <div className="fy-backend-product-tile__rating" aria-label="5 star rating">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-black text-black" aria-hidden="true" />
                  ))}
                  <span>(128)</span>
                </div>
                <div className="fy-backend-product-tile__price">
                  <strong>{formatCurrency(currentPrice)}</strong>
                  {originalPrice && <span>{formatCurrency(originalPrice)}</span>}
                </div>
                <p>{productDescription}</p>
                <div className="fy-backend-product-tile__swatches" aria-label="Available colors">
                  {productColors.slice(0, 4).map((color) => (
                    <span key={color} style={{ '--swatch-color': color } as React.CSSProperties} />
                  ))}
                </div>
                <Link to={`/products/${productSlug}`} className="fy-editorial-hero__button fy-editorial-hero__button--wide">
                  View Product
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </article>
      </aside>
    </section>
  );
};

export default HeroSplit;
