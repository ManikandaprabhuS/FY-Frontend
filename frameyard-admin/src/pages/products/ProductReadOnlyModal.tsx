import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FileText, Layers, Package, Image as ImageIcon, Pencil, X, ChevronRight } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import type { Product } from '../../types';
import { productService } from '../../services/product.service';
import { getStockStatus } from '../../utils/stock';
import { DEFAULT_PHOTO_MAX_MB } from '../../utils/photo-limits';
import { resolveColorOption, useFrameColorStore } from '../../store/frameColorStore';
import './product-read-only.css';

const option = (value?: string | null) => value ? value.replace(/^OPTION_(\d+)$/, 'Option $1') : '-';
const money = (value?: number | null) => value == null ? '-' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

export default function ProductReadOnlyModal({ initial, onClose }: { initial: Product; onClose: () => void }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const colours = useFrameColorStore(state => state.colors);
  const legacyColours = useFrameColorStore(state => state.legacyColors);
  useEffect(() => {
    let active = true;
    productService.getProductById(initial.id).then(value => { if (active) setProduct(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [initial.id, attempt]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = root.current?.querySelector<HTMLElement>('[role="dialog"]');
    const close = dialog?.querySelector<HTMLButtonElement>('[data-product-close]');
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
  const images = product?.images ?? [];
  const cover = value.images?.find(image => image.isPrimary) ?? value.images?.[0];
  const markedCover = images.some(image => image.isPrimary);
  const coverCount = images.filter((image, index) => image.isPrimary || (!markedCover && index === 0)).length;
  const breadcrumb = document.querySelector('[data-admin-breadcrumbs]');
  return <>
    {breadcrumb && createPortal(<nav className="fy-product-readonly__breadcrumb" aria-label="Product details breadcrumb"><span>Admin</span><ChevronRight aria-hidden size={14}/><span>Products</span><ChevronRight aria-hidden size={14}/><strong title={value.name}>{value.name}</strong></nav>, breadcrumb)}
    {createPortal(<div ref={root} className="fy-product-readonly"><Modal isOpen onClose={onClose} size="xl" title={'Product Details: ' + value.name} footer={<><Link className="fy-product-readonly__edit" to={'/admin/products/' + initial.id}><Pencil size={16} aria-hidden/>Edit product</Link><button type="button" className="fy-product-readonly__close" onClick={onClose}>Close</button></>}>
      <div className="fy-product-readonly__content">
        <header className="fy-product-readonly__heading">
          <div className="fy-product-readonly__cover">{cover ? <img src={cover.imageUrl} alt={value.name + ' cover'} /> : <ImageIcon size={30} aria-label="No product image"/>}</div>
          <div className="fy-product-readonly__identity"><div className="fy-product-readonly__title-row"><h1>{value.name}</h1><span className="fy-product-readonly__status" data-active={value.isActive}><Badge type={value.isActive ? 'success' : 'neutral'}>{value.isActive ? 'Active' : 'Draft'}</Badge></span></div><p>Product details, variants, materials and images.</p></div>
          <button data-product-close type="button" aria-label="Close product details" className="fy-product-readonly__close" onClick={onClose}><X size={16} aria-hidden/>Close</button>
        </header>
        {error ? <div role="alert" className="mt-4 rounded-xl border border-error/20 p-4 text-error">Could not load product details. <button type="button" className="font-bold underline" onClick={() => { setError(false); setAttempt(n => n + 1); }}>Retry</button></div> : !product ? <div role="status" aria-label="Loading product details" className="fy-product-readonly__loading animate-pulse"><div className="fy-product-readonly__top-grid"><div/><div/></div><div/><div/></div> : <div className="fy-product-readonly__cards">
          <div className="fy-product-readonly__top-grid">
            <section className="fy-product-readonly__section"><h2><FileText aria-hidden size={22}/>Basic Information</h2><dl className="fy-product-readonly__basic-grid"><div><dt>Name</dt><dd>{product.name || '-'}</dd></div><div><dt>Brand</dt><dd>{product.brandName || '-'}</dd></div><div><dt>Created date</dt><dd>{product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-IN') : '-'}</dd></div><div><dt>Customer photo upload</dt><dd>{product.allowCustomerPhoto === false ? 'Not allowed' : 'Allowed'}</dd></div><div><dt>Default photo limit</dt><dd>{product.allowCustomerPhoto === false ? 'Not applicable' : (product.maxPhotoMb ?? 4) + ' MB (variant overrides apply)'}</dd></div><div><dt>FrameYaad Arts</dt><dd>{product.isFrameyaadArt ? 'Yes' : 'No'}</dd></div><div className="fy-product-readonly__description"><dt>Description</dt><dd>{product.description || '-'}</dd></div></dl></section>
            <section className="fy-product-readonly__section"><h2><Layers aria-hidden size={22}/>Material &amp; Colours</h2><p className="fy-product-readonly__material">{product.material || '-'}</p><div className="fy-product-readonly__colours">{product.availableColors?.length ? product.availableColors.map(color => {const resolved = resolveColorOption(color, colours, legacyColours); const colourImages = product.images?.filter(image => image.color === color || Boolean(image.color && resolved.hex && image.color.toLowerCase() === resolved.hex.toLowerCase()));return <div key={color} className="fy-product-readonly__colour"><span className="fy-product-readonly__swatch" style={{backgroundColor: resolved.hex || color}} aria-hidden/><span>{resolved.name !== resolved.hex && <strong>{resolved.name}</strong>}{resolved.hex ? <span>{resolved.hex}</span> : resolved.name === resolved.hex ? <span>{color}</span> : null}</span>{colourImages?.map(image => <img key={image.id} src={image.imageUrl} alt={resolved.name + ' colour image'} loading="lazy"/>)}</div>;}) : <p className="fy-product-readonly__empty">No colours</p>}</div></section>
          </div>
          <section className="fy-product-readonly__section"><h2><Package aria-hidden size={22}/>Variants ({product.variants?.length ?? 0})</h2>{product.variants?.length ? <div className="fy-product-readonly__variants">{product.variants.map(variant => { const stock = getStockStatus(variant.stockQuantity); return <article key={variant.id} className="fy-product-readonly__variant"><div className="fy-product-readonly__variant-heading"><span className="fy-product-readonly__variant-image">{variant.imageUrl ? <img src={variant.imageUrl} alt={'Variant ' + variant.frameSize} loading="lazy"/> : <ImageIcon size={26} aria-label="No variant image"/>}</span><h3>{variant.frameSize || '-'}</h3></div><dl className="fy-product-readonly__variant-grid"><div><dt>Mount Type</dt><dd>{option(variant.mountType)}</dd></div><div><dt>Glass Type</dt><dd>{option(variant.glassType)}</dd></div><div><dt>Price</dt><dd className="fy-product-readonly__price">{money(variant.price)}</dd></div><div><dt>Stock</dt><dd className="fy-product-readonly__stock" data-stock={stock.key}>{variant.stockQuantity ?? '-'} <Badge type={stock.type}>{stock.label}</Badge></dd></div><div><dt>Max Photo Size</dt><dd>{variant.maxPhotoSizeMB == null ? 'Default (' + (product.maxPhotoMb ?? DEFAULT_PHOTO_MAX_MB) + ' MB)' : variant.maxPhotoSizeMB + ' MB'}</dd></div></dl></article>; })}</div> : <p className="fy-product-readonly__empty">No variants</p>}</section>
          <section className="fy-product-readonly__section"><div className="fy-product-readonly__section-heading"><h2><ImageIcon aria-hidden size={22}/>Images ({images.length})</h2><p>{images.length} {images.length === 1 ? 'image' : 'images'} · {coverCount} {coverCount === 1 ? 'cover' : 'covers'}</p></div>{images.length ? <div className="fy-product-readonly__images" tabIndex={0} role="region" aria-label="Product images">{images.map((image,index) => <figure key={image.id}><img src={image.imageUrl} alt={product.name + ' image ' + (index + 1)} loading="lazy" />{(image.isPrimary || (!markedCover && index === 0)) && <figcaption>Cover</figcaption>}</figure>)}</div> : <p className="fy-product-readonly__empty">No images</p>}</section>
        </div>}
      </div>
    </Modal></div>, document.body)}
  </>;
}
