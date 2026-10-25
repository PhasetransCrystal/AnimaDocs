/** Switch-only raster plates. The caller owns lite-tier selection and visibility. */
export type PlateName =
  | 'd-ocean' | 'd-tiles' | 'd-lines' | 'd-guide'
  | 'n-grid' | 'n-core' | 'n-ticks' | 'n-orbits' | 'n-marks';

export interface PlateCache {
  /** Rendered canvas for the current art size, or null if not ready / stale. */
  get(name: PlateName): HTMLCanvasElement | null;
  /** True when every plate of that scene is ready. */
  ready(scene: 'day' | 'night'): boolean;
  /** Stop all work, remove canvases, drop images/object URLs, disconnect observers. */
  dispose(): void;
}

const SCENES: Record<'day' | 'night', PlateName[]> = {
  day: ['d-ocean', 'd-tiles', 'd-lines', 'd-guide'],
  night: ['n-grid', 'n-core', 'n-ticks', 'n-orbits', 'n-marks'],
};
const SVG_NS = 'http://www.w3.org/2000/svg';
// Apply the mask shorthand before its longhands: otherwise it resets mask-image.
const SVG_STYLES = [
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'opacity', 'visibility', 'display', 'color', 'stop-color',
  'stop-opacity', 'font-family', 'font-size', 'font-weight', 'font-style',
  'letter-spacing', 'text-anchor', 'dominant-baseline', 'paint-order', 'vector-effect',
  'mix-blend-mode', 'mask', 'mask-image', '-webkit-mask-image', 'clip-path', 'filter',
  'transform', 'transform-origin', 'transform-box', 'shape-rendering',
] as const;

function localUrls(value: string): string {
  return value.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (original, _quote, url: string) => {
    const hash = url.indexOf('#');
    return hash >= 0 && !url.startsWith('data:') ? `url(${url.slice(hash)})` : original;
  });
}

/** Clone and style together so omitted branches cannot misalign the live/clone walk. */
function styledClone(live: Element, win: Window, omitDefs = false): Element | null {
  if (live.matches('[data-plate-skip]') || (omitDefs && live.localName === 'defs')) return null;
  const clone = live.cloneNode(false) as SVGElement;
  clone.removeAttribute('class');
  // Drop inline custom properties, animation declarations and will-change too.
  clone.removeAttribute('style');
  const computed = win.getComputedStyle(live);
  for (const property of SVG_STYLES) {
    const value = computed.getPropertyValue(property);
    // The inactive scene is baked while display:none, where Chrome reports
    // `none` for an SVG transform attribute; an inline `transform: none`
    // would then override the attribute (e.g. the orbit group's rotation).
    if (property === 'transform' && value === 'none' && live.hasAttribute('transform')) continue;
    if (value) clone.style.setProperty(property, localUrls(value));
  }
  for (const child of Array.from(live.childNodes)) {
    if (child.nodeType === 1) {
      const copy = styledClone(child as Element, win, omitDefs);
      if (copy) clone.appendChild(copy);
    } else {
      clone.appendChild(child.cloneNode(true));
    }
  }
  return clone;
}

