// Low-end tier for the hero art loops.
//
// Every idle loop in VisualStudy animates an SVG child (dash offset or an SVG
// transform). SVG children cannot get their own compositor layer, so each
// animation frame re-rasters the whole full-viewport art layer. A desktop GPU
// absorbs that; an integrated GPU at DPR 2 saturates and the idle hero drops
// to ~30fps. The loops are slow (drifts of a few px over 24-240s), so on such
// devices `[data-art-lite]` quantises them to ~12 updates per second
// (VisualStudy/styles.module.css), which is visually the same motion at a
// fraction of the raster work. The desktop theme switch takes its lite path
// whenever the flag is present (heroThemeSwitch.ts).
//
// The tier is chosen in two steps. A hardware hint runs once at mount (GPU
// renderer string, software-render caveat, cores/memory, physical pixel
// load) and picks the starting state:
//   strong low-end hint  -> data-art-lite="true" straight away, no probe
//   discrete GPU hint    -> no flag (full), the probe still verifies it
//   anything else        -> data-art-lite="pending", the probe decides
// States:
//   data-art-lite="pending"  no verdict yet: lite switch, full idle loops
//   data-art-lite="true"     low-end: lite switch, quantised loops
//   (absent)                 full, or reduced motion
// Idle quantisation waits for a real verdict because the probe has to measure
// the unquantised loops. The probe samples rAF while the hero is visible and
// idle, and marks its windows with [data-art-probe] so idle-time work (plate
// cache) stays out of the measurement.
//
// A hidden `[data-hero-tier]` element inside the art wrapper mirrors the
// result for inspection (tier, source, hint reason, last fps, GPU string).
// It stays in the DOM only; nothing is sent anywhere.

const STORAGE_KEY = 'anima-hero-art-lite';
const START_DELAY = 1800;
const RETRY_DELAY = 1500;
const WINDOW = 1600;
// Mean fps below this marks the device as low-end; at or above GOOD_FPS the
// verdict is "full" and sampling stops.
const LITE_FPS = 48;
const GOOD_FPS = 55;

// Physical pixels the art layer re-rasters per frame (viewport x DPR^2) above
// which an integrated GPU is treated as low-end without measuring. The test
// laptop (Iris Xe, 1600x865 at DPR 2) is ~5.5M and idles at 26-30fps.
const INTEGRATED_PIXEL_LIMIT = 3_500_000;

type Verdict = 'lite' | 'full';
type Start = 'lite' | 'full' | 'pending';

interface Hint {
  start: Start;
  reason: string;
  gpu: string;
}

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const DISCRETE_GPU = /nvidia|geforce|quadro|\brtx\b|\bgtx\b|radeon (rx|pro)|\barc a\d/i;
// Apple GPUs are left out on purpose: M-series handle the full loops at
// Retina DPR, so they go to the probe instead of a pixel-count verdict.
const INTEGRATED_GPU = /intel|iris|uhd|hd graphics|mali|adreno|powervr|radeon(\(tm\))? graphics|vega \d+ graphics/i;

/** Reads the GPU renderer string; `software` is true when the browser only
 * offers a context with a major performance caveat (software raster). */
const probeGpu = (): {gpu: string; software: boolean} => {
  try {
    const canvas = document.createElement('canvas');
    let gl = canvas.getContext('webgl', {failIfMajorPerformanceCaveat: true}) as WebGLRenderingContext | null;
    let software = false;
    if (!gl) {
      gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      software = gl !== null;
    }
    if (!gl) return {gpu: '', software: false};
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {gpu, software};
  } catch {
    return {gpu: '', software: false};
  }
};

/** Pre-sorts the device before any frame is measured. Only clear cases get a
 * starting tier; everything else stays pending for the probe. */
const hardwareHint = (): Hint => {
  const {gpu, software} = probeGpu();
  const nav = navigator as Navigator & {deviceMemory?: number};
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const dpr = window.devicePixelRatio || 1;
  const pixels = window.innerWidth * window.innerHeight * dpr * dpr;

  if (software || SOFTWARE_GPU.test(gpu)) return {start: 'lite', reason: 'software-raster', gpu};
  if (cores <= 4 && memory <= 4) return {start: 'lite', reason: 'low-cpu-memory', gpu};
  if (DISCRETE_GPU.test(gpu)) return {start: 'full', reason: 'discrete-gpu', gpu};
  if (INTEGRATED_GPU.test(gpu) && pixels >= INTEGRATED_PIXEL_LIMIT) {
    return {start: 'lite', reason: `integrated-gpu+${(pixels / 1e6).toFixed(1)}Mpx`, gpu};
  }
  return {start: 'pending', reason: gpu ? 'unclassified' : 'no-gpu-info', gpu};
};

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
  const probing = (on: boolean) => {
    if (on) art.dataset.artProbe = 'true';
    else delete art.dataset.artProbe;
  };

  // Hidden status tag (rendered in pages/index.tsx). Read it in DevTools or
  // with document.querySelector('[data-hero-tier]').dataset.
  const tag = art.querySelector<HTMLElement>('[data-hero-tier]');
  const report = (source: string, extra: Record<string, string> = {}) => {
    if (!tag) return;
    const lite = art.dataset.artLite;
    const tier = lite === 'true' ? 'lite' : lite === 'pending' ? 'pending' : 'full';
    tag.dataset.heroTier = tier;
    tag.dataset.source = source;
    for (const [key, value] of Object.entries(extra)) tag.dataset[key] = value;
    tag.textContent = `${tier} (${source})`;
  };

  const known = read();
  if (known === 'lite') art.dataset.artLite = 'true';
  if (known) {
    report('stored');
    return () => {};
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    report('reduced-motion');
    return () => {};
  }

  const hint = hardwareHint();
  const hinted = {reason: hint.reason, gpu: hint.gpu || 'unknown'};
  // A strong low-end hint is final: quantised loops would always measure
  // ~60fps, so probing them cannot overturn it.
  if (hint.start === 'lite') {
    art.dataset.artLite = 'true';
    store('lite');
    report('hint', hinted);
    return () => {};
  }
  // Otherwise start from the hint (full for a discrete GPU, pending lite
  // switch for the rest) and let the probe confirm or correct it.
  if (hint.start === 'pending') art.dataset.artLite = 'pending';
  report('hint', hinted);

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
      probing(true);
      frame = window.requestAnimationFrame(sample);
    }, delay);
  };

  const sample = (now: number) => {
    frame = 0;
    // A paused/switching hero or a background tab measures something else:
    // drop the window and try again later.
    if (!idle() || document.hidden || (last && now - last > 400)) {
      last = 0;
      probing(false);
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
    const measured = {fps: fps.toFixed(1), windows: String(windows)};
    if (fps >= GOOD_FPS) {
      probing(false);
      delete art.dataset.artLite;
      store('full');
      report('probe', measured);
      return;
    }
    // Borderline: no verdict, so this load keeps its hinted start and the
    // next load re-probes.
    if (fps >= LITE_FPS) {
      probing(false);
      report('probe-borderline', measured);
      return;
    }
    // One slow window may be load-time noise; a second one confirms.
    if (windows < 2) {
      report('probing', measured);
      schedule(0);
      return;
    }
    probing(false);
    art.dataset.artLite = 'true';
    store('lite');
    report('probe', measured);
  };

  schedule(START_DELAY);

  return () => {
    window.clearTimeout(timer);
    window.cancelAnimationFrame(frame);
    probing(false);
  };
}
