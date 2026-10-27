/* Mobile switch bitmaps (heroThemeSwitch.ts, "plate" variant). Each scene is
 * baked once into ONE canvas at its on-screen geometry (every visible SVG
 * layer merged into a single image), wrapped in a host that carries the
 * scene's CSS backdrop and veil as plain gradients. The switch then only
 * composites base (live scene) | circle mask | top (this host). Scenes pin
 * their own palette, so a bake does not depend on the page theme; it is
 * invalidated only by size / DPR changes. Never runs while the page is
 * hidden or wider than the phone breakpoint. */
import {styledClone} from './heroPlateCache';

export type SceneName = 'day' | 'night';

export interface SceneBake {
  /** Opaque stand-in for the scene, or null if not ready / stale. */
  get(scene: SceneName): HTMLElement | null;
  dispose(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Only phones use the plate switch; wider screens never bake. */
const MAX_WIDTH = 640;
const px = (v: number) => v.toFixed(2);
/** Height drift (CSS px) tolerated without re-baking. */
const HEIGHT_SLACK = 16;

type Paint = {color: string; image: string};
type Serialized = {xml: string; back: Paint; veil: Paint | null};

const paintOf = (style: CSSStyleDeclaration): Paint => ({color: style.backgroundColor, image: style.backgroundImage});
const applyPaint = (el: HTMLElement, paint: Paint | null) => {
  el.style.backgroundColor = paint?.color ?? 'transparent';
  el.style.backgroundImage = paint?.image ?? 'none';
};

/**
 * Serialise the scene's SVG layers as one SVG document in art-local CSS px.
 * An inactive scene is mounted (visibility hidden) for this one synchronous
 * task only: style + layout, unmounted again before any frame is painted.
 * Its CSS loops are created fresh at phase 0, which is where they restart
 * when the switch mounts the scene for real.
 */
function serializeScene(art: HTMLElement, scene: HTMLElement, w: number, h: number): Serialized {
  const doc = art.ownerDocument;
  const win = doc.defaultView!;
  const hidden = win.getComputedStyle(scene).display === 'none';
  if (hidden) {
    // Opacity, not visibility: visibility inherits, so styledClone would
    // inline `hidden` into every cloned node and the bitmap came out empty.
    // Opacity stays on the scene box, which is never cloned.
    scene.style.opacity = '0';
    scene.style.display = 'block';
  }
  // Loops are read at phase 0, where a scene restarts when it mounts at the
  // end of a switch. The active scene has been running since load, so without
  // the rewind its bake showed e.g. the tick ring a few degrees off and the
  // plate visibly jumped on the swap. Seek only (no pause/play): play state
  // stays CSS-driven, so [data-art-paused] keeps working. Same task restore.
  const seeks = new Set(scene.getAnimations({subtree: true}));
  for (const def of Array.from(art.querySelectorAll('defs'))) {
    for (const animation of def.getAnimations({subtree: true})) seeks.add(animation);
  }
  const saved = Array.from(seeks, (animation) => ({animation, time: animation.currentTime}));
  for (const {animation} of saved) {
    try { animation.currentTime = 0; } catch { /* detached timeline */ }
  }
  try {
    const a = art.getBoundingClientRect();
    const out = doc.createElementNS(SVG_NS, 'svg');
    out.setAttribute('xmlns', SVG_NS);
    out.setAttribute('width', String(w));
    out.setAttribute('height', String(h));
    // Shared definitions (filters, gradients, masks) once, ids de-duplicated.
    const ids = new Set<string>();
    const defs = doc.createElementNS(SVG_NS, 'defs');
    for (const def of Array.from(art.querySelectorAll('defs'))) {
      if (def.parentElement?.closest('defs')) continue;
      const copy = styledClone(def, win, false, true);
      if (!copy) continue;
      copy.querySelectorAll('[id]').forEach((el) => {
        if (ids.has(el.id)) el.remove();
        else ids.add(el.id);
      });
      while (copy.firstChild) defs.appendChild(copy.firstChild);
    }
    out.appendChild(defs);
    for (const child of Array.from(scene.children)) {
      if (!(child instanceof SVGSVGElement)) continue;
      const cs = win.getComputedStyle(child);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const r = child.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const clone = styledClone(child, win, true, true) as SVGSVGElement | null;
      if (!clone) continue;
      clone.setAttribute('x', px(r.left - a.left));
      clone.setAttribute('y', px(r.top - a.top));
      clone.setAttribute('width', px(r.width));
      clone.setAttribute('height', px(r.height));
      clone.style.overflow = cs.overflow === 'visible' ? 'visible' : 'hidden';
      clone.style.removeProperty('transform');
      clone.style.removeProperty('opacity');
      out.appendChild(clone);
    }
    const after = win.getComputedStyle(scene, '::after');
    return {
      xml: new XMLSerializer().serializeToString(out),
      back: paintOf(win.getComputedStyle(scene)),
      veil: after.content && after.content !== 'none' ? paintOf(after) : null,
    };
  } finally {
    for (const {animation, time} of saved) {
      try { animation.currentTime = time; } catch { /* detached timeline */ }
    }
    if (hidden) {
      scene.style.removeProperty('display');
      scene.style.removeProperty('opacity');
    }
  }
}

type Bake = {host: HTMLElement; canvas: HTMLCanvasElement; veil: HTMLElement; state: 'pending' | 'ready' | 'failed'};

export function createSceneBake(art: HTMLElement, options: {busy?: () => boolean} = {}): SceneBake {
  const win = art.ownerDocument.defaultView;
  if (!win) return {get: () => null, dispose: () => {}};
  const doc = art.ownerDocument;
  const bakes = new Map<SceneName, Bake>();
  for (const name of ['day', 'night'] as const) {
    // host > inner > (canvas, veil). The switch clips host and counter-scales
    // inner; at rest the host is display:none (VisualStudy styles).
    const host = doc.createElement('div');
    host.dataset.heroBake = name;
    host.setAttribute('aria-hidden', 'true');
    const inner = doc.createElement('div');
    inner.dataset.heroBakeInner = '';
    const canvas = doc.createElement('canvas');
    const veil = doc.createElement('div');
    veil.dataset.heroBakeVeil = '';
    inner.append(canvas, veil);
    host.append(inner);
    art.insertBefore(host, art.querySelector('[data-hero-noise]'));
    bakes.set(name, {host, canvas, veil, state: 'pending'});
  }
  let disposed = false;
  let generation = 0;
  let width = art.clientWidth;
  let height = art.clientHeight;
  let dpr = win.devicePixelRatio || 1;
  let timer: number | undefined;
  let idle: number | undefined;
  let url = '';

  const canWork = () =>
    !disposed && !doc.hidden && win.innerWidth <= MAX_WIDTH && art.isConnected && !options.busy?.();

  function drop(): void {
    if (url) URL.revokeObjectURL(url);
    url = '';
  }
  function cancel(): void {
    if (timer !== undefined) win!.clearTimeout(timer);
    if (idle !== undefined) {
      if (typeof win!.cancelIdleCallback === 'function') win!.cancelIdleCallback(idle);
      else win!.clearTimeout(idle);
    }
    timer = idle = undefined;
  }
  function schedule(delay = 0): void {
    if (disposed || timer !== undefined || idle !== undefined) return;
    timer = win!.setTimeout(() => {
      timer = undefined;
      idle = typeof win!.requestIdleCallback === 'function'
        ? win!.requestIdleCallback(work, {timeout: 1500})
        : win!.setTimeout(work, 32);
    }, delay);
  }
  /* A canvas drawn while display:none is uploaded on its first visible
   * frame, which made the first switch after load open with a ~250ms stall
   * (4x CPU). Show the host for two idle frames, nearly transparent and
   * clipped to one pixel, so that upload happens before any click. */
  function warm(host: HTMLElement): void {
    if (host.dataset.live !== undefined) return;
    host.dataset.warm = '';
    let frames = 0;
    const step = () => {
      frames += 1;
      if (frames < 3 && !disposed && host.dataset.live === undefined) win!.requestAnimationFrame(step);
      else delete host.dataset.warm;
    };
    win!.requestAnimationFrame(step);
  }
  function checkSize(): boolean {
    const w = art.clientWidth;
    const h = art.clientHeight;
    const d = win!.devicePixelRatio || 1;
    // The art is a few px taller in one theme than the other (hero copy
    // metrics). Re-baking for that would drop both bitmaps on every switch
    // and send the next quick switch to the View Transition fallback; the
    // bitmap is stretched to the live box instead (<1.5% here, invisible).
    if (w === width && d === dpr && Math.abs(h - height) <= HEIGHT_SLACK) return false;
    width = w;
    height = h;
    dpr = d;
    generation += 1;
    drop();
    for (const bake of bakes.values()) bake.state = 'pending';
    cancel();
    schedule(500);
    return true;
  }

  function work(): void {
    idle = undefined;
    if (disposed) return;
    if (!canWork()) { schedule(800); return; }
    if (checkSize() || width <= 0 || height <= 0) return;
    // Both scenes are baked (inactive first), so the switch never has to fall
    // back to the View Transition variant on the way back. styledClone rewinds
    // loops to phase 0 for the clone only (restored in the same task), which
    // is where they restart when the switch mounts the scene for real.
    const inactive: SceneName = doc.documentElement.dataset.theme === 'dark' ? 'day' : 'night';
    const order: SceneName[] = inactive === 'day' ? ['day', 'night'] : ['night', 'day'];
    const name = order.find((s) => bakes.get(s)!.state === 'pending');
    if (!name) return;
    const bake = bakes.get(name)!;
    const next = () => {
      if (Array.from(bakes.values()).some((b) => b.state === 'pending')) schedule(400);
    };
    const source = art.querySelector<HTMLElement>(`[data-hero-scene="${name}"]`);
    if (!source) { bake.state = 'failed'; return; }
    const ratio = Math.max(1, Math.min(dpr, 2) * (art.closest('[data-art-lite="true"]') ? 0.5 : 1));
    const pw = Math.max(1, Math.round(width * ratio));
    const ph = Math.max(1, Math.round(height * ratio));
    const mine = generation;
    const fail = () => {
      if (mine !== generation) return;
      bake.state = 'failed';
      drop();
      next();
    };
    try {
      const {xml, back, veil} = serializeScene(art, source, width, height);
      drop();
      url = URL.createObjectURL(new Blob([xml], {type: 'image/svg+xml;charset=utf-8'}));
      const image = new Image();
      image.src = url;
      void image.decode().then(() => {
        // Draw in its own slice, with fresh busy / hidden / size checks.
        const draw = () => {
          if (disposed || mine !== generation) return;
          if (!canWork()) { win!.setTimeout(draw, 400); return; }
          try {
            bake.canvas.width = pw;
            bake.canvas.height = ph;
            const context = bake.canvas.getContext('2d');
            if (!context) throw new Error('Canvas 2D context unavailable');
            context.drawImage(image, 0, 0, pw, ph);
            // Backdrop on the art-sized inner box (the host is the circle).
            applyPaint(bake.canvas.parentElement as HTMLElement, back);
            applyPaint(bake.veil, veil);
            bake.state = 'ready';
            warm(bake.host);
          } catch {
            bake.state = 'failed';
          }
          image.removeAttribute('src');
          drop();
          next();
        };
        draw();
      }, fail);
    } catch {
      fail();
    }
  }

  /* No ResizeObserver on the art: useHeroPaging's observer re-measures the
   * section inside its callback after the theme flip, which resizes the art
   * in the same frame ("ResizeObserver loop completed with undelivered
   * notifications"). Size is re-checked lazily instead: before every bake,
   * on get() and on window resize. */
  const onResize = () => { checkSize(); };
  win.addEventListener('resize', onResize);
  const onVisible = () => { if (!doc.hidden) schedule(600); };
  doc.addEventListener('visibilitychange', onVisible);
  // A theme change unmounts the other scene, which may still need its bake.
  const themeObserver = new MutationObserver(() => schedule(800));
  themeObserver.observe(doc.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  schedule(1500);

  return {
    get(scene) {
      if (disposed || checkSize()) return null;
      const bake = bakes.get(scene);
      return bake?.state === 'ready' ? bake.host : null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      cancel();
      drop();
      win.removeEventListener('resize', onResize);
      themeObserver.disconnect();
      doc.removeEventListener('visibilitychange', onVisible);
      for (const {host, canvas} of bakes.values()) {
        host.remove();
        canvas.width = canvas.height = 0;
      }
      bakes.clear();
    },
  };
}
