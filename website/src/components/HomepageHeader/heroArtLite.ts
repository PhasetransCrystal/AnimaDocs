// Low-end tier for the hero art loops.
//
// Every idle loop in VisualStudy animates an SVG child (dash offset or an SVG
// transform). SVG children cannot get their own compositor layer, so each
// animation frame re-rasters the whole full-viewport art layer. A desktop GPU
// absorbs that; an integrated GPU at DPR 2 saturates and the idle hero drops
// to ~30fps. The loops are slow (drifts of a few px over 24-240s), so on such
// devices `[data-art-lite]` quantises them to ~12 updates per second
// (VisualStudy/styles.module.css), which is visually the same motion at a
// fraction of the raster work.
//
// The tier is chosen by measuring: the probe samples rAF while the hero is
// visible and idle. Devices that hold their frame rate never get the flag, so
// their animation is untouched.

const STORAGE_KEY = 'anima-hero-art-lite';
const START_DELAY = 1800;
const RETRY_DELAY = 1500;
const WINDOW = 1600;
// Mean fps below this marks the device as low-end; at or above GOOD_FPS the
// verdict is "full" and sampling stops.
const LITE_FPS = 48;
const GOOD_FPS = 55;

type Verdict = 'lite' | 'full';

const read = (): Verdict | null => {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value === 'lite' || value === 'full' ? value : null;
  } catch {
    return null;
  }
};

const store = (verdict: Verdict) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, verdict);
  } catch {
    // Storage blocked: the probe simply runs again next visit.
  }
};

/**
 * Starts the frame-rate probe for the hero art wrapper. `idle` reports whether
 * the loops are currently running (not paused, not mid theme switch).
 * Returns a cleanup function.
 */
export default function watchHeroArtLoad(art: HTMLElement, idle: () => boolean): () => void {
  const apply = () => {
    art.dataset.artLite = 'true';
  };

  const known = read();
  if (known === 'lite') apply();
  if (known) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let timer = 0;
  let frame = 0;
  let windows = 0;
  let start = 0;
  let last = 0;
  let count = 0;

  const schedule = (delay: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      start = 0;
      count = 0;
      frame = window.requestAnimationFrame(sample);
    }, delay);
  };

  const sample = (now: number) => {
    frame = 0;
    // A paused/switching hero or a background tab measures something else:
    // drop the window and try again later.
    if (!idle() || document.hidden || (last && now - last > 400)) {
      last = 0;
      schedule(RETRY_DELAY);
      return;
    }
    last = now;
    if (!start) start = now;
    else count += 1;
    if (now - start < WINDOW) {
      frame = window.requestAnimationFrame(sample);
      return;
    }
    last = 0;
    const fps = (count * 1000) / (now - start);
    windows += 1;
    if (fps >= GOOD_FPS) {
      store('full');
      return;
    }
    if (fps >= LITE_FPS) return; // Borderline: leave the loops as they are.
    // One slow window may be load-time noise; a second one confirms.
    if (windows < 2) {
      schedule(0);
      return;
    }
    store('lite');
    apply();
  };

  schedule(START_DELAY);

  return () => {
    window.clearTimeout(timer);
    window.cancelAnimationFrame(frame);
  };
}
