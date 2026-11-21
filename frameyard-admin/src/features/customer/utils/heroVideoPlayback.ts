export const HERO_VIDEO_TIMEOUTS = { firstStart: 4000, laterStart: 2000, stall: 3000, bufferPreference: 750 } as const;
export type HeroVideoState = { loading: boolean; visible: boolean; duration: number; bufferedEnd: number; progress: number };
type FinishReason = 'ended' | 'start-timeout' | 'stall-timeout' | 'blocked' | 'error';
type Clock = { setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>; clearTimeout: (id: ReturnType<typeof setTimeout>) => void };
export const heroIntersectsViewport = (rect: {top:number;bottom:number;left:number;right:number;width:number;height:number}, width:number, height:number) => rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<height&&rect.right>0&&rect.left<width;

/** One active visit owns its listeners, play request and deadlines. No carousel timer. */
export function createHeroVideoPlayback(video: HTMLVideoElement, options: {
  active: boolean;
  startupMs: number;
  onState: (state: HeroVideoState) => void;
  onComplete: (reason: FinishReason) => void;
  touchTarget?: EventTarget;
  canStart?: () => boolean;
  clock?: Clock;
}) {
  // WebKit requires Window as the native timer receiver; do not store bare methods.
  const clock: Clock = options.clock ?? { setTimeout: (callback, delay) => setTimeout(callback, delay), clearTimeout: (id) => clearTimeout(id) };
  let disposed = false, completed = false, started = false, pending = false, blocked = false, through = false, allowPartial = false, touched = false;
  let visibilityWait: ReturnType<typeof setTimeout> | undefined;
  let startup: ReturnType<typeof setTimeout> | undefined, stall: ReturnType<typeof setTimeout> | undefined, bufferWait: ReturnType<typeof setTimeout> | undefined, watchdog: ReturnType<typeof setTimeout> | undefined;
  let lastTime = 0;
  const state: HeroVideoState = { loading: options.active, visible: false, duration: 0, bufferedEnd: 0, progress: 0 };
  const live = () => options.active && !disposed && !completed;
  const emit = () => { if (!disposed) options.onState({ ...state }); };
  const clear = () => { if (visibilityWait !== undefined) clock.clearTimeout(visibilityWait); visibilityWait = undefined; if (startup !== undefined) clock.clearTimeout(startup); if (stall !== undefined) clock.clearTimeout(stall); if (bufferWait !== undefined) clock.clearTimeout(bufferWait); if (watchdog !== undefined) clock.clearTimeout(watchdog); startup = stall = bufferWait = watchdog = undefined; };
  const measure = () => {
    state.duration = Number.isFinite(video.duration) ? video.duration : 0;
    const buffered = video.buffered;
    state.bufferedEnd = buffered.length ? buffered.end(buffered.length - 1) : 0;
    state.progress = started && state.duration ? Math.min(1, Math.max(0, video.currentTime / state.duration)) : 0;
  };
  const reset = () => { video.pause(); try { if (video.currentTime !== 0) video.currentTime = 0; } catch { /* Metadata may not exist yet; loadedmetadata retries. */ } };
  const finish = (reason: FinishReason) => {
    if (!live()) return;
    completed = true; clear(); state.loading = false; state.visible = false; emit(); video.dispatchEvent(new CustomEvent('fyhero:finish',{detail:reason})); video.pause(); options.onComplete(reason);
  };
  const rejected = (error: unknown) => {
    if (!live()) return;
    video.dispatchEvent(new CustomEvent('fyhero:play-rejected',{detail:(error as {name?:string})?.name??'play error'}));
    if ((error as { name?: string })?.name === 'NotAllowedError') { blocked = true; state.loading = false; state.visible = false; emit(); }
  };
  const watchProgress = () => {
    if (watchdog !== undefined) clock.clearTimeout(watchdog);
    lastTime = state.duration > 0 ? Math.min(video.currentTime, state.duration) : video.currentTime;
    watchdog = clock.setTimeout(() => {
      watchdog = undefined;
      if (!live() || !started) return;
      const time = state.duration > 0 ? Math.min(video.currentTime, state.duration) : video.currentTime;
      if (time > lastTime + 0.02 && !video.paused) watchProgress();
      else finish('stall-timeout');
    }, HERO_VIDEO_TIMEOUTS.stall);
  };
  const attempt = (gesture = false) => {
    if (!live() || pending || (!video.paused && !video.ended)) return;
    if (blocked && !gesture) return;
    // Wait for the incoming slide to actually intersect the viewport. Readiness
    // alone is insufficient while the carousel still parks the slide offscreen.
    if (options.canStart && !options.canStart()) {
      if (visibilityWait === undefined) visibilityWait = clock.setTimeout(() => { visibilityWait = undefined; attempt(gesture); }, 50);
      return;
    }
    // Source assignment/load() initiates loading. Do not call play before canplay.
    if (video.readyState < 3) return;
    // Short clips prefer canplaythrough; the same startup deadline bounds this wait.
    if (!gesture && state.duration > 0 && state.duration <= 15 && !through && !allowPartial && video.readyState < 4 && state.bufferedEnd < state.duration - 0.05) {
      if (video.readyState >= 2 && bufferWait === undefined) bufferWait = clock.setTimeout(() => { bufferWait = undefined; allowPartial = true; attempt(); }, HERO_VIDEO_TIMEOUTS.bufferPreference);
      return;
    }
    video.muted = true; video.defaultMuted = true; video.setAttribute('muted', '');
    video.autoplay = true; video.setAttribute('autoplay', '');
    pending = true;
    try {
      // Transient readiness/Abort errors can retry at canplay or the next touch.
      Promise.resolve(video.play()).catch(rejected).finally(() => { pending = false; });
    } catch (error) { pending = false; rejected(error); }
  };
  const ready = () => { measure(); emit(); attempt(); };
  const metadata = () => { if (options.active && !started && video.currentTime !== 0) { try { video.currentTime = 0; } catch { /* not seekable yet */ } } ready(); };
  const canPlayThrough = () => { through = true; ready(); };
  const playing = () => {
    if (!live()) { video.pause(); return; }
    started = true; blocked = false; clear(); state.loading = false; state.visible = true; measure(); emit(); watchProgress();
  };
  const waiting = () => {
    if (!live() || !started) return;
    state.loading = true; state.visible = false; measure(); emit();
    // Repeated waiting/progress events must not extend an existing stall deadline.
    if (stall === undefined) stall = clock.setTimeout(() => finish('stall-timeout'), HERO_VIDEO_TIMEOUTS.stall);
  };
  const paused = () => { if (live() && started && video.paused && !video.ended) waiting(); };
  const ended = () => { if (video.ended) finish('ended'); };
  const error = () => finish('error');
  const progress = () => {
    // Only the native ended listener completes a pass. A missing event is a bounded failure.
    const time = state.duration > 0 ? Math.min(video.currentTime, state.duration) : video.currentTime;
    if (live() && started && !video.paused && time > lastTime + 0.02) {
      // A stalled download is not a stalled picture while buffered frames still advance.
      if (stall !== undefined) { clock.clearTimeout(stall); stall = undefined; state.loading = false; state.visible = true; }
      watchProgress();
    }
    measure(); emit();
  };
  const touch = () => { if (live() && !touched) { touched = true; attempt(true); } };
  const listeners: [string, EventListener][] = [['loadedmetadata', metadata], ['canplay', ready], ['canplaythrough', canPlayThrough], ['playing', playing], ['waiting', waiting], ['stalled', waiting], ['pause', paused], ['ended', ended], ['error', error], ['progress', progress], ['timeupdate', progress]];
  video.muted = true; video.defaultMuted = true; video.setAttribute('muted', '');
  video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
  video.loop = false; video.removeAttribute?.('loop');
  if (!options.active) { video.autoplay = false; video.removeAttribute?.('autoplay'); }
  reset(); measure(); emit();
  for (const [name, listener] of listeners) video.addEventListener(name, listener);
  options.touchTarget?.addEventListener('pointerdown', touch, { passive: true });
  if (options.active) {
    startup = clock.setTimeout(() => finish(blocked ? 'blocked' : 'start-timeout'), options.startupMs);
    attempt();
  }
  return () => {
    disposed = true; clear();
    for (const [name, listener] of listeners) video.removeEventListener(name, listener);
    options.touchTarget?.removeEventListener('pointerdown', touch);
    video.autoplay = false; video.removeAttribute?.('autoplay');
    reset();
  };
}
