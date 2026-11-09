import { create } from 'zustand';
import { reviewService, type RatingSummary } from '../services/review.service';
const pending = new Set<string>();
const requested = new Set<string>();
const requestedAt = new Map<string, number>();
let timer: ReturnType<typeof setTimeout> | undefined;
export const useReviewRatingStore = create<{ summaries: Record<string, RatingSummary>; revision: number }>(() => ({ summaries: {}, revision: 0 }));
export const invalidateReviewRating = (id: string) => {
  requested.delete(id); requestedAt.delete(id);
  useReviewRatingStore.setState(state => { const summaries = { ...state.summaries }; delete summaries[id]; return { summaries, revision: state.revision + 1 }; });
};
export const requestReviewRating = (id: string) => {
  if (requested.has(id) && Date.now() - (requestedAt.get(id) ?? 0) < 5000) return;
  requested.add(id); requestedAt.set(id, Date.now()); pending.add(id);
  if (timer) return;
  timer = setTimeout(() => {
    timer = undefined;
    const ids = [...pending].slice(0, 100); ids.forEach(value => pending.delete(value));
    void reviewService.summaries(ids).then(summaries => useReviewRatingStore.setState(state => ({ summaries: { ...state.summaries, ...summaries } }))).catch(() => { ids.forEach(value => requested.delete(value)); });
    if (pending.size) { const next = [...pending]; next.forEach(value => requested.delete(value)); next.forEach(requestReviewRating); }
  }, 0);
};
