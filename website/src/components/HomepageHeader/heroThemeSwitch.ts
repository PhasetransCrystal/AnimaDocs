/* Hero theme switch choreography (artifacts/handoff/hero-launch-landing-spec.md).
 * Desktop: WAAPI timelines over whole SVG layers plus a light actor overlay.
 * Mobile (≤640px): View Transition circle reveal from the top centre.
 * Every animation is cancelled at the end, so the static plate is the end
 * state and nothing has to be swapped back by hand. */
import {DAY_TILE_GROUPS, HERO_ANCHORS} from '@site/src/components/VisualStudy';
import {heroSwitchState, setHeroSwitchHandler} from '@site/src/utils/heroSwitchHook';

import {ALT_EASE, bezier, driveAltimeter} from './altimeterDriver';

type Direction = 'launch' | 'landing';
type Mode = 'desktop' | 'mobile';
type Key = Record<string, string | number | undefined> & {at: number};
type Target = Element | null | undefined;
type ViewTransitionLike = {ready: Promise<void>; finished: Promise<void>};
type VTDocument = {startViewTransition?: (update: () => void) => ViewTransitionLike};

const LAUNCH_MS = 1600;
const LANDING_MS = 1250;
const LAUNCH_FLIP_MS = 800;
const LANDING_FLIP_MS = 550;
const LAUNCH_FILTERS_ON_MS = 1200;
const FILTERS_OFF_DURING_LAUNCH = true;
const MOBILE_FADE_MS = 180;
const MOBILE_REVEAL_MS = 600;
const WATCHDOG_PAD_MS = 400;
const MOBILE_MAX_WIDTH = 640;
const TOGGLE_SELECTOR = '[class*="colorModeToggle"] button';

const EASE_IO = 'cubic-bezier(.65,0,.35,1)';
const EASE_POP = 'cubic-bezier(.2,.8,.2,1)';
const EASE_ACCEL = 'cubic-bezier(.55,0,1,.45)';

/** Shared clock: every animation spans the whole switch so offsets line up. */
class Timeline {
  readonly anims: Animation[] = [];

  constructor(readonly total: number) {}

  add(el: Target, keys: Key[]): void {
    if (!el || keys.length === 0) return;
    const frames: Keyframe[] = keys.map(({at, easing, ...props}) => ({
      ...props,
      offset: Math.min(1, Math.max(0, at / this.total)),
      ...(easing ? {easing: String(easing)} : {}),
    }));
    // Hold the first / last values across the rest of the clock.
    if (frames[0].offset !== 0) frames.unshift({...frames[0], offset: 0, easing: 'linear'});
    const last = frames[frames.length - 1];
    if (last.offset !== 1) frames.push({...last, offset: 1});
    this.anims.push(el.animate(frames, {duration: this.total, fill: 'both'}));
  }

