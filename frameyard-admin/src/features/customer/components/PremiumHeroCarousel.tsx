import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../../types';

type PremiumHeroCarouselProps = {
  products: Product[];
  loading?: boolean;
  error?: string | null;
};

type PointerSession = {
  startX: number;
  startPosition: number;
  currentPosition: number;
};

const DESKTOP_VISIBLE_CARDS = 7;
const TABLET_VISIBLE_CARDS = 3;
const MOBILE_VISIBLE_CARDS = 3;
const SNAP_DURATION_MS = 450;
const AUTOPLAY_INTERVAL_MS = 5000;
const AUTOPLAY_RESUME_DELAY_MS = 4500;

const getResponsiveViewportWidth = () =>
  window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth;

const PremiumHeroCarousel: React.FC<PremiumHeroCarouselProps> = ({ products, loading = false, error = null }) => {
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const movedRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const lastWheelMoveRef = useRef(0);
  const dragFrameRef = useRef<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(getResponsiveViewportWidth);
  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => {
      setViewportWidth(getResponsiveViewportWidth());
    };
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    window.addEventListener('resize', updateWidth);
    window.addEventListener('orientationchange', updateWidth);
    window.visualViewport?.addEventListener('resize', updateWidth);
    updateWidth();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
      window.removeEventListener('orientationchange', updateWidth);
      window.visualViewport?.removeEventListener('resize', updateWidth);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const visibleCards = viewportWidth < 640
    ? MOBILE_VISIBLE_CARDS
    : viewportWidth < 1200
      ? TABLET_VISIBLE_CARDS
      : DESKTOP_VISIBLE_CARDS;

  const baseProducts = useMemo(() => {
    if (products.length === 0) return [];

    const minimumLoopLength = visibleCards + 2;
    const length = Math.max(products.length, minimumLoopLength);
    return Array.from({ length }, (_, index) => products[index % products.length]);
  }, [products, visibleCards]);

  const loopedProducts = useMemo(
    () => baseProducts.length > 0 ? [...baseProducts, ...baseProducts, ...baseProducts] : [],
    [baseProducts],
  );

  const baseLength = baseProducts.length;
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1200;
  const isCompactViewport = isMobile || isTablet;
  const cardWidth = isMobile
    ? viewportWidth * 0.25
    : isTablet
      ? viewportWidth * 0.28
      : Math.min(viewportWidth * 0.135, 300);
  // Keep cards close enough to read as one sculpted row without compressing
  // the product photos.
  const visualGap = isMobile ? 24 : isTablet ? 10 : 12;
  const cardStep = cardWidth + visualGap;
  const curveRadius = Math.max(1, Math.floor(visibleCards / 2));
  const centreHeight = isMobile ? 0.78 : isTablet ? 0.74 : 0.7;
  const edgeHeightIncrease = isMobile ? 0.18 : isTablet ? 0.23 : 0.27;

  const getCardGeometry = (distance: number) => {
    const absoluteDistance = Math.abs(distance);
    const curveProgress = Math.min(absoluteDistance / curveRadius, 1);
    // The visible height is shaped by one continuous SVG envelope below. Keep
    // depth restrained so perspective does not pull matching seams apart.
    const translateZ = (isMobile ? 8 : isTablet ? 12 : 16) * Math.pow(curveProgress, 1.2);
    const translateY = 0;
    // Exact relative dimensions requested for the three visible size tiers.
    // The underlying card is 3:4, so X and Y are scaled independently to
    // represent A2 (4.25x5.5), A6 (4.5x6.25), and A7 (5x7).
    const a2 = { x: 1, y: 5.5 / (4.25 * 4 / 3) };
    const a6 = { x: 4.5 / 4.25, y: 6.25 / (4.25 * 4 / 3) };
    const a7 = { x: 5 / 4.25, y: 7 / (4.25 * 4 / 3) };
    let scaleX: number;
    let scaleY: number;

    if (absoluteDistance <= 1) {
      scaleX = a2.x + (a6.x - a2.x) * absoluteDistance;
      scaleY = a2.y + (a6.y - a2.y) * absoluteDistance;
    } else {
      const edgeProgress = curveRadius <= 1
        ? 1
        : Math.min((absoluteDistance - 1) / (curveRadius - 1), 1);
      scaleX = a6.x + (a7.x - a6.x) * edgeProgress;
      scaleY = a6.y + (a7.y - a6.y) * edgeProgress;
    }
    // Left cards face right and right cards face left, toward the focal card.
    const rotateY = Math.max(-12, Math.min(12, distance * (isMobile ? 3.6 : isTablet ? 4.5 : 5.5)));
    const rotateZ = 0;

    return { absoluteDistance, translateY, translateZ, scaleX, scaleY, rotateY, rotateZ };
  };

  const getCardTranslateX = () => {
    return 0;
  };

  const getEnvelopeHeight = (edgeDistance: number) => {
    const progress = Math.min(Math.abs(edgeDistance) / (curveRadius + 0.5), 1);
    return centreHeight + edgeHeightIncrease * Math.pow(progress, 1.35);
  };

  const getCardClipPathData = (distance: number) => {
    // A card's right boundary and its neighbour's left boundary evaluate the
    // same half-step on this continuous envelope, guaranteeing aligned seams.
    const leftHeight = getEnvelopeHeight(distance - 0.5);
    const rightHeight = getEnvelopeHeight(distance + 0.5);
    const topLeft = (1 - leftHeight) / 2;
    const topRight = (1 - rightHeight) / 2;
    const bottomLeft = 1 - topLeft;
    const bottomRight = 1 - topRight;
    const radius = 0.045;

    return `M ${radius} ${topLeft}
      C 0.32 ${topLeft} 0.68 ${topRight} ${1 - radius} ${topRight}
      C ${1 - radius * 0.3} ${topRight} 1 ${topRight + radius * 0.3} 1 ${topRight + radius}
      L 1 ${bottomRight - radius}
      C 1 ${bottomRight - radius * 0.3} ${1 - radius * 0.3} ${bottomRight} ${1 - radius} ${bottomRight}
      C 0.68 ${bottomRight} 0.32 ${bottomLeft} ${radius} ${bottomLeft}
      C ${radius * 0.3} ${bottomLeft} 0 ${bottomLeft - radius * 0.3} 0 ${bottomLeft - radius}
      L 0 ${topLeft + radius}
      C 0 ${topLeft + radius * 0.3} ${radius * 0.3} ${topLeft} ${radius} ${topLeft} Z`;
  };

  useEffect(() => {
    let transitionFrame: number | null = null;
    const resetFrame = window.requestAnimationFrame(() => {
      if (baseLength === 0) {
        setPosition(0);
        return;
      }

      setTransitionEnabled(false);
      setPosition(baseLength);
      transitionFrame = window.requestAnimationFrame(() => setTransitionEnabled(!reducedMotion));
    });

    return () => {
      window.cancelAnimationFrame(resetFrame);
      if (transitionFrame !== null) window.cancelAnimationFrame(transitionFrame);
    };
  }, [baseLength, reducedMotion]);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
  }, []);

  useEffect(() => {
    if (loading || products.length > 0) return;
    console.warn('[FrameYaad] Hero carousel has no products to display.', error || 'The product API returned an empty list.');
  }, [error, loading, products.length]);

  const resetIntoMiddleCopy = useCallback((nextPosition: number) => {
    if (baseLength === 0) return;

    let normalized = nextPosition;
    while (normalized < baseLength) normalized += baseLength;
    while (normalized >= baseLength * 2) normalized -= baseLength;

    if (normalized === nextPosition) return;
    setTransitionEnabled(false);
    setPosition(normalized);
    window.requestAnimationFrame(() => setTransitionEnabled(!reducedMotion));
  }, [baseLength, reducedMotion]);

  const snapTo = useCallback((nextPosition: number) => {
    if (baseLength === 0) return;

    const snapped = Math.round(nextPosition);
    setTransitionEnabled(!reducedMotion);
    setPosition(snapped);

    if (reducedMotion) {
      resetIntoMiddleCopy(snapped);
      return;
    }

    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => resetIntoMiddleCopy(snapped), SNAP_DURATION_MS + 20);
  }, [baseLength, reducedMotion, resetIntoMiddleCopy]);

  const moveBy = (delta: number) => snapTo(position + delta);

  const pauseAfterInteraction = () => {
    setInteractionPaused(true);
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setInteractionPaused(false), AUTOPLAY_RESUME_DELAY_MS);
  };

  useEffect(() => {
    if (reducedMotion || loading || baseLength === 0 || hovered || dragging || interactionPaused || !pageVisible) return;
    const interval = window.setInterval(() => snapTo(position + 1), AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [baseLength, dragging, hovered, interactionPaused, loading, pageVisible, position, reducedMotion, snapTo]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (baseLength === 0) return;
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);

    pointerSessionRef.current = { startX: event.clientX, startPosition: position, currentPosition: position };
    movedRef.current = false;
    setDragging(true);
    setTransitionEnabled(false);
    pauseAfterInteraction();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = pointerSessionRef.current;
    if (!session || cardStep === 0) return;

    const distance = event.clientX - session.startX;
    if (Math.abs(distance) > 5) movedRef.current = true;
    session.currentPosition = session.startPosition - distance / cardStep;
    if (dragFrameRef.current === null) {
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const activeSession = pointerSessionRef.current;
        if (activeSession) setPosition(activeSession.currentPosition);
      });
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerSessionRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const positionDelta = Math.round(pointerSessionRef.current.currentPosition - pointerSessionRef.current.startPosition);
    const nextPosition = pointerSessionRef.current.startPosition + Math.max(-1, Math.min(1, positionDelta));
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    pointerSessionRef.current = null;
    setDragging(false);
    snapTo(nextPosition);
    pauseAfterInteraction();
    window.setTimeout(() => { movedRef.current = false; }, 0);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || baseLength === 0) return;

    const handleWheel = (event: WheelEvent) => {
      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
      if (!horizontalIntent) return;

      event.preventDefault();
      const now = event.timeStamp;
      if (now - lastWheelMoveRef.current < SNAP_DURATION_MS) return;
      lastWheelMoveRef.current = now;

      setInteractionPaused(true);
      if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(() => setInteractionPaused(false), AUTOPLAY_RESUME_DELAY_MS);
      snapTo(position + ((event.deltaX || event.deltaY) > 0 ? 1 : -1));
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [baseLength, position, snapTo]);

  const handleCardClick = (index: number, product: Product) => {
    if (movedRef.current) return;

    const distance = index - Math.round(position);
    if (distance !== 0) {
      pauseAfterInteraction();
      moveBy(Math.sign(distance));
      return;
    }

    navigate(`/product/${product.id}`);
  };

  if (!loading && baseLength === 0) return null;

  const trackTranslateX = viewportWidth / 2 - position * cardStep - cardWidth / 2;

  return (
    <section className="relative w-full overflow-hidden bg-white px-0 pb-2 pt-10 sm:pb-3 sm:pt-12" aria-label="Featured FrameYaad products">
      <div
        ref={viewportRef}
        className="relative mx-auto h-[390px] w-full touch-pan-y select-none sm:h-[500px] lg:h-[560px] xl:h-[580px]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="FrameYaad product carousel"
      >
        <div className="absolute inset-x-0 top-0 z-30 flex flex-col items-center px-4 text-center sm:px-6">
          <h1 className="max-w-4xl text-2xl font-black leading-[1.08] tracking-[-0.035em] text-black sm:text-3xl md:text-4xl lg:text-5xl">
            Elevate your memories. Frame your world.
          </h1>
          <h3 className="mt-3 max-w-2xl text-xs font-medium leading-5 text-black/60 sm:mt-4 sm:text-sm sm:leading-6 lg:text-base">
            Discover gallery-quality frames designed to showcase your most cherished pieces with modern elegance.
          </h3>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => navigate('/products')}
            className="mt-5 inline-flex items-center gap-4 rounded-lg bg-black px-8 py-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/20 sm:mt-6 sm:px-10 sm:py-4 sm:text-base"
          >
            Shop All <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 top-48 overflow-hidden [perspective:1500px] sm:top-60 lg:top-64">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center gap-0 overflow-hidden px-2" aria-label="Loading featured products" aria-busy="true">
              {Array.from({ length: visibleCards }, (_, index) => {
                const center = Math.floor(visibleCards / 2);
                const distance = index - center;
                const { translateY, translateZ, scaleX, scaleY, rotateY, rotateZ } = getCardGeometry(distance);
                const translateX = getCardTranslateX();
                const clipId = `hero-skeleton-envelope-${index}`;
                return <div key={index} className="origin-center shrink-0 animate-pulse overflow-hidden bg-neutral-200 shadow-[0_12px_32px_rgba(0,0,0,0.14)] [backface-visibility:hidden] will-change-transform" style={{ width: cardWidth, marginRight: cardStep - cardWidth, clipPath: `url(#${clipId})`, transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale3d(${scaleX}, ${scaleY}, 1)` }}><svg className="absolute h-0 w-0" aria-hidden="true"><defs><clipPath id={clipId} clipPathUnits="objectBoundingBox"><path d={getCardClipPathData(distance)} /></clipPath></defs></svg><div className="aspect-[3/4] w-full bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300" /></div>;
              })}
            </div>
          ) : (
          <div
            className={`absolute top-1/2 flex items-center [transform-style:preserve-3d] will-change-transform ${
              isCompactViewport ? 'inset-x-0 justify-center gap-6 px-4 sm:gap-5' : 'left-0'
            } ${
              transitionEnabled && !dragging ? 'transition-transform duration-[450ms] ease-out' : ''
            }`}
            style={{
              transform: isCompactViewport
                ? 'translate3d(0, -50%, 0)'
                : `translate3d(${trackTranslateX}px, -50%, 0)`,
            }}
          >
            {loopedProducts.map((product, index) => {
              const distance = index - position;
              const { absoluteDistance, translateY, translateZ, scaleX, scaleY, rotateY, rotateZ } = getCardGeometry(distance);
              const translateX = getCardTranslateX();
              const visibleCenterIndex = Math.round(position);
              const isCentered = isCompactViewport ? index === visibleCenterIndex : Math.abs(distance) < 0.5;
              const isNearViewport = absoluteDistance <= visibleCards;
              const distanceFromVisibleCenter = Math.abs(index - visibleCenterIndex);
              const isWithinVisibleRange = !isCompactViewport || distanceFromVisibleCenter <= 1;
              const isCompactSideCard = isCompactViewport && distanceFromVisibleCenter === 1;
              const visualProgress = Math.min(absoluteDistance / (curveRadius + 1.5), 1);
              const clipId = `hero-product-envelope-${index}`;

              return (
                <button
                  key={`${index}-${product.id}`}
                  type="button"
                  onClick={() => handleCardClick(index, product)}
                  className={`relative origin-center shrink-0 overflow-hidden bg-neutral-100 shadow-[0_12px_32px_rgba(0,0,0,0.14)] outline-none [backface-visibility:hidden] [transform-style:preserve-3d] will-change-transform focus-visible:ring-4 focus-visible:ring-black/25 ${transitionEnabled && !dragging ? 'transition-[transform,opacity,filter] duration-[450ms] ease-out' : ''}`}
                  style={{
                    width: cardWidth,
                    marginRight: isCompactViewport ? 0 : cardStep - cardWidth,
                    display: isCompactViewport && !isWithinVisibleRange ? 'none' : undefined,
                    clipPath: `url(#${clipId})`,
                    transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ + (hoveredCardIndex === index ? 45 : 0)}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale3d(${scaleX * (hoveredCardIndex === index ? 1.035 : 1)}, ${scaleY * (hoveredCardIndex === index ? 1.035 : 1)}, 1)`,
                    zIndex: hoveredCardIndex === index ? 60 : Math.max(1, 50 - Math.round(absoluteDistance * 5)),
                    opacity: !isWithinVisibleRange ? 0 : isCompactSideCard ? 0.72 : Math.max(0, 1 - visualProgress * 0.48),
                    filter: isCentered
                      ? 'none'
                      : isCompactSideCard
                        ? `blur(${isMobile ? 2.4 : 2}px) grayscale(0.2) saturate(0.78)`
                        : `blur(${Math.min(6, absoluteDistance * 1.6)}px) grayscale(${Math.min(0.85, visualProgress * 0.72)}) saturate(${Math.max(0.45, 1 - visualProgress * 0.5)})`,
                    pointerEvents: !isWithinVisibleRange || absoluteDistance > curveRadius + 1.5 ? 'none' : 'auto',
                  }}
                  aria-label={`${product.name}${isCentered ? ', centered product' : ', move to center'}`}
                  aria-current={isCentered ? 'true' : undefined}
                  onMouseEnter={() => setHoveredCardIndex(index)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                >
                  <svg className="absolute h-0 w-0" aria-hidden="true">
                    <defs>
                      <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                        <path d={getCardClipPathData(distance)} />
                      </clipPath>
                    </defs>
                  </svg>
                  {product.images?.[0]?.imageUrl ? (
                    <img
                      src={product.images[0].imageUrl}
                      alt={product.name}
                      draggable={false}
                      loading={isNearViewport ? 'eager' : 'lazy'}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[3/4] w-full items-center justify-center bg-neutral-100 px-4 text-center text-xs font-semibold text-neutral-500">
                      Image unavailable
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default PremiumHeroCarousel;
