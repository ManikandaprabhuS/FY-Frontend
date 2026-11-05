import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../../types';
import FeaturedProductCard, { FeaturedProductPricing } from './FeaturedProductCard';
import { useCustomerCommerce } from '../hooks/useCustomerCommerce';

interface FeaturedProductsCarouselProps {
  products: Product[];
}

const CARD_WIDTH = 216;
const CARD_GAP = 24;
const LOOP_COPIES = 3;
const FAVORITES_CACHE_KEY = 'frameyaad-favorites-products';

const readCachedProducts = (): Product[] => {
  try {
    const cachedProducts = window.localStorage.getItem(FAVORITES_CACHE_KEY);
    return cachedProducts ? (JSON.parse(cachedProducts) as Product[]).slice(0, 5) : [];
  } catch {
    return [];
  }
};

const getProductPricing = (product: Product): FeaturedProductPricing => {
  const variant = product.variants?.[0];
  const currentPrice = Number(variant?.offerPrice || variant?.price || 0);
  const originalPrice =
    variant?.offerPrice && Number(variant.offerPrice) < Number(variant.price)
      ? Number(variant.price)
      : Math.round(currentPrice * 1.35);
  const discount =
    originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

  return { currentPrice, originalPrice, discount };
};

const FeaturedProductsCarousel: React.FC<FeaturedProductsCarouselProps> = ({ products }) => {
  const navigate = useNavigate();
  const desktopCarouselRef = useRef<HTMLDivElement | null>(null);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const wheelLockedRef = useRef(false);
  const [cachedProducts] = useState<Product[]>(readCachedProducts);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(1);
  const [desktopIndex, setDesktopIndex] = useState(1);
  const [desktopTransition, setDesktopTransition] = useState(true);
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const { customerLoggedIn, wishlist, toggleWishlist, addToCart } = useCustomerCommerce();

  const sourceProducts = products.length > 0 ? products : cachedProducts;
  const featuredProducts = useMemo(() => {
    const activeProducts = sourceProducts.filter((product) => product.isActive);
    const availableProducts = activeProducts.length > 0 ? activeProducts : sourceProducts;
    const randomizedProducts = [...availableProducts];

    for (let index = randomizedProducts.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [randomizedProducts[index], randomizedProducts[randomIndex]] = [
        randomizedProducts[randomIndex],
        randomizedProducts[index],
      ];
    }

    return randomizedProducts.slice(0, 5);
  }, [sourceProducts]);
  const loopedProducts = useMemo(
    () => Array.from({ length: LOOP_COPIES }, () => featuredProducts).flat(),
    [featuredProducts],
  );
  const productCount = featuredProducts.length;
  const desktopOffset = -desktopIndex * (CARD_WIDTH + CARD_GAP) - CARD_WIDTH / 2;

  useEffect(() => {
    if (featuredProducts.length === 0 || products.length === 0) return;

    try {
      window.localStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(featuredProducts));
    } catch {
      // The live API data still renders if browser storage is unavailable.
    }
  }, [featuredProducts, products.length]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const updateLayout = () => setIsDesktopLayout(query.matches);
    query.addEventListener('change', updateLayout);
    return () => query.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (productCount === 0) return;

    const initialIndex = productCount + Math.min(1, productCount - 1);
    setDesktopTransition(false);
    setDesktopIndex(initialIndex);
    setMobileActiveIndex(initialIndex % productCount);

    const frame = window.requestAnimationFrame(() => {
      setDesktopTransition(true);
      const track = mobileTrackRef.current;
      const firstCard = track?.querySelector<HTMLElement>('[data-featured-card]');
      if (track && firstCard) {
        track.scrollLeft = productCount * (firstCard.offsetWidth + 20);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [productCount]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') {
      setDesktopIndex((current) => current + 1);
    }

    if (event.key === 'ArrowLeft') {
      setDesktopIndex((current) => current - 1);
    }
  };

  useEffect(() => {
    const carousel = desktopCarouselRef.current;
    if (!carousel) return;

    const handleDesktopWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 4) return;

      event.preventDefault();
      if (wheelLockedRef.current) return;

      wheelLockedRef.current = true;
      setDesktopIndex((current) => current + (delta > 0 ? 1 : -1));
      window.setTimeout(() => {
        wheelLockedRef.current = false;
      }, 420);
    };

    carousel.addEventListener('wheel', handleDesktopWheel, { passive: false });
    return () => carousel.removeEventListener('wheel', handleDesktopWheel);
  }, []);

  const selectDesktopCard = (index: number) => {
    setDesktopIndex(index);
  };

  const handleDesktopTransitionEnd = () => {
    if (desktopIndex < productCount) {
      setDesktopTransition(false);
      setDesktopIndex((current) => current + productCount);
    } else if (desktopIndex >= productCount * 2) {
      setDesktopTransition(false);
      setDesktopIndex((current) => current - productCount);
    } else {
      return;
    }

    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setDesktopTransition(true)));
  };

  const handleMobileScroll = () => {
    const track = mobileTrackRef.current;
    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>('[data-featured-card]');
    const cardStep = (firstCard?.offsetWidth || 1) + 20;
    const rawIndex = Math.round(track.scrollLeft / cardStep);
    setMobileActiveIndex(((rawIndex % productCount) + productCount) % productCount);

    if (rawIndex < productCount) {
      track.scrollLeft += productCount * cardStep;
    } else if (rawIndex >= productCount * 2) {
      track.scrollLeft -= productCount * cardStep;
    }
  };

  const selectMobileCard = (index: number) => {
    setMobileActiveIndex(index);
    const track = mobileTrackRef.current;
    const target = track?.querySelectorAll<HTMLElement>('[data-featured-card]')[productCount + index];
    target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <section
      id="featured-products"
      className="overflow-hidden bg-white px-4 pb-4 pt-16 sm:px-6 lg:px-8"
      aria-labelledby="featured-products-heading"
      onKeyDown={handleKeyDown}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <p className="text-xl font-black uppercase tracking-[0.22em] text-[#c07d42]">FrameYaad Favorites</p>
          <div className="mx-auto mt-7 flex w-28 items-center justify-center gap-2 text-[#c07d42]">
            <span className="h-px flex-1 bg-[#c07d42]" />
            <span className="h-3 w-3 rotate-45 border-2 border-[#c07d42]" />
            <span className="h-px flex-1 bg-[#c07d42]" />
          </div>
          <p id="featured-products-heading" className="mt-7 text-lg font-semibold text-black/65">
            Loved by our customers. Handpicked bestsellers just for you.
          </p>
        </div>

        {isDesktopLayout ? <div
          ref={desktopCarouselRef}
          className="relative mx-auto h-[400px] max-w-[1200px] overflow-hidden px-6 pt-16"
          aria-label="Featured product carousel"
        >
          <div
            className={`absolute left-1/2 top-16 flex items-center gap-6 px-2 will-change-transform ${
              desktopTransition ? 'transition-transform duration-500 ease-in-out' : ''
            }`}
            style={{ transform: `translate3d(${desktopOffset}px, 0, 0)` }}
            onTransitionEnd={handleDesktopTransitionEnd}
          >
            {productCount === 0
              ? Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={`favorite-skeleton-${index}`}
                    className="h-[300px] w-[216px] shrink-0 animate-pulse overflow-hidden rounded-[1.35rem] border border-black/5 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
                    aria-hidden="true"
                  >
                    <div className="h-[58%] bg-black/10" />
                    <div className="space-y-3 px-4 py-4">
                      <div className="h-4 w-4/5 rounded bg-black/10" />
                      <div className="h-5 w-2/5 rounded bg-black/10" />
                      <div className="h-3 w-3/5 rounded bg-black/5" />
                    </div>
                  </div>
                ))
              : loopedProducts.map((product, index) => {
              const isActive = index === desktopIndex;

              return (
                <FeaturedProductCard
                  key={`${Math.floor(index / productCount)}-${product.id}`}
                  product={product}
                  pricing={getProductPricing(product)}
                  isActive={isActive}
                  onSelect={() => isActive ? navigate(`/product/${product.id}`) : selectDesktopCard(index)}
                  wished={customerLoggedIn && Boolean(product.productIdentifier && wishlist[product.productIdentifier])}
                  onToggleWishlist={() => void toggleWishlist(product)}
                  onAddToCart={() => {
                    const variant = product.variants?.find((item) => item.isActive !== false && Number(item.stockQuantity) > 0);
                    if (variant) addToCart(product, variant);
                  }}
                  className="h-[300px] w-[216px]"
                  style={{
                    transform: `translate3d(0, ${isActive ? 8 : 24}px, 0) scale(${isActive ? 1.04 : 0.96})`,
                    zIndex: isActive ? 20 : 10,
                  }}
                />
              );
                })}
          </div>
        </div> :

        <div>
          <div
            ref={mobileTrackRef}
            onScroll={handleMobileScroll}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-visible px-[10vw] pb-12 pt-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Swipe featured products"
          >
            {productCount === 0
              ? Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={`mobile-favorite-skeleton-${index}`}
                    className="aspect-[4.5/6.25] w-[180px] shrink-0 snap-center animate-pulse overflow-hidden rounded-[1.35rem] border border-black/5 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)] sm:w-[200px]"
                    aria-hidden="true"
                  >
                    <div className="h-[58%] bg-black/10" />
                    <div className="space-y-3 px-4 py-4">
                      <div className="h-4 w-4/5 rounded bg-black/10" />
                      <div className="h-5 w-2/5 rounded bg-black/10" />
                    </div>
                  </div>
                ))
              : loopedProducts.map((product, index) => {
              const originalIndex = index % productCount;
              const isActive = originalIndex === mobileActiveIndex;

              return (
                <div
                  key={`${Math.floor(index / productCount)}-${product.id}`}
                  data-featured-card
                  className="aspect-[4.5/6.25] w-[180px] shrink-0 snap-center sm:w-[200px]"
                >
                  <FeaturedProductCard
                    product={product}
                    pricing={getProductPricing(product)}
                    isActive={isActive}
                    onSelect={() => isActive ? navigate(`/product/${product.id}`) : selectMobileCard(originalIndex)}
                    wished={customerLoggedIn && Boolean(product.productIdentifier && wishlist[product.productIdentifier])}
                    onToggleWishlist={() => void toggleWishlist(product)}
                    onAddToCart={() => {
                      const variant = product.variants?.find((item) => item.isActive !== false && Number(item.stockQuantity) > 0);
                      if (variant) addToCart(product, variant);
                    }}
                    className="h-full w-full"
                    style={{ transform: `translate3d(0, ${isActive ? 0 : 14}px, 0) scale(${isActive ? 1 : 0.93})` }}
                  />
                </div>
              );
                })}
          </div>
        </div>}
      </div>
    </section>
  );
};

export default FeaturedProductsCarousel;
