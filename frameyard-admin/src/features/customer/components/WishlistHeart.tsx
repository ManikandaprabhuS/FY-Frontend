import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import '../styles/all-frames.css';

type WishlistHeartProps = {
  wished: boolean;
  pending: boolean;
  productName: string;
  onToggle: () => void;
  className?: string;
};

/**
 * The wishlist heart, shared by the shop cards and the product page. Adding pops the heart,
 * fills it and sends out a ring; removing gives a soft shrink. It animates only after a tap
 * on this heart (not when the wishlist syncs in the background), and waits while saving.
 */
const WishlistHeart = ({ wished, pending, productName, onToggle, className = '' }: WishlistHeartProps) => {
  const [motion, setMotion] = useState<'added' | 'removed' | null>(null);
  const clickedAt = useRef(0);
  const previous = useRef(wished);
  useEffect(() => {
    if (previous.current === wished) return;
    previous.current = wished;
    if (Date.now() - clickedAt.current > 8000) return;
    clickedAt.current = 0;
    setMotion(wished ? 'added' : 'removed');
  }, [wished]);

  return (
    <button
      type="button"
      aria-label={`${wished ? 'Remove' : 'Add'} ${productName} ${wished ? 'from' : 'to'} wishlist`}
      aria-pressed={wished}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation();
        clickedAt.current = Date.now();
        onToggle();
      }}
      className={`fy-wish ${className}`}
      data-on={wished || undefined}
      data-motion={motion ?? undefined}
      onAnimationEnd={() => setMotion(null)}
    >
      <span className="fy-wish__ring" aria-hidden="true" />
      <Heart className="fy-wish__heart" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
};

export default WishlistHeart;
