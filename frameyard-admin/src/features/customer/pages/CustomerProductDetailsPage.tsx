import { getStockStatus, normalizeStock } from '../../../utils/stock';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { setCheckoutPhotoDraft, checkoutPhotoDraft, clearCheckoutPhotoDraft, validateOrderPhoto } from '../../../services/order-photos.service';
import { productService } from '../../../services/product.service';
import { ArrowLeft, ChevronDown, Crop, ImagePlus, Minus, PackageCheck, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';

import ProductReviews from '../../../components/reviews/ProductReviews';
import ProductRating from '../../../components/reviews/ProductRating';
import ImageCropModal from '../components/ImageCropModal';
import ColorSwatch from '../components/ColorSwatch';
import { resolveColorOption, useFrameColors } from '../../../store/frameColorStore';
import ProductFramePreview from '../components/ProductFramePreview';
import ProductGallery, { type GallerySlide } from '../components/ProductGallery';
import FrameStudioPreview, { FrameStudioThumb } from '../components/FrameStudioPreview';
import AddToCartButton from '../components/AddToCartButton';
import BuyNowButton from '../components/BuyNowButton';
import WishlistHeart from '../components/WishlistHeart';
import ProductCatalogCard from '../components/ProductCatalogCard';
import { parseStoredCrops, ratioFromFrameSize, selectVariantPhoto } from '../components/framePreviewGeometry';
import { productOptionImage, type ImageSelection } from '../utils/productOptionImage';
import { getVariantPricing, variantForColor } from '../utils/product-pricing';
import { getCatalogPricing } from '../utils/catalog-product';
import { useProductStore } from '../../../store/productStore';
import type { Product, ProductVariant } from '../../../types';
import { showError, showSuccess, showWarning } from '../../../utils/toast';
import { useCustomerCommerce } from '../hooks/useCustomerCommerce';
import '../styles/product-details.css';

const uniqueValues = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))];
const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;
/** Mount and glass are stored as codes; these are the names the admin uses for them. */
const optionLabel = (value?: string | null) => (!value || value === 'NONE' ? 'None' : value.replace(/^OPTION_(\d+)$/, 'Option $1'));
const hasOption = (value?: string | null) => Boolean(value && value !== 'NONE');

