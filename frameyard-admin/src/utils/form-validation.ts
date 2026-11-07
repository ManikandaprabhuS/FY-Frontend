// Basic input validation only. No pricing, eligibility, permission or stock calculations.
export const validateText = (label: string, value: string, minimum: number, maximum: number): string | null => {
  const text = value.trim();
  if (text.length < minimum) return `${label} must contain at least ${minimum} characters.`;
  if (text.length > maximum) return `${label} must be ${maximum} characters or fewer.`;
  if (/<\/?[a-z][^>]*>/i.test(text)) return `${label} must be plain text.`;
  return null;
};
export const validatePhone = (value: string): string | null => {
  if (!value.trim()) return null; // optional field
  const digits = value.replace(/\D/g, '');
  return /^\+?[\d\s()-]+$/.test(value.trim()) && digits.length >= 7 && digits.length <= 15 && value.trim().length <= 20
    ? null : 'Enter a valid phone number.';
};
export const validatePerson = (input: { name: string; email?: string; phoneNumber?: string; password?: string }): string | null => {
  const name = validateText('Name', input.name, 2, 120);
  if (name) return name;
  if (input.email !== undefined && (input.email.trim().length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))) return 'Enter a valid email address.';
  if (input.password !== undefined && (input.password.length < 8 || input.password.length > 72)) return 'Password must contain 8–72 characters.';
  return validatePhone(input.phoneNumber ?? '');
};
export const validateVariant = (input: { frameSize: string; mountType: string; glassType: string; price: number; offerPrice?: number | null; stockQuantity: number }): string | null => {
  const text = validateText('Variant size', input.frameSize, 1, 80) || validateText('Mount type', input.mountType, 1, 80);
  if (text) return text;
  if (!['NONE', 'OPTION_1', 'OPTION_2'].includes(input.glassType)) return 'Select a valid glass type.';
  if (!Number.isFinite(input.price) || input.price <= 0 || input.price > 9_999_999_999.99) return 'Price must be greater than zero and within the supported range.';
  if (input.offerPrice != null && (!Number.isFinite(input.offerPrice) || input.offerPrice <= 0 || input.offerPrice > 9_999_999_999.99)) return 'Offer price must be greater than zero and within the supported range.';
  if (!Number.isSafeInteger(input.stockQuantity) || input.stockQuantity < 0 || input.stockQuantity > 2_147_483_647) return 'Stock must be a whole number from 0 to 2,147,483,647.';
  return null;
};
export const validateProductBasics = (input: { name: string; brandName: string; material: string; description: string; availableColors: string[] }): string | null => {
  const text = validateText('Product name', input.name, 2, 160) || validateText('Brand name', input.brandName, 2, 120) || validateText('Material', input.material, 2, 120);
  if (text) return text;
  if (input.description.trim().length > 2000) return 'Description must be 2,000 characters or fewer.';
  if (input.availableColors.length < 1 || input.availableColors.length > 20) return 'Select between 1 and 20 frame colors.';
  for (const color of input.availableColors) { const message = validateText('Frame color', color, 1, 80); if (message) return message; }
  if (new Set(input.availableColors.map(color => color.trim().toLowerCase())).size !== input.availableColors.length) return 'Frame colors must not contain duplicates.';
  return null;
};
export const validateCouponFields = (input: { code: string; description?: string | null; couponType: string; discountType: string; discountValue: number | string; minimumOrderValue: number | string; usageLimit?: number | null; usagePerUser?: number | null; startDate: string; endDate: string; expiresAt: string }): string | null => {
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(input.code.trim())) return 'Coupon code must contain 3–40 letters, numbers, hyphens or underscores.';
  if ((input.description?.trim().length ?? 0) > 2000) return 'Description must be 2,000 characters or fewer.';
  if (!['PERCENTAGE', 'FLAT', 'LIMITED_COUNT', 'ORDER_PRICE_ABOVE', 'ONCE_PER_USER', 'NEW_USER', 'FESTIVAL', 'BUY_ONE_GET_ONE', 'BUY_TWO_GET_ONE'].includes(input.couponType)) return 'Select a valid coupon type.';
  if (!['PERCENTAGE', 'FLAT', 'NONE'].includes(input.discountType)) return 'Select a valid discount type.';
  const value = Number(input.discountValue);
  if (!String(input.discountValue).trim() || !Number.isFinite(value) || value < 0 || value > 9_999_999_999.99 || (input.discountType !== 'NONE' && value === 0)) return 'Enter a valid positive discount value.';
  if (input.discountType === 'PERCENTAGE' && value > 100) return 'Percentage must not exceed 100.';
  const minimum = Number(input.minimumOrderValue);
  if (!String(input.minimumOrderValue).trim() || !Number.isFinite(minimum) || minimum < 0 || minimum > 9_999_999_999.99) return 'Minimum order value must be zero or positive.';
  for (const [label, limit] of [['Usage limit', input.usageLimit], ['Usage per user', input.usagePerUser]] as const) {
    if (limit != null && (!Number.isSafeInteger(limit) || limit <= 0 || limit > 2_147_483_647)) return `${label} must be a positive whole number.`;
  }
  for (const [label, value] of [['Start date', input.startDate], ['End date', input.endDate], ['Expiry', input.expiresAt]]) {
    if (!value?.trim() || !Number.isFinite(Date.parse(value))) return `${label} must be a valid date.`;
  }
  return null;
};
export const validateProductFiles = (files: File[]): string | null => {
  if (files.length > 10) return 'Upload at most 10 files at a time.';
  if (files.some(file => !['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(file.type))) return 'Choose JPG, PNG, WebP or MP4 files.';
  if (files.some(file => file.size === 0 || file.size > 10 * 1024 * 1024)) return 'Each file must be non-empty and no larger than 10 MB.';
  return null;
};
