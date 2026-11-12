import React, { useEffect, useRef, useState } from 'react';
import { Check, Truck as TruckIcon } from 'lucide-react';

import { fallbackHeroPhotos } from '../data/heroShowcase';
import '../styles/photo-to-frame.css';

const steps = [
  { title: 'Choose your frame', detail: 'Select the frame style and size that suit your wall.' },
  { title: 'Your photo', detail: 'Choose your favourite memory and add it to the frame.' },
  { title: 'Made for your home', detail: 'Preview your personalised frame, then place your order.' },
];

/** Four finishes (the hero's black, walnut and grey, plus sandal gold); the empty frame tries them on in step one. */
const finishes = ['black', 'walnut', 'grey', 'sandal'] as const;

/** How long each step stays before the story moves on (the progress bar fills over it). */
const STEP_MS = 4200;
/** Step three runs longer: the framed photo is shown, packed, and driven away. */
const SHIP_MS = 6400;
/** How often the empty frame changes finish while it is being "chosen". */
const FINISH_MS = 900;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Homepage "How it works": one frame, three moments. A single stage tells the story while
 * a slim step list drives it. Step one: a bare frame tries on finishes, with size guides
 * around it. Step two: a phone slides in and the chosen photo flies from its screen into
 * the mount. Step three: the finished piece hangs on a lit wall, then
 * is packed in a box and driven away on a truck.
 * The story plays on its own while on screen (pausing on hover), and each step can be
 * picked directly.
 */
const PhotoToFrameSection: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [finish, setFinish] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion] = useState(prefersReducedMotion);
  const paused = hovered || !inView;

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Step one: the empty frame tries on each finish in turn.
  useEffect(() => {
    if (step !== 0 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setFinish((current) => (current + 1) % finishes.length), FINISH_MS);
    return () => window.clearInterval(timer);
  }, [step, paused, reducedMotion]);

  const next = () => setStep((current) => (current + 1) % steps.length);
  const photos = fallbackHeroPhotos;

  return (
    <section
      ref={ref}
      className="fy-story mx-auto w-full max-w-[1440px] px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 lg:px-10 lg:pb-3 lg:pt-8"
      aria-labelledby="fy-story-title"
      data-paused={paused || undefined}
      data-static={reducedMotion || undefined}
      style={{ '--step-ms': `${STEP_MS}ms`, '--ship-ms': `${SHIP_MS}ms` } as React.CSSProperties}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
    >
      <div className="fy-story__layout">
        <div className="fy-story__intro">
          <p className="fy-story__eyebrow">How it works</p>
          <h2 id="fy-story-title" className="fy-story__title">From photo to frame</h2>
          <p className="fy-story__lead">One memory, three moments.</p>

          <ol className="fy-story__steps">
            {steps.map((item, index) => {
              const active = index === step;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    className="fy-story__step"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => setStep(index)}
                  >
                    <span className="fy-story__num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="fy-story__step-text">
                      <span className="fy-story__step-title">{item.title}</span>
                      <span className="fy-story__step-detail"><span>{item.detail}</span></span>
                    </span>
                    <span className="fy-story__progress" aria-hidden="true">
                      {active && <span key={step} className="fy-story__fill" data-long={index === 2 || undefined} onAnimationEnd={next} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* The stage: one frame becoming a framed memory. */}
        <div className="fy-story__stage" data-step={step} aria-hidden="true">
          <span className="fy-story__glow" />
          <span className="fy-story__floor" />

          <div className={`fy-story__frame fy-story__frame--${finishes[finish]}`}>
            <span className="fy-story__mat">
              <span className="fy-story__opening">
                <span className="fy-story__plus" />
                <img className="fy-story__photo" src={photos[0].src} srcSet={photos[0].srcSet} sizes="(min-width: 1024px) 220px, 40vw" alt="" decoding="async" loading="lazy" draggable={false} />
              </span>
            </span>

            {/* Step one: size guides along two sides. */}
            <span className="fy-story__dim fy-story__dim--w"><span>12 in</span></span>
            <span className="fy-story__dim fy-story__dim--h"><span>16 in</span></span>
          </div>

          {/* Step one: the finishes being tried on. */}
          <span className="fy-story__swatches">
            {finishes.map((name, index) => (
              <span key={name} className={`fy-story__swatch fy-story__swatch--${name}`} data-on={index === finish || undefined} />
            ))}
          </span>

          {/* Step two: the phone the photo comes from. */}
          <span className="fy-story__phone">
            <span className="fy-story__screen">
              {photos.slice(0, 4).map((photo, index) => (
                <img key={photo.src} src={photo.src} alt="" decoding="async" loading="lazy" draggable={false} data-picked={index === 0 || undefined} />
              ))}
            </span>
          </span>

          {/* Step three: shown, then packed in a box... */}
          <span className="fy-story__box">
            <span className="fy-story__box-tape" />
            <span className="fy-story__box-label">FrameYaad</span>
          </span>

          {/* ...and driven away. */}
          <svg className="fy-story__truck" viewBox="0 0 170 74" fill="none">
            <rect x="4" y="40" width="108" height="9" rx="2" fill="#111111" />
            <path d="M112 49V22a6 6 0 0 1 6-6h22a6 6 0 0 1 5 2.7l12 18a6 6 0 0 1 1 3.3V49z" fill="#111111" />
            <path d="M121 22h17l9 13h-26z" fill="#ffffff" fillOpacity="0.9" />
            <rect x="0" y="48" width="162" height="6" rx="3" fill="#2a2a2a" />
            <circle cx="30" cy="58" r="10" fill="#111111" />
            <circle cx="30" cy="58" r="4" fill="#d9d6d0" />
            <circle cx="138" cy="58" r="10" fill="#111111" />
            <circle cx="138" cy="58" r="4" fill="#d9d6d0" />
          </svg>

          <span className="fy-story__tag fy-story__tag--ready">
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
            Ready to order
          </span>
          <span className="fy-story__tag fy-story__tag--shipped">
            <TruckIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
            Packed &amp; shipped
          </span>
        </div>
      </div>
    </section>
  );
};

export default PhotoToFrameSection;
