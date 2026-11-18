import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Modal from '../../src/components/ui/Modal';
import Badge from '../../src/components/ui/Badge';
import type { Product } from '../../src/types';
import { productService } from '../../src/services/product.service';
import { getStockStatus } from '../../src/utils/stock';
import './product-readonly-before.css';

const option = (value?: string | null) => value ? value.replace(/^OPTION_(\d+)$/, 'Option $1') : '-';
const money = (value?: number | null) => value == null ? '-' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

export default function ProductReadOnlyModal({ initial, onClose }: { initial: Product; onClose: () => void }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    productService.getProductById(initial.id).then(value => { if (active) setProduct(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [initial.id, attempt]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = root.current?.querySelector<HTMLElement>('[role="dialog"]');
    const close = dialog?.querySelector<HTMLButtonElement>('button');
    close?.setAttribute('aria-label', 'Close product details');
    close?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')).filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('keydown', key, true); previous?.focus(); };
  }, [onClose]);
  const value = product ?? initial;
  return createPortal(<div ref={root} className="fy-product-readonly-before"><Modal isOpen onClose={onClose} size="xl" title={'Product Details: ' + value.name} footer={<><Link className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary" to={'/admin/products/' + initial.id}>Edit product</Link><button type="button" className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold" onClick={onClose}>Close</button></>}>
    <Badge type={value.isActive ? 'success' : 'neutral'}>{value.isActive ? 'Active' : 'Draft'}</Badge>
    {error ? <div role="alert" className="mt-4 rounded-xl border border-error/20 p-4 text-error">Could not load product details. <button type="button" className="font-bold underline" onClick={() => { setError(false); setAttempt(n => n + 1); }}>Retry</button></div> : !product ? <div role="status" aria-label="Loading product details" className="mt-4 space-y-4 animate-pulse">{[0,1,2,3].map(n => <div key={n} className="h-32 rounded-xl bg-surface-container-low" />)}</div> : <div className="mt-4 space-y-4">
      <section className="fy-product-readonly-before__section"><h4>Basic Information</h4><dl className="grid gap-3 sm:grid-cols-2"><div><dt>Name</dt><dd>{product.name || '-'}</dd></div><div><dt>Brand</dt><dd>{product.brandName || '-'}</dd></div><div><dt>Created date</dt><dd>{product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-IN') : '-'}</dd></div><div className="sm:col-span-2"><dt>Description</dt><dd className="whitespace-pre-wrap">{product.description || '-'}</dd></div></dl></section>
      <section className="fy-product-readonly-before__section"><h4>Material &amp; Colours</h4><p>{product.material || '-'}</p><div className="mt-3 flex flex-wrap gap-3">{product.availableColors?.length ? product.availableColors.map(color => <span key={color} className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded-full border border-outline-variant" style={{backgroundColor:color}} aria-hidden />{color}{product.images?.filter(image => image.color === color).map(image => <img key={image.id} src={image.imageUrl} alt={color} className="h-12 w-12 rounded-lg object-cover" loading="lazy" />)}</span>) : '-'}</div></section>
      <section className="fy-product-readonly-before__section"><h4>Variants</h4>{product.variants?.length ? <div className="fy-product-readonly-before__variants">{product.variants.map(variant => { const stock = getStockStatus(variant.stockQuantity); return <article key={variant.id} className="rounded-lg border border-outline-variant p-3"><div className="flex items-start gap-3">{variant.imageUrl && <img src={variant.imageUrl} alt={'Variant ' + variant.frameSize} className="h-14 w-14 rounded-lg object-cover" loading="lazy" />}<strong>{variant.frameSize || '-'}</strong></div><dl className="mt-3 grid grid-cols-2 gap-3"><div><dt>Mount type</dt><dd>{option(variant.mountType)}</dd></div><div><dt>Glass type</dt><dd>{option(variant.glassType)}</dd></div><div><dt>Price</dt><dd>{money(variant.price)}</dd></div><div><dt>Stock</dt><dd>{variant.stockQuantity ?? '-'} <Badge type={stock.type}>{stock.label}</Badge></dd></div><div><dt>Max photo size</dt><dd>{variant.maxPhotoSizeMB == null ? '-' : variant.maxPhotoSizeMB + ' MB'}</dd></div></dl></article>; })}</div> : <p>-</p>}</section>
      <section className="fy-product-readonly-before__section"><h4>Images</h4>{product.images?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{product.images.map((image,index) => <figure key={image.id}><img src={image.imageUrl} alt={product.name + ' image ' + (index + 1)} className="aspect-square w-full rounded-lg object-cover" loading="lazy" />{(image.isPrimary || (!product.images?.some(item => item.isPrimary) && index === 0)) && <figcaption className="mt-1 text-xs font-bold">Cover</figcaption>}</figure>)}</div> : <p>-</p>}</section>
    </div>}
  </Modal></div>, document.body);
}
