import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Heart,
  ImagePlus,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

import ImageCropModal from '../components/ImageCropModal';
import ColorSwatch from '../components/ColorSwatch';
import { useProductStore } from '../../../store/productStore';
import type { ProductVariant } from '../../../types';
import { showError, showSuccess } from '../../../utils/toast';
import { useCustomerCommerce } from '../hooks/useCustomerCommerce';

type FrameRatio = { width: number; height: number; label: string };

const ratioFromFrameSize = (frameSize?: string): FrameRatio => {
  const values = frameSize?.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!values || values.length < 2 || values[0] <= 0 || values[1] <= 0) {
    return { width: 4, height: 5, label: frameSize || 'selected' };
  }
  return { width: values[0], height: values[1], label: frameSize || `${values[0]} × ${values[1]}` };
};

const uniqueValues = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))];

const CustomerProductDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const products = useProductStore((state) => state.products);
  const fetchedProduct = useProductStore((state) => state.currentProduct);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const fetchProductById = useProductStore((state) => state.fetchProductById);
  const clearCurrentProduct = useProductStore((state) => state.clearCurrentProduct);
  const cachedProduct = useMemo(() => products.find((product) => product.id === slug), [products, slug]);
  const currentProduct = fetchedProduct?.id === slug ? fetchedProduct : cachedProduct;
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedGalleryImage, setSelectedGalleryImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cropSource, setCropSource] = useState('');
  const [croppedImages, setCroppedImages] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { customerLoggedIn, wishlist, toggleWishlist, addToCart } = useCustomerCommerce();

  useEffect(() => {
    if (slug) fetchProductById(slug, true);
    return () => clearCurrentProduct();
  }, [clearCurrentProduct, fetchProductById, slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!slug) {
        setCroppedImages({});
        return;
      }
      try {
        setCroppedImages(JSON.parse(window.localStorage.getItem(`frameyaad-crops:${slug}`) || '{}') as Record<string, string>);
      } catch {
        setCroppedImages({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  const activeVariants = useMemo(
    () => currentProduct?.variants?.filter((variant) => variant.isActive !== false) ?? [],
    [currentProduct],
  );
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) ?? activeVariants[0];
  const { frameSizes, mountTypes, glassTypes, colors } = useMemo(() => ({
    frameSizes: uniqueValues(activeVariants.map((variant) => variant.frameSize)),
    mountTypes: uniqueValues(activeVariants.map((variant) => variant.mountType)),
    glassTypes: uniqueValues(activeVariants.map((variant) => variant.glassType)),
    colors: uniqueValues([
      ...(currentProduct?.availableColors ?? []),
      ...activeVariants.map((variant) => variant.color),
    ]),
  }), [activeVariants, currentProduct?.availableColors]);
  const effectiveColor = selectedColor || selectedVariant?.color || colors[0] || '';
  const frameRatio = ratioFromFrameSize(selectedVariant?.frameSize);
  const cropKey = selectedVariant?.frameSize || 'default';
  const croppedImage = croppedImages[cropKey];
  const galleryImages = currentProduct?.images ?? [];
  const primaryProductImage = galleryImages.find((image) => image.isPrimary)?.imageUrl ?? galleryImages[0]?.imageUrl ?? '';
  const mainImage = selectedGalleryImage || croppedImage || primaryProductImage;
  const currentPrice = Number(selectedVariant?.offerPrice ?? selectedVariant?.price ?? 0);
  const originalPrice = Number(selectedVariant?.mrp ?? selectedVariant?.price ?? currentPrice);
  const discount = originalPrice > currentPrice && originalPrice > 0
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;
  const wished = customerLoggedIn && Boolean(currentProduct?.productIdentifier && wishlist[currentProduct.productIdentifier]);

  const chooseVariantValue = (field: keyof Pick<ProductVariant, 'frameSize' | 'mountType' | 'glassType'>, value: string) => {
    const candidates = activeVariants.filter((variant) => variant[field] === value);
    if (candidates.length === 0) return;
    const preferred = [...candidates].sort((left, right) => {
      const leftScore = Number(left.mountType === selectedVariant?.mountType)
        + Number(left.glassType === selectedVariant?.glassType)
        + Number(left.frameSize === selectedVariant?.frameSize);
      const rightScore = Number(right.mountType === selectedVariant?.mountType)
        + Number(right.glassType === selectedVariant?.glassType)
        + Number(right.frameSize === selectedVariant?.frameSize);
      return rightScore - leftScore;
    })[0];
    setSelectedVariantId(preferred.id);
    setSelectedGalleryImage('');
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showError('Please select an image smaller than 12 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSource(String(reader.result || ''));
    reader.onerror = () => showError('The selected image could not be opened.');
    reader.readAsDataURL(file);
  };

  const saveCrop = (image: string) => {
    const nextImages = { ...croppedImages, [cropKey]: image };
    setCroppedImages(nextImages);
    setSelectedGalleryImage('');
    setCropSource('');
    try {
      window.localStorage.setItem(`frameyaad-crops:${slug}`, JSON.stringify(nextImages));
      showSuccess(`Photo cropped and saved locally for ${frameRatio.label}.`);
    } catch {
      showError('The crop is ready for this session, but browser storage is full.');
    }
  };

  const clearCrop = () => {
    if (!croppedImage) return;

    const nextImages = { ...croppedImages };
    delete nextImages[cropKey];

    try {
      const storageKey = `frameyaad-crops:${slug}`;
      if (Object.keys(nextImages).length === 0) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, JSON.stringify(nextImages));
      }
      setCroppedImages(nextImages);
      setCropSource('');
      setSelectedGalleryImage('');
      showSuccess(`Photo cleared for ${frameRatio.label}.`);
    } catch {
      showError('Unable to clear the saved photo. Please try again.');
    }
  };

  if (loading && !currentProduct) return <ProductDetailsSkeleton />;

  if (!currentProduct) {
    return (
      <div className="mx-auto my-12 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-black text-red-700">Product could not be loaded</p>
        <p className="mt-2 text-sm text-red-600">{error || 'Product not found.'}</p>
        <Link to="/products" className="mt-5 inline-flex rounded-lg bg-black px-5 py-2.5 text-xs font-bold text-white">Back to products</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] pb-12 text-black">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 text-[11px] text-black/50">
          <Link to="/" className="hover:text-black">Home</Link><span>›</span>
          <Link to="/products" className="hover:text-black">Shop</Link><span>›</span>
          <span>{currentProduct.material}</span><span>›</span>
          <span className="font-semibold text-black">{currentProduct.name}</span>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <div className="contents xl:block xl:min-w-0">
            <div className="order-1 grid gap-3 sm:grid-cols-[72px_minmax(0,1fr)]">
              <div className="order-2 flex gap-2 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible sm:pb-0">
                {galleryImages.map((image) => (
                  <button key={image.id} type="button" onClick={() => setSelectedGalleryImage(image.imageUrl)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${mainImage === image.imageUrl ? 'border-black' : 'border-transparent hover:border-black/25'}`}>
                    <img src={image.imageUrl} alt={`${currentProduct.name} view`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                ))}
                {croppedImage && (
                  <button type="button" onClick={() => setSelectedGalleryImage(croppedImage)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${mainImage === croppedImage ? 'border-black' : 'border-transparent'}`}>
                    <img src={croppedImage} alt="Your cropped photo" decoding="async" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 py-0.5 text-[8px] font-bold text-white">YOUR PHOTO</span>
                  </button>
                )}
              </div>

              <div className="order-1 relative aspect-[4/5] min-h-0 overflow-hidden rounded-xl border border-black/10 bg-[#eeeae4] sm:order-2 sm:aspect-auto sm:min-h-[460px] lg:min-h-[560px]">
                {discount > 0 && <span className="absolute left-3 top-3 z-10 rounded bg-black px-2.5 py-1.5 text-[10px] font-black uppercase text-white">{discount}% off</span>}
                <button type="button" onClick={() => void toggleWishlist(currentProduct)} aria-label={`${wished ? 'Remove' : 'Add'} product ${wished ? 'from' : 'to'} wishlist`} aria-pressed={wished} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white shadow"><Heart className={`h-4 w-4 ${wished ? 'fill-black' : ''}`} /></button>
                {mainImage ? <img src={mainImage} alt={currentProduct.name} fetchPriority="high" decoding="async" className="h-full w-full object-cover object-center" /> : <div className="grid h-full min-h-[360px] place-items-center text-sm text-black/40">No product image</div>}
                {croppedImage && mainImage === croppedImage && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="border-[12px] border-black/75 shadow-[0_20px_50px_rgba(0,0,0,0.3)]" style={{ width: '62%', aspectRatio: `${frameRatio.width}/${frameRatio.height}` }}>
                      <img src={croppedImage} alt="Cropped preview inside selected frame" decoding="async" className="h-full w-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="order-3 grid gap-4 md:grid-cols-2 xl:mt-4">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div><h2 className="text-sm font-black">Upload Your Photo</h2><p className="mt-0.5 text-[10px] text-black/45">JPG, PNG or WEBP · maximum 12 MB</p></div>
                  {croppedImage && (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><Check className="h-3 w-3" /> Saved locally</span>
                      <button type="button" onClick={clearCrop} className="inline-flex items-center gap-1 rounded-md border border-black/15 px-2 py-1 text-[10px] font-bold text-black transition hover:border-black hover:bg-black hover:text-white" aria-label={`Clear saved photo for ${frameRatio.label}`}>
                        <Trash2 className="h-3 w-3" /> Clear
                      </button>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-black/25 bg-[#fafafa] transition hover:border-black hover:bg-white">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow"><Upload className="h-5 w-5" /></span>
                  <span className="mt-2 text-xs font-black">{croppedImage ? 'Replace your image' : 'Upload your image'}</span>
                  <span className="mt-1 text-[9px] text-black/45">Crop ratio: {frameRatio.label}</span>
                </button>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <h2 className="text-sm font-black">Preview & Crop</h2>
                <p className="mt-0.5 text-[10px] text-black/45">Adjust your photo for the selected frame size.</p>
                <button type="button" onClick={() => croppedImage ? setCropSource(croppedImage) : fileInputRef.current?.click()} className="mt-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-lg bg-[#eeeae4]">
                  {croppedImage ? <img src={croppedImage} alt="Cropped photo preview" decoding="async" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-xs font-bold"><ImagePlus className="h-6 w-6" /> Upload to preview</span>}
                </button>
              </div>
            </div>
          </div>

          <aside className="order-2 self-start rounded-xl border border-black/10 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-5 xl:sticky xl:top-20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">{currentProduct.brandName || 'FrameYaad'}</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">{currentProduct.name}</h1>
                <div className="mt-2 flex items-center gap-3 text-[11px]"><span className="text-amber-500">★ 4.8</span><span className="text-black/45">Premium custom frame</span><span className="inline-flex items-center gap-1 font-bold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> In stock</span></div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3 border-b border-black/10 pb-4">
              <span className="text-2xl font-black">₹{currentPrice.toLocaleString('en-IN')}</span>
              {discount > 0 && <><span className="pb-0.5 text-sm text-black/35 line-through">₹{originalPrice.toLocaleString('en-IN')}</span><span className="mb-0.5 rounded bg-[#f6dfc9] px-2 py-1 text-[10px] font-black text-[#b65d1d]">{discount}% OFF</span></>}
            </div>

            <OptionGroup number="1" title="Select Frame Size (inches)">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {frameSizes.map((size) => {
                  const variant = activeVariants.find((item) => item.frameSize === size);
                  const price = Number(variant?.offerPrice ?? variant?.price ?? 0);
                  return <OptionButton key={size} active={selectedVariant?.frameSize === size} onClick={() => chooseVariantValue('frameSize', size)}><span>{size}</span><small>₹{price.toLocaleString('en-IN')}</small></OptionButton>;
                })}
              </div>
            </OptionGroup>

            <OptionGroup number="2" title="Select Material">
              <div className="flex flex-wrap gap-2"><OptionPill active>{currentProduct.material || 'Standard material'}</OptionPill></div>
            </OptionGroup>

            <OptionGroup number="3" title="Select Color / Finish">
              <div className="flex flex-wrap gap-3">
                {colors.length === 0 ? <span className="text-xs text-black/45">Standard finish</span> : colors.map((color) => (
                  <button key={color} type="button" onClick={() => setSelectedColor(color)} aria-label={`Select color ${color}`} aria-pressed={effectiveColor === color} title={color} className="group flex items-center justify-center">
                    <span className={`grid h-9 w-9 place-items-center rounded-full border-2 transition ${effectiveColor === color ? 'border-black' : 'border-transparent group-hover:border-black/25'}`}><ColorSwatch color={color} className="h-7 w-7" /></span>
                  </button>
                ))}
              </div>
            </OptionGroup>

            <OptionGroup number="4" title="Select Mount Type">
              <div className="flex flex-wrap gap-2">{mountTypes.map((value) => <OptionPill key={value} active={selectedVariant?.mountType === value} onClick={() => chooseVariantValue('mountType', value)}>{value}</OptionPill>)}</div>
            </OptionGroup>

            <OptionGroup number="5" title="Select Glass Type">
              <div className="flex flex-wrap gap-2">{glassTypes.map((value) => <OptionPill key={value} active={selectedVariant?.glassType === value} onClick={() => chooseVariantValue('glassType', value)}>{value}</OptionPill>)}</div>
            </OptionGroup>

            <div className="mt-5 flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-700">
              <span>Selected: {selectedVariant?.frameSize || '—'} · {currentProduct.material || '—'} ·</span><ColorSwatch color={effectiveColor} className="h-4 w-4" /><span>· {selectedVariant?.mountType || '—'} · {selectedVariant?.glassType || '—'}</span>
            </div>

            <div className="mt-4 flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center">
              <div className="flex h-11 w-full items-center justify-between rounded-lg border border-black/15 min-[380px]:w-auto min-[380px]:justify-start">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid h-full w-10 place-items-center"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-8 text-center text-xs font-black">{quantity}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((current) => Math.min(Number(selectedVariant?.stockQuantity ?? 1), current + 1))} className="grid h-full w-10 place-items-center"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <button type="button" onClick={() => { if (selectedVariant) addToCart(currentProduct, selectedVariant, quantity, effectiveColor); }} disabled={!selectedVariant || Number(selectedVariant.stockQuantity) <= 0} className="inline-flex h-11 w-full flex-1 items-center justify-center gap-2 rounded-lg bg-black text-xs font-black text-white disabled:bg-black/30"><ShoppingBag className="h-4 w-4" /> Add to Bag</button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/10 pt-4 sm:grid-cols-4">
              <TrustItem icon={<Sparkles />} label="Premium quality" />
              <TrustItem icon={<ShieldCheck />} label="Secure packing" />
              <TrustItem icon={<PackageCheck />} label="Easy returns" />
              <TrustItem icon={<ImagePlus />} label="Made with love" />
            </div>
          </aside>
        </section>

        <section className="mt-8 rounded-xl border border-black/10 bg-white p-5">
          <h2 className="text-sm font-black">Description</h2>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-black/60">{currentProduct.description || 'A premium FrameYaad frame designed to preserve and display your favorite memories beautifully.'}</p>
        </section>

        <Link to="/products" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-black hover:underline"><ArrowLeft className="h-4 w-4" /> Back to all frames</Link>
      </div>

      {cropSource && (
        <ImageCropModal
          imageSource={cropSource}
          aspectWidth={frameRatio.width}
          aspectHeight={frameRatio.height}
          frameLabel={frameRatio.label}
          onCancel={() => setCropSource('')}
          onSave={saveCrop}
        />
      )}
    </div>
  );
};

const OptionGroup: React.FC<React.PropsWithChildren<{ number: string; title: string }>> = ({ number, title, children }) => (
  <div className="mt-5"><h2 className="mb-2 text-xs font-black"><span className="mr-1 text-black/45">{number}.</span>{title}</h2>{children}</div>
);

const OptionButton: React.FC<React.PropsWithChildren<{ active: boolean; onClick: () => void }>> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`flex min-h-12 flex-col items-center justify-center rounded-lg border px-2 text-[10px] font-black transition ${active ? 'border-black bg-black text-white' : 'border-black/15 bg-white hover:border-black'}`}>{children}</button>
);

const OptionPill: React.FC<React.PropsWithChildren<{ active: boolean; onClick?: () => void }>> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition ${active ? 'border-black bg-black text-white' : 'border-black/15 bg-white hover:border-black'}`}>{children}</button>
);

const TrustItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center gap-1.5 rounded-lg bg-[#fafafa] px-2 py-3 text-center text-[9px] font-bold text-black/65"><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}</div>
);

const ProductDetailsSkeleton = () => (
  <div className="mx-auto grid max-w-[1500px] animate-pulse gap-6 px-4 py-8 lg:grid-cols-2">
    <div className="aspect-[4/5] rounded-xl bg-black/10 sm:aspect-auto sm:min-h-[460px] lg:min-h-[560px]" />
    <div className="space-y-5 rounded-xl border border-black/5 bg-white p-6"><div className="h-8 w-3/4 rounded bg-black/10" /><div className="h-5 w-1/3 rounded bg-black/10" />{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-14 rounded bg-black/5" />)}</div>
  </div>
);

export default CustomerProductDetailsPage;
