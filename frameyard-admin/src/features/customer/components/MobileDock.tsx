import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { dockItems, isActivePath } from '../navigation';

/*
 * Mobile bottom bar with a "liquid" active indicator.
 *
 * The active item sits in an ink bubble seated in a curved notch cut into the
 * bar's top edge. On navigation the bubble lifts out (the notch flattens),
 * arcs across to the new item, and drops in while a new notch forms with a
 * small spring wobble. The bar shape is an SVG path redrawn per frame; the
 * bubble is moved with transforms, so React only re-renders twice per change.
 */

const EDGE = 26; // space above the bar's top edge for the bubble and Customize
const BAR = 60; // bar height below the edge
const LIFT = 26; // how far the bubble rises while travelling
const DURATION = 680;
const FEATURED_INDEX = dockItems.findIndex((item) => item.featured);

type Geometry = { x: number; size: number; depth: number; halfWidth: number };

const geometry = (width: number, index: number): Geometry => {
  const featured = index === FEATURED_INDEX;
  const x = (width * (2 * index + 1)) / (dockItems.length * 2);
  const size = featured ? 54 : 46;
  return {
    x,
    size,
    depth: featured ? 38 : 34,
    // Narrow the notch shoulders for the outer items so the curve never runs off-screen.
    halfWidth: Math.max(size / 2 + 8, Math.min(featured ? 54 : 41, x - 1, width - x - 1)),
  };
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const segment = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
/** Damped spring from 0 to 1 with a single ~12% overshoot. */
const spring = (t: number) => (t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(9 * t));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const barPath = (width: number, x: number, depth: number, halfWidth: number) => {
  const bottom = EDGE + BAR + 2;
  if (depth <= 0.2) return `M0 ${bottom} L0 ${EDGE} L${width} ${EDGE} L${width} ${bottom} Z`;
  const left = Math.max(0, x - halfWidth);
  const right = Math.min(width, x + halfWidth);
  const low = EDGE + depth;
  return [
    `M0 ${bottom} L0 ${EDGE} L${left} ${EDGE}`,
    `C${x - halfWidth * 0.5} ${EDGE} ${x - halfWidth * 0.55} ${low} ${x} ${low}`,
    `C${x + halfWidth * 0.55} ${low} ${x + halfWidth * 0.5} ${EDGE} ${right} ${EDGE}`,
    `L${width} ${EDGE} L${width} ${bottom} Z`,
  ].join(' ');
};

type Frame = { x: number; notch: number; depth: number; halfWidth: number; size: number; lift: number; opacity: number };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SCROLL_DELTA = 8;
const REVEAL_ZONE = 120;

const MobileDock: React.FC<{ routeHidden?: boolean }> = ({ routeHidden = false }) => {
  const { pathname } = useLocation();
  const cartCount = useCustomerCommerceStore((state) => state.cartItems.reduce((total, item) => total + item.quantity, 0));
  const foundIndex = dockItems.findIndex((item) => isActivePath(pathname, item.path));
  const activeIndex = foundIndex === -1 ? null : foundIndex;

  // Seated = the item whose icon is shown inside the bubble (null while travelling).
  const [seated, setSeated] = useState<number | null>(activeIndex);
  const [bubbleItem, setBubbleItem] = useState<number | null>(activeIndex);

  const barRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const widthRef = useRef(0);
  const shownIndex = useRef<number | null>(activeIndex);
  const frameId = useRef(0);

  const draw = useCallback((frame: Frame) => {
    const width = widthRef.current;
    if (!width) return;
    pathRef.current?.setAttribute('d', barPath(width, frame.x, frame.depth * frame.notch, frame.halfWidth));
    const bubble = bubbleRef.current;
    if (bubble) {
      bubble.style.width = `${frame.size}px`;
      bubble.style.height = `${frame.size}px`;
      bubble.style.opacity = String(frame.opacity);
      bubble.style.transform = `translate3d(${frame.x - frame.size / 2}px, ${EDGE + 4 - frame.size / 2 + frame.lift}px, 0)`;
    }
  }, []);

  const drawSettled = useCallback((index: number | null) => {
    const width = widthRef.current;
    if (!width) return;
    if (index === null) {
      draw({ x: width / 2, notch: 0, depth: 0, halfWidth: 46, size: 46, lift: -LIFT, opacity: 0 });
      return;
    }
    const g = geometry(width, index);
    draw({ x: g.x, notch: 1, depth: g.depth, halfWidth: g.halfWidth, size: g.size, lift: 0, opacity: 1 });
  }, [draw]);

  // Measure the bar and redraw when the viewport width changes.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    // Draw synchronously on mount so the first paint already has the right shape.
    widthRef.current = bar.getBoundingClientRect().width;
    drawSettled(shownIndex.current);
    const observer = new ResizeObserver(([entry]) => {
      widthRef.current = entry.contentRect.width;
      if (!frameId.current) drawSettled(shownIndex.current);
    });
    observer.observe(bar);
    return () => observer.disconnect();
  }, [drawSettled]);

  // Animate the bubble whenever the active item changes.
  useEffect(() => {
    const from = shownIndex.current;
    const to = activeIndex;
    if (from === to) return;
    shownIndex.current = to;
    cancelAnimationFrame(frameId.current);

    const width = widthRef.current;
    if (!width || prefersReducedMotion()) {
      frameId.current = requestAnimationFrame(() => {
        frameId.current = 0;
        drawSettled(to);
        setSeated(to);
        setBubbleItem(to);
      });
      return;
    }

    const a = from === null ? null : geometry(width, from);
    const b = to === null ? null : geometry(width, to);
    let start = 0;
    let landed = false;

    const tick = (now: number) => {
      if (!start) {
        start = now;
        setSeated(null);
      }
      const t = clamp01((now - start) / DURATION);

      const rise = easeOut(segment(t, 0, 0.3));
      const fall = spring(segment(t, 0.62, 1));
      const travel = easeInOut(segment(t, 0.18, 0.7));

      const x = a && b ? mix(a.x, b.x, travel) : (b ?? a)!.x;
      const size = a && b ? mix(a.size, b.size, travel) : (b ?? a)!.size;
      const leaving = t < 0.62;
      const notchShape = leaving ? (a ?? b)! : (b ?? a)!;
      const notch = leaving ? (a ? 1 - rise : 0) : (b ? fall : 0);
      const lift = leaving ? -LIFT * (a ? rise : 1) : -LIFT * (b ? 1 - fall : 1);
      const opacity = a && b ? 1 : a ? 1 - segment(t, 0.3, 0.6) : segment(t, 0.35, 0.62);

      draw({ x, notch, depth: notchShape.depth, halfWidth: notchShape.halfWidth, size, lift, opacity });

      if (!landed && t >= 0.62) {
        landed = true;
        setSeated(to);
        if (to !== null) setBubbleItem(to);
      }

      if (t < 1) {
        frameId.current = requestAnimationFrame(tick);
      } else {
        frameId.current = 0;
        drawSettled(to);
      }
    };

    frameId.current = requestAnimationFrame(tick);
  }, [activeIndex, draw, drawSettled]);

  useEffect(() => () => cancelAnimationFrame(frameId.current), []);

  // Slide away while scrolling down; return on scroll up or on a new page.
  const [hiddenOnPath, setHiddenOnPath] = useState<string | null>(null);
  const scrollHidden = hiddenOnPath === pathname;
  const lastY = useRef(0);
  const currentPath = useRef(pathname);

  useEffect(() => {
    currentPath.current = pathname;
    lastY.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y < REVEAL_ZONE || delta < -SCROLL_DELTA) setHiddenOnPath(null);
        else if (delta > SCROLL_DELTA) setHiddenOnPath(currentPath.current);
        if (Math.abs(delta) > SCROLL_DELTA) lastY.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const hidden = routeHidden || scrollHidden;
  const BubbleIcon = bubbleItem === null ? null : dockItems[bubbleItem].icon;
  const featuredSeated = seated === FEATURED_INDEX;

  return (
    <div className="fy-dock-enter fixed inset-x-0 bottom-0 z-[90] lg:hidden">
      <nav
        aria-label="Quick navigation"
        aria-hidden={routeHidden || undefined}
        inert={routeHidden}
        className={`transition-transform duration-500 ease-[var(--fy-ease-out)] ${hidden ? 'pointer-events-none translate-y-[calc(100%+12px)]' : 'translate-y-0'}`}
      >
        <div ref={barRef} className="relative" style={{ height: EDGE + BAR }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_-6px_18px_rgba(17,17,17,0.08)]" aria-hidden="true">
            <path ref={pathRef} fill="#ffffff" stroke="var(--color-rule)" strokeWidth="1" />
          </svg>

          {/* Customize: permanently raised in the centre; the bubble fills it when active. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border-[1.5px] border-ink bg-white text-ink shadow-[0_6px_16px_rgba(17,17,17,0.12)] transition-[opacity,transform] duration-300 ${featuredSeated ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
            style={{ top: EDGE - 2 - 28 }}
          >
            {React.createElement(dockItems[FEATURED_INDEX].icon, { className: 'h-[22px] w-[22px]', strokeWidth: 1.6 })}
          </span>

          <span ref={bubbleRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 grid place-items-center rounded-full bg-ink text-white opacity-0 shadow-[0_8px_18px_rgba(17,17,17,0.25)] ring-[3px] ring-white">
            {BubbleIcon && (
              <span className={`relative transition-opacity duration-150 ${seated === null ? 'opacity-0' : 'opacity-100'}`}>
                <BubbleIcon className="h-[21px] w-[21px]" strokeWidth={1.7} />
                {dockItems[bubbleItem!].showsCartCount && cartCount > 0 && <CountBadge count={cartCount} inverted />}
              </span>
            )}
          </span>

          <ul className="absolute inset-x-0 bottom-0 grid grid-cols-5" style={{ height: BAR }}>
            {dockItems.map((item, index) => {
              const Icon = item.icon;
              const isSeated = seated === index;
              const isActive = activeIndex === index;
              return (
                <li key={item.path} className="relative">
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    aria-label={item.showsCartCount && cartCount > 0 ? `${item.name}, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : item.name}
                    aria-current={isActive ? 'page' : undefined}
                    className={`absolute inset-x-0 bottom-0 flex flex-col items-center rounded-xl text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ink ${item.featured ? '-top-8' : 'top-0'}`}
                  >
                    {!item.featured && (
                      <span className={`relative mt-[13px] transition-[opacity,transform] duration-200 ${isSeated ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}>
                        <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden="true" />
                        {item.showsCartCount && cartCount > 0 && <CountBadge count={cartCount} />}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-[9px] text-[11px] font-medium leading-none transition-[opacity,transform] duration-300 ${item.featured || isSeated ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
                    >
                      {item.name}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="bg-white" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </div>
  );
};

const CountBadge: React.FC<{ count: number; inverted?: boolean }> = ({ count, inverted = false }) => (
  <span
    key={count}
    className={`absolute -right-2.5 -top-2 grid h-[17px] min-w-[17px] animate-[fy-badge-pop_500ms_var(--fy-ease-spring)] place-items-center rounded-full px-1 text-[10px] font-semibold leading-none ${inverted ? 'bg-white text-ink' : 'bg-ink text-white'}`}
  >
    {count > 99 ? '99+' : count}
  </span>
);

export default MobileDock;
