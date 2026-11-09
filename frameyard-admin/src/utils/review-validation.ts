import type { ReviewInput } from '../services/review.service';
export const reviewValidation = (input: ReviewInput) => {
  const errors: Partial<Record<keyof ReviewInput, string>> = {};
  const plain = (value: string) => !/<\/?[a-z][^>]*>/i.test(value);
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) errors.rating = 'Please select 1 to 5 stars.';
  if ([...input.name.trim()].length < 2 || [...input.name.trim()].length > 50 || !plain(input.name)) errors.name = 'Enter a plain-text name of 2-50 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) || input.email.trim().length > 254) errors.email = 'Enter a valid email address.';
  if (input.title.trim().length > 100 || !plain(input.title)) errors.title = 'Use plain text, up to 100 characters.';
  if ([...input.comment.trim()].length < 10 || [...input.comment.trim()].length > 1000 || !plain(input.comment)) errors.comment = 'Enter plain-text feedback of 10-1000 characters.';
  return errors;
};
