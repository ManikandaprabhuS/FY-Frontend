import { useCallback, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PenLine } from 'lucide-react';
import ReviewForm from './ReviewForm';
import { ReviewDialog } from './ProductReviews';

/*
 * "Write a review" for a product in an order: the Product Details review experience, reused
 * as is. The trigger is the product page's own button (fy-rev__write), and it opens the same
 * ReviewDialog + ReviewForm (stars, fields, validation, spam trap, toasts, review API) for
 * this order line's product. The customer stays on the order view; once submitted, the button
 * becomes a note that the review is awaiting approval.
 */

// Products reviewed in this visit, shared by every order view (list, detail, account page).
const submitted = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

type Props = { productId: string; productName: string; productImage?: string | null; label?: string; className?: string };

export default function OrderItemReview({ productId, productName, productImage, label = 'Write a review', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const done = useSyncExternalStore(subscribe, () => submitted.has(productId), () => false);
  const close = useCallback(() => setOpen(false), []);
  const onSubmitted = useCallback(() => {
    submitted.add(productId);
    listeners.forEach((listener) => listener());
    setOpen(false);
  }, [productId]);

  if (done) return <span className={`fy-oir fy-oir--done ${className}`} role="status">Review submitted · awaiting approval</span>;
  return (
    <>
      <button type="button" className={`fy-rev__write ${className}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PenLine className="h-4 w-4" aria-hidden="true" />{label}
      </button>
      {/* Rendered at the page level, inside the store's styles: order views can sit in a sliding
          (transformed) full-screen layer on phones, which would otherwise trap a fixed dialog. */}
      {open && createPortal(
        <div className="fy-store fy-store-portal">
          <ReviewDialog productName={productName} productImage={productImage ?? undefined} onClose={close}>
            <ReviewForm productId={productId} onCancel={close} onSubmitted={onSubmitted} />
          </ReviewDialog>
        </div>,
        document.body,
      )}
    </>
  );
}
