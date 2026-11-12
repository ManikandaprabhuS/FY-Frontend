import { useState } from 'react';
import { Lock, Star } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reviewService, type ReviewInput } from '../../services/review.service';
import { reviewValidation } from '../../utils/review-validation';
import { getApiErrorMessage } from '../../services/api';
import { showApiError, showLoading, showSuccess, showWarning } from '../../utils/toast';

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const COMMENT_MAX = 1000;

/**
 * The review form: five stars that pop when chosen (with a word for each), name and email,
 * an optional title, and the review with a bar that fills as you write. Validation,
 * the spam trap, approval before publishing and the toasts work as before.
 */
export default function ReviewForm({ productId, onSubmitted, onCancel }: { productId: string; onSubmitted: () => void; onCancel: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [input, setInput] = useState<ReviewInput>({ name: user?.role === 'CUSTOMER' ? user.name : '', email: user?.role === 'CUSTOMER' ? user.email : '', rating: 0, title: '', comment: '', website: '' });
  const [hover, setHover] = useState(0), [busy, setBusy] = useState(false);
  const errors = reviewValidation(input), valid = !Object.keys(errors).length;
  const change = (key: keyof ReviewInput, value: string | number) => setInput((current) => ({ ...current, [key]: value }));
  const shown = hover || input.rating;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!valid) { showWarning(Object.values(errors)[0] || 'Complete the required fields.'); return; }
    setBusy(true);
    const id = 'review-submit:' + productId;
    showLoading('Please wait, your review is being submitted...', id);
    try {
      await reviewService.submit(productId, { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), title: input.title.trim(), comment: input.comment.trim() });
      showSuccess('Thank you! Your review will appear after approval.', { id });
      onSubmitted();
    } catch (error) {
      showApiError(error, getApiErrorMessage(error, 'Your review could not be submitted. Please try again.'), { id });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="fy-rf" noValidate>
      <fieldset className="fy-rf__rating" disabled={busy}>
        <legend className="fy-rf__label">Your rating <span aria-hidden="true">*</span></legend>
        <div className="fy-rf__stars" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="fy-rf__star" data-on={shown >= value || undefined} data-picked={input.rating === value || undefined} onMouseEnter={() => setHover(value)}>
              <input type="radio" name="review-rating" value={value} checked={input.rating === value} onChange={() => change('rating', value)} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}, ${RATING_WORDS[value]}`} className="sr-only" />
              <Star className="fy-rf__star-icon" strokeWidth={1.6} aria-hidden="true" />
            </label>
          ))}
          <span className="fy-rf__word" key={shown} aria-hidden="true">{shown ? RATING_WORDS[shown] : 'Tap a star'}</span>
        </div>
      </fieldset>

      <div className="fy-rf__row">
        <label className="fy-rf__field">
          <span className="fy-rf__label">Name <span aria-hidden="true">*</span></span>
          <input value={input.name} onChange={(event) => change('name', event.target.value)} maxLength={50} autoComplete="name" disabled={busy} required aria-invalid={Boolean(input.name && errors.name)} />
          {input.name && errors.name && <span className="fy-rf__error">{errors.name}</span>}
        </label>
        <label className="fy-rf__field">
          <span className="fy-rf__label">Email <span aria-hidden="true">*</span></span>
          <input type="email" value={input.email} onChange={(event) => change('email', event.target.value)} maxLength={254} autoComplete="email" disabled={busy} required aria-invalid={Boolean(input.email && errors.email)} />
          {input.email && errors.email && <span className="fy-rf__error">{errors.email}</span>}
        </label>
      </div>

      <label className="fy-rf__field">
        <span className="fy-rf__label">Title <small>Optional</small></span>
        <input value={input.title} onChange={(event) => change('title', event.target.value)} maxLength={100} disabled={busy} placeholder="Sum it up in a few words" aria-invalid={Boolean(errors.title)} />
        {errors.title && <span className="fy-rf__error">{errors.title}</span>}
      </label>

      <label className="fy-rf__field">
        <span className="fy-rf__label">Your review <span aria-hidden="true">*</span></span>
        <textarea value={input.comment} onChange={(event) => change('comment', event.target.value)} minLength={10} maxLength={COMMENT_MAX} rows={5} disabled={busy} required placeholder="How does it look on your wall? How was the finish, the glass, the packing?" aria-describedby="review-counter" aria-invalid={Boolean(input.comment && errors.comment)} />
        <span className="fy-rf__meter" aria-hidden="true"><span style={{ transform: `scaleX(${input.comment.length / COMMENT_MAX})` }} /></span>
        <span className="fy-rf__foot">
          {input.comment && errors.comment ? <span className="fy-rf__error">{errors.comment}</span> : <span />}
          <span id="review-counter" className="fy-rf__count">{COMMENT_MAX - input.comment.length} characters left</span>
        </span>
      </label>

      {/* Spam trap: hidden from people, filled in only by bots. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0"><label>Website<input name="website" value={input.website} onChange={(event) => change('website', event.target.value)} tabIndex={-1} autoComplete="off" /></label></div>

      <p className="fy-rf__note"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Your email stays private. Reviews appear once our team approves them.</p>

      <div className="fy-rf__actions">
        <button type="button" onClick={onCancel} disabled={busy} className="fy-rf__cancel">Cancel</button>
        <button type="submit" disabled={!valid || busy} aria-disabled={!valid || busy} className="fy-rf__submit">{busy ? 'Submitting…' : 'Submit review'}</button>
      </div>
    </form>
  );
}
