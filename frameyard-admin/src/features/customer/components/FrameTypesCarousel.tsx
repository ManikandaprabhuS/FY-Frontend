import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { frameTypes as defaultFrameTypes, type FrameTypeCard } from '../data/frameTypes';
import { ButtonLink } from '../ui/Button';
import FramedPhoto from './FramedPhoto';
import '../styles/frame-types.css';

const SWIPE_THRESHOLD = 40;

/** Panels alternate black and white, starting with black. */
const isDark = (index: number) => index % 2 === 0;

interface FrameTypesCarouselProps {
  types?: FrameTypeCard[];
}

/**
 * "Frames for every story": frame types as black and white panels; the active one
 * widens on hover, tap or swipe to show its name, description and a link to the shop.
 */
const FrameTypesCarousel: React.FC<FrameTypesCarouselProps> = ({ types = defaultFrameTypes }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStart = useRef<number | null>(null);

  if (types.length === 0) return null;

  const select = (index: number) => setActiveIndex((index + types.length) % types.length);

  const onPointerUp = (event: React.PointerEvent) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) > SWIPE_THRESHOLD) select(activeIndex + (distance < 0 ? 1 : -1));
  };

  return (
    <section className="mx-auto w-full max-w-[1440px] pb-5 pt-7 sm:px-8 sm:pb-8 sm:pt-10 lg:px-10 lg:pb-12 lg:pt-16" aria-labelledby="fy-frame-types-title">
      <div className="flex items-end justify-between gap-6 px-5 sm:px-0">
        <div>
          <h2 id="fy-frame-types-title" className="fy-display text-[34px] leading-[1.05] sm:text-[44px] lg:text-[56px]">
            Frames for every story
          </h2>
          <p className="mt-3 max-w-[48ch] text-[15px] leading-6 text-mute sm:text-[16px]">
            Find the perfect frame for every space, memory and style.
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <ButtonLink to="/products" variant="quiet">View all frames</ButtonLink>
        </div>
      </div>

      {/* Phones: the link sits on the right, just above the panels. */}
      <div className="mt-1 flex justify-end px-5 sm:hidden">
        <ButtonLink to="/products" variant="quiet">View all frames</ButtonLink>
      </div>

      {/* Phones: frame types as pages in a photo album, turned with the arrows or a swipe. */}
      <MobileFrameTypes types={types} />

      {/* Tablet and desktop: the expanding panels. */}
      <div className="hidden sm:block">
      <div
        className="fy-types mt-2 sm:mt-8 lg:mt-10"
        role="list"
        onPointerDown={(event) => { pointerStart.current = event.clientX; }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
      >
        {types.map((type, index) => {
          const active = index === activeIndex;
          const dark = isDark(index);
          return (
            <div
              key={type.id}
              role="listitem"
              className="fy-type"
              data-active={active}
              data-tone={dark ? 'dark' : 'light'}
              style={{ '--fy-type-chars': Math.max(type.word.length, 5) } as React.CSSProperties}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') select(index); }}
            >
              <span className="fy-type__word" aria-hidden="true">{type.word}</span>

              <div className="fy-type__media">
                <div className="fy-type__frame">
                  <FramedPhoto photo={type.photo} alt={active ? type.alt : ''} finish={type.finish} lazy />
                </div>
              </div>

              <span className="fy-type__label" aria-hidden="true">{type.name}</span>

              {!active && (
                <button
                  type="button"
                  onClick={() => select(index)}
                  aria-label={`Show ${type.name}`}
                  className={`absolute inset-0 z-[1] cursor-pointer outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 ${dark ? 'focus-visible:outline-white' : 'focus-visible:outline-ink'}`}
                />
              )}

              <div className="fy-type__info" aria-hidden={!active} inert={!active}>
                <h3 className="text-[17px] font-semibold leading-tight">{type.name}</h3>
                <p className="max-w-[30ch] text-[14px] leading-5">{type.description}</p>
                <ButtonLink to="/products" variant={dark ? 'primaryOnDark' : 'primary'} aria-label={`Shop ${type.name}`} className="mt-3">
                  Shop now
                </ButtonLink>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
};


const TURN_MS = 950;
/** How long a page rests before the album turns to the next one on its own. */
const AUTO_TURN_MS = 4000;

type Turn = { from: number; to: number; direction: 'next' | 'prev' };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One album page: the framed photo is the hero, with the name and description beneath. */
const AlbumPage: React.FC<{ type: FrameTypeCard; index: number; count: number; interactive: boolean }> = ({ type, index, count, interactive }) => {
  const dark = isDark(index);
  return (
    <div className="fy-page__face" data-tone={dark ? 'dark' : 'light'} inert={!interactive}>
      <div className="fy-page__frame">
        <FramedPhoto photo={type.photo} alt={interactive ? type.alt : ''} finish={type.finish} />
      </div>
      <h3 className="fy-display mt-3.5 text-[26px] leading-none">{type.name}</h3>
      <p className="fy-page__sub mt-1.5 max-w-[26ch] text-[14px] leading-5">{type.description}</p>
      <ButtonLink to="/products" variant={dark ? 'primaryOnDark' : 'primary'} aria-label={`Shop ${type.name}`} className="mt-3.5">
        Shop now
      </ButtonLink>
      <span className="fy-page__number" aria-hidden="true">{index + 1} / {count}</span>
    </div>
  );
};

/**
 * Phone layout: frame types as pages in a photo album. Pages turn on their own every few
 * seconds while the album is on screen, and the arrows turn one page at a time:
 * forward lifts the current page over the spine (left edge) to reveal the next one beneath;
 * back brings the previous page over from the left. Swipes do the same.
 */
const MobileFrameTypes: React.FC<{ types: FrameTypeCard[] }> = ({ types }) => {
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [inView, setInView] = useState(false);
  const [autoplay] = useState(() => !prefersReducedMotion() && types.length > 1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<number | null>(null);
  const count = types.length;

  // Only turn pages automatically while the album is visible.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !autoplay || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [autoplay]);

  // One timer, started only while a page is at rest; any turn (automatic, arrow or swipe)
  // clears it and the full wait starts again once that turn has finished.
  useEffect(() => {
    if (!autoplay || !inView || turn) return;
    const timer = window.setTimeout(
      () => setTurn({ from: index, to: (index + 1) % count, direction: 'next' }),
      AUTO_TURN_MS,
    );
    return () => window.clearTimeout(timer);
  }, [autoplay, count, inView, index, turn]);

  const finishTurn = useCallback((to: number) => {
    setIndex(to);
    setTurn(null);
  }, []);

  const turnPage = (direction: Turn['direction']) => {
    if (turn || count < 2) return;
    const to = (index + (direction === 'next' ? 1 : -1) + count) % count;
    if (prefersReducedMotion()) {
      setIndex(to);
      return;
    }
    setTurn({ from: index, to, direction });
  };

  // Safety net in case animationend is missed (e.g. the tab is hidden mid-turn).
  useEffect(() => {
    if (!turn) return;
    const timer = window.setTimeout(() => finishTurn(turn.to), TURN_MS + 150);
    return () => window.clearTimeout(timer);
  }, [finishTurn, turn]);

  const onPointerUp = (event: React.PointerEvent) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) > SWIPE_THRESHOLD) turnPage(distance < 0 ? 'next' : 'prev');
  };

  // Which page lies flat underneath, and which page is the turning leaf.
  const basePage = turn ? (turn.direction === 'next' ? turn.to : turn.from) : index;
  const leafPage = turn ? (turn.direction === 'next' ? turn.from : turn.to) : null;
  const shownIndex = turn ? turn.to : index;
  const arrowClass = 'fy-album__arrow grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-white text-ink shadow-[0_2px_8px_rgba(17,17,17,0.08)] transition-[background-color,color] duration-300';

  return (
    <div className="mt-2 overflow-x-clip sm:hidden">
      <div ref={wrapRef} className="fy-album-wrap" role="group" aria-roledescription="carousel" aria-label="Frame types">
        {/* Arrows sit either side of the frame image, level with its centre. */}
        <button type="button" onClick={() => turnPage('prev')} aria-label="Previous frame type" className={`${arrowClass} fy-album__arrow--prev`}>
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
        <button type="button" onClick={() => turnPage('next')} aria-label="Next frame type" className={`${arrowClass} fy-album__arrow--next`}>
          <ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>

        <div
          className="fy-album"
          onPointerDown={(event) => { pointerStart.current = event.clientX; }}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { pointerStart.current = null; }}
        >
          {/* The page lying flat underneath; it darkens under the turning leaf's shadow. */}
          <div className="fy-page fy-page--base" data-turning={turn ? turn.direction : undefined}>
            <AlbumPage type={types[basePage]} index={basePage} count={count} interactive={!turn} />
            <span className="fy-page__cast" aria-hidden="true" />
          </div>

          {/* The turning leaf: front is the page, back is plain album paper. */}
          {turn && leafPage !== null && (
            <div
              className={`fy-leaf fy-leaf--${turn.direction}`}
              onAnimationEnd={(event) => { if (event.target === event.currentTarget) finishTurn(turn.to); }}
              aria-hidden="true"
            >
              <div className="fy-page fy-leaf__front">
                <AlbumPage type={types[leafPage]} index={leafPage} count={count} interactive={false} />
                <span className="fy-leaf__shade" />
              </div>
              <div className="fy-page fy-leaf__back" data-tone={isDark(leafPage) ? 'dark' : 'light'} />
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{types[shownIndex].name}</p>
    </div>
  );
};

export default FrameTypesCarousel;
