export const MOTION_TIMING={
 cartWalk:950,cartAdded:1500,
 dockDefault:680,dockIOS:400,dockSlideDefault:500,dockSlideIOS:400,
} as const;
export const IOS_MOTION_EASE="cubic-bezier(0.32, 0.72, 0, 1)";
export const prefersReducedMotion=()=>typeof window!=="undefined"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches===true;
export const supportsScrollTimeline=()=>typeof CSS!=="undefined"&&CSS.supports?.("animation-timeline","scroll()")===true;
export const isIOSWebKit=()=>typeof navigator!=="undefined"&&(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1));
export const clampScrollPosition=(value:number,max:number)=>Math.min(Math.max(0,max),Math.max(0,Number.isFinite(value)?value:0));
