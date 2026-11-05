import React, { useEffect, useState } from 'react';
import { wishlistAnalyticsService, type WishlistProductAnalytics } from '../../services/wishlist-analytics.service';

export const WishlistAnalyticsPage: React.FC = () => {
  const [products, setProducts] = useState<WishlistProductAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    wishlistAnalyticsService.list()
      .then(setProducts)
      .catch((requestError) => {
        setError(requestError?.response?.data?.message || 'Failed to load wishlist data');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Wishlists</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Products ranked by the number of customers who wishlisted them.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-right">Wishlisted Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50 text-sm">
              {loading ? (
                <tr><td colSpan={2} className="px-6 py-10 text-center text-on-surface-variant">Loading wishlist data...</td></tr>
              ) : error ? (
                <tr><td colSpan={2} className="px-6 py-10 text-center text-error">{error}</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={2} className="px-6 py-10 text-center text-on-surface-variant">No products have been wishlisted yet.</td></tr>
              ) : products.map((product) => (
                <tr key={product.productIdentifier} className="transition-colors hover:bg-surface-container-low/60">
                  <td className="px-6 py-4 font-semibold text-on-surface">{product.productName}</td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-on-surface">{product.wishlistUserCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WishlistAnalyticsPage;
