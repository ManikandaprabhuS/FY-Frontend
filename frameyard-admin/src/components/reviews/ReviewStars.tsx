import { Star, StarHalf } from 'lucide-react';
export default function ReviewStars({ rating, className = '' }: { rating: number; className?: string }) {
  return <span role="img" aria-label={rating + ' out of 5 stars'} className={'inline-flex shrink-0 items-center gap-0.5 text-amber-600 ' + className}>{[1,2,3,4,5].map(star => rating >= star ? <Star key={star} className="h-3.5 w-3.5 fill-current" aria-hidden /> : rating >= star - 0.5 ? <StarHalf key={star} className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Star key={star} className="h-3.5 w-3.5" aria-hidden />)}</span>;
}
