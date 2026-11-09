export const LOW_STOCK_THRESHOLD = 5;
export const normalizeStock = (value: unknown): number => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return 0;
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 && Number.isSafeInteger(Math.floor(quantity)) ? Math.floor(quantity) : 0;
};
export const getStockStatus = (value: unknown) => {
  const quantity = normalizeStock(value);
  if (!quantity) return { quantity, key: 'out' as const, label: 'Out of stock', type: 'error' as const, textClass: 'text-red-600 font-bold', dotClass: 'bg-red-500' };
  if (quantity <= LOW_STOCK_THRESHOLD) return { quantity, key: 'low' as const, label: 'Low stock (' + quantity + ')', type: 'warning' as const, textClass: 'text-amber-600 font-bold', dotClass: 'bg-amber-500' };
  return { quantity, key: 'in' as const, label: 'In stock', type: 'success' as const, textClass: 'text-emerald-600 font-bold', dotClass: 'bg-emerald-500' };
};
export const totalVariantStock = (variants: Array<{ stockQuantity?: unknown }> = []) => variants.reduce((total, variant) => total + normalizeStock(variant.stockQuantity), 0);
export const cartStockIssue = (items: Array<{ productId: string; variantId: string; quantity: number; stockQuantity: unknown }>): string | null => {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = item.productId + ':' + item.variantId;
    const quantity = (totals.get(key) ?? 0) + item.quantity;
    totals.set(key, quantity);
    const available = normalizeStock(item.stockQuantity);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || quantity > available) return 'Requested quantity exceeds available stock (' + available + ')';
  }
  return null;
};
