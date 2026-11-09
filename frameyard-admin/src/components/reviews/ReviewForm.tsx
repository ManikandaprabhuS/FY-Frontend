import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reviewService, type ReviewInput } from '../../services/review.service';
import { reviewValidation } from '../../utils/review-validation';
import { getApiErrorMessage } from '../../services/api';
import { showApiError, showLoading, showSuccess, showWarning } from '../../utils/toast';
export default function ReviewForm({ productId, onSubmitted, onCancel }: { productId: string; onSubmitted: () => void; onCancel: () => void }) {
  const user = useAuthStore(state => state.user);
  const [input, setInput] = useState<ReviewInput>({ name: user?.role === 'CUSTOMER' ? user.name : '', email: user?.role === 'CUSTOMER' ? user.email : '', rating: 0, title: '', comment: '', website: '' });
  const [hover, setHover] = useState(0), [busy, setBusy] = useState(false);
  const errors = reviewValidation(input), valid = !Object.keys(errors).length;
  const change = (key: keyof ReviewInput, value: string | number) => setInput(current => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (!valid) { showWarning(Object.values(errors)[0] || 'Complete the required fields.'); return; }
    setBusy(true); const id = 'review-submit:' + productId;
    showLoading('Please wait, your review is being submitted...', id);
    try {
      await reviewService.submit(productId, { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), title: input.title.trim(), comment: input.comment.trim() });
      showSuccess('Thank you! Your review will appear after approval.', { id }); onSubmitted();
    } catch (error) { showApiError(error, getApiErrorMessage(error, 'Your review could not be submitted. Please try again.'), { id }); }
    finally { setBusy(false); }
  };
  const field = 'min-h-11 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black focus:ring-2 focus:ring-black/10 disabled:opacity-50';
  return <form onSubmit={submit} className="space-y-4" noValidate>
    <p className="text-xs leading-5 text-black/60">Everyone is welcome to review this frame. Your email stays private. Reviews appear after staff approval.</p>
    <fieldset disabled={busy}><legend className="mb-2 text-sm font-bold">Your rating *</legend><div className="flex gap-1" onMouseLeave={() => setHover(0)}>{[1,2,3,4,5].map(value => <label key={value} onMouseEnter={() => setHover(value)} className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-lg"><input type="radio" name="review-rating" value={value} checked={input.rating === value} onChange={() => change('rating', value)} aria-label={value + (value === 1 ? ' star' : ' stars')} className="peer sr-only" /><Star className={'h-8 w-8 rounded text-amber-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-black ' + ((hover || input.rating) >= value ? 'fill-current' : '')} aria-hidden /></label>)}</div></fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-bold">Name *<input value={input.name} onChange={e => change('name',e.target.value)} maxLength={50} autoComplete="name" disabled={busy} className={field} required />{input.name && errors.name && <span className="block text-xs text-red-700">{errors.name}</span>}</label>
      <label className="space-y-1 text-sm font-bold">Email *<input type="email" value={input.email} onChange={e => change('email',e.target.value)} maxLength={254} autoComplete="email" disabled={busy} className={field} required />{input.email && errors.email && <span className="block text-xs text-red-700">{errors.email}</span>}</label>
    </div>
    <label className="block space-y-1 text-sm font-bold">Review title (optional)<input value={input.title} onChange={e => change('title',e.target.value)} maxLength={100} disabled={busy} className={field} />{errors.title && <span className="block text-xs text-red-700">{errors.title}</span>}</label>
    <label className="block space-y-1 text-sm font-bold">Feedback *<textarea value={input.comment} onChange={e => change('comment',e.target.value)} minLength={10} maxLength={1000} rows={5} disabled={busy} className={field + ' resize-y'} required aria-describedby="review-counter" />{input.comment && errors.comment && <span className="block text-xs text-red-700">{errors.comment}</span>}</label>
    <p id="review-counter" className="text-right text-xs text-black/50">{input.comment.length}/1000</p>
    <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0"><label>Website<input name="website" value={input.website} onChange={e => change('website',e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
    <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-lg border border-black/20 px-4 text-sm font-bold">Cancel</button><button type="submit" disabled={!valid || busy} aria-disabled={!valid || busy} className="min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-black/25">{busy ? 'Submitting…' : 'Submit review'}</button></div>
  </form>;
}