const CustomerProductDetailsPage: React.FC = () => {
  const reviewLocation = useLocation();
  const navigate = useNavigate();
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
  const colorCatalogue = useFrameColors();
  const [imageSelection, setImageSelection] = useState<ImageSelection>('default');
  const [quantity, setQuantity] = useState(1);
  const [cropSource, setCropSource] = useState('');
  const [photoSource, setPhotoSource] = useState('');
  const [photoOwner, setPhotoOwner] = useState<string>();
  const [croppedImages, setCroppedImages] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [jump, setJump] = useState<{ index: number; token: number }>();
  const [related, setRelated] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const buyRowRef = useRef<HTMLDivElement | null>(null);
  const [buyRowVisible, setBuyRowVisible] = useState(true);
  const { customerLoggedIn, wishlist, toggleWishlist, addToCart } = useCustomerCommerce();
  const wishPending = useCustomerCommerceStore((state) => Boolean(currentProduct?.productIdentifier && state.wishlistPending[currentProduct.productIdentifier]));

  useEffect(() => {
    if (slug) fetchProductById(slug, true);
    return () => clearCurrentProduct();
  }, [clearCurrentProduct, fetchProductById, slug]);

  // Saved crops for this product (per frame size) survive reloads.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!slug) {
        setCroppedImages({});
        setPhotoSource('');
        return;
      }
      try {
        setCroppedImages(parseStoredCrops(window.localStorage.getItem(`frameyaad-crops:${slug}`)));
        setPhotoSource(window.localStorage.getItem(`frameyaad-photo-source:${slug}`) || '');
        setPhotoOwner(slug);
      } catch {
        setCroppedImages({});
        setPhotoSource('');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  // "You might also like": other frames from the public catalogue (read-only, this page only).
  useEffect(() => {
    let active = true;
    productService.getProducts({ page: 1, limit: 8, publicCatalog: true })
      .then(({ products: list }) => { if (active) setRelated(list.filter((item) => item.isActive && item.id !== slug).slice(0, 4)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [slug]);

  // Phones: the sticky buy bar shows once the in-page Add to cart scrolls away.
  useEffect(() => {
    const row = buyRowRef.current;
    if (!row || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setBuyRowVisible(entry.isIntersecting || entry.boundingClientRect.top > 0));
    observer.observe(row);
    return () => observer.disconnect();
  }, [currentProduct?.id]);

  const activeVariants = useMemo(
    () => currentProduct?.variants?.filter((variant) => variant.isActive !== false) ?? [],
    [currentProduct],
  );
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) ?? activeVariants[0];
  const { frameSizes, mountTypes, glassTypes, colors } = useMemo(() => ({
    frameSizes: uniqueValues(activeVariants.map((variant) => variant.frameSize)),
    mountTypes: uniqueValues(activeVariants.map((variant) => variant.mountType)),
    glassTypes: uniqueValues(activeVariants.map((variant) => variant.glassType)),
    colors: uniqueValues([...(currentProduct?.availableColors ?? []), ...activeVariants.map((variant) => variant.color)]),
  }), [activeVariants, currentProduct?.availableColors]);
  const effectiveColor = selectedColor || selectedVariant?.color || colors[0] || '';
  const colorOption = resolveColorOption(effectiveColor, colorCatalogue.colors, colorCatalogue.legacyColors);
  const frameRatio = ratioFromFrameSize(selectedVariant?.frameSize);
  const cropKey = selectedVariant?.frameSize || 'default';
  const croppedImage = photoOwner === slug ? selectVariantPhoto(croppedImages, cropKey, photoSource) : '';
  // A photo carried over from another size has the wrong shape until it is re-cropped.
  const needsRecrop = Boolean(croppedImage) && !croppedImages[cropKey];
  const { currentPrice, originalPrice, discount } = getVariantPricing(selectedVariant);
  const stock = getStockStatus(selectedVariant?.stockQuantity);
  const available = Boolean(selectedVariant) && normalizeStock(selectedVariant?.stockQuantity) > 0;
  const wished = customerLoggedIn && Boolean(currentProduct?.productIdentifier && wishlist[currentProduct.productIdentifier]);

  // Gallery: "Your frame" first, then the option's own photo and the rest of the product photos.
  const optionImage = productOptionImage(currentProduct, selectedVariant, effectiveColor, imageSelection);
  const productImages = useMemo(
    () => uniqueValues([optionImage, ...(currentProduct?.images ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder).map((image) => image.imageUrl)]),
    [currentProduct?.images, optionImage],
  );
  const jumpTo = (index: number) => setJump((previous) => ({ index, token: (previous?.token ?? 0) + 1 }));
  // A chosen option leads the product photos (slide 2), so show it, as the old page swapped the main image.
  const showOptionPhoto = () => jumpTo(1);

  const chooseVariantValue = (field: keyof Pick<ProductVariant, 'frameSize' | 'mountType' | 'glassType'>, value: string) => {
    const candidates = activeVariants.filter((variant) => variant[field] === value);
    if (candidates.length === 0) return;
    const score = (variant: ProductVariant) => Number(variant.mountType === selectedVariant?.mountType)
      + Number(variant.color?.trim().toLowerCase() === effectiveColor.trim().toLowerCase()) * 4
      + Number(variant.glassType === selectedVariant?.glassType)
      + Number(variant.frameSize === selectedVariant?.frameSize);
    const preferred = [...candidates].sort((left, right) => score(right) - score(left))[0];
    setSelectedVariantId(preferred.id);
    setImageSelection('variant');
    if (field !== 'frameSize' || !croppedImage) showOptionPhoto();
  };

  const chooseColor = (color: string) => {
    const variant = variantForColor(activeVariants, selectedVariant, color);
    if (variant) setSelectedVariantId(variant.id);
    setSelectedColor(color);
    setImageSelection('color');
    if (!croppedImage) showOptionPhoto();
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated || auth.user?.role !== 'CUSTOMER') {
      showWarning('Please log in to upload your photo.');
      return;
    }
    const issue = validateOrderPhoto(file);
    if (issue) { showWarning(issue); return; }
    setCheckoutPhotoDraft(auth.user.id, file);
    try { localStorage.setItem('frameyaad-photo-name:' + slug, file.name); localStorage.setItem('frameyaad-photo-owner:' + slug, auth.user.id); } catch { /* Local preview still works when storage is full. */ }
    const reader = new FileReader();
    reader.onload = () => setCropSource(String(reader.result || ''));
    reader.onerror = () => showError('The selected image could not be opened.');
    reader.readAsDataURL(file);
  };

  const saveCrop = (image: string) => {
    const nextImages = { ...croppedImages, [cropKey]: image };
    setCroppedImages(nextImages);
    setPhotoSource(cropSource);
    setPhotoOwner(slug);
    setCropSource('');
    jumpTo(0);
    try {
      window.localStorage.setItem(`frameyaad-crops:${slug}`, JSON.stringify(nextImages));
      window.localStorage.removeItem(`frameyaad-photo-source:${slug}`);
      // Large originals stay in this session only; saved crops survive reloads.
      if (cropSource.length <= 1_500_000) window.localStorage.setItem(`frameyaad-photo-source:${slug}`, cropSource);
      showSuccess(`Your photo is in the ${frameRatio.label} frame.`);
    } catch {
      showWarning('The crop is ready for this session, but browser storage is full.');
    }
  };

  const clearCrop = () => {
    if (!croppedImage) return;
    const customer = useAuthStore.getState().user;
    if (customer) clearCheckoutPhotoDraft(customer.id);
    const nextImages = { ...croppedImages, [cropKey]: '' };
    try {
      window.localStorage.setItem(`frameyaad-crops:${slug}`, JSON.stringify(nextImages));
      setCroppedImages(nextImages);
      setCropSource('');
      showSuccess(`Photo removed from the ${frameRatio.label} frame.`);
    } catch {
      showError('Unable to clear the saved photo. Please try again.');
    }
  };

  const addSelectedToCart = () => (selectedVariant && currentProduct ? addToCart(currentProduct, selectedVariant, quantity, effectiveColor) : false);

  // Buy now: add to the cart (the walker crosses the button), then carry the photo to checkout.
  const addForBuyNow = () => {
    if (!selectedVariant || !currentProduct) return false;
    const before = useCustomerCommerceStore.getState().cartItems.reduce((total, item) => total + item.quantity, 0);
    addToCart(currentProduct, selectedVariant, quantity, effectiveColor);
    const after = useCustomerCommerceStore.getState().cartItems.reduce((total, item) => total + item.quantity, 0);
    return after > before;
  };
  const goToCheckout = () => {
    const customer = useAuthStore.getState().user;
    try {
      if (customer?.role === 'CUSTOMER' && croppedImage && !checkoutPhotoDraft(customer.id) && localStorage.getItem('frameyaad-photo-owner:' + slug) === customer.id) {
        const source = photoSource || croppedImage;
        const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(source);
        if (match) {
          const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
          const savedName = localStorage.getItem('frameyaad-photo-name:' + slug) || 'photo.png';
          setCheckoutPhotoDraft(customer.id, new File([bytes], savedName, { type: match[1] }));
        }
      }
    } catch { showWarning('Your local photo could not be carried over. You can choose it again at checkout.'); }
    navigate('/checkout');
  };

  if (loading && !currentProduct) return <ProductDetailsSkeleton />;

  if (!currentProduct) {
    return (
      <div className="mx-auto my-16 max-w-xl border border-rule p-10 text-center">
        <p className="fy-display text-[26px]">This frame couldn't load</p>
        <p className="mt-2 text-[15px] text-mute">{error || 'Product not found.'}</p>
        <Link to="/products" className="mt-6 inline-flex min-h-12 items-center bg-ink px-6 text-[14px] font-semibold text-white">Back to all frames</Link>
      </div>
    );
  }

  const slides: GallerySlide[] = [
    {
      key: 'studio',
      label: 'Your frame',
      content: (
        <FrameStudioPreview
          photo={croppedImage || undefined}
          ratio={frameRatio}
          colorHex={colorOption.hex || '#1a1a1a'}
          mounted={hasOption(selectedVariant?.mountType)}
          glazed={hasOption(selectedVariant?.glassType)}
          productName={currentProduct.name}
          onUpload={() => fileInputRef.current?.click()}
        />
      ),
      thumb: <FrameStudioThumb photo={croppedImage || undefined} colorHex={colorOption.hex || '#1a1a1a'} />,
    },
    ...productImages.map((image, position) => ({
      key: image,
      label: `Photo ${position + 1} of ${productImages.length}`,
      content: (
        <div className="fy-pdp__photo">
          <ProductFramePreview productImage={image} photo={croppedImage || undefined} aspectRatio={frameRatio.width / frameRatio.height} name={currentProduct.name} />
        </div>
      ),
      thumb: <img src={image} alt="" loading="lazy" decoding="async" />,
    })),
  ];

  const details: Array<[string, string]> = [
    ['Material', currentProduct.material || 'Standard'],
    ['Brand', currentProduct.brandName || 'FrameYaad'],
    ['Size', selectedVariant?.frameSize || '—'],
    ['Finish', colorOption.name || '—'],
    ['Mount', optionLabel(selectedVariant?.mountType)],
    ['Glass', optionLabel(selectedVariant?.glassType)],
  ];

  // Quantity, Add to cart and the wishlist heart: the same controls in the page and in the
  // phone's sticky bar, sharing one quantity.
  const buyControls = (
    <>
      <div className="fy-qty" role="group" aria-label="Quantity">
        <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity <= 1}><Minus className="h-4 w-4" /></button>
        <span aria-live="polite">{quantity}</span>
        <button type="button" aria-label="Increase quantity" onClick={() => { const limit = normalizeStock(selectedVariant?.stockQuantity); if (quantity >= limit) { showWarning('Requested quantity exceeds available stock (' + limit + ')'); return; } setQuantity((current) => current + 1); }}><Plus className="h-4 w-4" /></button>
      </div>
      <AddToCartButton available={available} onAdd={addSelectedToCart} className="fy-pdp__cart" />
      <WishlistHeart wished={wished} pending={wishPending} productName={currentProduct.name} onToggle={() => void toggleWishlist(currentProduct)} className="fy-pdp__wish" />
    </>
  );

  return (
    <div className="fy-pdp">
      <div className="fy-pdp__wrap">
        <nav aria-label="Breadcrumb" className="fy-pdp__crumbs">
          <Link to="/products"><ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />All frames</Link>
          {currentProduct.material && <><span aria-hidden="true">/</span><span>{currentProduct.material}</span></>}
        </nav>

        <section className="fy-pdp__grid">
          <div className="fy-pdp__left">
            <div className="fy-pdp__media">
              <ProductGallery slides={slides} jump={jump} />
            </div>
            <div className="fy-pdp__about">
              <Accordion title="Description" defaultOpen>
                <p className="fy-pdp__text">{currentProduct.description || 'A premium FrameYaad frame designed to preserve and display your favourite memories beautifully.'}</p>
              </Accordion>
              <Accordion title="Frame details">
                <dl className="fy-pdp__specs">
                  {details.map(([term, value]) => <div key={term}><dt>{term}</dt><dd key={value}>{value}</dd></div>)}
                </dl>
              </Accordion>
              {frameSizes.length > 0 && (
                <Accordion title="FrameYaad size chart" defaultOpen hint={`${frameSizes.length} ${frameSizes.length === 1 ? 'size' : 'sizes'}`}>
                  <SizeChart
                    sizes={frameSizes.map((size) => ({ size, variant: activeVariants.find((item) => item.frameSize === size) }))}
                    selected={selectedVariant?.frameSize}
                    onSelect={(size) => chooseVariantValue('frameSize', size)}
                  />
                </Accordion>
              )}
              <ProductReviews key={currentProduct.id} productId={currentProduct.id} productName={currentProduct.name} productImage={productImages[0]} initiallyOpen={new URLSearchParams(reviewLocation.search).get('writeReview') === '1'} />
            </div>
          </div>

          <div className="fy-pdp__right">
            <div className="fy-pdp__info">
              <div className="fy-pdp__head">
                <div className="fy-pdp__eyebrow">
                  {currentProduct.material && <span className="fy-pdp__pill">{currentProduct.material}</span>}
                  <a href="#reviews" className="fy-pdp__rating-link"><ProductRating productId={currentProduct.id} /></a>
                </div>
                <h1 className="fy-pdp__title">{currentProduct.name}</h1>
                <div className="fy-pdp__price" aria-live="polite">
                  <span key={currentPrice} className="fy-pdp__now">{formatPrice(currentPrice)}</span>
                  {discount > 0 && (
                    <>
                      <s className="fy-pdp__was">{formatPrice(originalPrice)}</s>
                      <span key={`save-${originalPrice - currentPrice}`} className="fy-pdp__save">Save {formatPrice(originalPrice - currentPrice)} · {discount}% off</span>
                    </>
                  )}
                </div>
                <p className={`fy-pdp__stock ${stock.key === 'in' ? '' : 'fy-pdp__stock--warn'}`}>
                  <span className="fy-pdp__dot" aria-hidden="true" />{stock.key === 'low' ? `Only ${stock.quantity} left` : stock.label}
                </p>
              </div>

              {/* Make it yours: the choices in the order a frame is put together. */}
              <ol className="fy-steps" aria-label="Make it yours">
                {frameSizes.length > 0 && (
                  <Step n={1} title="Size" value={selectedVariant?.frameSize ? `${selectedVariant.frameSize} in` : ''} done={Boolean(selectedVariant?.frameSize)}>
                    <div className="fy-pdp__chips">
                      {frameSizes.map((size) => {
                        const variant = activeVariants.find((item) => item.frameSize === size);
                        return (
                          <OptionChip key={size} active={selectedVariant?.frameSize === size} onClick={() => chooseVariantValue('frameSize', size)}>
                            <span>{size}</span>
                            <small>{formatPrice(getVariantPricing(variant).currentPrice)}</small>
                          </OptionChip>
                        );
                      })}
                    </div>
                  </Step>
                )}
                {colors.length > 0 && (
                  <Step n={2} title="Finish" value={colorOption.name} done>
                    <div className="fy-pdp__swatches">
                      {colors.map((color) => {
                        const option = resolveColorOption(color, colorCatalogue.colors, colorCatalogue.legacyColors);
                        return (
                          <button key={color} type="button" onClick={() => chooseColor(color)} aria-label={`Finish: ${option.name}`} aria-pressed={effectiveColor === color} title={option.name} className="fy-pdp__swatch">
                            <ColorSwatch color={color} className="h-8 w-8" />
                          </button>
                        );
                      })}
                    </div>
                  </Step>
                )}
                {mountTypes.length > 0 && (
                  <Step n={3} title="Mount" value={optionLabel(selectedVariant?.mountType)} done>
                    <div className="fy-pdp__chips">
                      {mountTypes.map((value) => <OptionChip key={value} active={selectedVariant?.mountType === value} onClick={() => chooseVariantValue('mountType', value)}>{optionLabel(value)}</OptionChip>)}
                    </div>
                  </Step>
                )}
                {glassTypes.length > 0 && (
                  <Step n={4} title="Glass" value={optionLabel(selectedVariant?.glassType)} done>
                    <div className="fy-pdp__chips">
                      {glassTypes.map((value) => <OptionChip key={value} active={selectedVariant?.glassType === value} onClick={() => chooseVariantValue('glassType', value)}>{optionLabel(value)}</OptionChip>)}
                    </div>
                  </Step>
                )}
                <Step n={5} title="Your photo" value={croppedImage ? (needsRecrop ? 'Needs a crop' : 'Added') : 'Optional'} done={Boolean(croppedImage) && !needsRecrop}>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                  {croppedImage ? (
                    <div className="fy-upload fy-upload--done">
                      <img src={croppedImage} alt="Your cropped photo" className="fy-upload__thumb" style={{ aspectRatio: `${frameRatio.width} / ${frameRatio.height}` }} />
                      <div className="fy-upload__body">
                        <p className="fy-upload__title">{needsRecrop ? `Crop it for ${frameRatio.label}` : 'In your frame'}</p>
                        <p className="fy-upload__hint">{needsRecrop ? 'This photo was cropped for another size. Adjust it to fit this one exactly.' : 'Shown in "Your frame" and the photos.'}</p>
                        <div className="fy-upload__actions">
                          <button type="button" onClick={() => setCropSource(photoSource || croppedImage)} data-emphasis={needsRecrop || undefined}><Crop className="h-3.5 w-3.5" aria-hidden="true" />Adjust crop</button>
                          <button type="button" onClick={() => fileInputRef.current?.click()}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Change</button>
                          <button type="button" onClick={clearCrop} aria-label={`Remove your photo from the ${frameRatio.label} frame`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="fy-upload"
                      data-dragging={dragging || undefined}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files?.[0]); }}
                    >
                      <span className="fy-upload__icon"><Upload className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" /></span>
                      <span className="fy-upload__title">Drop your photo here, or browse</span>
                      <span className="fy-upload__hint">JPG, PNG or WebP, up to 4 MB. You'll crop it to {frameRatio.label}.</span>
                    </button>
                  )}
                </Step>
              </ol>

              {/* Your frame: the whole order in one line, with its total. */}
              <div className="fy-summary">
                <span className="fy-summary__thumb"><FrameStudioThumb photo={croppedImage || undefined} colorHex={colorOption.hex || '#1a1a1a'} /></span>
                <div className="fy-summary__body">
                  <p className="fy-summary__title">Your frame</p>
                  <p className="fy-summary__line">{[selectedVariant?.frameSize && `${selectedVariant.frameSize} in`, colorOption.name, hasOption(selectedVariant?.mountType) && `Mount ${optionLabel(selectedVariant?.mountType)}`, hasOption(selectedVariant?.glassType) && `Glass ${optionLabel(selectedVariant?.glassType)}`, croppedImage && 'your photo'].filter(Boolean).join(' · ')}</p>
                </div>
                <p className="fy-summary__total" aria-live="polite"><span>{quantity > 1 ? `${quantity} × ${formatPrice(currentPrice)}` : 'Total'}</span><strong key={currentPrice * quantity}>{formatPrice(currentPrice * quantity)}</strong></p>
              </div>

              <div ref={buyRowRef} className="fy-pdp__buy">{buyControls}</div>
              <BuyNowButton available={available && normalizeStock(selectedVariant?.stockQuantity) >= quantity} photo={croppedImage || undefined} onAdd={addForBuyNow} onDone={goToCheckout} />

              <ul className="fy-pdp__trust">
                <TrustItem icon={<Sparkles />} label="Premium quality" />
                <TrustItem icon={<ShieldCheck />} label="Secure packing" />
                <TrustItem icon={<PackageCheck />} label="Easy returns" />
                <TrustItem icon={<ImagePlus />} label="Made with love" />
              </ul>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="fy-pdp__related" aria-labelledby="fy-related-title">
            <h2 id="fy-related-title" className="fy-pdp__related-title">You might also like</h2>
            <div className="fy-pdp__related-grid">
              {related.map((product) => {
                const pricing = getCatalogPricing(product);
                const total = product.variants.reduce((sum, variant) => sum + normalizeStock(variant.stockQuantity), 0);
                return (
                  <ProductCatalogCard
                    key={product.id}
                    product={product}
                    pricing={pricing}
                    totalStock={total}
                    wished={customerLoggedIn && Boolean(product.productIdentifier && wishlist[product.productIdentifier])}
                    onToggleWishlist={toggleWishlist}
                    onAddToCart={addToCart}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Phones and tablets: price and Add to cart stay in reach once the main button scrolls away. */}
      <div className="fy-pdp__sticky" data-show={!buyRowVisible || undefined} aria-hidden={buyRowVisible} inert={buyRowVisible || undefined}>
        <p className="fy-pdp__sticky-meta"><strong>{formatPrice(currentPrice * quantity)}</strong>{[selectedVariant?.frameSize, colorOption.name].filter(Boolean).map((part) => <span key={part}>{part}</span>)}</p>
        <div className="fy-pdp__buy fy-pdp__buy--sticky">{buyControls}</div>
      </div>

      {cropSource && (
        <ImageCropModal
          key={`${slug}:${cropKey}:${cropSource}`}
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

/** One choice in "Make it yours": a numbered marker that turns into a tick once it's settled. */
const Step: React.FC<React.PropsWithChildren<{ n: number; title: string; value?: string; done?: boolean }>> = ({ n, title, value, done = false, children }) => (
  <li className="fy-step" data-done={done || undefined}>
    <span className="fy-step__marker" aria-hidden="true">
      <span className="fy-step__n">{n}</span>
      <svg viewBox="0 0 16 16" className="fy-step__tick"><path d="M3.5 8.4l2.9 2.9 6-6.3" pathLength="100" /></svg>
    </span>
    <div className="fy-step__body">
      <h2 className="fy-step__title">{title}{value && <span key={value}>{value}</span>}</h2>
      {children}
    </div>
  </li>
);

const OptionChip: React.FC<React.PropsWithChildren<{ active: boolean; onClick: () => void }>> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={active} className="fy-pdp__chip">{children}</button>
);

/**
 * An expandable section. Its open state lives in React, so a re-render never forces it
 * open or shut; the body eases open, and the chevron turns.
 */
const Accordion: React.FC<React.PropsWithChildren<{ title: string; hint?: string; defaultOpen?: boolean }>> = ({ title, hint, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="fy-pdp__acc" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span>{title}{hint && <small>{hint}</small>}</span>
        <ChevronDown className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      </summary>
      <div className="fy-pdp__acc-body">{children}</div>
    </details>
  );
};

const TrustItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <li className="fy-pdp__trust-item"><span aria-hidden="true">{icon}</span>{label}</li>
);

const CM_PER_INCH = 2.54;

/**
 * The FrameYaad size chart: every size of this frame drawn to one scale on a strip of wall
 * (so 8 × 10 and 12 × 10 can be compared at a glance), then a table in inches and
 * centimetres with each size's price and stock. Picking a size here selects it.
 */
const SizeChart: React.FC<{ sizes: Array<{ size: string; variant?: ProductVariant }>; selected?: string; onSelect: (size: string) => void }> = ({ sizes, selected, onSelect }) => {
  const rows = sizes.map(({ size, variant }) => {
    const ratio = ratioFromFrameSize(size);
    const known = /\d/.test(size) && ratio.label === size;
    return { size, variant, w: ratio.width, h: ratio.height, known };
  });
  const largest = Math.max(1, ...rows.filter((row) => row.known).map((row) => Math.max(row.w, row.h)));
  return (
    <div className="fy-sizes">
      <div className="fy-sizes__wall" aria-hidden="true">
        {rows.filter((row) => row.known).map((row) => (
          <button
            key={row.size}
            type="button"
            tabIndex={-1}
            className="fy-sizes__frame"
            data-on={row.size === selected || undefined}
            style={{ '--fw': row.w / largest, '--fh': row.h / largest } as React.CSSProperties}
            onClick={() => onSelect(row.size)}
          >
            <span>{row.w}×{row.h}</span>
          </button>
        ))}
      </div>
      <table className="fy-sizes__table">
        <thead>
          <tr><th scope="col">Size</th><th scope="col">Inches</th><th scope="col">Centimetres</th><th scope="col">Price</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const stock = getStockStatus(row.variant?.stockQuantity);
            return (
              <tr key={row.size} data-on={row.size === selected || undefined}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(row.size)} aria-pressed={row.size === selected}>{row.size}</button>
                </th>
                <td>{row.known ? `${row.w} × ${row.h}` : '—'}</td>
                <td>{row.known ? `${(row.w * CM_PER_INCH).toFixed(1)} × ${(row.h * CM_PER_INCH).toFixed(1)}` : '—'}</td>
                <td>
                  {formatPrice(getVariantPricing(row.variant).currentPrice)}
                  {stock.key !== 'in' && <small>{stock.key === 'low' ? `Only ${stock.quantity} left` : stock.label}</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fy-sizes__note">Sizes are the photo area your frame holds, width × height.</p>
    </div>
  );
};

const ProductDetailsSkeleton = () => (
  <div className="fy-pdp"><div className="fy-pdp__wrap"><div className="fy-pdp__grid animate-pulse">
    <div className="aspect-[4/5] bg-mat" />
    <div className="space-y-5"><div className="h-9 w-3/4 bg-mat" /><div className="h-7 w-1/3 bg-mat" />{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-14 bg-mat/60" />)}</div>
  </div></div></div>
);

export default CustomerProductDetailsPage;
