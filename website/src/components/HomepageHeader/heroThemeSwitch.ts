/* Hero theme switch choreography (artifacts/handoff/hero-launch-landing-spec.md).
 * Desktop: WAAPI timelines over whole SVG layers plus a light actor overlay.
 * Mobile (≤640px): View Transition circle reveal from the top centre.
 * Every animation is cancelled at the end, so the static plate is the end
 * state and nothing has to be swapped back by hand. */
import {AXIS_DECADE, CRAFT, HERO_ANCHORS} from '@site/src/components/VisualStudy';
import {heroSwitchState, setHeroSwitchHandler} from '@site/src/utils/heroSwitchHook';

import {ALT_EASE, bezier, driveAltimeter} from './altimeterDriver';
import {createPlateCache, type PlateCache, type PlateName} from './heroPlateCache';

type Direction = 'launch' | 'landing';
type Mode = 'desktop' | 'mobile';
type Key = Record<string, string | number | undefined> & {at: number};
type Target = Element | null | undefined;
type ViewTransitionLike = {ready: Promise<void>; finished: Promise<void>};
type VTDocument = {startViewTransition?: (update: () => void) => ViewTransitionLike};

/* Both directions share one length. Landing spends its first ~400ms winding
 * the orbit back into the satellite before the day disc opens. */
const LAUNCH_MS = 1200;
const LANDING_MS = 1200;
const LAUNCH_FLIP_MS = 700;
const LANDING_FLIP_MS = 600;
/** Altimeter number lands (and the axis ladder stops) at these times. */
const LAUNCH_LAND_MS = 1060;
const LANDING_LAND_MS = 1000;
/** Ladder travel from 325 m to 799,000 km in decade units. */
const LADDER_SPAN = AXIS_DECADE * Math.log10(799_000_000 / 325);
const REST_READING_OPACITY = 0.42;
/** Night plate stays pre-mounted this long after the pointer/focus leaves. */
const PRIME_RELEASE_MS = 1500;
const MOBILE_FADE_MS = 180;
const MOBILE_REVEAL_MS = 600;
const WATCHDOG_PAD_MS = 400;
const MOBILE_MAX_WIDTH = 640;
const TOGGLE_SELECTOR = '[class*="colorModeToggle"] button';

const EASE_IO = 'cubic-bezier(.65,0,.35,1)';
const EASE_POP = 'cubic-bezier(.2,.8,.2,1)';
const EASE_ACCEL = 'cubic-bezier(.55,0,1,.45)';

/** Craft link pivots (viewBox units; night SVG elements use transform-box: view-box).
 * The slant line scales about the white star, the marker about itself. */
const CRAFT_ORIGIN = `${HERO_ANCHORS.star.x}px ${HERO_ANCHORS.star.y}px`;
const CRAFT_MARK_ORIGIN = `${CRAFT.x}px ${CRAFT.y}px`;

/** Shared clock: every animation spans the whole switch so offsets line up. */
class Timeline {
  readonly anims: Animation[] = [];

  constructor(readonly total: number) {}

  add(el: Target, keys: Key[], pseudoElement?: string): void {
    if (!el || keys.length === 0) return;
    // Offsets are clamped to be non-decreasing: a staggered key that runs
    // past a later fixed key would otherwise make animate() throw.
    let floor = 0;
    const frames: Keyframe[] = keys.map(({at, easing, ...props}) => {
      floor = Math.max(floor, Math.min(1, Math.max(0, at / this.total)));
      return {...props, offset: floor, ...(easing ? {easing: String(easing)} : {})};
    });
    // Hold the first / last values across the rest of the clock.
    if (frames[0].offset !== 0) frames.unshift({...frames[0], offset: 0, easing: 'linear'});
    const last = frames[frames.length - 1];
    if (last.offset !== 1) frames.push({...last, offset: 1});
    this.anims.push(el.animate(frames, {duration: this.total, fill: 'both', ...(pseudoElement ? {pseudoElement} : {})}));
  }

  each(list: ArrayLike<Element>, keys: (index: number, el: Element) => Key[]): void {
    for (let i = 0; i < list.length; i += 1) this.add(list[i], keys(i, list[i]));
  }

  cancel(): void {
    for (const anim of this.anims) anim.cancel();
    this.anims.length = 0;
  }
}

/* Plate geometry: viewBox 1440x900, preserveAspectRatio xMidYMin slice. */
type Geometry = {w: number; h: number; s: number; ox: number};
type Point = [number, number];

function measure(art: HTMLElement): Geometry {
  const w = art.clientWidth;
  const h = art.clientHeight;
  const s = Math.max(w / 1440, h / 900);
  return {w, h, s, ox: (w - 1440 * s) / 2};
}

const toPx = (g: Geometry, x: number, y: number): Point => [g.ox + x * g.s, y * g.s];
const farthest = (g: Geometry, [x, y]: Point) => Math.hypot(Math.max(x, g.w - x), Math.max(y, g.h - y));
const n = (v: number) => v.toFixed(2);
const clip = (r: number, [x, y]: Point) => `circle(${n(r)}px at ${n(x)}px ${n(y)}px)`;
/** The colour layer is a 200px disc; place its centre at p with radius r. */
const disc = (r: number, [x, y]: Point) =>
  `translate(${n(x - 100)}px, ${n(y - 100)}px) scale(${(Math.max(r, 0.01) / 100).toFixed(4)})`;
/** Actor transforms are in viewBox units (transform-box: view-box). */
const move = (x: number, y: number, scale = 1) => `translate(${n(x)}px, ${n(y)}px) scale(${scale})`;
const shift = (x: number, y: number) => `translate(${n(x)}px, ${n(y)}px)`;

/** Two blinks then gone, starting at `start` (steps, no tweening). */
function blink(start: number): Key[] {
  const seq = [1, 0, 1, 0];
  const out: Key[] = [];
  seq.forEach((opacity, i) => {
    const at = start + i * 40;
    if (i > 0) out.push({at, opacity: seq[i - 1]});
    out.push({at, opacity});
  });
  return out;
}

/* Clip curves, shared by the keyframes and the theme-flip timing. */
const LAUNCH_CLIP = {from: 440, to: 840, curve: [0.7, 0, 0.85, 0.3]} as const;
const LANDING_CLIP = {from: 390, to: 870, curve: [0.6, 0, 0.4, 1]} as const;
/** Ignition shock ring (pad-local radius 18 -> 900 viewBox units). */
const SHOCK = {from: 200, to: 620, curve: [0.15, 0.55, 0.35, 1], r0: 18, r1: 900} as const;
const cssBezier = (c: readonly number[]) => `cubic-bezier(${c.join(',')})`;
/** Half of the 200ms page colour transition: flip this early so the colour
 * change is half done when the clip edge crosses the title. */
