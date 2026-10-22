/* Hero theme switch choreography (artifacts/handoff/hero-launch-landing-spec.md).
 * Desktop: WAAPI timelines over whole SVG layers plus a light actor overlay.
 * Mobile (≤640px): View Transition circle reveal from the top centre.
 * Every animation is cancelled at the end, so the static plate is the end
 * state and nothing has to be swapped back by hand. */
import {AXIS_DECADE, HERO_ANCHORS} from '@site/src/components/VisualStudy';
import {heroSwitchState, setHeroSwitchHandler} from '@site/src/utils/heroSwitchHook';

import {ALT_EASE, bezier, driveAltimeter} from './altimeterDriver';

type Direction = 'launch' | 'landing';
type Mode = 'desktop' | 'mobile';
type Key = Record<string, string | number | undefined> & {at: number};
type Target = Element | null | undefined;
type ViewTransitionLike = {ready: Promise<void>; finished: Promise<void>};
type VTDocument = {startViewTransition?: (update: () => void) => ViewTransitionLike};

const LAUNCH_MS = 1300;
const LANDING_MS = 1050;
const LAUNCH_FLIP_MS = 700;
const LANDING_FLIP_MS = 450;
const LAUNCH_FILTERS_ON_MS = 1000;
/** Altimeter number lands (and the axis ladder stops) at these times. */
const LAUNCH_LAND_MS = 1150;
const LANDING_LAND_MS = 850;
/** Ladder travel from 325 m to 799,000 km in decade units. */
const LADDER_SPAN = AXIS_DECADE * Math.log10(799_000_000 / 325);
const REST_READING_OPACITY = 0.42;
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
const LAUNCH_CLIP = {from: 440, to: 840, curve: [0.7, 0, 0.85, 0.3]} as const;
const LANDING_CLIP = {from: 240, to: 720, curve: [0.6, 0, 0.4, 1]} as const;
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
      const sp = launch ? [0, 350, 900, 1000] : [0, 250, 600, 700];
      const br = launch ? [1000, 1080, 1150] : [700, 780, 850];
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
  const animateAxis = (tl: Timeline, launch: boolean) => {
    const landAt = launch ? LAUNCH_LAND_MS : LANDING_LAND_MS;
    const set = launch ? 'h' : 'v';
    const shift = (pos: number) => (launch ? `translateX(${n(-pos)}px)` : `translateY(${n(pos)}px)`);
    const [from, to] = launch ? [0, LADDER_SPAN] : [LADDER_SPAN, 0];
    art.querySelectorAll('[data-hero-axis]').forEach((svg) => {
      tl.add(svg.querySelector(`[data-axis-set="${set}"]`), launch
        ? [{at: 220, opacity: 0}, {at: 320, opacity: 1}, {at: 1080, opacity: 1}, {at: 1220, opacity: 0}]
        : [{at: 0, opacity: 0}, {at: 120, opacity: 1}, ...blink(760)]);
      const start = launch ? 240 : 0;
      tl.each(svg.querySelectorAll(`[data-axis-set="${set}"] [data-axis-arm]`), (i) => [
        {at: start + (i >> 1) * 30, strokeDashoffset: 1, easing: 'cubic-bezier(.2,.7,.2,1)'},
        {at: start + 380 + (i >> 1) * 30, strokeDashoffset: 0},
      ]);
      tl.add(svg.querySelector(`[data-axis-ladder="${set}"]`), [
        {at: 0, transform: shift(from), easing: ALT_EASE},
        {at: landAt, transform: shift(to)},
      ]);
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

  /* Day -> night: launch into orbit (1300ms). Nothing travels: the actor
   * rig sits on the pad arc, which is the white star's position. */
  const buildLaunch = (tl: Timeline, g: Geometry) => {
    const {star, disc: red, pad} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const F = toPx(g, red.x, red.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);
    const starOrigin = `${n(S[0])}px ${n(S[1])}px`;
    const focusOrigin = `${n(F[0])}px ${n(F[1])}px`;

    // Day scenery peels off as whole layers.
    tl.add(layer('d-ocean'), [{at: 0, opacity: 1, easing: 'ease-out'}, {at: 200, opacity: 0}]);
    tl.add(layer('d-guide'), [{at: 0, opacity: 1, easing: 'ease-out'}, {at: 180, opacity: 0}]);
    tl.add(layer('d-lines'), [
      {at: 150, opacity: 1, transform: 'scale(1)', transformOrigin: starOrigin, easing: 'ease-in'},
      {at: 480, opacity: 0, transform: 'scale(0.96)', transformOrigin: starOrigin},
    ]);
    tl.each(tiles(), (i) => {
      const t = 200 + i * 45;
      return [{at: t, opacity: 1}, {at: t, opacity: 0}];
    });

    // Colour layer and the day clip, both centred on the white star. The
    // clip ends 40ms before the colour disc, so red shows ~790-880ms.
    tl.add(q('[data-hero-colour]'), [
      {at: 360, opacity: 1, transform: disc(full, S), backgroundColor: '#c6383d', easing: 'cubic-bezier(.5,0,.75,.4)'},
      {at: 880, opacity: 1, transform: disc(rs, S), backgroundColor: '#e34549'},
      {at: 920, opacity: 0, transform: disc(rs, S), backgroundColor: '#e34549'},
    ]);
    tl.add(scene('day'), [
      {at: LAUNCH_CLIP.from, clipPath: clip(full, S), easing: cssBezier(LAUNCH_CLIP.curve)},
      {at: LAUNCH_CLIP.to, clipPath: clip(rs, S)},
      {at: 920, clipPath: clip(0, S)},
    ]);

    // Night builds up under the shrinking clip: grid, tick ring turning in,
    // orbits settling, pixels stepping on, labels, then the red star last.
    tl.add(layer('n-grid'), [{at: 440, opacity: 0}, {at: 700, opacity: 1}]);
    tl.add(layer('n-ticks'), [
      {at: 520, opacity: 0, transform: 'rotate(-10deg)', transformOrigin: focusOrigin, easing: 'cubic-bezier(.2,.7,.3,1)'},
      {at: 920, opacity: 1, transform: 'rotate(0deg)', transformOrigin: focusOrigin},
    ]);
    tl.add(layer('n-orbits'), [
      {at: 600, opacity: 0, transform: 'scale(1.08)', transformOrigin: focusOrigin, easing: 'cubic-bezier(.2,.7,.3,1)'},
      {at: 980, opacity: 1, transform: 'scale(1)', transformOrigin: focusOrigin},
    ]);
    tl.each(art.querySelectorAll('[data-pixel-group]'), (i) => {
      const t = 760 + i * 70;
      return [{at: t, opacity: 0}, {at: t, opacity: 1}];
    });
    tl.add(q('[data-night-labels]'), [{at: 950, opacity: 0}, {at: 1150, opacity: 1}]);
    tl.add(q('[data-night-stars]'), [{at: 440, opacity: 0}, {at: 700, opacity: 1}]);
    tl.add(layer('n-core'), [{at: 1000, opacity: 0}, {at: 1250, opacity: 1}]);

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
    tl.each(actors('red-line'), (i) => strokeKeys([
      [550 + i * 30, 1, 'ease-out'],
      [850, 0.45, EASE_POP],
      [1100, 0],
    ], 1150));

    tl.each(actors('red-end'), (i) => [
      {at: 1060 + i * 40, opacity: 0},
      {at: 1080 + i * 40, opacity: 1},
      {at: 1160 + i * 30, opacity: 1},
      {at: 1180 + i * 30, opacity: 0},
    ]);
    tl.add(actor('leader-red'), strokeKeys([[1000, 1, 'ease-out'], [1120, 0]], 1200));
    tl.add(actor('caption-red'), [
      {at: 1060, opacity: 0},
      {at: 1120, opacity: 1},
      {at: 1200, opacity: 1},
      {at: 1280, opacity: 0},
    ]);

    // White dot takes over as the clip lands on the star; the flat red star
    // stand-in fades in at its final size and hands over to the real disc.
    tl.add(actor('dot'), [
      {at: LAUNCH_CLIP.to, opacity: 0},
      {at: LAUNCH_CLIP.to + 40, opacity: 1},
      {at: 1200, opacity: 1},
      {at: 1300, opacity: 0},
    ]);
    tl.add(actor('disc'), [
      {at: 820, opacity: 0, transform: move(red.x, red.y, 1), easing: 'ease-out'},
      {at: 960, opacity: 1, transform: move(red.x, red.y, 1)},
      {at: 1160, opacity: 1, transform: move(red.x, red.y, 1)},
      {at: 1300, opacity: 0, transform: move(red.x, red.y, 1)},
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
      {at: 120, opacity: 0, transform: 'scale(0.3)'},
      {at: 120, opacity: 0.8, transform: 'scale(0.3)', easing: 'cubic-bezier(.1,.6,.3,1)'},
      {at: 520, opacity: 0, transform: 'scale(1.5)'},
    ]);
    tl.add(actor('trace'), strokeKeys([
      [300, 1, 'cubic-bezier(.5,0,.2,1)'],
      [980, 0],
    ], 1180));
    animateAxis(tl, true);
  };

  /* Night -> day: landing (1050ms). */
  const buildLanding = (tl: Timeline, g: Geometry) => {
    const {star, disc: red, pad} = HERO_ANCHORS;
    const S = toPx(g, star.x, star.y);
    const F = toPx(g, red.x, red.y);
    const rs = star.r * g.s;
    const full = farthest(g, S);
    const focusOrigin = `${n(F[0])}px ${n(F[1])}px`;

    // Day clip opens from the white star; cobalt wave runs ahead of it.
    tl.add(scene('day'), [
      {at: 0, clipPath: clip(0, S)},
      {at: LANDING_CLIP.from, clipPath: clip(rs, S), easing: cssBezier(LANDING_CLIP.curve)},
      {at: LANDING_CLIP.to, clipPath: clip(full, S)},
    ]);
    tl.add(q('[data-hero-colour]'), [
      {at: 200, opacity: 1, transform: disc(rs, S), backgroundColor: '#245dcc', easing: 'cubic-bezier(.4,0,.8,.5)'},
      {at: 600, opacity: 1, transform: disc(full, S), backgroundColor: '#e4ecf8'},
      {at: 720, opacity: 0, transform: disc(full, S), backgroundColor: '#e4ecf8'},
    ]);

    // Night peels off in layers while the day clip spreads: labels, pixels,
    // red star, tick ring turning out; orbits and grid stay until covered.
    tl.add(q('[data-night-labels]'), [{at: 0, opacity: 1}, {at: 120, opacity: 0}]);
    tl.add(q('[data-night-stars]'), [{at: 120, opacity: 1, easing: 'ease-in'}, {at: 360, opacity: 0}]);
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
      {at: 380, opacity: 1, transform: 'scale(1)', transformOrigin: focusOrigin, easing: 'ease-in'},
      {at: 640, opacity: 0, transform: 'scale(1.06)', transformOrigin: focusOrigin},
    ]);

    // Day layers return once the clip covers the hero (short rise).
    tl.add(layer('d-ocean'), [
      {at: 760, opacity: 0, transform: 'translateY(4px)', easing: 'ease-out'},
      {at: 1050, opacity: 1, transform: 'translateY(0px)'},
    ]);
    tl.add(layer('d-lines'), [{at: 760, opacity: 0, easing: 'ease-out'}, {at: 1050, opacity: 1}]);
    tl.add(layer('d-guide'), [{at: 760, opacity: 0, easing: 'ease-out'}, {at: 1050, opacity: 1}]);
    tl.each(tiles(), (i) => {
      const t = 560 + i * 40;
      return [{at: t, opacity: 0}, {at: t, opacity: 1}];
    });

    // White star goes paper-white and hands over to the clip.
    tl.add(actor('dot'), [
      {at: 0, opacity: 1, fill: '#ece9e3'},
      {at: 240, opacity: 1, fill: '#ece9e3'},
      {at: 320, opacity: 1, fill: '#f1f3f2'},
      {at: 380, opacity: 0, fill: '#f1f3f2'},
    ]);
    // Pad arc grows with the clip until it reaches its own radius.
    const t44 = timeAtRadius(pad.r * g.s, rs, full, LANDING_CLIP);
    tl.add(actor('ring'), [
      {at: LANDING_CLIP.from, opacity: 0, transform: `scale(${(star.r / pad.r).toFixed(4)})`, easing: 'ease-out'},
      {at: LANDING_CLIP.from + 30, opacity: 1, transform: `scale(${(star.r / pad.r).toFixed(4)})`, easing: 'ease-out'},
      {at: t44, opacity: 1, transform: 'scale(1)'},
      {at: 900, opacity: 1, transform: 'scale(1)'},
      {at: 1050, opacity: 0, transform: 'scale(1)'},
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
      day: (k) => strokeKeys([[300 + k * 40, 1, 'ease-out'], [520 + k * 40, 0]], 760 + k * 30),
    });
    tl.each(actors('blue-line'), (i) => [
      ...strokeKeys([[280 + i * 30, -1, 'ease-out'], [500 + i * 30, 0]]).slice(0, -1),
      ...blink(760).map((k) => ({...k, strokeDashoffset: 0})),
    ]);

    tl.each(actors('square'), (i) => [
      {at: 500 + i * 30, opacity: 0},
      {at: 500 + i * 30, opacity: 1},
      ...blink(760),
    ]);
    tl.add(actor('leader-blue'), [
      ...strokeKeys([[400, 1, 'ease-out'], [520, 0]]).slice(0, -1),
      {at: 840, opacity: 1, strokeDashoffset: 0},
      {at: 900, opacity: 0, strokeDashoffset: 0},
    ]);
    tl.add(actor('caption-blue'), [
      {at: 470, opacity: 0},
      {at: 530, opacity: 1},
      {at: 840, opacity: 1},
      {at: 900, opacity: 0},
    ]);

    // Free study: deorbit (the orbit trace winds back into the satellite),
    // then touchdown: reticle locks onto the pad, two ripples, blink out.
    tl.add(actor('trace'), strokeKeys([
      [0, 0, 'cubic-bezier(.55,0,.75,.4)'],
      [420, 1],
    ]).map((k) => ({...k, stroke: '#ece9e3'})));
    tl.add(actor('reticle'), [
      {at: 700, opacity: 0, transform: 'scale(1.8)', easing: EASE_POP},
      {at: 820, opacity: 1, transform: 'scale(1)'},
      ...blink(900).map((k) => ({...k, transform: 'scale(1)'})),
    ]);
    tl.each(actors('ripple'), (i) => {
      const t = 690 + i * 90;
      return [
        {at: t, opacity: 0, transform: 'scale(0.4)'},
        {at: t, opacity: 0.7, transform: 'scale(0.4)', easing: 'cubic-bezier(.1,.6,.3,1)'},
        {at: t + 260, opacity: 0, transform: 'scale(1.6)'},
      ];
    });
    animateAxis(tl, false);
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
    const [lo, hi] = launch
      ? [LAUNCH_CLIP.from + 60, LAUNCH_CLIP.to]
      : [LANDING_CLIP.from + 40, LANDING_CLIP.to - 60];
    return Math.round(Math.min(hi, Math.max(lo, at - FLIP_LEAD_MS)));
  };

  /* Desktop run: both plates mounted, shared clock, flip mid-way. */
  const runDesktop = (flip: () => void, target: Run['target']) => {
    const launch = target === 'dark';
    const total = launch ? LAUNCH_MS : LANDING_MS;
    const run = begin('desktop', total, flip, target);
    const g = measure(art);
    setupAxis(g);
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
