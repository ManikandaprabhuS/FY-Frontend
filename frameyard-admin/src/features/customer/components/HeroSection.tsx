import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { heroSlides, type HeroSlide } from '../data/heroSlides';
import { STUDIO_PATH } from '../navigation';
import { ButtonLink } from '../ui/Button';
import FramedPhoto from './FramedPhoto';
import '../styles/hero.css';

const AUTOPLAY_MS = 4000;
const SWIPE_THRESHOLD = 45;

type Direction = 'next' | 'prev';
type SlideState = { index: number; previous: number | null; direction: Direction };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SlidePhoto: React.FC<{ slide: HeroSlide; priority: boolean }> = ({ slide, priority }) => (
  <FramedPhoto
    photo={slide.photo}
    srcSet={slide.photoSrcSet}
    sizes="(min-width: 1024px) 450px, (min-width: 640px) 52vw, 70vw"
    alt={slide.alt}
    finish={slide.finish}
    priority={priority}
  />
);

interface HeroSectionProps {
  slides?: HeroSlide[];
}

/**
 * Homepage hero: headline and actions beside a framed photograph that swaps
 * against a changing wall tone. Slides come from data so they can later be
 * served by the backend.
 */
const HeroSection: React.FC<HeroSectionProps> = ({ slides = heroSlides }) => {
  const [state, setState] = useState<SlideState>({ index: 0, previous: null, direction: 'next' });
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const paused = hovered || tabHidden;
  const [autoplay] = useState(() => !prefersReducedMotion() && slides.length > 1);
  const pointerStart = useRef<number | null>(null);

  const slide = slides[state.index];
  const count = slides.length;

  const goTo = useCallback((index: number, direction: Direction) => {
    setState((current) => (current.index === index ? current : { index, previous: current.index, direction }));
  }, []);

  const step = useCallback((direction: Direction) => {
    setState((current) => {
      const index = (current.index + (direction === 'next' ? 1 : -1) + count) % count;
      return { index, previous: current.index, direction };
    });
  }, [count]);

  // One timer at a time. Every slide change (automatic or manual) resets the full
  // interval; pausing (mouse over the image, or a hidden tab) keeps the time left so
  // the progress bar and the timer stay in step.
  const remaining = useRef(AUTOPLAY_MS);

  useEffect(() => {
    remaining.current = AUTOPLAY_MS;
  }, [state]);

  useEffect(() => {
    if (!autoplay || paused) return;
    const startedAt = performance.now();
    const timer = window.setTimeout(() => step('next'), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt));
    };
  }, [autoplay, paused, state, step]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') step('prev');
    if (event.key === 'ArrowRight') step('next');
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) > SWIPE_THRESHOLD) step(distance < 0 ? 'next' : 'prev');
  };

  const dark = slide.dark;
  const muted = dark ? 'text-white/70' : 'text-ink/65';
  const control = `grid h-10 w-10 place-items-center rounded-full border transition-[background-color,color,border-color,transform] duration-300 active:scale-90 ${dark ? 'border-white/35 text-white hover:bg-white hover:text-ink' : 'border-ink/20 text-ink hover:bg-ink hover:text-white'}`;

  return (
    <section
      className={`fy-hero relative overflow-hidden ${dark ? 'text-white' : 'text-ink'}`}
      style={{ backgroundColor: slide.tone }}
      data-dark={dark}
      aria-labelledby="fy-hero-title"
    >
      <div className="mx-auto grid w-full max-w-[1440px] gap-9 px-5 pb-10 pt-6 sm:px-8 sm:pt-12 lg:min-h-[clamp(540px,calc(100svh-180px),720px)] lg:max-w-[1280px] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12 lg:px-10 lg:py-12">
        <div className="max-w-[620px]">
          {count > 1 && (
            <div className="fy-hero-rise mb-6 flex items-center gap-4 lg:mb-8" style={{ animationDelay: '60ms' }}>
              <div className="flex gap-2">
                <button type="button" onClick={() => step('prev')} aria-label="Previous frame" className={control}>
                  <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </button>
                <button type="button" onClick={() => step('next')} aria-label="Next frame" className={control}>
                  <ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </button>
              </div>
              <div className="flex gap-1.5" role="group" aria-label="Choose a frame">
                {slides.map((item, index) => {
                  const active = index === state.index;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(index, index > state.index ? 'next' : 'prev')}
                      aria-label={`Show frame ${index + 1} of ${count}`}
                      aria-current={active ? 'true' : undefined}
                      className="flex h-10 items-center"
                    >
                      <span className={`relative block h-[2px] w-7 overflow-hidden rounded-full ${dark ? 'bg-white/25' : 'bg-ink/15'}`}>
                        {active && (
                          <span
                            key={state.index}
                            className={`absolute inset-0 ${dark ? 'bg-white' : 'bg-ink'} ${autoplay ? 'fy-hero-progress' : ''}`}
                            style={autoplay ? { animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <h1 id="fy-hero-title" className="fy-display text-[44px] leading-[1.02] sm:text-[60px] lg:text-[clamp(56px,5vw,76px)]">
            <span className="fy-hero-rise block" style={{ animationDelay: '120ms' }}>Your Memories.</span>
            <span className="fy-hero-rise block" style={{ animationDelay: '220ms' }}>Beautifully Framed.</span>
          </h1>

          <p className={`fy-hero-rise mt-5 max-w-[36ch] text-[16px] leading-7 transition-colors duration-500 lg:mt-6 lg:text-[18px] lg:leading-8 ${muted}`} style={{ animationDelay: '320ms' }}>
            Custom frames. Premium quality. A more beautiful way to cherish your memories.
          </p>

          <div className="fy-hero-rise mt-7 grid gap-3 min-[420px]:flex min-[420px]:flex-wrap lg:mt-8" style={{ animationDelay: '420ms' }}>
            <ButtonLink to={STUDIO_PATH} variant={dark ? 'primaryOnDark' : 'primary'} className="w-full min-[420px]:w-auto">
              Customize Your Frame
            </ButtonLink>
            <ButtonLink to="/products" variant={dark ? 'secondaryOnDark' : 'secondary'} className="w-full min-[420px]:w-auto">
              Explore Collection
            </ButtonLink>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="fy-hero-stage"
            data-direction={state.direction}
            role="group"
            aria-roledescription="carousel"
            aria-label="Framed photographs"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
            onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
            onPointerDown={(event) => { pointerStart.current = event.clientX; }}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { pointerStart.current = null; }}
          >
            {slides.map((item, index) => {
              const status = index === state.index ? 'is-active' : index === state.previous ? 'is-leaving' : '';
              return (
                <div
                  key={item.id}
                  className={`fy-hero-slide ${status}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${count}`}
                  aria-hidden={index !== state.index}
                >
                  <SlidePhoto slide={item} priority={index === 0} />
                </div>
              );
            })}
          </div>
          <div key={state.index} className="fy-hero-shadow" aria-hidden="true" />
          <p className={`mt-5 text-center text-[14px] transition-colors duration-500 ${muted}`} aria-live="polite">
            {slide.caption}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
