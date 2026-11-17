import './wishlists.css';
import {Heart,Crown,Image} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { wishlistAnalyticsService, type WishlistProductAnalytics } from '../../services/wishlist-analytics.service';
import PaginationControls from '../../components/ui/PaginationControls';
import type { Pagination } from '../../services/contracts';

export const WishlistAnalyticsPage: React.FC = () => {
  const [products, setProducts] = useState<WishlistProductAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    let active = true;
    wishlistAnalyticsService.listPage(page)
      .then(data => { if (active) { setProducts(data.products); setPagination(data.pagination); setError(''); } })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Failed to load wishlist data');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  return (
    <div className="fy-wishlists w-full animate-fade-in">
      <div className="fy-wishlists__heading">
        <span aria-hidden="true"><Heart size={28}/></span>
        <div><h1 className="font-bold">Wishlists</h1><p>Products ranked by the number of customers who wishlisted them.</p></div>
      </div>
      <section className="fy-wishlists__card" aria-label="Wishlist product ranking">
        <table>
          <thead><tr><th scope="col">#</th><th scope="col">Product</th><th scope="col">Wishlisted Users</th></tr></thead>
          <tbody>
            {loading ? <>{Array.from({length:5},(_,index)=><tr key={index} aria-hidden="true"><td><span className="fy-wishlists__skeleton"/></td><td><span className="fy-wishlists__skeleton"/></td><td><span className="fy-wishlists__skeleton"/></td></tr>)}<tr className="sr-only"><td colSpan={3} role="status">Loading wishlist data...</td></tr></> : error ? (
              <tr><td colSpan={3} role="alert" className="fy-wishlists__state fy-wishlists__error">{error}</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={3} className="fy-wishlists__state"><Heart size={30} aria-hidden="true"/>No wishlisted products yet</td></tr>
            ) : products.map((product,index) => {
              const rank=(pagination.page-1)*pagination.limit+index+1;
              return <tr key={product.productIdentifier} data-rank={rank}>
                <td><span className="fy-wishlists__rank">{rank===1 && <Crown size={13} aria-label="Top wishlisted"/>}{rank}</span></td>
                <td><div className="fy-wishlists__product"><span className="fy-wishlists__image" aria-hidden="true"><Image size={23}/></span><span className="fy-wishlists__name" title={product.productName}>{product.productName}</span></div></td>
                <td><span className="fy-wishlists__count" aria-label={product.wishlistUserCount+' wishlisted users'}><Heart size={15} aria-hidden="true"/>{product.wishlistUserCount}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
        <PaginationControls pagination={pagination} busy={loading} onPageChange={next => { setLoading(true); setPage(next); }} />
      </section>
    </div>
  );
};

export default WishlistAnalyticsPage;