/** Animation changes and style reads must stay in this one synchronous task. */
function serializePlate(source: SVGSVGElement, art: HTMLElement, win: Window, width: number, height: number): string {
  const defs = Array.from(art.querySelectorAll('defs')).filter((def) => !def.closest('[data-plate-skip]'));
  const animations = new Set(source.getAnimations({subtree: true}));
  for (const def of defs) {
    for (const animation of def.getAnimations({subtree: true})) animations.add(animation);
  }
  const saved = Array.from(animations, (animation) => ({
    animation, time: animation.currentTime, state: animation.playState,
  }));
  try {
    for (const {animation} of saved) {
      animation.pause();
      animation.currentTime = 0;
    }
    const clone = styledClone(source, win, true) as SVGSVGElement | null;
    if (!clone) throw new Error('Plate source is excluded');
    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.style.opacity = '1';
    clone.style.transform = 'none';
    clone.removeAttribute('transform');
    const definitions = art.ownerDocument.createDocumentFragment();
    // Source defs were omitted above; collect one styled copy of every definition.
    const ids = new Set<string>();
    for (const def of defs) {
      if (def.parentElement?.closest('defs')) continue;
      const copy = styledClone(def, win);
      if (!copy) continue;
      const deduplicate = (element: Element): void => {
        if (element.id) {
          if (ids.has(element.id)) { element.remove(); return; }
          ids.add(element.id);
        }
        for (const child of Array.from(element.children)) deduplicate(child);
      };
      definitions.appendChild(copy);
      deduplicate(copy);
    }
    clone.insertBefore(definitions, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  } finally {
    // Restore every animation even if one fails (e.g. its timeline was detached).
    let restoreError: unknown;
    for (const {animation, time, state} of saved) {
      try {
        if (state === 'idle') animation.cancel();
        else if (state === 'running') animation.play();
        else if (state === 'finished') animation.finish();
        else animation.pause();
        animation.currentTime = time;
      } catch (error) { restoreError = error; }
    }
    if (restoreError) throw restoreError;
  }
}

type Plate = {source: SVGSVGElement; canvas: HTMLCanvasElement; state: 'pending' | 'ready' | 'failed'};
type DecodeJob = {plate: Plate; image: HTMLImageElement; url: string; generation: number; decoded: boolean};

export function createPlateCache(art: HTMLElement, options: {scale?: number; busy?: () => boolean} = {}): PlateCache {
  const win = art.ownerDocument.defaultView;
  if (!win) return {get: () => null, ready: () => false, dispose: () => {}};
  const scale = Number.isFinite(options.scale) && options.scale! > 0 ? options.scale! : 0.5;
  const plates = new Map<PlateName, Plate>();
  for (const name of [...SCENES.day, ...SCENES.night]) {
    const source = art.querySelector<SVGSVGElement>(`svg[data-hero-layer="${name}"]`);
    if (!source) continue;
    const canvas = art.ownerDocument.createElement('canvas');
    canvas.dataset.heroPlate = name;
    canvas.setAttribute('aria-hidden', 'true');
    source.before(canvas);
    plates.set(name, {source, canvas, state: 'pending'});
  }

  let disposed = false;
  let warned = false;
  let generation = 0;
  let width = art.clientWidth;
  let height = art.clientHeight;
  let dpr = win.devicePixelRatio || 1;
  let timer: number | undefined;
  let idle: number | undefined;
  let idleIsTimeout = false;
  let job: DecodeJob | null = null;
  let resolution: MediaQueryList | null = null;
  const initialDeadline = Date.now() + 1200;

  function warn(error: unknown): void {
    if (!warned && process.env.NODE_ENV !== 'production') {
      warned = true;
      console.warn('[heroPlateCache] Could not render a hero plate.', error);
    }
  }

  function dropJob(): void {
    if (!job) return;
    URL.revokeObjectURL(job.url);
    job.image.removeAttribute('src');
    job = null;
  }

  function cancelSchedule(): void {
    if (timer !== undefined) win!.clearTimeout(timer);
    if (idle !== undefined) {
      if (idleIsTimeout) win!.clearTimeout(idle);
      else win!.cancelIdleCallback(idle);
    }
    timer = idle = undefined;
  }

  function schedule(delay = 0): void {
    if (disposed || timer !== undefined || idle !== undefined) return;
    timer = win!.setTimeout(() => {
      timer = undefined;
      if (disposed) return;
      idleIsTimeout = typeof win!.requestIdleCallback !== 'function';
      idle = idleIsTimeout
        ? win!.setTimeout(work, 32)
        : win!.requestIdleCallback(work, {timeout: 1000});
    }, Math.max(delay, initialDeadline - Date.now()));
  }

  function invalidate(): void {
    generation += 1;
    cancelSchedule();
    dropJob();
    for (const plate of plates.values()) plate.state = 'pending';
    schedule(400);
  }

  function checkSize(): boolean {
    const nextWidth = art.clientWidth;
    const nextHeight = art.clientHeight;
    const nextDpr = win!.devicePixelRatio || 1;
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return false;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    invalidate();
    return true;
  }

  function sourceAnimating(source: SVGSVGElement): boolean {
    return source.getAnimations().some((animation) => animation.playState === 'running' || animation.pending);
  }

  function work(): void {
    idle = undefined;
    if (disposed) return;
    if (options.busy?.()) { schedule(200); return; }
    if (checkSize()) return;
    if (width <= 0 || height <= 0 || !art.isConnected) { schedule(400); return; }

    if (job) {
      if (!job.decoded) return;
      if (sourceAnimating(job.plate.source)) { schedule(200); return; }
      const {plate, image} = job;
      try {
        // Never below one device pixel per CSS pixel on DPR-1 screens.
        const ratio = Math.max(1, Math.min(dpr, 2) * scale);
        plate.canvas.width = Math.max(1, Math.round(width * ratio));
        plate.canvas.height = Math.max(1, Math.round(height * ratio));
        const context = plate.canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context unavailable');
        context.drawImage(image, 0, 0, plate.canvas.width, plate.canvas.height);
        plate.state = 'ready';
      } catch (error) {
        plate.state = 'failed';
        warn(error);
      } finally { dropJob(); }
      schedule();
      return;
    }

    const night = art.querySelector('[data-hero-scene="night"]');
    const inactive = night && win!.getComputedStyle(night).display === 'none' ? 'night' : 'day';
    const order = [...SCENES[inactive], ...SCENES[inactive === 'day' ? 'night' : 'day']];
    const plate = order.map((name) => plates.get(name)).find((candidate) => candidate?.state === 'pending');
    if (!plate) return;
    if (sourceAnimating(plate.source)) { schedule(200); return; }
    try {
      const xml = serializePlate(plate.source, art, win!, width, height);
      const url = URL.createObjectURL(new Blob([xml], {type: 'image/svg+xml;charset=utf-8'}));
      const image = new Image();
      const pending: DecodeJob = {plate, image, url, generation, decoded: false};
      job = pending;
      image.src = url;
      // Decoding may finish during a switch. Drawing is always a separate idle
      // slice, with a fresh busy/size check and a generation guard.
      void image.decode().then(() => {
        if (disposed || job !== pending || pending.generation !== generation) return;
        pending.decoded = true;
        schedule();
      }).catch((error: unknown) => {
        if (disposed || job !== pending || pending.generation !== generation) return;
        plate.state = 'failed';
        dropJob();
        warn(error);
        schedule();
      });
    } catch (error) {
      plate.state = 'failed';
      dropJob();
      warn(error);
      schedule();
    }
  }

  function watchResolution(): void {
    resolution?.removeEventListener('change', onResolution);
    resolution = win!.matchMedia(`(resolution: ${win!.devicePixelRatio || 1}dppx)`);
    resolution.addEventListener('change', onResolution);
  }
  function onResolution(): void {
    checkSize();
    watchResolution();
  }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { checkSize(); });
  observer?.observe(art);
  win.addEventListener('resize', checkSize);
  watchResolution();
  schedule(1200);

  function get(name: PlateName): HTMLCanvasElement | null {
    if (disposed || checkSize()) return null;
    const plate = plates.get(name);
    return plate?.state === 'ready' ? plate.canvas : null;
  }
  return {
    get,
    ready: (scene) => SCENES[scene].every((name) => get(name) !== null),
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      cancelSchedule();
      dropJob();
      observer?.disconnect();
      win.removeEventListener('resize', checkSize);
      resolution?.removeEventListener('change', onResolution);
      resolution = null;
      for (const {canvas} of plates.values()) {
        canvas.remove();
        canvas.width = canvas.height = 0;
      }
      plates.clear();
    },
  };
}
