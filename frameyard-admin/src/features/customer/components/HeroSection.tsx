import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useProducts from '../../../hooks/useProducts';
import {
  fallbackHeroPhotos as defaultFallbackPhotos,
  HERO_BIRD_OF_PARADISE,
  HERO_MONEY_PLANT,
  HERO_MONSTERA,
  HERO_PLANT,
  wallFrames,
  type HeroPhoto,
} from '../data/heroShowcase';
import { siteMediaService, type HeroVideo } from '../../../services/site-media.service';
import { backendHeroPhotos } from '../utils/heroFrames';
import { useFramePhotosStore } from '../store/framePhotosStore';
import PhotoToggle from './PhotoToggle';
import '../styles/hero.css';

/** A photo inside a frame's opening; it appears when the toggle is on. */
const FramePhoto: React.FC<{ photo: HeroPhoto; visible: boolean; priority: boolean; onBroken: (src: string) => void }> = ({ photo, visible, priority, onBroken }) => {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes="(min-width: 1024px) 230px, 21vw"
      alt={visible ? photo.alt : ''}
      aria-hidden={!visible}
      decoding="async"
      fetchPriority={priority ? 'high' : 'low'}
      draggable={false}
      onError={() => {
        setBroken(true);
        onBroken(photo.src);
      }}
      className="fy-wphoto"
      data-visible={visible}
    />
  );
};

interface HeroSectionProps {
  /** Dummy photos used until the admin marks hero photos. Pass [] once they are no longer wanted. */
  fallbackPhotos?: HeroPhoto[];
}

/**
 * Slide 1 of the hero: a white gallery wall with four frames (black, grey, walnut, red)
 * under track spotlights, a plant on the left and a console with a plant on the right.
 * The toggle lights the frames and shows the photos, or dims the wall and leaves them
 * empty. Photos come from product images the admin marks as hero photos, with dummy
 * photos until there are any.
 */
