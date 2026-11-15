import { useCallback, useState, useSyncExternalStore } from 'react';
import { PenLine } from 'lucide-react';
import ReviewForm from './ReviewForm';
import { ReviewDialog } from './ProductReviews';

/*
 * "Write a review" for a product in an order. It opens the same review dialog as the product
 * page, right where the customer is, and submits to the same review API. After a successful
 * submit the dialog closes and the customer stays on the orders page, with the button
 * replaced by a note that the review is awaiting approval.
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
      <button type="button" className={`fy-oir ${className}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PenLine aria-hidden="true" />{label}
      </button>
      {open && (
        <ReviewDialog productName={productName} productImage={productImage ?? undefined} onClose={close}>
          <ReviewForm productId={productId} onCancel={close} onSubmitted={onSubmitted} />
        </ReviewDialog>
      )}
    </>
  );
}
