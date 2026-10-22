/* Altitude formatting + rAF text driver for the hero altimeter.
 * Only text is written here (≤1 write per frame); motion is WAAPI elsewhere. */

export const GROUND_M = 325;
export const ORBIT_M = 799_000_000;

const LOG_GROUND = Math.log(GROUND_M);
const LOG_ORBIT = Math.log(ORBIT_M);
const grouping = new Intl.NumberFormat('en-US');

/** Log interpolation between ground (p=0) and high orbit (p=1). */
export function altitudeAt(p: number): number {
  const t = Math.min(1, Math.max(0, p));
  return Math.exp(LOG_GROUND + (LOG_ORBIT - LOG_GROUND) * t);
}

/** 3 significant digits while rolling; switches to km at 1,000 m. */
export function formatAltitude(metres: number): {value: string; unit: string} {
  const m = Math.round(metres);
  if (m < 1000) return {value: String(m), unit: 'm'};
  const km = metres / 1000;
  if (km < 10) return {value: km.toFixed(2), unit: 'km'};
  if (km < 100) return {value: km.toFixed(1), unit: 'km'};
  const digits = Math.floor(Math.log10(km)) + 1;
  const step = 10 ** Math.max(0, digits - 3);
  return {value: grouping.format(Math.round(km / step) * step), unit: 'km'};
}

/** Cubic bezier (x1,y1,x2,y2) evaluated at x by bisection — cheap enough per frame. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i += 1) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}

export const ALT_EASE = 'cubic-bezier(.45,0,.25,1)';
const altEase = bezier(0.45, 0, 0.25, 1);

/**
 * Roll the live number from `from` (0 ground / 1 orbit) to `to` between
 * startMs and endMs of the switch clock. Returns a stop function.
 */
export function driveAltimeter(
  valueEl: HTMLElement,
  unitEl: HTMLElement,
  from: 0 | 1,
  startMs: number,
  endMs: number,
): () => void {
  const t0 = performance.now();
  let raf = 0;
  let last = '';
  const write = (p: number) => {
    const {value, unit} = formatAltitude(altitudeAt(from + (1 - 2 * from) * p));
    const key = `${value}|${unit}`;
    if (key === last) return;
    last = key;
    valueEl.textContent = value;
    unitEl.textContent = unit;
  };
  const tick = (now: number) => {
    const elapsed = now - t0;
    const raw = (elapsed - startMs) / (endMs - startMs);
    write(altEase(raw));
    if (raw < 1) raf = requestAnimationFrame(tick);
  };
  write(0);
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