const FrameWallSlide: React.FC<HeroSectionProps & { replayKey?: number }> = ({ fallbackPhotos = defaultFallbackPhotos, replayKey = 0 }) => {
  const { products } = useProducts(false);
  // Starts off: empty frames first; switching on lights them and reveals the photos.
  // Shared with the collections section: switching here switches every frame on the page.
  const photosOn = useFramePhotosStore((state) => state.photosOn);
  const [brokenUrls, setBrokenUrls] = useState<ReadonlySet<string>>(() => new Set());

  const adminPhotos = useMemo(() => backendHeroPhotos(products, brokenUrls), [brokenUrls, products]);
  // Admin-marked photos win whenever there are any; dummy photos are never mixed in with them.
  const photos = adminPhotos.length > 0 ? adminPhotos : fallbackPhotos;
  const photoSource = adminPhotos.length > 0 ? 'backend' : 'fallback';

  const markBroken = useCallback((src: string) => {
    setBrokenUrls((current) => new Set(current).add(src));
  }, []);

  return (
    <div
      className="fy-wall"
      data-lights={photosOn ? 'on' : 'off'}
      data-photo-source={photoSource}
    >
      {/* The room: window light across the wall, the floor, and the shade when the lights are off. */}
      <span className="fy-wall__window" aria-hidden="true" />
      <span className="fy-wall__floor" aria-hidden="true" />
      <span className="fy-wall__dim" aria-hidden="true" />

      <img className="fy-wall__plant" src={HERO_PLANT} alt="" aria-hidden="true" decoding="async" draggable={false} />
      {/* Desktop only: a tall bird of paradise on the floor each side, and a small monstera in front of the left palm. */}
      <img className="fy-wall__plant fy-wall__plant--extra fy-wall__plant--bird-left" src={HERO_BIRD_OF_PARADISE} alt="" aria-hidden="true" decoding="async" draggable={false} />
      <img className="fy-wall__plant fy-wall__plant--extra fy-wall__plant--monstera-left" src={HERO_MONSTERA} alt="" aria-hidden="true" decoding="async" draggable={false} />
      <img className="fy-wall__plant fy-wall__plant--extra fy-wall__plant--bird-right" src={HERO_BIRD_OF_PARADISE} alt="" aria-hidden="true" decoding="async" draggable={false} />

      <div className="fy-wall__console" aria-hidden="true">
        <img className="fy-wall__console-plant" src={HERO_PLANT} alt="" decoding="async" draggable={false} />
        <img className="fy-wall__console-monstera" src={HERO_MONSTERA} alt="" decoding="async" draggable={false} />
        {/* Desktop: a trailing money plant on the book stack, in place of the palm. */}
        <img className="fy-wall__console-pothos" src={HERO_MONEY_PLANT} alt="" decoding="async" draggable={false} />
        <span className="fy-wall__books">
          <span /><span /><span />
        </span>
        <span className="fy-wall__console-top" />
        <span className="fy-wall__console-body" />
      </div>

      <div className="fy-wall__hang">
        <span className="fy-wall__track" aria-hidden="true" />
        <ul className="fy-wall__frames">
          {wallFrames.map((frame, index) => {
            const photo = photos.length > 0 ? photos[index % photos.length] : null;
            return (
              <li key={frame.id} className="fy-wslot">
                <span className="fy-spot" aria-hidden="true">
                  <span className="fy-spot__head"><span className="fy-spot__lens" /></span>
                </span>
                <span className="fy-spot__beam" aria-hidden="true" />
                <span className="fy-spot__pool" aria-hidden="true" />
                <div className={`fy-wframe fy-wframe--${frame.finish}`} role="img" aria-label={frame.label}>
                  <div className="fy-wframe__mat">
                    <span className="fy-wframe__opening">
                      {photo && (
                        <FramePhoto
                          key={photo.src}
                          photo={photo}
                          visible={photosOn}
                          priority={index < 2}
                          onBroken={photoSource === 'backend' ? markBroken : () => undefined}
                        />
                      )}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="fy-wall__brand">
        {/* Letters rise in one after another, left to right; the tagline then slides up. */}
        <h1 key={`title-${replayKey}`} id="fy-hero-title" className="fy-wall__title" aria-label="FrameYaad">
          {Array.from('FrameYaad', (letter, index) => (
            <span key={index} className="fy-wall__letter" style={{ '--i': index } as React.CSSProperties} aria-hidden="true">{letter}</span>
          ))}
        </h1>
        <p key={`tagline-${replayKey}`} className="fy-wall__tagline">
          <span className="fy-wall__tagline-mask"><span className="fy-wall__tagline-text">Preserve your memories</span></span>
        </p>

        <PhotoToggle />
      </div>
    </div>
  );
};

/** How long each slide shows; the active indicator's ring fills over this time. */
const SLIDE_MS = 5000;
/** A horizontal swipe longer than this changes slide on touch screens. */
const SWIPE_PX = 50;

/**
 * Slide positions: the current slide, the one that just left (and the direction it left
 * in). Each move parks the incoming slide off the side it enters from, then slides it in
 * while the outgoing slide leaves the other way, so it loops endlessly in either
 * direction without duplicating any slide.
 */
type Motion = { current: number; previous: number | null; dir: 1 | -1; /** Times the frame wall has come into view; replays its text animation. */ wallVisits: number };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Slide 2: the video set in the admin (Settings → Homepage). Plays, looping, only while showing. */
const VideoSlide: React.FC<{ video: HeroVideo; playing: boolean; onFailed: () => void }> = ({ video, playing, onFailed }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (playing) {
      element.currentTime = 0;
      element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  }, [playing]);

  return (
    <video
      ref={ref}
      className="fy-hero__video"
      src={video.url}
      muted
      playsInline
      loop
      preload="metadata"
      onError={onFailed}
      aria-label="FrameYaad frames at home"
    />
  );
};

/**
 * The active slide's indicator: a ring that fills clockwise over SLIDE_MS. Its animation
 * is the carousel's only timer: when the fill finishes, the carousel moves on. Pausing
 * freezes the animation where it is (animation-play-state), so it resumes from there.
 * It is keyed by slide, so every slide change starts a fresh ring.
 */
const ProgressRing: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <svg className="fy-hero__ring" viewBox="0 0 20 20" aria-hidden="true">
    <circle className="fy-hero__ring-track" cx="10" cy="10" r="9.15" />
    <circle
      className="fy-hero__ring-fill"
      cx="10"
      cy="10"
      r="9.15"
      pathLength={1}
      onAnimationEnd={(event) => {
        if (event.animationName === 'fy-hero-ring') onComplete();
      }}
    />
  </svg>
);

/**
 * Homepage hero carousel. Slide 1 is the frame wall with its toggle; slide 2 is the
 * homepage video managed in the admin. Without a video it is just the frame wall.
 * Indicators sit at the bottom right: the active slide's ring fills, then the carousel
 * moves on. It pauses while hovered, keyboard-focused, off screen or in a hidden tab;
 * the dots jump to a slide, and swiping works on touch screens.
 */
const HeroSection: React.FC<HeroSectionProps> = (props) => {
  const rootRef = useRef<HTMLElement>(null);
  const [video, setVideo] = useState<HeroVideo | null>(null);
  const [motion, setMotion] = useState<Motion>({ current: 0, previous: null, dir: 1, wallVisits: 0 });
  const motionRef = useRef<Motion>(motion);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  const [reducedMotion] = useState(prefersReducedMotion);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const slideCount = video ? 2 : 1;
  const current = Math.min(motion.current, slideCount - 1);
  const paused = hovered || focused || !inView || !pageVisible;

  // Tells the transparent homepage navbar whether it sits on the light wall or the video.
  useEffect(() => {
    document.documentElement.dataset.heroTone = current === 1 ? 'dark' : 'light';
    return () => { delete document.documentElement.dataset.heroTone; };
  }, [current]);

  useEffect(() => {
    let active = true;
    siteMediaService.getHeroVideo()
      .then((configured) => { if (active) setVideo(configured); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  const goTo = useCallback((to: number, dir: 1 | -1) => {
    const from = Math.min(motionRef.current.current, slideCount - 1);
    if (slideCount < 2 || to === from) return;
    // Park the incoming slide just off the side it enters from, with no transition, and
    // make the browser apply that (reading offsetWidth does). Then let it slide in.
    const incoming = rootRef.current?.querySelector<HTMLElement>(`[data-slide-index="${to}"]`);
    if (incoming) {
      incoming.style.transition = 'none';
      incoming.style.visibility = 'visible';
      incoming.style.transform = `translateX(${dir * 100}%)`;
      void incoming.offsetWidth;
      incoming.style.transition = '';
    }
    const next: Motion = { current: to, previous: from, dir, wallVisits: motionRef.current.wallVisits + (to === 0 ? 1 : 0) };
    motionRef.current = next;
    setMotion(next);
  }, [slideCount]);

  const step = useCallback((dir: 1 | -1) => {
    const from = Math.min(motionRef.current.current, slideCount - 1);
    goTo((from + dir + slideCount) % slideCount, dir);
  }, [goTo, slideCount]);

  const slideStyle = (index: number): React.CSSProperties => {
    if (index === current) return { transform: 'translateX(0)' };
    if (index === motion.previous) return { transform: `translateX(${motion.dir * -100}%)` };
    return { transform: 'translateX(100%)', transition: 'none', visibility: 'hidden' };
  };

  const slideProps = (index: number) => ({
    'data-slide-index': index,
    className: `fy-hero__slide${index === 1 ? ' fy-hero__slide--video' : ''}`,
    style: slideStyle(index),
    role: slideCount > 1 ? 'group' : undefined,
    'aria-roledescription': slideCount > 1 ? 'slide' : undefined,
    'aria-label': slideCount > 1 ? `${index + 1} of ${slideCount}` : undefined,
    'aria-hidden': index !== current || undefined,
    inert: index !== current,
  });

  return (
    <section
      ref={rootRef}
      className="fy-hero"
      aria-labelledby="fy-hero-title"
      aria-roledescription={slideCount > 1 ? 'carousel' : undefined}
      data-slide={current}
      data-paused={paused || undefined}
      style={{ '--fy-slide-ms': `${SLIDE_MS}ms` } as React.CSSProperties}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
      // Only keyboard focus pauses; a tap or click on the toggle or a dot does not.
      onFocus={(event) => { if (event.target.matches(':focus-visible')) setFocused(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onPointerDown={(event) => {
        if (event.pointerType !== 'mouse') swipeStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start || slideCount < 2) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => { swipeStart.current = null; }}
    >
      <div {...slideProps(0)}>
        <FrameWallSlide {...props} replayKey={motion.wallVisits} />
      </div>

      {video && (
        <div {...slideProps(1)}>
          <VideoSlide
            key={video.url}
            video={video}
            playing={current === 1 && inView && pageVisible}
            onFailed={() => setVideo(null)}
          />
        </div>
      )}

      {slideCount > 1 && (
        <div className="fy-hero__dots" data-static={reducedMotion || undefined}>
          {Array.from({ length: slideCount }, (_, index) =>
            index === current ? (
              <button key={index} type="button" className="fy-hero__dot fy-hero__dot--active" aria-label={`Go to slide ${index + 1}`} aria-current="true">
                <ProgressRing key={current} onComplete={() => step(1)} />
              </button>
            ) : (
              <button key={index} type="button" className="fy-hero__dot" aria-label={`Go to slide ${index + 1}`} onClick={() => goTo(index, index > current ? 1 : -1)}>
                <span className="fy-hero__dot-mark" />
              </button>
            ),
          )}
        </div>
      )}
    </section>
  );
};

export default HeroSection;
