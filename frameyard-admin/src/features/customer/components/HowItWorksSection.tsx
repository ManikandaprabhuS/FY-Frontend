import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Eye, ImageUp } from 'lucide-react';

import '../styles/how-it-works.css';

type SceneId = 'upload' | 'choose' | 'preview' | 'receive';

interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
  scene: SceneId;
  sceneLabel: string;
}

const howItWorksSteps: HowItWorksStep[] = [
  {
    number: 'Step 1',
    title: 'Upload Your Photo',
    description: 'Choose your favorite memory from your phone or computer and upload it securely to FrameYaad.',
    scene: 'upload',
    sceneLabel: 'A photo being uploaded',
  },
  {
    number: 'Step 2',
    title: 'Choose Your Frame',
    description: 'Browse premium frame styles, colors, sizes, mount options, and glass finishes that match your space.',
    scene: 'choose',
    sceneLabel: 'A frame switching between oak, black and white finishes',
  },
  {
    number: 'Step 3',
    title: 'Preview Before You Order',
    description: 'Instantly preview your uploaded photo inside the selected frame before placing your order.',
    scene: 'preview',
    sceneLabel: 'A photo being fitted inside a frame for preview',
  },
  {
    number: 'Step 4',
    title: 'Receive & Display',
    description: 'Complete your order and receive a beautifully handcrafted frame delivered to your doorstep.',
    scene: 'receive',
    sceneLabel: 'A framed photo rising out of its delivery box onto the wall',
  },
];

const MiniFrame: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`fy-mini-frame ${className}`}>
    <div className="fy-mini-frame__mat"><div className="fy-mini-photo" /></div>
  </div>
);

/** Small animated illustration of each step. Plays on hover/focus, or in view on touch screens. */
const Scene: React.FC<{ id: SceneId }> = ({ id }) => {
  switch (id) {
    case 'upload':
      return (
        <div className="fy-scene__center">
          <div className="fy-s1__zone">
            <ImageUp className="fy-s1__icon h-7 w-7" strokeWidth={1.4} />
            <div className="fy-s1__photo fy-mini-photo" />
          </div>
          <div className="fy-s1__bar"><span /></div>
        </div>
      );
    case 'choose':
      return (
        <>
          <div className="fy-scene__center pb-[9%]"><MiniFrame className="fy-s2__frame" /></div>
          <div className="fy-s2__swatches"><span className="fy-s2__swatch" /><span className="fy-s2__swatch" /><span className="fy-s2__swatch" /></div>
        </>
      );
    case 'preview':
      return (
        <div className="fy-scene__center">
          <div className="fy-s3__frame p-[6%]">
            <div className="relative h-full overflow-hidden bg-[#f4f4f2] px-[10%] pb-[13%] pt-[10%]">
              <div className="h-full overflow-hidden"><div className="fy-mini-photo h-full" /></div>
              <span className="fy-s3__sheen" />
            </div>
          </div>
          <span className="fy-s3__badge"><Eye className="h-3 w-3" strokeWidth={2} />Preview</span>
        </div>
      );
    case 'receive':
      return (
        <div className="fy-s4__wall">
          <MiniFrame className="fy-s4__frame" />
          <div className="fy-s4__box" />
        </div>
      );
  }
};

/** How long each card stays active: one full run of its scene animation. */
const SCENE_MS: Record<SceneId, number> = { upload: 2600, choose: 3600, preview: 2800, receive: 3200 };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const HowItWorksSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  const [sequence] = useState(() => !prefersReducedMotion());

  // Only run the sequence while the section is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !sequence || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [sequence]);

  // Play the cards one after another, looping; a single timer, reset on every change.
  useEffect(() => {
    if (!sequence || !inView || held) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % howItWorksSteps.length),
      SCENE_MS[howItWorksSteps[active].scene],
    );
    return () => window.clearTimeout(timer);
  }, [active, held, inView, sequence]);

  // Hovering a card (mouse only) jumps the sequence to it and holds it there.
  const hold = (index: number) => (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    setActive(index);
    setHeld(true);
  };
  const release = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') setHeld(false);
  };

  return (
    <section ref={sectionRef} className="fy-hiw py-10 lg:py-14" aria-labelledby="fy-hiw-title">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[14px] text-white/55">FrameYaad Experience</p>
          <h2 id="fy-hiw-title" className="fy-display mt-2 text-[36px] leading-[1.05] sm:text-[46px] lg:text-[56px]">
            How FrameYaad Works
          </h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-7 text-white/65 sm:text-[16px]">
            Create your perfect framed memory in just a few simple steps.
          </p>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-5 lg:mt-10 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-3">
          {howItWorksSteps.map((step, index) => (
            <React.Fragment key={step.number}>
              {index > 0 && (
                // The arrow into the active card lights up as the sequence moves on.
                <li aria-hidden="true" className="fy-hiw-arrow flex justify-center sm:hidden lg:flex lg:items-center" data-active={sequence && active === index ? '' : undefined}>
                  <ArrowDown className="h-5 w-5 lg:hidden" strokeWidth={1.5} />
                  <ArrowRight className="hidden h-5 w-5 lg:block" strokeWidth={1.5} />
                </li>
              )}
              <li
                className="fy-step flex flex-col p-3"
                tabIndex={0}
                data-play={sequence && active === index ? '' : undefined}
                onPointerEnter={hold(index)}
                onPointerLeave={release}
              >
                <div className="fy-scene" role="img" aria-label={step.sceneLabel}>
                  <span className="fy-scene__mark fy-scene__mark--tl" />
                  <span className="fy-scene__mark fy-scene__mark--tr" />
                  <span className="fy-scene__mark fy-scene__mark--bl" />
                  <span className="fy-scene__mark fy-scene__mark--br" />
                  <Scene id={step.scene} />
                </div>
                <div className="px-1 pb-1 pt-4">
                  <p className="text-[13px] text-white/50">{step.number}</p>
                  <h3 className="mt-1 text-[18px] font-semibold leading-snug">{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-white/60">{step.description}</p>
                </div>
              </li>
            </React.Fragment>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorksSection;
