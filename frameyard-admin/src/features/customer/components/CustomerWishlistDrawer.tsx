import React, { useEffect } from 'react';
import { Heart, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { useAuthStore } from '../../../store/authStore';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { showError, showSuccess } from '../../../utils/toast';

type Props = {
  open: boolean;
  onClose: () => void;
};

const CustomerWishlistDrawer: React.FC<Props> = ({ open, onClose }) => {
  const items = useCustomerCommerceStore((state) => state.wishlistItems);
  const loading = useCustomerCommerceStore((state) => state.wishlistLoading);
  const toggleWishlist = useCustomerCommerceStore((state) => state.toggleWishlist);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);


  if (!open) return null;

  const removeItem = async (productIdentifier: string) => {
    try {
      const removed = await toggleWishlist(productIdentifier);
      if (removed === null) return;
      showSuccess('Product removed from wishlist');
    } catch {
      showError('Wishlist could not be updated. Please try again.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[250]" role="dialog" aria-modal="true" aria-labelledby="customer-wishlist-title">
      <button type="button" aria-label="Close wishlist" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-[-18px_0_55px_rgba(0,0,0,0.18)]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-black text-white"><Heart className="h-4 w-4 fill-white" /></span>
            <div><h2 id="customer-wishlist-title" className="text-base font-black">Your Wishlist</h2><p className="text-[10px] font-semibold text-black/45">{items.length} saved {items.length === 1 ? 'item' : 'items'}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close wishlist" className="grid h-9 w-9 place-items-center rounded-full border border-black/10 transition hover:bg-black hover:text-white"><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-black/[0.05]" />)}</div>
          ) : items.length === 0 ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center px-8 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-black/[0.04]"><Heart className="h-7 w-7 text-black/30" /></span>
              <h3 className="mt-5 text-lg font-black">Your wishlist is empty</h3>
              <p className="mt-2 text-sm leading-6 text-black/50">Save the frames you love and find them here anytime.</p>
              <Link to="/products" onClick={onClose} className="mt-5 rounded-lg bg-black px-5 py-3 text-xs font-bold text-white">Explore frames</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const image = item.product.images?.find((entry) => entry.isPrimary)?.imageUrl ?? item.product.images?.[0]?.imageUrl;
                const activeVariants = item.product.variants?.filter((variant) => variant.isActive !== false) ?? [];
                const price = activeVariants.length > 0 ? Math.min(...activeVariants.map((variant) => Number(variant.price))) : 0;
                return (
                  <article key={item.id} className="flex gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-[0_6px_22px_rgba(0,0,0,0.04)]">
                    <Link to={`/product/${item.product.id}`} onClick={onClose} className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f4f1ed]">
                      {image ? <img src={image} alt={item.product.productName} loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center px-2 text-center text-[9px] text-black/35">No image</span>}
                    </Link>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><Link to={`/product/${item.product.id}`} onClick={onClose} className="block truncate text-sm font-black hover:underline">{item.product.productName}</Link><p className="mt-1 truncate text-[10px] text-black/45">{item.product.material?.material || 'Frame'}{activeVariants[0]?.frameSize ? ` · ${activeVariants[0].frameSize}` : ''}</p></div>
                        <button type="button" onClick={() => void removeItem(item.productIdentifier)} aria-label={`Remove ${item.product.productName} from wishlist`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/10 text-black/50 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      {price > 0 && <p className="mt-4 text-sm font-black">₹{price.toLocaleString('en-IN')}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default CustomerWishlistDrawer;
