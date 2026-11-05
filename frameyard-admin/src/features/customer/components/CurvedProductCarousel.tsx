import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '../../../types';
import CurvedProductCard, { ProductPricing } from './CurvedProductCard';

interface CurvedProductCarouselProps {
  products: Product[];
}

const getProductPricing = (product: Product): ProductPricing => {
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const CurvedProductCarousel: React.FC<CurvedProductCarouselProps> = ({ products }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);

  const carouselProducts = useMemo(() => products.filter((product) => product.isActive).slice(0, 7), [products]);
  const maxIndex = Math.max(carouselProducts.length - 1, 0);
  const activeIndex = clamp(Math.round(scrollProgress * maxIndex), 0, maxIndex);

  useEffect(() => {
    let frameId = 0;

    const updateProgress = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const rawProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
      setScrollProgress(clamp(rawProgress, 0, 1));
    };

    const handleScroll = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const handleMobileScroll = () => {
    const track = mobileTrackRef.current;
    if (!track) return;

    const cardWidth = track.scrollWidth / Math.max(carouselProducts.length, 1);
    setMobileActiveIndex(clamp(Math.round(track.scrollLeft / cardWidth), 0, maxIndex));
  };

  if (carouselProducts.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className="overflow-hidden bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-[#c07d42]">FrameYaad Collection</p>
          <h2 className="mt-3 text-3xl font-black text-black md:text-4xl">Discover Our Premium Frames</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-black/60">
            Crafted with care to preserve your memories beautifully.
          </p>
        </div>

        <div
          className="relative mt-16 hidden h-[560px] md:block"
          aria-label="Scroll to explore featured FrameYaad products"
        >
          {carouselProducts.map((product, index) => {
            const virtualIndex = index - scrollProgress * maxIndex;
            const distance = virtualIndex;
            const absDistance = Math.abs(distance);
            const isActive = index === activeIndex;
            const translateX = distance * 245;
            const translateY = absDistance * 52 + Math.pow(distance, 2) * 8;
            const rotate = clamp(distance * 7, -14, 14);
            const scale = clamp(1 - absDistance * 0.09, 0.78, 1);
            const opacity = clamp(1 - absDistance * 0.18, 0.28, 1);

            return (
              <CurvedProductCard
                key={product.id}
                product={product}
                pricing={getProductPricing(product)}
                isActive={isActive}
                style={{
                  transform: `translate3d(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px), 0) rotate(${rotate}deg) scale(${scale})`,
                  opacity,
                  zIndex: 100 - Math.round(absDistance * 10),
                }}
              />
            );
          })}
        </div>

        <div className="mt-12 md:hidden">
          <div
            ref={mobileTrackRef}
            onScroll={handleMobileScroll}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-visible px-[10vw] pb-8 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Swipe to explore featured FrameYaad products"
          >
            {carouselProducts.map((product, index) => {
              const isActive = index === mobileActiveIndex;

              return (
                <div key={product.id} className="relative h-[500px] w-[78vw] max-w-[320px] shrink-0 snap-center">
                  <CurvedProductCard
                    product={product}
                    pricing={getProductPricing(product)}
                    isActive={isActive}
                    style={{
                      transform: `translate3d(-50%, calc(-50% + ${isActive ? -8 : 18}px), 0) rotate(${isActive ? 0 : index % 2 === 0 ? -4 : 4}deg) scale(${isActive ? 1 : 0.92})`,
                      opacity: isActive ? 1 : 0.72,
                      zIndex: isActive ? 20 : 10,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CurvedProductCarousel;
