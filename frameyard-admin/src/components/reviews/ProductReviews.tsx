import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import ReviewForm from './ReviewForm';
import ReviewStars from './ReviewStars';
import { reviewService, type PublicReview, type RatingSummary } from '../../services/review.service';
import { useReviewRatingStore } from '../../store/reviewRatingStore';
const blank: RatingSummary = { average: 0, count: 0, breakdown: {} };
export default function ProductReviews({ productId, initiallyOpen = false }: { productId: string; initiallyOpen?: boolean }) {
  const [reviews, setReviews] = useState<PublicReview[]>([]), [summary, setSummary] = useState(blank);
  const [page, setPage] = useState(1), [pages, setPages] = useState(0), [sort, setSort] = useState('newest');
  const [open,setOpen] = useState(initiallyOpen), [loading,setLoading] = useState(true), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { setLoading(true); void reviewService.publicList(productId,page,sort).then(data => {
      if (!active) return;
      setReviews(current => page === 1 ? data.reviews : [...current,...data.reviews]); setSummary(data.summary); setPages(data.pagination.totalPages); setError('');
      useReviewRatingStore.setState(state => ({ summaries: { ...state.summaries, [productId]: data.summary } }));
    }).catch(() => { if(active) setError('Reviews could not be loaded. Please try again.'); }).finally(() => { if(active) setLoading(false); }); },0);
    return () => { active=false; clearTimeout(timer); };
  },[productId,page,sort,revision]);
  return <section id="reviews" className="mt-8 scroll-mt-24 rounded-xl border border-black/10 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">Reviews & Ratings</h2><button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-lg bg-black px-4 text-xs font-bold text-white">Write a review</button></div>
    {summary.count > 0 && <div className="my-5 grid gap-5 border-b border-black/10 pb-5 sm:grid-cols-2"><div><p className="text-3xl font-black">{summary.average.toFixed(1)} <span className="text-sm font-normal text-black/60">out of 5</span></p><ReviewStars rating={summary.average} /><p className="mt-1 text-xs text-black/60">{summary.count} approved {summary.count === 1 ? 'review' : 'reviews'}</p></div><div className="space-y-1.5">{[5,4,3,2,1].map(star => <div key={star} className="flex items-center gap-2 text-xs"><span className="w-9">{star} stars</span><div className="h-2 flex-1 rounded-full bg-black/10"><div className="h-2 rounded-full bg-amber-500" style={{ width: ((summary.breakdown[String(star)] || 0) / summary.count * 100) + '%' }} /></div><span className="w-5 text-right">{summary.breakdown[String(star)] || 0}</span></div>)}</div></div>}
    <div className="my-4 flex justify-end"><label className="text-xs font-semibold">Sort reviews <select value={sort} onChange={e => { setSort(e.target.value);setPage(1);setReviews([]); }} className="ml-2 min-h-11 rounded-lg border border-black/20 bg-white px-2"><option value="newest">Newest</option><option value="highest">Highest rating</option><option value="lowest">Lowest rating</option></select></label></div>
    {error && <div role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={() => setRevision(v=>v+1)} className="min-h-11 px-2 font-bold underline">Retry</button></div>}
    {!loading && !error && !reviews.length && <p className="py-8 text-center text-sm text-black/60">No reviews yet. Be the first to review this frame.</p>}
    <div className="divide-y divide-black/10">{reviews.map(review => <article key={review.id} className="py-5"><div className="flex items-start gap-3"><span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5 text-sm font-black">{review.name.slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words text-sm font-bold">{review.name}</h3><time className="text-xs text-black/50" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('en-GB')}</time></div><ReviewStars rating={review.rating} />{review.verifiedPurchase && <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Verified purchase</span>}{review.title && <h4 className="mt-2 break-words text-sm font-bold">{review.title}</h4>}<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-black/70">{review.comment}</p></div></div></article>)}</div>
    {loading && <p role="status" className="py-5 text-center text-sm font-semibold text-black/50">Loading reviews…</p>}
    {page < pages && <button type="button" disabled={loading} onClick={() => setPage(v=>v+1)} className="mt-4 min-h-11 w-full rounded-lg border border-black/20 text-sm font-bold disabled:opacity-50">Load more</button>}
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Write a review"><ReviewForm productId={productId} onCancel={() => setOpen(false)} onSubmitted={() => setOpen(false)} /></Modal>
  </section>;
}
