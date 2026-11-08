import type { OrderItem } from '../../types';
const orderOptionText = (value?: string | null) => !value || /^(not specified|undefined|null)$/i.test(value.trim()) ? '-' : value;
export default function OrderItemOptions({ item }: { item: Pick<OrderItem, 'productId' | 'productIdentifier' | 'frameSize' | 'colorName' | 'colorHex' | 'material'> }) {
  return <div className="mt-1 space-y-1 text-[11px] text-on-surface-variant">
    <p className="break-all">Product ID: {orderOptionText(item.productId || item.productIdentifier)}</p>
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span>Variant: {orderOptionText(item.frameSize)}</span><span aria-hidden="true">|</span>
      <span className="inline-flex items-center gap-1">Color: {item.colorHex && /^#[a-f0-9]{6}$/i.test(item.colorHex) && <span role="img" aria-label={item.colorName || 'Frame colour'} className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: item.colorHex }} />}{orderOptionText(item.colorName)}</span>
      <span aria-hidden="true">|</span><span>Material: {orderOptionText(item.material)}</span>
    </p>
  </div>;
}
