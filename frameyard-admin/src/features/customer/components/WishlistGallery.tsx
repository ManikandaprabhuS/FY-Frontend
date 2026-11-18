import { useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import type { CustomerWishlistItem } from '../../../services/customer-wishlist.service';
import type { Product } from '../../../types';
import { showError } from '../../../utils/toast';
import { totalVariantStock } from '../../../utils/stock';
import { getCatalogPricing } from '../utils/catalog-product';
import { useCustomerCommerce } from '../hooks/useCustomerCommerce';
import ProductCatalogCard from './ProductCatalogCard';
import ShopSortMenu from './ShopSortMenu';
import { FrameSpinner, ProductCardSkeleton } from '../../../components/loaders/FrameLoader';
import '../styles/all-frames.css';
import '../styles/wishlist.css';

/*
 * The wishlist as a gallery: the same product cards, sort menu and interactions as All Frames,
 * used by both the wishlist view (navbar heart) and Profile → Wishlist. Both read the one
 * wishlist store, so removing a frame in either view removes it from the other at once.
 */

type WishSort = 'recent' | 'price-asc' | 'price-desc' | 'name';
const SORTS: { value: WishSort; label: string }[] = [
  { value: 'recent', label: 'Recently saved' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
];

/** The wishlist API returns the product with its variants and images; shape it as a shop product. */
const toProduct = (item: CustomerWishlistItem): Product => ({
  id: item.product.id,
  productIdentifier: item.product.productIdentifier ?? item.productIdentifier,
  productName: item.product.productName,
  name: item.product.productName,
  brandName: item.product.material?.brandName ?? '',
  material: item.product.material?.material ?? '',
  availableColors: [],
  isActive: item.product.material?.isActive !== false,
  // The product's own creation date is not in the wishlist payload, so no "New" badge here.
  createdAt: '',
  updatedAt: '',
  variants: (item.product.variants ?? []).map((variant) => ({
    id: variant.id,
    productId: variant.productId ?? item.product.id,
    color: variant.color ?? null,
    frameSize: variant.frameSize,
    mountType: variant.mountType ?? '',
    glassType: variant.glassType ?? '',
    isActive: variant.isActive,
    mrp: variant.mrp == null ? null : Number(variant.mrp),
    price: Number(variant.price),
    offerPrice: variant.offerPrice == null ? null : Number(variant.offerPrice),
    stockQuantity: Number(variant.stockQuantity ?? 0),
    createdAt: '',
  })),
  images: (item.product.images ?? []).map((image, index) => ({ id: image.id, productId: item.product.id, imageUrl: image.imageUrl, isPrimary: image.isPrimary, displayOrder: index })),
});

export default function WishlistGallery({ onBrowse }: { onBrowse?: () => void }) {
  const items = useCustomerCommerceStore((state) => state.wishlistItems);
  const loading = useCustomerCommerceStore((state) => state.wishlistLoading);
  const total = useCustomerCommerceStore((state) => state.wishlistTotal);
  const hasMore = useCustomerCommerceStore((state) => state.wishlistHasMore);
  const loadMore = useCustomerCommerceStore((state) => state.loadMoreWishlist);
  const wishlist = useCustomerCommerceStore((state) => state.wishlistByProductIdentifier);
  const { toggleWishlist, addToCart } = useCustomerCommerce();
  const [sort, setSort] = useState<WishSort>('recent');

  const entries = useMemo(() => {
    const rows = items.map((item, index) => {
      const product = toProduct(item);
      return { key: item.id, index, product, pricing: getCatalogPricing(product), totalStock: totalVariantStock(product.variants) };
    });
    if (sort === 'price-asc') rows.sort((a, b) => a.pricing.currentPrice - b.pricing.currentPrice);
    else if (sort === 'price-desc') rows.sort((a, b) => b.pricing.currentPrice - a.pricing.currentPrice);
    else if (sort === 'name') rows.sort((a, b) => a.product.name.localeCompare(b.product.name));
    return rows;
  }, [items, sort]);

  if (loading && items.length === 0) {
    return (
      <div className="fy-wl-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="fy-wl-empty">
        <span className="fy-wl-empty__mark" aria-hidden="true"><Heart strokeWidth={1.5} /></span>
        <h3>Your wishlist is empty</h3>
        <p>Tap the heart on any frame to save it here.</p>
        <Link to="/products" onClick={onBrowse} className="fy-wl-empty__cta">Explore frames</Link>
      </div>
    );
  }

  const shown = Math.max(total, items.length);
  return (
    <div className="fy-wl">
      <div className="fy-wl__bar">
        <p className="fy-wl__count" aria-live="polite">{shown} saved {shown === 1 ? 'frame' : 'frames'}</p>
        <ShopSortMenu value={sort} options={SORTS} onChange={setSort} />
      </div>
      <div className="fy-wl-grid">
        {entries.map(({ key, product, pricing, totalStock }, position) => (
          <div key={key} className="fy-wl-grid__cell" style={{ '--d': `${Math.min(position, 8) * 50}ms` } as React.CSSProperties}>
            <ProductCatalogCard
              product={product}
              pricing={pricing}
              totalStock={totalStock}
              wished={Boolean(product.productIdentifier && wishlist[product.productIdentifier])}
              priority={position < 4}
              onToggleWishlist={toggleWishlist}
              onAddToCart={addToCart}
            />
          </div>
        ))}
      </div>
      {hasMore && (
        <button type="button" className="fy-wl__more" disabled={loading} onClick={() => { void loadMore().catch(() => showError('Could not load more wishlist items. Please try again.')); }}>
          {loading ? <><FrameSpinner />Loading</> : 'Show more saved frames'}
        </button>
      )}
    </div>
  );
}
