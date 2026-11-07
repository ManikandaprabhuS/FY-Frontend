export interface PriceVariant { price?: number | string | null; mrp?: number | string | null; offerPrice?: number | string | null; isActive?: boolean }
const amount = (value: unknown): number | undefined => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};
export const discountPercent = (original: unknown, selling: unknown): number => {
  const originalPrice = amount(original);
  const sellingPrice = amount(selling);
  if (!originalPrice || !sellingPrice || originalPrice <= sellingPrice) return 0;
  const percent = Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
  return percent > 0 && percent < 100 ? percent : 0;
};
export const getVariantPricing = (variant?: PriceVariant) => {
  const currentPrice = amount(variant?.offerPrice ?? variant?.price) ?? 0;
  // Raw API: mrp=original, price=selling. Normalized UI: price=original,
  // offerPrice=selling when discounted. Never manufacture an original price.
  const original = variant?.mrp ?? (variant?.offerPrice != null ? variant.price : undefined);
  return { currentPrice, originalPrice: amount(original) ?? currentPrice, discount: discountPercent(original, currentPrice) };
};
export const getLowestVariantPricing = <T extends PriceVariant>(variants: T[] = []) => {
  const variant = variants.filter(item => item.isActive !== false).reduce<T | undefined>((lowest, candidate) =>
    !lowest || getVariantPricing(candidate).currentPrice < getVariantPricing(lowest).currentPrice ? candidate : lowest, undefined);
  return { ...getVariantPricing(variant), variant };
};
interface VariantOption extends PriceVariant { color?: string | null; frameSize?: string; mountType?: string; glassType?: string }
export const variantForColor = <T extends VariantOption>(variants: T[], selected: T | undefined, color: string): T | undefined => {
  const matches = variants.filter(variant => variant.isActive !== false && variant.color?.trim().toLowerCase() === color.trim().toLowerCase());
  const score = (variant: T) => Number(variant.frameSize === selected?.frameSize) * 4 + Number(variant.mountType === selected?.mountType) * 2 + Number(variant.glassType === selected?.glassType);
  return matches.sort((left, right) => score(right) - score(left))[0] ?? selected;
};
