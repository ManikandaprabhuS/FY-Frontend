import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export type GallerySlide = {
  key: string;
  /** Read by screen readers as the slide's name, e.g. "Your frame" or "Photo 2 of 5". */
  label: string;
  content: React.ReactNode;
  thumb: React.ReactNode;
};

type ProductGalleryProps = {
  slides: GallerySlide[];
  /** Change `token` to slide to `index` (e.g. after an upload or an option change). */
  jump?: { index: number; token: number };
};

/**
 * The product gallery: a horizontal track that snaps slide to slide. Touch and trackpad swipe
 * come from native scrolling; arrows, thumbnails and the keyboard (← →) move it too. A
 * segmented bar along the top shows where you are. The thumbnails live in a dropdown under
 * the image, closed by default, so the frame image stands alone.
 */
const ProductGallery = ({ slides, jump }: ProductGalleryProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const count = slides.length;

  const goTo = useCallback((next: number, smooth = true) => {
    const track = trackRef.current;
    if (!track || count === 0) return;
    const target = Math.max(0, Math.min(count - 1, next));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: target * track.clientWidth, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }, [count]);

  // The index follows the scroll position (swipes included), once per frame.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (jump) goTo(jump.index);
  }, [jump, goTo]);

  // Mouse and pen drag (touch already swipes natively): follow the pointer, then settle on
  // the next or previous slide once the drag passes a short threshold.
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const track = trackRef.current;
    if (!state || !track || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) > 6) {
      state.moved = true;
      track.setPointerCapture(event.pointerId);
      track.style.scrollSnapType = 'none';
    }
    if (state.moved) track.scrollLeft = state.left - dx;
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const track = trackRef.current;
    drag.current = null;
    if (!state || !track || !state.moved) return;
    track.style.scrollSnapType = '';
    const start = Math.round(state.left / Math.max(1, track.clientWidth));
    const dx = event.clientX - state.x;
    const threshold = track.clientWidth * 0.15;
    goTo(dx < -threshold ? start + 1 : dx > threshold ? start - 1 : start);
    // A drag isn't a tap: swallow the click that follows it.
    const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault(); };
    track.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => track.removeEventListener('click', swallow, { capture: true }), 0);
  };

  if (count === 0) return null;
  const current = Math.min(index, count - 1);

  return (
    <div className="fy-gallery" aria-roledescription="carousel" aria-label="Product images">
      <div className="fy-gallery__stage">
        {count > 1 && (
          <div className="fy-gallery__progress" aria-hidden="true">
            {slides.map((slide, position) => <span key={slide.key} data-on={position === current || undefined} />)}
          </div>
        )}

        <div
          ref={trackRef}
          className="fy-gallery__track"
          tabIndex={0}
          aria-label="Swipe or use the arrow keys to see more images"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current + 1); }
            if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current - 1); }
          }}
        >
          {slides.map((slide, position) => (
            <div
              key={slide.key}
              className="fy-gallery__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={slide.label}
              aria-hidden={position !== current}
              data-active={position === current || undefined}
            >
              {slide.content}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" className="fy-gallery__arrow fy-gallery__arrow--prev" aria-label="Previous image" disabled={current === 0} onClick={() => goTo(current - 1)}>
              <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <button type="button" className="fy-gallery__arrow fy-gallery__arrow--next" aria-label="Next image" disabled={current === count - 1} onClick={() => goTo(current + 1)}>
              <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <p className="fy-gallery__count" aria-live="polite">{current + 1} / {count}</p>
          </>
        )}
      </div>

      {/* All frames: a dropdown under the image, closed by default. */}
      {count > 1 && (
        <div className="fy-gallery__drawer" data-open={thumbsOpen || undefined}>
          <button
            type="button"
            className="fy-gallery__toggle"
            aria-expanded={thumbsOpen}
            aria-controls="fy-gallery-thumbs"
            onClick={() => setThumbsOpen((open) => !open)}
          >
            <span>All frames</span>
            <span className="fy-gallery__toggle-count">{count}</span>
            <ChevronDown className="fy-gallery__toggle-icon h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="fy-gallery__panel" id="fy-gallery-thumbs" inert={!thumbsOpen || undefined}>
            <div className="fy-gallery__panel-inner">
              <div className="fy-gallery__thumbs">
                {slides.map((slide, position) => (
                  <button
                    key={slide.key}
                    type="button"
                    className="fy-gallery__thumb"
                    aria-label={`Show ${slide.label}`}
                    aria-current={position === current || undefined}
                    onClick={() => goTo(position)}
                  >
                    {slide.thumb}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
