import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ChevronDown, PenLine, X } from 'lucide-react';
import ReviewForm from './ReviewForm';
import ReviewStars from './ReviewStars';
import ShopSortMenu from '../../features/customer/components/ShopSortMenu';
import { reviewService, type PublicReview, type RatingSummary } from '../../services/review.service';
import { useReviewRatingStore } from '../../store/reviewRatingStore';
import './product-reviews.css';

type ReviewSort = 'newest' | 'highest' | 'lowest';
const SORTS: { value: ReviewSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest rating' },
  { value: 'lowest', label: 'Lowest rating' },
];
const blank: RatingSummary = { average: 0, count: 0, breakdown: {} };

/**
 * Ratings and reviews. The rating (a counted score and star bars) is always shown; the
 * reviews themselves sit in a dropdown that, once open, scrolls inside its own panel so a
 * long list never pushes the page. Writing a review opens a FrameYaad dialog.
 */
export default function ProductReviews({ productId, productName, productImage, initiallyOpen = false }: { productId: string; productName?: string; productImage?: string; initiallyOpen?: boolean }) {
  const [reviews, setReviews] = useState<PublicReview[]>([]), [summary, setSummary] = useState(blank);
  const [page, setPage] = useState(1), [pages, setPages] = useState(0), [sort, setSort] = useState<ReviewSort>('newest');
  const [writing, setWriting] = useState(initiallyOpen), [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const scoreRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void reviewService.publicList(productId, page, sort).then((data) => {
        if (!active) return;
        setReviews((current) => (page === 1 ? data.reviews : [...current, ...data.reviews]));
        setSummary(data.summary);
        setPages(data.pagination.totalPages);
        setError('');
        useReviewRatingStore.setState((state) => ({ summaries: { ...state.summaries, [productId]: data.summary } }));
      }).catch(() => { if (active) setError('Reviews could not be loaded. Please try again.'); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [productId, page, sort, revision]);

  // #reviews links (the rating at the top of the page) open the list and bring it into view.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash !== '#reviews') return;
      setListOpen(true);
      window.setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  // The score counts up and the bars fill the first time the rating is on screen.
  useEffect(() => {
    const node = scoreRef.current;
    if (!node || seen) return;
    if (!('IntersectionObserver' in window)) { const timer = setTimeout(() => setSeen(true), 0); return () => clearTimeout(timer); }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setSeen(true); }, { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, summary.count]);

  return (
    <section id="reviews" className="fy-rev" data-seen={seen || undefined} aria-labelledby="fy-rev-title">
      <div className="fy-rev__head">
        <h2 id="fy-rev-title" className="fy-rev__title">Ratings &amp; reviews</h2>
        <button type="button" onClick={() => setWriting(true)} className="fy-rev__write"><PenLine className="h-4 w-4" aria-hidden="true" />Write a review</button>
      </div>

      {summary.count > 0 ? (
        <div ref={scoreRef} className="fy-rev__score">
          <div className="fy-rev__big">
            <CountUp value={summary.average} run={seen} />
            <span className="fy-rev__out">/ 5</span>
            <ReviewStars rating={summary.average} className="fy-rev__stars" />
            <p className="fy-rev__total">{summary.count} {summary.count === 1 ? 'review' : 'reviews'}</p>
          </div>
          <ul className="fy-rev__bars" aria-label="Ratings by stars">
            {[5, 4, 3, 2, 1].map((star, index) => {
              const value = summary.breakdown[String(star)] || 0;
              return (
                <li key={star} style={{ '--i': index } as React.CSSProperties}>
                  <span className="fy-rev__bar-label">{star}<span aria-hidden="true">★</span><span className="sr-only"> stars</span></span>
                  <span className="fy-rev__bar" aria-hidden="true"><span style={{ '--w': value / summary.count } as React.CSSProperties} /></span>
                  <span className="fy-rev__bar-count">{value}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : !loading && !error && (
        <div className="fy-rev__empty">
          <p className="fy-rev__empty-title">No ratings yet</p>
          <p>Bought this frame? Tell others how it looks on your wall.</p>
        </div>
      )}

      {error && <div role="alert" className="fy-rev__error">{error} <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></div>}

      {reviews.length > 0 && (
        <details className="fy-rev__drop" open={listOpen} onToggle={(event) => setListOpen(event.currentTarget.open)}>
          <summary>
            <span>Customer reviews <small>{summary.count}</small></span>
            <ChevronDown className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </summary>
          <div className="fy-rev__panel">
            {reviews.length > 1 && (
              <div className="fy-rev__toolbar">
                <ShopSortMenu value={sort} options={SORTS} onChange={(value) => { setSort(value); setPage(1); setReviews([]); }} />
              </div>
            )}
            {/* The list scrolls inside this panel, so it never runs over the page. */}
            <div className="fy-rev__scroll" tabIndex={0} aria-label="Customer reviews, scrollable">
              <ol className="fy-rev__list">
                {reviews.map((review, index) => <ReviewCard key={review.id} review={review} index={index % 6} />)}
              </ol>
              {loading && <p role="status" className="fy-rev__loading"><span aria-hidden="true" />Loading reviews</p>}
              {page < pages && (
                <button type="button" disabled={loading} onClick={() => setPage((value) => value + 1)} className="fy-rev__more">Show more reviews</button>
              )}
            </div>
          </div>
        </details>
      )}

      {writing && (
        <ReviewDialog productName={productName} productImage={productImage} onClose={() => setWriting(false)}>
          <ReviewForm productId={productId} onCancel={() => setWriting(false)} onSubmitted={() => setWriting(false)} />
        </ReviewDialog>
      )}
    </section>
  );
}

/**
 * The write-a-review dialog: on desktop a panel with the frame on the left and the form on
 * the right; on phones a sheet that rises from the bottom. Escape or the backdrop closes it,
 * the page behind stays still, and focus starts on the stars and returns afterwards.
 */
function ReviewDialog({ productName, productImage, onClose, children }: React.PropsWithChildren<{ productName?: string; productImage?: string; onClose: () => void }>) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector<HTMLElement>('input[name="review-rating"], .fy-rd__main input, .fy-rd__main textarea');
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled])')].filter((item) => item.offsetParent !== null);
      if (items.length === 0) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (event.shiftKey && document.activeElement === head) { event.preventDefault(); tail.focus(); }
      else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fy-rd" role="dialog" aria-modal="true" aria-labelledby="fy-rd-title">
      <button type="button" className="fy-rd__backdrop" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div ref={panelRef} className="fy-rd__panel">
        <aside className="fy-rd__side" aria-hidden="true">
          {productImage ? <img src={productImage} alt="" /> : <span className="fy-rd__side-blank" />}
          <p className="fy-rd__side-kicker">You're reviewing</p>
          <p className="fy-rd__side-name">{productName || 'This frame'}</p>
        </aside>
        <div className="fy-rd__main">
          <div className="fy-rd__head">
            <div>
              <h2 id="fy-rd-title" className="fy-rd__title">Write a review</h2>
              {productName && <p className="fy-rd__for">{productName}</p>}
            </div>
            <button type="button" className="fy-rd__close" aria-label="Close" onClick={onClose}><X className="h-5 w-5" strokeWidth={1.8} /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** One review: initial, name, date, stars, verified mark, and the text — long text folds. */
function ReviewCard({ review, index }: { review: PublicReview; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.comment.length > 220;
  return (
    <li className="fy-rev__card" style={{ '--i': index } as React.CSSProperties}>
      <div className="fy-rev__card-head">
        <span className="fy-rev__avatar" aria-hidden="true">{review.name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="fy-rev__name">{review.name}</p>
          <div className="fy-rev__meta">
            <ReviewStars rating={review.rating} />
            <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
          </div>
        </div>
        {review.verifiedPurchase && <span className="fy-rev__verified"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />Verified</span>}
      </div>
      {review.title && <h3 className="fy-rev__card-title">{review.title}</h3>}
      <p className="fy-rev__text" data-clamped={long && !expanded ? true : undefined}>{review.comment}</p>
      {long && <button type="button" className="fy-rev__toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : 'Read more'}</button>}
    </li>
  );
}

/** The average, counting up from 0 once `run` turns on (still under reduced motion). */
function CountUp({ value, run }: { value: number; run: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const timer = setTimeout(() => setShown(value), 0); return () => clearTimeout(timer); }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      // A frame's timestamp can be a touch earlier than `start`; never count below zero.
      const progress = Math.min(1, Math.max(0, (now - start) / 900));
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [run, value]);
  // Until the count starts (the score is still off screen), show the real average.
  return <span className="fy-rev__avg" aria-label={`${value.toFixed(1)} out of 5`}>{(run ? shown : value).toFixed(1)}</span>;
}
