import React, { useEffect, useRef, useState } from 'react';
import { Check, Truck as TruckIcon } from 'lucide-react';

import { fallbackHeroPhotos } from '../data/heroShowcase';
import '../styles/photo-to-frame.css';
import {MOTION_TIMING,prefersReducedMotion,isIOSWebKit} from '../animationConfig';

const steps = [
  { title: 'Choose your frame', detail: 'Select the frame style and size that suit your wall.' },
  { title: 'Your photo', detail: 'Choose your favourite memory and add it to the frame.' },
  { title: 'Made for your home', detail: 'Preview your personalised frame, then place your order.' },
];

/** Four finishes (the hero's black, walnut and grey, plus sandal gold); the empty frame tries them on in step one. */
const finishes = ['black', 'walnut', 'grey', 'sandal'] as const;

const STEP_MS=MOTION_TIMING.storyStep,SHIP_MS=MOTION_TIMING.storyShip,FINISH_MS=MOTION_TIMING.storyFinish;

/**
 * Homepage "How it works": one frame, three moments. A single stage tells the story while
 * a slim step list drives it. Step one: a bare frame tries on finishes, with size guides
 * around it. Step two: a phone slides in and the chosen photo flies from its screen into
 * the mount. Step three: the finished piece hangs on a lit wall, then
 * is packed in a box and driven away on a truck.
 * The story loops on its own, continuously, whenever it is on screen. Hovering never pauses
 * it; it only rests while scrolled out of view, so it does not run unseen. Each step can
 * still be picked directly.
 */
const PhotoToFrameSection: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [finish, setFinish] = useState(0);
  const [inView, setInView] = useState(()=>typeof IntersectionObserver==='undefined');
  const [reducedMotion] = useState(prefersReducedMotion);
  const paused = !inView;

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    if(typeof IntersectionObserver==='undefined')return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Keep stage geometry in measured pixels, including WebKit versions with partial
  // container-unit animation support. ResizeObserver keeps rotation/resizing accurate.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure=()=>{
      const {width:w,height:h}=stage.getBoundingClientRect();
      if(!w||!h)return;
      stage.style.setProperty('--u',w/100+'px');
      if(isIOSWebKit()){
        const mobile=window.matchMedia('(max-width: 639.98px)').matches;
        const bedW=(mobile?.15:.13)*w,bedH=(mobile?.115:.10)*w;
        const boxW=(mobile?.48:.40)*w,boxH=(mobile?.70:.82)*h;
        const dx=((mobile?.26:.30)-(mobile?.335:.345))*w;
        const dy=-((mobile?.26:.14)*h-(.02*h+.066*w));
        stage.style.setProperty('--pack-dx',dx+'px');stage.style.setProperty('--pack-dy',dy+'px');
        stage.style.setProperty('--pack-sx',String(boxW/bedW));stage.style.setProperty('--pack-sy',String(boxH/bedH));
      }
    };
    measure();
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    observer?.observe(stage);window.addEventListener('resize',measure,{passive:true});
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};  }, []);

  // Step one: the empty frame tries on each finish in turn.
  useEffect(() => {
    if (step !== 0 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setFinish((current) => (current + 1) % finishes.length), FINISH_MS);
    return () => window.clearInterval(timer);
  }, [step, paused, reducedMotion]);

  useEffect(()=>{
    if(!isIOSWebKit()||paused||reducedMotion)return;
    const timer=window.setTimeout(()=>setStep(current=>(current+1)%steps.length),step===2?SHIP_MS:STEP_MS);
    return()=>window.clearTimeout(timer);
  },[step,paused,reducedMotion]);
  const next = () => setStep((current) => (current + 1) % steps.length);
  const photos = fallbackHeroPhotos;

  return (
    <section
      ref={ref}
      className="fy-story mx-auto w-full max-w-[1440px] px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 lg:px-10 lg:pb-3 lg:pt-8"
      aria-labelledby="fy-story-title"
      data-paused={paused || undefined}
      data-static={reducedMotion || undefined}
      data-ios-motion={isIOSWebKit() || undefined}
      style={{ '--step-ms': `${STEP_MS}ms`, '--ship-ms': `${SHIP_MS}ms` } as React.CSSProperties}
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
                      {active && <span key={step} className="fy-story__fill" data-long={index === 2 || undefined} data-motion-timer onAnimationEnd={(event) => { if (!isIOSWebKit() && event.animationName === 'fy-story-fill') next(); }} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* The stage: one frame becoming a framed memory. */}
        <div ref={stageRef} className="fy-story__stage" data-step={step} aria-hidden="true">
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
