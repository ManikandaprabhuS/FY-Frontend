import { useEffect, useRef, useState } from 'react';
import '../styles/all-frames.css';

/** How long the walker takes to cross the button, and how long "Added" stays. */
const WALK_MS = 950;
const ADDED_MS = 1500;

type CartState = 'idle' | 'adding' | 'added';

type AddToCartButtonProps = {
  /** Adds the item; returning false (not added) skips the walk and the "Added" state. */
  onAdd: () => boolean | void;
  available: boolean;
  label?: string;
  soldOutLabel?: string;
  className?: string;
};

/**
 * Add to cart, shared by the shop cards and the product page: a small figure carrying a
 * shopping bag walks across the button, then a drawn tick and "Added". One add at a time —
 * the guard is a ref, so rapid clicks that land before React re-renders are ignored too.
 */
const AddToCartButton = ({ onAdd, available, label = 'Add to cart', soldOutLabel = 'Sold out', className = '' }: AddToCartButtonProps) => {
  const [cartState, setCartState] = useState<CartState>('idle');
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const add = () => {
    if (busy.current || !available) return;
    busy.current = true;
    if (onAdd() === false) {
      busy.current = false;
      return;
    }
    setCartState('adding');
    const walk = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : WALK_MS;
    timers.current.push(
      window.setTimeout(() => setCartState('added'), walk),
      window.setTimeout(() => {
        setCartState('idle');
        busy.current = false;
      }, walk + ADDED_MS),
    );
  };

  return (
    <button
      type="button"
      disabled={!available || cartState !== 'idle'}
      aria-disabled={!available || cartState !== 'idle'}
      onClick={(event) => {
        event.stopPropagation();
        add();
      }}
      className={`fy-cart ${className}`}
      data-state={available ? cartState : 'sold'}
    >
      <span className="fy-cart__label" aria-hidden={cartState !== 'idle'}>{available ? label : soldOutLabel}</span>
      {cartState === 'adding' && (
        <span className="fy-cart__walk" aria-hidden="true">
          <Walker />
        </span>
      )}
      {cartState === 'added' && <span className="fy-cart__done"><AddedTick />Added</span>}
      <span className="sr-only" aria-live="polite">{cartState === 'adding' ? 'Adding to cart' : cartState === 'added' ? 'Added to cart' : ''}</span>
    </button>
  );
};

/** The "Added" tick: a ring draws round, the check strokes in, and the mark bounces once. */
const AddedTick = () => (
  <svg className="fy-tick" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <circle className="fy-tick__ring" cx="10" cy="10" r="8.5" pathLength="100" />
    <path className="fy-tick__check" d="M6 10.4l2.7 2.7L14.2 7.4" pathLength="100" />
  </svg>
);

/** A small figure carrying a shopping bag; its legs, arm and bag swing as it walks. */
const Walker = () => (
  <svg className="fy-walker" viewBox="0 0 24 28" width="20" height="24">
    <circle cx="11" cy="4" r="2.6" fill="currentColor" />
    <path d="M11 7.5v9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path className="fy-walker__arm-back" d="M11 9.5l-3 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <g className="fy-walker__arm">
      <path d="M11 9.5l3 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.2 14h5.6l.7 6.5h-7z" fill="currentColor" />
      <path d="M13.6 14v-1.2a1.4 1.4 0 0 1 2.8 0V14" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </g>
    <path className="fy-walker__leg" d="M11 16.5l-2.6 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path className="fy-walker__leg fy-walker__leg--b" d="M11 16.5l2.6 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export default AddToCartButton;