  each(list: ArrayLike<Element>, keys: (index: number) => Key[]): void {
    for (let i = 0; i < list.length; i += 1) this.add(list[i], keys(i));
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
const LAUNCH_CLIP = {from: 550, to: 1050, curve: [0.7, 0, 0.85, 0.3]} as const;
const LANDING_CLIP = {from: 300, to: 900, curve: [0.6, 0, 0.4, 1]} as const;
const cssBezier = (c: readonly number[]) => `cubic-bezier(${c.join(',')})`;
/** Half of the 200ms page colour transition: flip this early so the colour
 * change is half done when the clip edge crosses the title. */
const FLIP_LEAD_MS = 100;

/** Time at which an eased radius r0 -> r1 over [from, to] reaches `r`. */
function timeAtRadius(r: number, r0: number, r1: number, seg: typeof LAUNCH_CLIP | typeof LANDING_CLIP): number {
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

  const finish = (run: Run) => {
    if (run.done) return;
    run.done = true;
    run.timers.forEach((id) => window.clearTimeout(id));
    run.stops.forEach((stop) => stop());
    if (!run.flipped && root.dataset.theme !== run.target) {
      run.flipped = true;
      run.flip();
    }
    // Cancelling drops every layer back to its static styles = end state.
    run.timeline.cancel();
    run.extra.forEach((anim) => anim.cancel());
    delete root.dataset.heroSwitching;
    root.classList.remove('hero-vt');
    delete art.dataset.heroFilters;
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
    const landAt = mode === 'mobile' ? end : launch ? 1450 : 1050;
    const ticks = alt('[data-alt-ticks]');
    const axis = mode === 'mobile' ? 'translateX' : 'translateY';
    const travel = (launch ? 1 : -1) * 120; // multiple of the 40px tick period
    tl.add(ticks, [
      {at: 0, transform: `${axis}(0px)`, easing: ALT_EASE},
      {at: landAt, transform: `${axis}(${travel}px)`},
    ]);

    if (mode === 'desktop') {
      const reading = alt('[data-alt-reading]');
      const place = alt('[data-alt-place]');
      const band = ticks?.parentElement;
      const outEnd = launch ? 300 : 250;
      const backAt = launch ? 1400 : 1100;
      let lift = 'none';
      if (reading && band) {
        const r = reading.getBoundingClientRect();
        const b = band.getBoundingClientRect();
        lift = `translateY(${n(b.top + b.height / 2 - (r.top + r.height / 2))}px) scale(1.8)`;
      }
      tl.add(place, [
        {at: 0, opacity: 1, easing: 'ease-out'},
        {at: outEnd * 0.7, opacity: 0},
        {at: backAt, opacity: 0, easing: 'ease-out'},
        {at: end, opacity: 1},
      ]);
      tl.add(reading, [
        {at: 0, transform: 'none', easing: EASE_IO},
        {at: outEnd, transform: lift},
        {at: backAt, transform: lift, easing: EASE_IO},
        {at: end, transform: 'none'},
      ]);
      const sp = launch ? [0, 450, 1100, 1200] : [0, 300, 700, 850];
      const br = launch ? [1200, 1320, 1450] : [850, 950, 1050];
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

  /* Day -> night: launch into orbit (1600ms). */
  const buildLaunch = (tl: Timeline, g: Geometry) => {
    const {guide, star, disc: red} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);
    const origin = `${n(S[0])}px ${n(S[1])}px`;

    // Day scenery (whole layers).
    tl.add(layer('d-ocean'), [{at: 0, opacity: 1, easing: 'ease-out'}, {at: 250, opacity: 0}]);
    tl.add(layer('d-guide'), [{at: 0, opacity: 1, easing: 'ease-out'}, {at: 200, opacity: 0}]);
    tl.add(layer('d-lines'), [
      {at: 200, opacity: 1, transform: 'scale(1)', transformOrigin: origin, easing: 'ease-in'},
      {at: 650, opacity: 0, transform: 'scale(0.96)', transformOrigin: origin},
    ]);
    tl.each(tiles(), (i) => {
      const t = 250 + i * 64;
      return [{at: t, opacity: 1}, {at: t, opacity: 0}];
    });

    // Colour layer and the day clip, both centred on the white star.
    tl.add(q('[data-hero-colour]'), [
      {at: 450, opacity: 1, transform: disc(full, S), backgroundColor: '#c6383d', easing: 'cubic-bezier(.5,0,.75,.4)'},
      {at: 1100, opacity: 1, transform: disc(rs, S), backgroundColor: '#e34549'},
      {at: 1150, opacity: 0, transform: disc(rs, S), backgroundColor: '#e34549'},
    ]);
    // The clip ends 50ms before the colour disc, so it overtakes it at ~1000ms
    // and the red disc is briefly seen shrinking onto the star.
    tl.add(scene('day'), [
      {at: LAUNCH_CLIP.from, clipPath: clip(full, S), easing: cssBezier(LAUNCH_CLIP.curve)},
      {at: LAUNCH_CLIP.to, clipPath: clip(rs, S)},
      {at: 1150, clipPath: clip(0, S)},
    ]);

    // Night scenery fades in as whole layers.
    tl.add(layer('n-grid'), [{at: 1050, opacity: 0}, {at: 1300, opacity: 1}]);
    tl.add(layer('n-core'), [{at: 1350, opacity: 0}, {at: 1600, opacity: 1}]);
    tl.add(layer('n-rest'), [{at: 1350, opacity: 0}, {at: 1600, opacity: 1}]);

    // Actor rig: guide circle -> white star.
    tl.add(actor('rig'), [
      {at: 200, transform: move(guide.x, guide.y), easing: EASE_IO},
      {at: 650, transform: move(star.x, star.y)},
    ]);
    tl.add(actor('ring'), [
      {at: 0, opacity: 1, transform: 'scale(1)'},
      {at: 600, opacity: 1, transform: 'scale(1)', easing: 'ease-in'},
      {at: 1100, opacity: 0, transform: `scale(${(star.r / guide.r).toFixed(4)})`},
    ]);
    tl.each(actors('square'), (i) => [
      {at: i * 40, opacity: 0},
      {at: i * 40 + 120, opacity: 1},
      {at: 550, opacity: 1},
      {at: 620, opacity: 0},
    ]);
    tl.each(actors('blue-line'), (i) => [
      {at: i * 40, opacity: 1, strokeDashoffset: 1, easing: 'ease-out'},
      {at: i * 40 + 200, opacity: 1, strokeDashoffset: 0},
      {at: 600, opacity: 1, strokeDashoffset: 0, easing: 'ease-in'},
      {at: 800, opacity: 1, strokeDashoffset: -1},
      {at: 800, opacity: 0, strokeDashoffset: -1},
    ]);
    tl.each(actors('red-line'), () => [
      {at: 750, opacity: 1, strokeDashoffset: 1, easing: 'ease-out'},
      {at: 1100, opacity: 1, strokeDashoffset: 0.55, easing: EASE_POP},
      {at: 1450, opacity: 1, strokeDashoffset: 0, easing: 'ease-in'},
      {at: 1580, opacity: 0, strokeDashoffset: 0},
    ]);
    tl.each(actors('red-end'), () => [
      {at: 1420, opacity: 0},
      {at: 1440, opacity: 1},
      {at: 1520, opacity: 1},
      {at: 1540, opacity: 0},
    ]);
    tl.add(actor('axis'), [
      {at: 600, opacity: 0, easing: 'ease-in'},
      {at: 700, opacity: 1},
      {at: 1300, opacity: 1},
      {at: 1450, opacity: 0},
    ]);
    tl.add(actor('axis-h'), [{at: 0, opacity: 1}]);
    tl.each(actors('milestone'), (i) => {
      const x = 80 + i * 70;
      const t = 700 + i * 80;
      return [
        {at: 600, opacity: 1, transform: shift(0, 0), easing: 'ease-in'},
        {at: t + 200, opacity: 1, transform: shift(-x * 0.8, 0)},
        {at: t + 260, opacity: 0, transform: shift(-x, 0)},
      ];
    });
    tl.add(actor('dot'), [
      {at: 1050, opacity: 0},
      {at: 1150, opacity: 1},
      {at: 1450, opacity: 1},
      {at: 1600, opacity: 0},
    ]);
    // Red star + main orbit stand-ins: flat shapes scaled 2.8x -> 1.
    for (const name of ['disc', 'orbit']) {
      tl.add(actor(name), [
        {at: 1000, transform: move(red.x, red.y, 2.8), easing: EASE_POP},
        {at: 1400, transform: move(red.x, red.y, 1)},
      ]);
      tl.add(actor(name), [
        {at: 1000, opacity: 0},
        {at: 1080, opacity: 1},
        {at: 1480, opacity: 1},
        {at: 1600, opacity: 0},
      ]);
    }
  };

  /* Night -> day: landing (1250ms). */
  const buildLanding = (tl: Timeline, g: Geometry) => {
    const {guide, star, disc: red} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);

    // Day clip opens from the white star.
    tl.add(scene('day'), [
      {at: 0, clipPath: clip(0, S)},
      {at: LANDING_CLIP.from, clipPath: clip(rs, S), easing: cssBezier(LANDING_CLIP.curve)},
      {at: LANDING_CLIP.to, clipPath: clip(full, S)},
    ]);
    tl.add(layer('n-core'), [{at: 0, opacity: 1, easing: 'ease-in'}, {at: 200, opacity: 0}]);
    tl.add(layer('n-rest'), [{at: 0, opacity: 1, easing: 'ease-in'}, {at: 200, opacity: 0}]);
    tl.add(q('[data-hero-colour]'), [
      {at: 250, opacity: 1, transform: disc(rs, S), backgroundColor: '#245dcc', easing: 'cubic-bezier(.4,0,.8,.5)'},
      {at: 750, opacity: 1, transform: disc(full, S), backgroundColor: '#e4ecf8'},
      {at: 900, opacity: 0, transform: disc(full, S), backgroundColor: '#e4ecf8'},
    ]);

    // Day layers come back after the clip has covered the hero.
    tl.add(layer('d-ocean'), [
      {at: 950, opacity: 0, transform: 'translateY(12px)', easing: 'ease-out'},
      {at: 1250, opacity: 1, transform: 'translateY(0px)'},
    ]);
    tl.add(layer('d-lines'), [{at: 950, opacity: 0, easing: 'ease-out'}, {at: 1250, opacity: 1}]);
    tl.add(layer('d-guide'), [{at: 950, opacity: 0, easing: 'ease-out'}, {at: 1250, opacity: 1}]);
    tl.each(tiles(), (i) => {
      const t = 700 + i * 50;
      return [{at: t, opacity: 0}, {at: t, opacity: 1}];
    });

    // Actor takes the white star + main orbit at t=0.
    tl.add(actor('rig'), [
      {at: 300, transform: move(star.x, star.y), easing: EASE_IO},
      {at: 800, transform: move(guide.x, guide.y)},
    ]);
    tl.add(actor('dot'), [
      {at: 0, opacity: 1, fill: '#ece9e3'},
      {at: 300, opacity: 1, fill: '#ece9e3'},
      {at: 400, opacity: 1, fill: '#f1f3f2'},
      {at: 450, opacity: 0, fill: '#f1f3f2'},
    ]);
    tl.add(actor('orbit'), [
      {at: 0, opacity: 1, transform: move(red.x, red.y)},
      {at: 400, opacity: 1, transform: move(red.x, red.y), easing: 'ease-in'},
      {at: 600, opacity: 0, transform: move(red.x, red.y)},
    ]);
    tl.each(actors('red-line'), () => [
      {at: 0, opacity: 1, strokeDashoffset: 1, easing: 'ease-out'},
      {at: 250, opacity: 1, strokeDashoffset: 0},
      {at: 300, opacity: 1, strokeDashoffset: 0, easing: 'ease-in'},
      {at: 600, opacity: 1, strokeDashoffset: 1},
      {at: 600, opacity: 0, strokeDashoffset: 1},
    ]);
    tl.add(actor('axis'), [
      {at: 0, opacity: 0, easing: 'ease-out'},
      {at: 250, opacity: 1},
      ...blink(950),
    ]);
    tl.add(actor('axis-v'), [{at: 0, opacity: 1}]);
    tl.each(actors('milestone'), (i) => {
      // Park each name beside a vertical-axis node, then fly it outwards.
      const x = 80 + i * 70;
      const y = 70 + i * 60 + 12;
      return [
        {at: 0, opacity: 0, transform: shift(18 - x, y)},
        {at: 250, opacity: 1, transform: shift(18 - x, y)},
        {at: 350, opacity: 1, transform: shift(18 - x, y), easing: EASE_ACCEL},
        {at: 850, opacity: 0, transform: shift(18 - x + 260, y)},
      ];
    });
    tl.each(actors('blue-line'), () => [
      {at: 300, opacity: 1, strokeDashoffset: -1, easing: 'ease-out'},
      {at: 600, opacity: 1, strokeDashoffset: 0},
      ...blink(950).map((k) => ({...k, strokeDashoffset: 0})),
    ]);
    tl.each(actors('square'), () => [{at: 600, opacity: 0}, {at: 600, opacity: 1}, ...blink(950)]);
    tl.add(actor('ring'), [
      {at: 300, opacity: 0, transform: `scale(${(star.r / guide.r).toFixed(4)})`, easing: EASE_IO},
      {at: 800, opacity: 1, transform: 'scale(1)'},
      {at: 950, opacity: 1, transform: 'scale(1)'},
      {at: 1250, opacity: 0, transform: 'scale(1)'},
    ]);
  };

  /* Theme flip: timed to the clip edge passing the title, so the page text
   * changes colour while the matching backdrop is under it. */
  const flipTime = (g: Geometry, launch: boolean): number => {
    const {star} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);
    const d = titleDistance(art, S);
    if (d === null || d <= rs || d >= full) return launch ? LAUNCH_FLIP_MS : LANDING_FLIP_MS;
    const at = launch
      ? timeAtRadius(d, full, rs, LAUNCH_CLIP)
      : timeAtRadius(d, rs, full, LANDING_CLIP);
    const [lo, hi] = launch ? [650, 1050] : [350, 800];
    return Math.round(Math.min(hi, Math.max(lo, at - FLIP_LEAD_MS)));
  };

  /* Desktop run: both plates mounted, shared clock, flip mid-way. */
  const runDesktop = (flip: () => void, target: Run['target']) => {
    const launch = target === 'dark';
    const total = launch ? LAUNCH_MS : LANDING_MS;
    const run = begin('desktop', total, flip, target);
    const g = measure(art);
    if (launch) {
      if (FILTERS_OFF_DURING_LAUNCH) {
        art.dataset.heroFilters = 'off';
        run.timers.push(window.setTimeout(() => delete art.dataset.heroFilters, LAUNCH_FILTERS_ON_MS));
      }
      buildLaunch(run.timeline, g);
    } else {
      buildLanding(run.timeline, g);
    }
    animateAltimeter(run, launch ? 'launch' : 'landing', 'desktop');
    flipAt(run, flipTime(g, launch));
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
  const unregister = setHeroSwitchHandler(handler);

  return () => {
    unregister();
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    if (current) finish(current);
  };
}
