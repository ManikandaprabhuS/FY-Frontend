import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

import ReviewStars from '../../../components/reviews/ReviewStars';
import { resolveColorOption, useFrameColors } from '../../../store/frameColorStore';
import { useReviewRatingStore } from '../../../store/reviewRatingStore';
import type { Product, ProductVariant } from '../../../types';
import { normalizeStock } from '../../../utils/stock';
import { useCustomerCommerce } from '../hooks/useCustomerCommerce';
import { getVariantPricing } from '../utils/product-pricing';

const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const unique = (values: (string | null | undefined)[]) => [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];

/**
 * A product preview in a dialog: its photos, rating, sizes, colours and the price of the
 * chosen combination, with Add to cart and a link to the full product page.
 */
const ProductQuickView: React.FC<{ product: Product; onClose: () => void }> = ({ product, onClose }) => {
  const closeButton = useRef<HTMLButtonElement>(null);
  const { colors, legacyColors } = useFrameColors();
  const summary = useReviewRatingStore((state) => state.summaries[product.id]);
  const { addToCart } = useCustomerCommerce();

  const variants = useMemo(() => product.variants.filter((variant) => variant.isActive !== false), [product.variants]);
  const sizes = useMemo(() => unique(variants.map((variant) => variant.frameSize)), [variants]);
  const colours = useMemo(() => unique(variants.map((variant) => variant.color)), [variants]);
  const [size, setSize] = useState(sizes[0] ?? '');
  const [colour, setColour] = useState(colours[0] ?? '');
  const [imageIndex, setImageIndex] = useState(0);

  const variant: ProductVariant | undefined =
    variants.find((item) => item.frameSize?.trim() === size && (!colour || item.color?.trim() === colour))
    ?? variants.find((item) => item.frameSize?.trim() === size);
  const pricing = getVariantPricing(variant);
  const stock = normalizeStock(variant?.stockQuantity);

  const images = useMemo(() => {
    const list = [...(product.images ?? [])].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) || a.displayOrder - b.displayOrder);
    return list.length > 0 ? list : [];
  }, [product.images]);
  const image = images[imageIndex]?.imageUrl;

  // Close on Escape, keep the page from scrolling behind, and put focus in the dialog.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  const name = product.productName || product.name;

  return (
    <div className="fy-qv" role="presentation" onClick={onClose}>
      <div className="fy-qv__panel" role="dialog" aria-modal="true" aria-labelledby="fy-qv-title" onClick={(event) => event.stopPropagation()}>
        <button ref={closeButton} type="button" className="fy-qv__close" onClick={onClose} aria-label="Close preview">
          <X className="h-5 w-5" strokeWidth={1.8} />
        </button>

        <div className="fy-qv__gallery">
          <div className="fy-qv__image">
            {image ? <img key={image} src={image} alt={name} decoding="async" /> : <span className="fy-qv__empty">No photo yet</span>}
          </div>
          {images.length > 1 && (
            <div className="fy-qv__thumbs">
              {images.slice(0, 5).map((item, index) => (
                <button key={item.id} type="button" className="fy-qv__thumb" aria-label={`Photo ${index + 1}`} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}>
                  <img src={item.imageUrl} alt="" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="fy-qv__info">
          <p className="fy-qv__material">{product.material}</p>
          <h3 id="fy-qv-title" className="fy-qv__name">{name}</h3>

          {summary?.count ? (
            <p className="fy-qv__rating">
              <ReviewStars rating={summary.average} />
              <span className="font-semibold text-ink">{summary.average.toFixed(1)}</span>
              <span>({summary.count} {summary.count === 1 ? 'review' : 'reviews'})</span>
            </p>
          ) : null}

          <p className="fy-qv__price">
            <span className="fy-qv__now">{formatPrice(pricing.currentPrice)}</span>
            {pricing.discount > 0 && (
              <>
                <s className="fy-qv__was">{formatPrice(pricing.originalPrice)}</s>
                <span className="fy-qv__off">{pricing.discount}% off</span>
              </>
            )}
          </p>

          {sizes.length > 0 && (
            <fieldset className="fy-qv__group">
              <legend>Size <span>{size}</span></legend>
              <div className="fy-qv__chips">
                {sizes.map((option) => (
                  <button key={option} type="button" className="fy-qv__chip" aria-pressed={option === size} onClick={() => setSize(option)}>{option}</button>
                ))}
              </div>
            </fieldset>
          )}

          {colours.length > 0 && (
            <fieldset className="fy-qv__group">
              <legend>Colour <span>{resolveColorOption(colour, colors, legacyColors).name}</span></legend>
              <div className="fy-qv__chips">
                {colours.map((option) => {
                  const resolved = resolveColorOption(option, colors, legacyColors);
                  return (
                    <button
                      key={option}
                      type="button"
                      className="fy-qv__swatch"
                      aria-pressed={option === colour}
                      aria-label={resolved.name}
                      title={resolved.name}
                      style={{ '--swatch': resolved.hex || '#d6d3cd' } as React.CSSProperties}
                      onClick={() => setColour(option)}
                    />
                  );
                })}
              </div>
            </fieldset>
          )}

          <p className="fy-qv__stock" data-low={stock > 0 && stock <= 5 || undefined}>
            {!variant ? 'Not available in this combination' : stock <= 0 ? 'Out of stock' : stock <= 5 ? `Only ${stock} left` : 'In stock'}
          </p>

          <div className="fy-qv__actions">
            <button type="button" className="fy-qv__add" disabled={!variant || stock <= 0} onClick={() => { if (variant) addToCart(product, variant, 1, colour || undefined); }}>
              Add to cart
            </button>
            <Link to={`/product/${product.id}`} className="fy-qv__details" onClick={onClose}>View full details</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickView;