const FLIP_LEAD_MS = 100;
const INK_LEAD_MS = 40;

/** Time at which an eased radius r0 -> r1 over [from, to] reaches `r`. */
function timeAtRadius(r: number, r0: number, r1: number, seg: {from: number; to: number; curve: readonly number[]}): number {
  const [x1, y1, x2, y2] = seg.curve;
  const ease = bezier(x1, y1, x2, y2);
  const target = (r - r0) / (r1 - r0);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < target) lo = mid;
    else hi = mid;
  }
  return seg.from + (seg.to - seg.from) * ((lo + hi) / 2);
}

/** Distance from the clip centre to the hero title centre (art-local px). */
function titleDistance(art: HTMLElement, [x, y]: Point): number | null {
  const title = art.closest('header')?.querySelector('h1');
  if (!title) return null;
  const a = art.getBoundingClientRect();
  const t = title.getBoundingClientRect();
  return Math.hypot(t.left + t.width / 2 - a.left - x, t.top + t.height / 2 - a.top - y);
}

function heroVisible(art: HTMLElement): boolean {
  const rect = art.getBoundingClientRect();
  const view = window.innerHeight;
  const shown = Math.min(rect.bottom, view) - Math.max(rect.top, 0);
  return rect.height > 0 && shown / Math.min(rect.height, view) >= 0.5;
}

type Run = {
  target: 'light' | 'dark';
  flipped: boolean;
  done: boolean;
  flip: () => void;
  timeline: Timeline;
  extra: Animation[];
  timers: number[];
  stops: Array<() => void>;
};

/**
 * Wire the hero choreography into themeTransition.ts. `art` is the
 * [data-hero-art] element, `altimeter` the [data-altimeter] block.
 */
