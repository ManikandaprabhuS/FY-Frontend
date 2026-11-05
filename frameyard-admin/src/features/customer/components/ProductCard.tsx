import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroProduct } from '../data/heroData';
import './HeroSplit.css';

interface ProductCardProps {
  product: HeroProduct;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [selectedColor, setSelectedColor] = useState(product.colorOptions[0]?.value || product.frameColor);

  const previewStyle = useMemo(
    () => ({
      '--frame-color': selectedColor,
      '--mat-color': product.matColor,
      '--art-accent': product.artAccent,
    } as React.CSSProperties),
    [product.artAccent, product.matColor, selectedColor],
  );

  return (
    <Link to={`/products/${product.slug}`} className="fy-product-tile" aria-label={`View ${product.name}`}>
      <span className="fy-product-tile__badge">{product.badge}</span>

      <div className="fy-product-tile__visual" aria-hidden="true" style={previewStyle}>
        {product.image ? (
          <img className="fy-product-tile__image" src={product.image} alt={product.alt || product.name} loading="lazy" />
        ) : (
          <div className="fy-mini-frame">
            <div className="fy-mini-frame__mat">
              <div className="fy-mini-frame__art" />
            </div>
          </div>
        )}
      </div>

      <div className="fy-product-tile__footer">
        <div className="fy-product-tile__meta">
          <h2>{product.name}</h2>
          <div className="fy-product-tile__swatches" aria-label={`${product.name} color options`}>
            {product.colorOptions.map((color) => (
              <button
                key={color.name}
                type="button"
                className="fy-product-tile__swatch"
                style={{ '--swatch-color': color.value } as React.CSSProperties}
                aria-label={`Preview ${color.name}`}
                aria-pressed={selectedColor === color.value}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedColor(color.value);
                }}
              />
            ))}
          </div>
        </div>
        <p className="fy-product-tile__price">{product.price}</p>
      </div>
    </Link>
  );
};

export default ProductCard;

