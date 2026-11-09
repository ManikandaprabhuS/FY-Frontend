import { useEffect } from 'react';
import { requestReviewRating, useReviewRatingStore } from '../../store/reviewRatingStore';
import ReviewStars from './ReviewStars';
export default function ProductRating({ productId }: { productId: string }) {
  const summary = useReviewRatingStore(state => state.summaries[productId]);
  const revision = useReviewRatingStore(state => state.revision);
  useEffect(() => { requestReviewRating(productId); }, [productId, revision]);
  if (!summary?.count) return null;
  return <span className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-black/65"><ReviewStars rating={summary.average} /><span>{summary.average.toFixed(1)} ({summary.count})</span></span>;
}
