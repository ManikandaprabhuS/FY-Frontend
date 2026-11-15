import { useEffect, useRef, useState } from 'react';
import '../styles/buy-now.css';

/** The frame closes around the photo by FRAMED_MS; the tick is drawn by DONE_MS; then checkout. */
const FRAMED_MS = 760;
const DONE_MS = 1450;

type BuyNowButtonProps = {
  available: boolean;
  /** The customer's photo, shown inside the little frame (a soft tone when there is none). */
  photo?: string;
  /** Adds the order to the cart; returning false stops here (nothing else happens). */
  onAdd: () => boolean;
  /** Runs when the animation ends: carry on to checkout. */
  onDone: () => void;
  /** Optional wording and styling, so the cart's Checkout reuses the same animation. */
  label?: string;
  framingText?: string;
  doneText?: string;
  /** Spoken while framing (default: the Buy now wording). */
  framingAnnouncement?: string;
  className?: string;
};

/**
 * Buy now. On press the order goes into the cart, then — inside the button — a photo appears,
 * the four sides of a frame slide in and close around it, and the framed photo turns into a
 * drawn tick before checkout opens. One press only: a ref guards against double clicks.
 */
const BuyNowButton = ({
  available, photo, onAdd, onDone,
  label = 'Buy now', framingText = 'Framing your order…', doneText = 'Going to checkout',
  framingAnnouncement = 'Adding to cart', className = '',
}: BuyNowButtonProps) => {
  const [stage, setStage] = useState<'idle' | 'framing' | 'done'>('idle');
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const press = () => {
    if (busy.current || !available) return;
    busy.current = true;
    if (!onAdd()) {
      busy.current = false;
      return;
    }
    // The same timing everywhere, reduced motion included: that setting stills the frame
    // sliding in (in CSS); it does not hurry the customer on to checkout.
    setStage('framing');
    timers.current.push(
      window.setTimeout(() => setStage('done'), FRAMED_MS),
      window.setTimeout(onDone, DONE_MS),
    );
  };

  return (
    <button
      type="button"
      className={`fy-buynow ${className}`}
      data-stage={stage}
      disabled={!available || stage !== 'idle'}
      onClick={press}
    >
      <span className="fy-buynow__label" aria-hidden={stage !== 'idle'}>{label}</span>
      {stage !== 'idle' && (
        <span className="fy-buynow__play" aria-hidden="true">
          <span className="fy-buynow__icon">
            <span className="fy-buynow__frame">
              <span className="fy-buynow__photo" style={photo ? { backgroundImage: `url("${photo}")` } : undefined} />
              <span className="fy-buynow__side fy-buynow__side--top" />
              <span className="fy-buynow__side fy-buynow__side--right" />
              <span className="fy-buynow__side fy-buynow__side--bottom" />
              <span className="fy-buynow__side fy-buynow__side--left" />
            </span>
            <svg className="fy-buynow__tick" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" pathLength="100" /><path d="M7.5 12.4l3.1 3.1 6-6.4" pathLength="100" /></svg>
          </span>
          <span className="fy-buynow__text" key={stage}>{stage === 'framing' ? framingText : doneText}</span>
        </span>
      )}
      <span className="sr-only" aria-live="polite">{stage === 'framing' ? framingAnnouncement : stage === 'done' ? 'Added. Opening checkout' : ''}</span>
    </button>
  );
};

export default BuyNowButton;