export function installHeroThemeSwitch(art: HTMLElement, altimeter: HTMLElement | null): () => void {
  const root = document.documentElement;
  let current: Run | null = null;

  const q = (sel: string) => art.querySelector(sel);
  const layer = (name: string) => q(`[data-hero-layer="${name}"]`);
  const scene = (name: 'day' | 'night') => q(`[data-hero-scene="${name}"]`);
  const actor = (name: string) => q(`[data-actor="${name}"]`);
  const actors = (name: string) => art.querySelectorAll(`[data-actor="${name}"]`);
  const tiles = () => art.querySelectorAll('[data-hero-layer="d-tiles"] [data-tile-group]');
  const alt = (sel: string) => altimeter?.querySelector<HTMLElement>(sel) ?? null;
  const toggles = () => document.querySelectorAll(TOGGLE_SELECTOR);

  /* Pre-mount: when a pointer or focus reaches the toggle in light mode, mount
   * the night plate (with its filters) under the opaque day plate and promote
   * the hero layers, so the click does not pay for first raster + layer
   * creation on frame 1. Purely a warm-up: nothing visible changes. */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let releaseTimer = 0;
  const unprime = () => {
    window.clearTimeout(releaseTimer);
    delete art.dataset.heroPrimed;
  };
  const prime = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(TOGGLE_SELECTOR)) return;
    window.clearTimeout(releaseTimer);
    if (current || reducedMotion.matches || root.dataset.theme === 'dark') return;
    if (window.innerWidth <= MOBILE_MAX_WIDTH) return;
    art.dataset.heroPrimed = '';
  };
  const release = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(TOGGLE_SELECTOR)) return;
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      if (!current) unprime();
    }, PRIME_RELEASE_MS);
  };
  /* Lite tier (heroArtLite.ts flags the art host on low-end devices). Only
   * then are background plates pre-rendered to half-resolution bitmaps in
   * idle time, so the switch fades bitmaps instead of re-rasterising the
   * SVG plates. Full-tier devices never build the cache. */
  const isLite = () => art.closest('[data-art-lite]') !== null;
  let plates: PlateCache | null = null;
  const syncPlates = () => {
    if (plates || !isLite() || reducedMotion.matches) return;
    plates = createPlateCache(art, {
      busy: () => current !== null || art.dataset.heroPrimed !== undefined || art.closest('[data-art-paused]') !== null,
    });
  };
  const liteObserver = new MutationObserver(syncPlates);
  if (art.parentElement) liteObserver.observe(art.parentElement, {attributes: true, attributeFilter: ['data-art-lite']});
  syncPlates();

  /** Swap a source SVG plate for its cached bitmap for this run. */
  const usePlate = (run: Run, name: PlateName, incoming = true): HTMLElement | null => {
    const canvas = plates?.get(name) ?? null;
    const source = layer(name) as HTMLElement | null;
    if (!canvas || !source) return null;
    canvas.dataset.live = '';
    source.dataset.plated = '';
    // The bitmap is baked at loop phase 0. CSS holds the hidden source's
    // loops paused while plated; rewinding them here (priming may have run
    // them) makes the live SVG resume exactly where the bitmap stands.
    // Outgoing plates are only used for static layers, so they skip this.
    if (incoming) {
      for (const animation of source.getAnimations({subtree: true})) {
        if (animation instanceof CSSAnimation) animation.currentTime = 0;
      }
    }
    run.stops.push(() => {
      delete canvas.dataset.live;
      delete source.dataset.plated;
    });
    return canvas;
  };

  /* Day reveal circle. Full tier: clip-path on the day scene (unchanged).
   * Lite: a rounded box tracks the same circle and the scene is offset
   * inside it by the inverse amount; same geometry, timing and easing.
   * Box and offset both animate left/top, so they are sampled on the same
   * (main) thread every frame. A compositor transform on the scene would
   * run ahead of the box during main-thread jank and slide the scene
   * inside the circle. */
  type ClipKey = {at: number; r: number; easing?: string};
  const dayClip = (run: Run, lite: boolean, g: Geometry, [x, y]: Point, keys: ClipKey[]) => {
    const tl = run.timeline;
    const day = scene('day');
    const box = q('[data-hero-clip]') as HTMLElement | null;
    if (!lite || !box || !day) {
      tl.add(day, keys.map(({at, r, easing}) => ({at, clipPath: clip(r, [x, y]), easing})));
      return;
    }
    art.style.setProperty('--hero-w', `${g.w}px`);
    art.style.setProperty('--hero-h', `${g.h}px`);
    art.dataset.liteClip = '';
    run.stops.push(() => {
      delete art.dataset.liteClip;
      art.style.removeProperty('--hero-w');
      art.style.removeProperty('--hero-h');
    });
    tl.add(box, keys.map(({at, r, easing}) => ({
      at, easing,
      left: `${n(x - r)}px`, top: `${n(y - r)}px`, width: `${n(2 * r)}px`, height: `${n(2 * r)}px`,
    })));
    tl.add(day, keys.map(({at, r, easing}) => ({at, easing, left: `${n(r - x)}px`, top: `${n(r - y)}px`})));
  };

  /* Colour disc. Full tier: background-color tween (unchanged). Lite: the
   * disc holds the end colour and an ::after carrying the start colour fades
   * out on the same easing. The blend start*(1-e) + end*e is the same sRGB
   * mix the tween produces, but opacity runs on the compositor instead of
   * repainting the disc every frame. Keys carry exactly two colours. */
  const colourDisc = (run: Run, lite: boolean, keys: Key[]) => {
    const tl = run.timeline;
    const el = q('[data-hero-colour]') as HTMLElement | null;
    if (!lite || !el) {
      tl.add(el, keys);
      return;
    }
    const from = String(keys[0].backgroundColor);
    const to = String(keys[keys.length - 1].backgroundColor);
    el.style.backgroundColor = to;
    el.style.setProperty('--colour-from', from);
    el.dataset.liteColour = '';
    run.stops.push(() => {
      delete el.dataset.liteColour;
      el.style.removeProperty('background-color');
      el.style.removeProperty('--colour-from');
    });
    tl.add(el, keys.map((k) => {
      const rest = {...k};
      delete rest.backgroundColor;
      return rest;
    }));
    tl.add(el, keys.map(({at, easing, backgroundColor}) => ({at, easing, opacity: backgroundColor === from ? 1 : 0})), '::after');
  };

  const primeEvents = ['pointerover', 'pointerdown', 'focusin'] as const;
  const releaseEvents = ['pointerout', 'focusout'] as const;

  const finish = (run: Run) => {
    if (run.done) return;
    run.done = true;
    run.timers.forEach((id) => window.clearTimeout(id));
    run.stops.forEach((stop) => stop());
    if (!run.flipped && root.dataset.theme !== run.target) {
      run.flipped = true;
      run.flip();
    }
    // Same task as the global flip, so the inked scopes never show a frame of
    // the old theme in between.
    clearInk();
    // Cancelling drops every layer back to its static styles = end state.
    run.timeline.cancel();
    run.extra.forEach((anim) => anim.cancel());
    delete root.dataset.heroSwitching;
    root.classList.remove('hero-vt');
    unprime();
    toggles().forEach((button) => button.removeAttribute('aria-disabled'));
    if (altimeter) {
      delete altimeter.dataset.live;
      delete altimeter.dataset.hold;
    }
    const value = alt('[data-alt-value]');
    const unit = alt('[data-alt-unit]');
    if (value) value.textContent = '';
    if (unit) unit.textContent = '';
    if (current === run) current = null;
    // Let the data-theme MutationObserver in themeTransition.ts see `active`
    // first so it does not start the class crossfade on our own flip.
    queueMicrotask(() => {
      if (!current) heroSwitchState.active = false;
    });
  };

  const begin = (mode: Mode, total: number, flip: () => void, target: Run['target']): Run => {
    const run: Run = {target, flipped: false, done: false, flip, timeline: new Timeline(total), extra: [], timers: [], stops: []};
    current = run;
    heroSwitchState.active = true;
    root.dataset.heroSwitching = mode;
    toggles().forEach((button) => button.setAttribute('aria-disabled', 'true'));
    if (altimeter) {
      altimeter.dataset.live = '';
      altimeter.dataset.hold = target === 'dark' ? 'day' : 'night';
    }
    run.timers.push(window.setTimeout(() => finish(run), total + WATCHDOG_PAD_MS));
    return run;
  };

  /* Lite ink: at the visual flip time only the hero text scopes
   * ([data-hero-ink], index.tsx) take the target theme through a local
   * data-theme; the document flip waits for finish(), when the motion has
   * settled. The global flip restyles and repaints the whole page (art
   * included) and was the longest frame of the fast phase on low-end GPUs. */
  const inkScopes = () => document.querySelectorAll<HTMLElement>('[data-hero-ink]');
  /* The Docusaurus navbar is not ours to mark up; it joins the ink scope only
   * for the duration of the run (data-hero-ink-temp marks the borrowed attr). */
  const clearInk = () =>
    inkScopes().forEach((el) => {
      el.removeAttribute('data-theme');
      if (el.hasAttribute('data-hero-ink-temp')) {
        el.removeAttribute('data-hero-ink');
        el.removeAttribute('data-hero-ink-temp');
      }
    });
  const inkAt = (run: Run, ms: number) => {
    run.timers.push(
      window.setTimeout(() => {
        if (run.done || run.flipped) return;
        const navbar = document.querySelector<HTMLElement>('.navbar');
        if (navbar && !navbar.hasAttribute('data-hero-ink')) {
          navbar.setAttribute('data-hero-ink', '');
          navbar.setAttribute('data-hero-ink-temp', '');
        }
        inkScopes().forEach((el) => el.setAttribute('data-theme', run.target));
      }, ms),
    );
  };

  const flipAt = (run: Run, ms: number) => {
    run.timers.push(
      window.setTimeout(() => {
        if (run.done || run.flipped) return;
        run.flipped = true;
        run.flip();
      }, ms),
    );
  };

  /* Altimeter: place out, number to the scale centre (transform only), tick
   * band scroll, speed bar, rolling number; then back. */
  const animateAltimeter = (run: Run, dir: Direction, mode: Mode) => {
    const tl = run.timeline;
    const launch = dir === 'launch';
    const end = tl.total;
    const landAt = mode === 'mobile' ? end : launch ? LAUNCH_LAND_MS : LANDING_LAND_MS;
    const ticks = alt('[data-alt-ticks]');
    const axis = mode === 'mobile' ? 'translateX' : 'translateY';
    const travel = (launch ? 1 : -1) * 120; // multiple of the 40px tick period
    tl.add(ticks, [
      {at: 0, transform: `${axis}(0px)`, easing: ALT_EASE},
      {at: landAt, transform: `${axis}(${travel}px)`},
    ]);

    const reading = alt('[data-alt-reading]');
    const rest = REST_READING_OPACITY;
    if (mode === 'mobile') {
      tl.add(reading, [
        {at: 0, opacity: rest},
        {at: 150, opacity: 1},
        {at: end - 150, opacity: 1},
        {at: end, opacity: rest},
      ]);
    } else {
      const place = alt('[data-alt-place]');
      const band = ticks?.parentElement;
      const outEnd = 250;
      const backAt = landAt;
      // The number grows and lines up with the zero index (70% of the band),
      // which is where the speed bar starts.
      let lift = 'none';
      if (reading && band) {
        const r = reading.getBoundingClientRect();
        const b = band.getBoundingClientRect();
        lift = `translateY(${n(b.top + b.height * 0.7 - (r.top + r.height / 2))}px) scale(1.6)`;
      }
      tl.add(place, [
        {at: 0, opacity: rest, easing: 'ease-out'},
        {at: outEnd * 0.6, opacity: 0},
        {at: backAt + 60, opacity: 0, easing: 'ease-out'},
        {at: end, opacity: rest},
      ]);
      tl.add(reading, [
        {at: 0, opacity: rest, transform: 'none', easing: EASE_IO},
        {at: outEnd, opacity: 1, transform: lift},
        {at: backAt, opacity: 1, transform: lift, easing: EASE_IO},
        {at: end, opacity: rest, transform: 'none'},
      ]);
      const sp = launch ? [0, 330, 840, 940] : [0, 330, 780, 880];
      const br = launch ? [940, 1000, 1060] : [880, 940, 1000];
      tl.add(alt('[data-alt-speed]'), [
        {at: sp[0], transform: 'scaleY(0)', easing: 'ease-out'},
        {at: sp[1], transform: 'scaleY(1)'},
        {at: sp[2], transform: 'scaleY(1)', easing: 'ease-in'},
        {at: sp[3], transform: 'scaleY(0)'},
      ]);
      tl.add(alt('[data-alt-brake]'), [
        {at: br[0], transform: 'scaleY(0)', easing: 'ease-out'},
        {at: br[1], transform: 'scaleY(1)', easing: 'ease-in'},
        {at: br[2], transform: 'scaleY(0)'},
      ]);
    }

    const value = alt('[data-alt-value]');
    const unit = alt('[data-alt-unit]');
    if (value && unit) run.stops.push(driveAltimeter(value, unit, launch ? 0 : 1, 0, landAt));
  };

  /* Axis arms reach the hero edges; sized per run (resize-safe). Ticks on the
   * horizontal arm follow a log pattern (1..9 per decade). */
  const setupAxis = (g: Geometry) => {
    const {pad} = HERO_ANCHORS;
    const left = -g.ox / g.s - pad.x;
    const right = (g.w - g.ox) / g.s - pad.x;
    const top = -pad.y;
    const bottom = g.h / g.s - pad.y;
    // Launch: double rail at y = +-3, clear of the 12px origin square.
    // Landing: vertical ruler axis + plain horizontal axis, 6px gaps on all
    // four sides of the cross.
    const arms: Record<string, string> = {
      'l-3': `M-12 -3H${n(left)}`,
      l3: `M-12 3H${n(left)}`,
      'r-3': `M12 -3H${n(right)}`,
      r3: `M12 3H${n(right)}`,
      u: `M0 -16V${n(top)}`,
      d: `M0 16V${n(bottom)}`,
      hl: `M-16 0H${n(left)}`,
      hr: `M16 0H${n(right)}`,
    };
    art.querySelectorAll('[data-axis-arm]').forEach((arm) => {
      const d = arms[(arm as SVGElement).dataset.axisArm ?? ''];
      if (d) arm.setAttribute('d', d);
    });
  };

  /* Both axis copies share keyframes: set fade, arms drawn outwards from the
   * origin, ruler scrolled so the current altitude sits on the origin.
   * Launch: horizontal double rail, ruler runs right-to-left. Landing:
   * vertical axis, ruler drops back to the pad. */
  const animateAxis = (tl: Timeline, launch: boolean, liteRun?: {run: Run; g: Geometry}) => {
    const landAt = launch ? LAUNCH_LAND_MS : LANDING_LAND_MS;
    const set = launch ? 'h' : 'v';
    const shift = (pos: number) => (launch ? `translateX(${n(-pos)}px)` : `translateY(${n(pos)}px)`);
    const [from, to] = launch ? [0, LADDER_SPAN] : [LADDER_SPAN, 0];
    const setKeys: Key[] = launch
      ? [{at: 220, opacity: 0}, {at: 320, opacity: 1}, {at: 1000, opacity: 1}, {at: 1140, opacity: 0}]
      : [{at: 0, opacity: 0}, {at: 120, opacity: 1}, ...blink(910)];
    /* Lite: the rulers scroll as separate svg elements (compositor
     * transform, px = viewBox units * scale); CSS drops the in-SVG ladders. */
    if (liteRun) {
      const {run, g} = liteRun;
      art.dataset.liteLadder = set;
      run.stops.push(() => {
        delete art.dataset.liteLadder;
      });
      const px = (pos: number) => shift(pos * g.s);
      art.querySelectorAll(`[data-hero-ladder="${set}"]`).forEach((svg) => {
        tl.add(svg, setKeys);
        tl.add(svg, [
          {at: 0, transform: px(from), easing: ALT_EASE},
          {at: landAt, transform: px(to)},
        ]);
      });
    }
    art.querySelectorAll('[data-hero-axis]').forEach((svg) => {
      tl.add(svg.querySelector(`[data-axis-set="${set}"]`), setKeys);
      const start = launch ? 240 : 0;
      tl.each(svg.querySelectorAll(`[data-axis-set="${set}"] [data-axis-arm]`), (i) => [
        {at: start + (i >> 1) * 30, strokeDashoffset: 1, easing: 'cubic-bezier(.2,.7,.2,1)'},
        {at: start + 380 + (i >> 1) * 30, strokeDashoffset: 0},
      ]);
      if (!liteRun) {
        tl.add(svg.querySelector(`[data-axis-ladder="${set}"]`), [
          {at: 0, transform: shift(from), easing: ALT_EASE},
          {at: landAt, transform: shift(to)},
        ]);
      }
    });
  };

  /* Connector draw helpers (pathLength 1, dasharray 1 1). Offset 1 hides the
   * line, 0 shows it, -1 erases it from its start point. */
  const strokeKeys = (steps: Array<[number, number, string?]>, fadeAt?: number): Key[] => {
    const keys: Key[] = steps.map(([at, offset, easing]) => ({at, opacity: 1, strokeDashoffset: offset, ...(easing ? {easing} : {})}));
    keys.unshift({...keys[0], opacity: 0});
    if (fadeAt !== undefined) {
      const last = keys[keys.length - 1];
      keys.push({...last, at: fadeAt, opacity: 1}, {...last, at: fadeAt + 80, opacity: 0});
    } else {
      const last = keys[keys.length - 1];
      keys.push({...last, opacity: 0});
    }
    return keys;
  };

  /* Faint connectors grouped by tone; k is the index within that tone. */
  const eachFaint = (tl: Timeline, keys: Record<'day' | 'night', (k: number) => Key[]>) => {
    const seen = {day: 0, night: 0};
    actors('faint').forEach((el) => {
      const phase = ((el as SVGElement).dataset.phase ?? 'day') as keyof typeof seen;
      tl.add(el, keys[phase](seen[phase]++));
    });
  };

  /* Day -> night: launch into orbit (1200ms). Nothing travels: the actor
   * rig sits on the pad arc, which is the white star's position. */
  const buildLaunch = (run: Run, g: Geometry, lite: boolean) => {
    const tl = run.timeline;
    const {star, disc: red, pad} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const F = toPx(g, red.x, red.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);
    const starOrigin = `${n(S[0])}px ${n(S[1])}px`;
    const focusOrigin = `${n(F[0])}px ${n(F[1])}px`;

    // Day scenery peels off as whole layers.
    // Lite only: the click's first-frame stall swallows a 0-200ms fade, so
    // the plate would vanish before the clip moves; there the fades run with
    // the closing clip (440-840ms) instead. Full keeps the original timing.
    // Lite: the static ocean leaves as its bitmap (no loops, so no phase jump).
    const oceanOut = lite ? usePlate(run, 'd-ocean', false) : null;
    tl.add(oceanOut ?? layer('d-ocean'), lite
      ? [{at: 360, opacity: 1, easing: 'ease-in'}, {at: 800, opacity: 0}]
      : [{at: 0, opacity: 1, easing: 'ease-out'}, {at: 200, opacity: 0}]);
    tl.add(layer('d-guide'), lite
      ? [{at: 260, opacity: 1, easing: 'ease-in'}, {at: 680, opacity: 0}]
      : [{at: 0, opacity: 1, easing: 'ease-out'}, {at: 180, opacity: 0}]);
    tl.add(layer('d-lines'), lite
      ? [
        {at: 420, opacity: 1, transform: 'scale(1)', transformOrigin: starOrigin, easing: 'ease-in'},
        {at: 800, opacity: 0, transform: 'scale(0.96)', transformOrigin: starOrigin},
      ]
      : [
        {at: 150, opacity: 1, transform: 'scale(1)', transformOrigin: starOrigin, easing: 'ease-in'},
        {at: 480, opacity: 0, transform: 'scale(0.96)', transformOrigin: starOrigin},
      ]);
    // Tiles go as the ignition shock passes their distance band.
    tl.each(tiles(), (_i, el) => {
      const dist = Number((el as HTMLElement).dataset.tileDist ?? 0);
      const t = Math.round(Math.max(SHOCK.from + 20, timeAtRadius(Math.max(dist, SHOCK.r0), SHOCK.r0, SHOCK.r1, SHOCK)));
      return [{at: t, opacity: 1}, {at: t, opacity: 0}];
    });

    // Colour layer and the day clip, both centred on the white star. The
    // clip ends 40ms before the colour disc, so red shows ~790-880ms.
    colourDisc(run, lite, [
      {at: 360, opacity: 1, transform: disc(full, S), backgroundColor: '#c6383d', easing: 'cubic-bezier(.5,0,.75,.4)'},
      {at: 880, opacity: 1, transform: disc(rs, S), backgroundColor: '#e34549'},
      {at: 920, opacity: 0, transform: disc(rs, S), backgroundColor: '#e34549'},
    ]);
    dayClip(run, lite, g, S, [
      {at: LAUNCH_CLIP.from, r: full, easing: cssBezier(LAUNCH_CLIP.curve)},
      {at: LAUNCH_CLIP.to, r: rs},
      {at: 920, r: 0},
    ]);

    // Lite: the incoming night background plates are cached bitmaps (each
    // falls back to its live SVG if its bitmap is not ready). The craft link
    // stays live inside the hidden n-grid SVG.
    const gridPlate = lite ? usePlate(run, 'n-grid') : null;
    const corePlate = lite ? usePlate(run, 'n-core') : null;
    const marksPlate = lite ? usePlate(run, 'n-marks') : null;
    const ticksPlate = lite ? usePlate(run, 'n-ticks') : null;
    const orbitsPlate = lite ? usePlate(run, 'n-orbits') : null;

    // Night builds up under the shrinking clip: grid, tick ring turning in,
    // orbits settling, pixels stepping on, labels, then the red star last.
    tl.add(gridPlate ?? layer('n-grid'), [{at: 440, opacity: 0}, {at: 700, opacity: 1}]);
    tl.add(ticksPlate ?? layer('n-ticks'), [
      {at: 520, opacity: 0, transform: 'rotate(-10deg)', transformOrigin: focusOrigin, easing: 'cubic-bezier(.2,.7,.3,1)'},
      {at: 920, opacity: 1, transform: 'rotate(0deg)', transformOrigin: focusOrigin},
    ]);
    tl.add(orbitsPlate ?? layer('n-orbits'), [
      {at: 600, opacity: 0, transform: 'scale(1.08)', transformOrigin: focusOrigin, easing: 'cubic-bezier(.2,.7,.3,1)'},
      {at: 980, opacity: 1, transform: 'scale(1)', transformOrigin: focusOrigin},
    ]);
    if (marksPlate) {
      // One bitmap fade spans the star wave (440) to the labels (1100).
      tl.add(marksPlate, [{at: 440, opacity: 0, easing: 'ease-out'}, {at: 1100, opacity: 1}]);
    } else {
      tl.each(art.querySelectorAll('[data-pixel-group]'), (i) => {
        const t = 760 + i * 70;
        return [{at: t, opacity: 0}, {at: t, opacity: 1}];
      });
      tl.add(q('[data-night-labels]'), [{at: 900, opacity: 0}, {at: 1100, opacity: 1}]);
    }
    // Craft link: once the white star has settled, the dashed slant line
    // grows out of it toward the craft, then the marker locks on.
    tl.add(q('[data-craft-line]'), [
      {at: 880, opacity: 0, transform: 'scale(0)', transformOrigin: CRAFT_ORIGIN, easing: 'cubic-bezier(.2,.7,.3,1)'},
      {at: 1100, opacity: 1, transform: 'scale(1)', transformOrigin: CRAFT_ORIGIN},
    ]);
    tl.add(q('[data-craft-mark]'), [
      {at: 1060, opacity: 0, transform: 'scale(1.6)', transformOrigin: CRAFT_MARK_ORIGIN, easing: EASE_POP},
      {at: 1160, opacity: 1, transform: 'scale(1)', transformOrigin: CRAFT_MARK_ORIGIN},
    ]);
    if (!marksPlate) {
      tl.each(art.querySelectorAll('[data-star-group]'), (k) => [
        {at: 440 + k * 110, opacity: 0, easing: 'ease-out'},
        {at: 600 + k * 110, opacity: 1},
      ]);
    }
    tl.add(corePlate ?? layer('n-core'), [{at: 950, opacity: 0}, {at: 1180, opacity: 1}]);

    // Pad arc stand-in: holds until the clip edge reaches it, then shrinks
    // with the clip onto the star.
    const t44 = timeAtRadius(pad.r * g.s, full, rs, LAUNCH_CLIP);
    tl.add(actor('ring'), [
      {at: 0, opacity: 1, transform: 'scale(1)'},
      {at: t44, opacity: 1, transform: 'scale(1)', easing: 'ease-in'},
      {at: LAUNCH_CLIP.to, opacity: 1, transform: `scale(${(star.r / pad.r).toFixed(4)})`},
      {at: LAUNCH_CLIP.to + 40, opacity: 0, transform: `scale(${(star.r / pad.r).toFixed(4)})`},
    ]);

    // Blue survey links: squares pop, elbows draw in to the pad, then retract.
    tl.each(actors('square'), (i) => [
      {at: i * 30, opacity: 0},
      {at: i * 30 + 90, opacity: 1},
      {at: 420 + i * 20, opacity: 1},
      {at: 440 + i * 20, opacity: 0},
    ]);
    tl.each(actors('blue-line'), (i) => strokeKeys([
      [i * 30, 1, 'ease-out'],
      [220 + i * 30, 0],
      [440, 0, 'ease-in'],
      [600, -1],
    ]));
    // Faint lines draw with their phase's bold set: day ones with the blue
    // links (gone before the night shows), night ones with the red rays.
    eachFaint(tl, {
      day: (k) => strokeKeys([[30 + k * 45, 1, 'ease-out'], [260 + k * 45, 0]], 420 + k * 30),
      night: (k) => strokeKeys([[560 + k * 40, 1, 'ease-out'], [900 + k * 40, 0]], 1120 + k * 20),
    });

    // Red rays: elbows out from the star, decelerate to their marks.
    // Same on-screen life (~500ms) as the landing rays.
    tl.each(actors('red-line'), (i) => strokeKeys([
      [520 + i * 30, 1, 'ease-out'],
      [780, 0.45, EASE_POP],
      [980, 0],
    ], 1040));

    tl.each(actors('red-end'), (i) => [
      {at: 950 + i * 30, opacity: 0},
      {at: 970 + i * 30, opacity: 1},
      {at: 1050 + i * 25, opacity: 1},
      {at: 1070 + i * 25, opacity: 0},
    ]);
    tl.add(actor('leader-red'), strokeKeys([[900, 1, 'ease-out'], [1000, 0]], 1080));
    tl.add(actor('caption-red'), [
      {at: 950, opacity: 0},
      {at: 1000, opacity: 1},
      {at: 1080, opacity: 1},
      {at: 1150, opacity: 0},
    ]);

    // White dot takes over as the clip lands on the star; the flat red star
    // stand-in fades in at its final size and hands over to the real disc.
    tl.add(actor('dot'), [
      {at: LAUNCH_CLIP.to, opacity: 0},
      {at: LAUNCH_CLIP.to + 40, opacity: 1},
      {at: 1100, opacity: 1},
      {at: 1180, opacity: 0},
    ]);
    tl.add(actor('disc'), [
      {at: 820, opacity: 0, transform: move(red.x, red.y, 1), easing: 'ease-out'},
      {at: 960, opacity: 1, transform: move(red.x, red.y, 1)},
      {at: 1060, opacity: 1, transform: move(red.x, red.y, 1)},
      {at: 1180, opacity: 0, transform: move(red.x, red.y, 1)},
    ]);

    // Free study: lock-on, ignition ripple, then the orbit traced out of the
    // pad ahead of the night plate (the real orbit fades in under it).
    tl.add(actor('reticle'), [
      {at: 0, opacity: 0, transform: 'scale(1.8)', easing: EASE_POP},
      {at: 160, opacity: 1, transform: 'scale(1)'},
      {at: 360, opacity: 1, transform: 'scale(1)', easing: 'ease-in'},
      {at: 460, opacity: 0, transform: 'scale(0.5)'},
    ]);
    tl.add(actors('ripple')[0], [
      {at: SHOCK.from, opacity: 0, transform: 'scale(0.3)'},
      {at: SHOCK.from, opacity: 0.8, transform: 'scale(0.3)', easing: 'cubic-bezier(.1,.6,.3,1)'},
      {at: 560, opacity: 0, transform: 'scale(1.5)'},
    ]);
    tl.add(actor('shock'), [
      {at: SHOCK.from, opacity: 0, transform: `scale(${SHOCK.r0 / 60})`},
      {at: SHOCK.from, opacity: 0.55, transform: `scale(${SHOCK.r0 / 60})`, easing: cssBezier(SHOCK.curve)},
      {at: SHOCK.to, opacity: 0, transform: `scale(${SHOCK.r1 / 60})`},
    ]);
    // One full turn back to the satellite, then a slow fade onto the real
    // orbit underneath.
    const trace = strokeKeys([[260, 1, 'cubic-bezier(.5,0,.2,1)'], [980, 0]]).slice(0, -1);
    trace[trace.length - 1].easing = 'ease-in-out';
    tl.add(actor('trace'), [...trace, {at: 1180, opacity: 0, strokeDashoffset: 0}]);
    animateAxis(tl, true, lite ? {run, g} : undefined);
  };

  /* Night -> day: landing (1200ms). The orbit winds back into the satellite
   * first (0-400ms), then the day disc opens from it. */
  const buildLanding = (run: Run, g: Geometry, lite: boolean) => {
    const tl = run.timeline;
    const {star, disc: red, pad} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const F = toPx(g, red.x, red.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);
    const focusOrigin = `${n(F[0])}px ${n(F[1])}px`;

    // Day clip opens from the white star; cobalt wave runs ahead of it.
    dayClip(run, lite, g, S, [
      {at: 0, r: 0},
      {at: LANDING_CLIP.from, r: rs, easing: cssBezier(LANDING_CLIP.curve)},
      {at: LANDING_CLIP.to, r: full},
    ]);
    // Lite: incoming day background plates as cached bitmaps.
    const oceanPlate = lite ? usePlate(run, 'd-ocean') : null;
    const tilesPlate = lite ? usePlate(run, 'd-tiles') : null;
    const linesPlate = lite ? usePlate(run, 'd-lines') : null;
    const guidePlate = lite ? usePlate(run, 'd-guide') : null;
    // Lite: the static outgoing grid holds as its bitmap until covered; its
    // craft link stays live (plate-skip) for its own exit.
    if (lite) usePlate(run, 'n-grid', false);
    colourDisc(run, lite, [
      {at: 350, opacity: 1, transform: disc(rs, S), backgroundColor: '#245dcc', easing: 'cubic-bezier(.4,0,.8,.5)'},
      {at: 750, opacity: 1, transform: disc(full, S), backgroundColor: '#e4ecf8'},
      {at: 870, opacity: 0, transform: disc(full, S), backgroundColor: '#e4ecf8'},
    ]);

    // Night peels off in layers while the day clip spreads: labels, pixels,
    // red star, tick ring turning out; orbits and grid stay until covered.
    tl.add(q('[data-night-labels]'), [{at: 0, opacity: 1}, {at: 120, opacity: 0}]);
    // Craft link reels back into the white star before the orbit rewinds.
    tl.add(q('[data-craft-mark]'), [
      {at: 0, opacity: 1, transform: 'scale(1)', transformOrigin: CRAFT_MARK_ORIGIN, easing: 'ease-in'},
      {at: 100, opacity: 0, transform: 'scale(.6)', transformOrigin: CRAFT_MARK_ORIGIN},
    ]);
    tl.add(q('[data-craft-line]'), [
      {at: 40, opacity: 1, transform: 'scale(1)', transformOrigin: CRAFT_ORIGIN, easing: 'cubic-bezier(.55,0,.75,.4)'},
      {at: 300, opacity: 0.6, transform: 'scale(0)', transformOrigin: CRAFT_ORIGIN},
      {at: 300, opacity: 0},
    ]);
    tl.each(art.querySelectorAll('[data-star-group]'), (k) => [
      {at: 120 + k * 80, opacity: 1, easing: 'ease-in'},
      {at: 260 + k * 80, opacity: 0},
    ]);
    tl.each(art.querySelectorAll('[data-pixel-group]'), (i) => {
      const t = 60 + i * 50;
      return [{at: t, opacity: 1}, {at: t, opacity: 0}];
    });
    tl.add(layer('n-core'), [{at: 180, opacity: 1, easing: 'ease-in'}, {at: 420, opacity: 0}]);
    tl.add(layer('n-ticks'), [
      {at: 120, opacity: 1, transform: 'rotate(0deg)', transformOrigin: focusOrigin, easing: 'ease-in'},
      {at: 420, opacity: 0, transform: 'rotate(8deg)', transformOrigin: focusOrigin},
    ]);
    tl.add(layer('n-orbits'), [
      {at: 400, opacity: 1, transform: 'scale(1)', transformOrigin: focusOrigin, easing: 'ease-in'},
      {at: 680, opacity: 0, transform: 'scale(1.06)', transformOrigin: focusOrigin},
    ]);

    // Day layers return once the clip covers the hero (short rise).
    tl.add(oceanPlate ?? layer('d-ocean'), [
      {at: 910, opacity: 0, transform: 'translateY(4px)', easing: 'ease-out'},
      {at: 1200, opacity: 1, transform: 'translateY(0px)'},
    ]);
    tl.add(linesPlate ?? layer('d-lines'), [{at: 910, opacity: 0, easing: 'ease-out'}, {at: 1200, opacity: 1}]);
    tl.add(guidePlate ?? layer('d-guide'), [{at: 910, opacity: 0, easing: 'ease-out'}, {at: 1200, opacity: 1}]);
    // Tiles land just behind the opening clip edge, near bands first. The
    // lite bitmap is simply uncovered by the clip (no per-band steps).
    if (!tilesPlate) tl.each(tiles(), (_i, el) => {
      const dist = Number((el as HTMLElement).dataset.tileDist ?? 0) * g.s;
      const t = dist <= rs ? LANDING_CLIP.from : timeAtRadius(Math.min(dist, full), rs, full, LANDING_CLIP);
      const at = Math.round(Math.min(1150, t + 60));
      return [{at, opacity: 0}, {at, opacity: 1}];
    });

    // White star goes paper-white and hands over to the clip.
    tl.add(actor('dot'), [
      {at: 0, opacity: 1, fill: '#ece9e3'},
      {at: 390, opacity: 1, fill: '#ece9e3'},
      {at: 470, opacity: 1, fill: '#f1f3f2'},
      {at: 530, opacity: 0, fill: '#f1f3f2'},
    ]);
    // Pad arc grows with the clip until it reaches its own radius.
    const t44 = timeAtRadius(pad.r * g.s, rs, full, LANDING_CLIP);
    tl.add(actor('ring'), [
      {at: LANDING_CLIP.from, opacity: 0, transform: `scale(${(star.r / pad.r).toFixed(4)})`, easing: 'ease-out'},
      {at: LANDING_CLIP.from + 30, opacity: 1, transform: `scale(${(star.r / pad.r).toFixed(4)})`, easing: 'ease-out'},
      {at: t44, opacity: 1, transform: 'scale(1)'},
      {at: 1050, opacity: 1, transform: 'scale(1)'},
      {at: 1200, opacity: 0, transform: 'scale(1)'},
    ]);

    // Red rays come home: drawn in from their end marks towards the star,
    // then collapse into it. Blue links grow out to their squares.
    tl.each(actors('red-line'), (i) => strokeKeys([
      [i * 15, -1, 'ease-out'],
      [200 + i * 15, 0],
      [240 + i * 15, 0, 'ease-in'],
      [440 + i * 15, 1],
    ]));
    tl.each(actors('red-end'), (i) => [
      {at: i * 15, opacity: 0},
      {at: 20 + i * 15, opacity: 1},
      {at: 240 + i * 15, opacity: 1},
      {at: 260 + i * 15, opacity: 0},
    ]);
    // Faint lines draw with their phase's bold set: night ones converge with
    // the red rays, day ones grow out with the blue links.
    eachFaint(tl, {
      night: (k) => strokeKeys([[k * 25, -1, 'ease-out'], [200 + k * 25, 0]], 260 + k * 15),
      day: (k) => strokeKeys([[450 + k * 40, 1, 'ease-out'], [670 + k * 40, 0]], 910 + k * 30),
    });
    tl.each(actors('blue-line'), (i) => [
      ...strokeKeys([[430 + i * 30, -1, 'ease-out'], [650 + i * 30, 0]]).slice(0, -1),
      ...blink(910).map((k) => ({...k, strokeDashoffset: 0})),
    ]);

    tl.each(actors('square'), (i) => [
      {at: 650 + i * 30, opacity: 0},
      {at: 650 + i * 30, opacity: 1},
      ...blink(910),
    ]);
    tl.add(actor('leader-blue'), [
      ...strokeKeys([[550, 1, 'ease-out'], [670, 0]]).slice(0, -1),
      {at: 990, opacity: 1, strokeDashoffset: 0},
      {at: 1050, opacity: 0, strokeDashoffset: 0},
    ]);
    tl.add(actor('caption-blue'), [
      {at: 620, opacity: 0},
      {at: 680, opacity: 1},
      {at: 990, opacity: 1},
      {at: 1050, opacity: 0},
    ]);

    // Deorbit: the real orbit hands over to the trace (same stroke), which
    // winds back along the orbit into the satellite, brightening as it goes.
    // Then touchdown: reticle locks onto the pad, two ripples, blink out.
    tl.each(art.querySelectorAll('[data-hero-orbit]'), () => [{at: 0, opacity: 0}]);
    const orbitStroke = {stroke: '#ece9e3', strokeWidth: (0.9 / g.s).toFixed(3) + 'px'};
    tl.add(actor('trace'), [
      {at: 0, opacity: 1, strokeDashoffset: 0, strokeOpacity: 0.5, ...orbitStroke},
      {at: 40, opacity: 1, strokeDashoffset: 0, strokeOpacity: 0.5, ...orbitStroke, easing: 'cubic-bezier(.45,0,.75,.5)'},
      {at: 400, opacity: 1, strokeDashoffset: 1, strokeOpacity: 0.9, ...orbitStroke},
      {at: 400, opacity: 0, strokeDashoffset: 1, strokeOpacity: 0.9, ...orbitStroke},
    ]);
    tl.add(actor('reticle'), [
      {at: 850, opacity: 0, transform: 'scale(1.8)', easing: EASE_POP},
      {at: 970, opacity: 1, transform: 'scale(1)'},
      ...blink(1050).map((k) => ({...k, transform: 'scale(1)'})),
    ]);
    tl.each(actors('ripple'), (i) => {
      const t = 840 + i * 90;
      return [
        {at: t, opacity: 0, transform: 'scale(0.4)'},
        {at: t, opacity: 0.7, transform: 'scale(0.4)', easing: 'cubic-bezier(.1,.6,.3,1)'},
        {at: t + 260, opacity: 0, transform: 'scale(1.6)'},
      ];
    });
    animateAxis(tl, false, lite ? {run, g} : undefined);
  };

  /* Theme flip: timed to the clip edge passing the title, so the page text
   * changes colour while the matching backdrop is under it. */
  const flipTime = (g: Geometry, launch: boolean, lead = FLIP_LEAD_MS): number => {
    const {star} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);
    const d = titleDistance(art, S);
    if (d === null || d <= rs || d >= full) return launch ? LAUNCH_FLIP_MS : LANDING_FLIP_MS;
    const at = launch
      ? timeAtRadius(d, full, rs, LAUNCH_CLIP)
      : timeAtRadius(d, rs, full, LANDING_CLIP);
    const [lo, hi] = launch
      ? [LAUNCH_CLIP.from + 60, LAUNCH_CLIP.to]
      : [LANDING_CLIP.from + 40, LANDING_CLIP.to - 60];
    return Math.round(Math.min(hi, Math.max(lo, at - lead)));
  };

  /* Desktop run: both plates mounted, shared clock, flip mid-way. */
  const runDesktop = (flip: () => void, target: Run['target']) => {
    const launch = target === 'dark';
    const total = launch ? LAUNCH_MS : LANDING_MS;
    const run = begin('desktop', total, flip, target);
    const g = measure(art);
    setupAxis(g);
    const lite = isLite();
    if (launch) buildLaunch(run, g, lite);
    else buildLanding(run, g, lite);
    animateAltimeter(run, launch ? 'launch' : 'landing', 'desktop');
    /* Lite inks only the hero scopes (cheap, no fade), so it needs less lead
     * than the global flip: 100ms lead inked the title while it was still on
     * the old backdrop. */
    if (lite) inkAt(run, flipTime(g, launch, INK_LEAD_MS));
    else flipAt(run, flipTime(g, launch));
    Promise.all(run.timeline.anims.map((anim) => anim.finished)).then(
      () => finish(run),
      () => finish(run),
    );
  };

  /* Mobile run: fade current plate, then a circle View Transition from the
   * top centre; the new side is live so the altimeter keeps rolling. */
  const runMobile = (flip: () => void, target: Run['target']): boolean => {
    const doc = document as Document & VTDocument;
    if (typeof doc.startViewTransition !== 'function') return false;
    const total = MOBILE_FADE_MS + MOBILE_REVEAL_MS;
    const run = begin('mobile', total, flip, target);
    const from = target === 'dark' ? 'day' : 'night';
    const to = target === 'dark' ? 'night' : 'day';
    run.timeline.add(scene(from), [
      {at: 0, opacity: 1, easing: 'ease-out'},
      {at: MOBILE_FADE_MS, opacity: 0},
    ]);
    animateAltimeter(run, target === 'dark' ? 'launch' : 'landing', 'mobile');
    run.timers.push(
      window.setTimeout(() => {
        if (run.done) return;
        let vt: ViewTransitionLike;
        try {
          vt = doc.startViewTransition!(() => {
            if (run.done || run.flipped) return;
            root.classList.add('hero-vt');
            run.flipped = true;
            run.flip();
            const incoming = scene(to);
            if (incoming) {
              run.extra.push(
                incoming.animate([{opacity: 0}, {opacity: 1}], {duration: 450, delay: 150, easing: 'ease-out', fill: 'both'}),
              );
            }
          });
        } catch {
          finish(run);
          return;
        }
        vt.ready
          .then(() => {
            if (run.done) return;
            const radius = Math.hypot(window.innerWidth / 2, window.innerHeight);
            run.extra.push(
              root.animate(
                {clipPath: ['circle(0px at 50% 0px)', `circle(${n(radius)}px at 50% 0px)`]},
                {duration: MOBILE_REVEAL_MS, easing: 'cubic-bezier(.6,0,.3,1)', pseudoElement: '::view-transition-new(root)'},
              ),
            );
          })
          .catch(() => undefined);
        vt.finished.then(
          () => finish(run),
          () => finish(run),
        );
      }, MOBILE_FADE_MS),
    );
    return true;
  };

  const handler = (flip: () => void): boolean => {
    if (current) return true;
    if (typeof art.animate !== 'function' || !heroVisible(art)) return false;
    const target: Run['target'] = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (window.innerWidth <= MOBILE_MAX_WIDTH) return runMobile(flip, target);
    runDesktop(flip, target);
    return true;
  };

  // External theme change (other tab) or hidden tab -> jump to end state.
  const observer = new MutationObserver(() => {
    if (current && !current.flipped) finish(current);
  });
  observer.observe(root, {attributes: true, attributeFilter: ['data-theme']});
  const onVisibility = () => {
    if (document.hidden && current) finish(current);
  };
  document.addEventListener('visibilitychange', onVisibility);
  primeEvents.forEach((type) => document.addEventListener(type, prime, true));
  releaseEvents.forEach((type) => document.addEventListener(type, release, true));
  const unregister = setHeroSwitchHandler(handler);

  return () => {
    unregister();
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    primeEvents.forEach((type) => document.removeEventListener(type, prime, true));
    releaseEvents.forEach((type) => document.removeEventListener(type, release, true));
    if (current) finish(current);
    unprime();
    liteObserver.disconnect();
    plates?.dispose();
    plates = null;
  };
}
