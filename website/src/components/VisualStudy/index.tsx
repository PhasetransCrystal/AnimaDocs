import type {CSSProperties, ReactNode} from 'react';

import styles from './styles.module.css';

type VisualStudyProps = {
  variant?: 'field' | 'specimen';
};

/* Hero art adapter.
 * All geometry is authored in a fixed 1440x900 viewBox and every coordinate
 * below is a constant, so screenshots and reviews stay reproducible.
 * Safe areas (standard 1440 viewport): title block x<720 / y>330,
 * directory panel x 910-1385 / y>360. Focal objects sit above and between
 * those zones; the panel is allowed to overlap the lower disc edge. */

/* Night disc sits left of the frame edge, matching the day atlas centre. */
const FOCUS = {x: 1010, y: 236};

/* ---------------------------------------------------------------- Night */

const DISC_R = 190;
const TICK_R = 238;

function buildTicks(): {d: string; major: boolean}[] {
  const ticks: {d: string; major: boolean}[] = [];
  for (let deg = 0; deg < 360; deg += 3) {
    // Open gap on the lower-left quadrant: the "state" break in the ring.
    if (deg >= 132 && deg <= 168) continue;
    const major = deg % 30 === 0;
    const rad = (deg * Math.PI) / 180;
    const r0 = TICK_R;
    const r1 = TICK_R + (major ? 14 : 6);
    const x0 = FOCUS.x + r0 * Math.cos(rad);
    const y0 = FOCUS.y + r0 * Math.sin(rad);
    const x1 = FOCUS.x + r1 * Math.cos(rad);
    const y1 = FOCUS.y + r1 * Math.sin(rad);
    ticks.push({d: `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`, major});
  }
  return ticks;
}

/* Upper-right terraces: the night counterpart of the day "land" wedge.
 * Instead of stepped blocks, each level is a large arc whose centre drifts
 * slightly toward the frame, so the bands read as smooth contour shelves.
 * Levels run from graphite (outer) to dark ember (inner); a soft blur on
 * the fills blends neighbouring levels into a continuous gradient while a
 * thin contour stroke keeps the arc edge as the primary mark. */
const TERRACE_ORIGIN = {x: 1580, y: -150};
const TERRACE_LEVELS = 8;

type Terrace = {d: string; level: number};

/* Irregular contour: a base circle whose radius is modulated by a few
 * low-frequency sine terms. Phases depend on the level so neighbouring
 * lines drift apart and pinch together like a topographic map, while the
 * fixed constants keep the result deterministic. Points are joined with a
 * Catmull-Rom spline converted to cubic Beziers for a smooth edge. */
function contourPath(cx: number, cy: number, r: number, level: number): string {
  const steps = 48;
  const pts: [number, number][] = [];
  for (let s = 0; s < steps; s += 1) {
    const t = (s / steps) * Math.PI * 2;
    const k =
      1 +
      0.07 * Math.sin(2 * t + level * 0.9) +
      0.045 * Math.sin(3 * t + 1.7 + level * 1.4) +
      0.025 * Math.sin(5 * t + 0.4 + level * 2.3);
    pts.push([cx + r * k * Math.cos(t), cy + r * k * Math.sin(t)]);
  }
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < steps; i += 1) {
    const p0 = pts[(i - 1 + steps) % steps];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % steps];
    const p3 = pts[(i + 2) % steps];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/* Island peaks: closed contour loops sit inside the frame so the levels
 * read as islands rather than one huge arc. The main peak sits in the
 * upper-right corner; a smaller secondary peak rises beside it. */
const ISLAND_PEAKS = [
  {x: 1335, y: 96, r0: 330, step: 36, levels: TERRACE_LEVELS, from: 0},
  {x: 1408, y: 300, r0: 92, step: 26, levels: 3, from: 3},
];

function buildTerraces(): Terrace[] {
  const levels: Terrace[] = [];
  for (const peak of ISLAND_PEAKS) {
    for (let i = 0; i < peak.levels; i += 1) {
      const level = peak.from + i;
      // Uneven drift and spacing so the loops are not concentric.
      const cx = peak.x - i * 7 + (i % 3) * 6;
      const cy = peak.y + i * 5 - (i % 2) * 6;
      const r = peak.r0 - i * peak.step + (i % 2 ? 6 : -3);
      levels.push({d: contourPath(cx, cy, r, level + peak.from * 3), level});
    }
  }
  return levels;
}

/* Eccentric twin of the disc: same radius, offset to the lower right.
 * The centre distance (~211) keeps the overlap lens narrow; the lens is a
 * deeper red and the rest of the twin is an outline only. */
const TWIN = {dx: 180, dy: 110};

/* Tick ring as two paths (major / minor) instead of one element per tick. */
const NIGHT_TICK_LIST = buildTicks();
const NIGHT_TICKS_MAJOR = NIGHT_TICK_LIST.filter((tick) => tick.major).map((tick) => tick.d).join('');
const NIGHT_TICKS_MINOR = NIGHT_TICK_LIST.filter((tick) => !tick.major).map((tick) => tick.d).join('');
const NIGHT_TERRACES = buildTerraces();

/* Pixel island where the grid "breaks" over the lower-left disc edge
 * (night-01). Offsets are relative to FOCUS. */
const PIXELS: [number, number, number, 'light' | 'dark'][] = [
  [-182, 66, 8, 'light'], [-172, 66, 4, 'light'], [-182, 76, 4, 'dark'],
  [-166, 74, 6, 'light'], [-158, 84, 4, 'light'], [-174, 86, 6, 'dark'],
  [-148, 92, 4, 'light'], [-164, 94, 3, 'light'], [-190, 88, 3, 'light'],
  [-140, 70, 3, 'dark'], [-198, 56, 4, 'light'], [-152, 104, 6, 'light'],
];

const PLUS_MARKS: [number, number][] = [
  [660, 150], [1420, 78], [1365, 470], [760, 430], [1180, 40],
];

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [FOCUS.x + r * Math.cos(rad), FOCUS.y + r * Math.sin(rad)];
}

const STATE_DOT = polar(263, 136);
/** Pixel squares split into step groups for the switch (cheap toggles). */
export const NIGHT_PIXEL_GROUPS = 4;

/* Quiet night furniture (static, no animation): a sparse seeded star field
 * kept clear of the red star, and a faint planet limb low in the plate with
 * a short graduated segment. Stars peak at ~0.6, the limb stays under 0.3. */
/* Jittered grid (one star per cell) so the field spreads evenly instead of
 * clumping; cells on the red star, its tick ring and behind the directory
 * panel are skipped. Every 7th star is a brighter one with a small cross. */
const NIGHT_STARS = (() => {
  let seed = 20261023;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const stars: Array<{x: number; y: number; r: number; o: number; bright: boolean}> = [];
  const cols = 10;
  const rows = 6;
  const cw = 1120 / cols;
  const ch = 560 / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = 300 + (col + 0.15 + next() * 0.7) * cw;
      const y = 24 + (row + 0.15 + next() * 0.7) * ch;
      const r = 0.9 + next() * 0.9;
      const o = 0.3 + next() * 0.3;
      if (Math.hypot(x - FOCUS.x, y - FOCUS.y) < TICK_R + 14) continue;
      if (x > 880 && y > 400) continue;
      const bright = stars.length % 7 === 3;
      stars.push({x: Math.round(x), y: Math.round(y), r: Number(r.toFixed(1)), o: Number((bright ? 0.7 : o).toFixed(2)), bright});
    }
  }
  return stars;
})();
/** Distance band from the launch pad (night satellite), 0 nearest. */
const starBand = ({x, y}: {x: number; y: number}) => {
  const d = Math.hypot(x - 611.2, y - 310.8);
  return d < 300 ? 0 : d < 560 ? 1 : 2;
};
const LIMB = {cx: 720, cy: 2300, r: 1720};
const LIMB_PATH = `M0 ${(LIMB.cy - Math.sqrt(LIMB.r ** 2 - LIMB.cx ** 2)).toFixed(1)}A${LIMB.r} ${LIMB.r} 0 0 1 1440 ${(LIMB.cy - Math.sqrt(LIMB.r ** 2 - LIMB.cx ** 2)).toFixed(1)}`;
const LIMB_TICKS = (() => {
  let d = '';
  for (let deg = -4; deg <= 10; deg += 1.5) {
    const a = (deg * Math.PI) / 180;
    const sx = LIMB.cx + Math.sin(a) * LIMB.r;
    const sy = LIMB.cy - Math.cos(a) * LIMB.r;
    const len = Math.round((deg + 4) / 1.5) % 4 === 0 ? 9 : 4;
    const ex = LIMB.cx + Math.sin(a) * (LIMB.r - len);
    const ey = LIMB.cy - Math.cos(a) * (LIMB.r - len);
    d += `M${sx.toFixed(1)} ${sy.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }
  return d;
})();

/* Main orbit (rx 430, ry 112, frame rotated -16deg about FOCUS). The white
 * satellite sits at parameter SAT_T; arcs run forward (sweep 1) from it. */
const ORBIT = {rx: 430, ry: 112};
const SAT_T = (Math.atan2(-38 / ORBIT.ry, -404 / ORBIT.rx) * 180) / Math.PI + 360;
const orbitPt = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(FOCUS.x + ORBIT.rx * Math.cos(a)).toFixed(1)} ${(FOCUS.y + ORBIT.ry * Math.sin(a)).toFixed(1)}`;
};
/** Arc along the main orbit from `from` to `to` degrees, split below 180. */
function orbitArc(from: number, to: number): string {
  const steps = Math.ceil((to - from) / 90);
  let d = `M${orbitPt(from)}`;
  for (let i = 1; i <= steps; i += 1) d += `A${ORBIT.rx} ${ORBIT.ry} 0 0 1 ${orbitPt(from + ((to - from) * i) / steps)}`;
  return d;
}
/** Orbit trace: one full turn from the satellite. Launch draws it out of the
 * pad; landing starts from it (it stands in for the real orbit) and winds it
 * back into the satellite. */
const ORBIT_TRACE_PATH = orbitArc(SAT_T, SAT_T + 360);
/** Stepped trail behind the satellite (static night furniture). */
const SAT_TRAIL = [
  {d: orbitArc(SAT_T - 10, SAT_T - 3), o: 0.55},
  {d: orbitArc(SAT_T - 24, SAT_T - 13), o: 0.32},
  {d: orbitArc(SAT_T - 44, SAT_T - 28), o: 0.16},
];

/* Faint constellation links: each bright star to its nearest bright
 * neighbour, trimmed clear of the crosses and kept off the red star. */
const NIGHT_LINKS = (() => {
  const bright = NIGHT_STARS.filter((star) => star.bright);
  const seen = new Set<string>();
  let d = '';
  const nearDisc = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((FOCUS.x - ax) * dx + (FOCUS.y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(ax + dx * t - FOCUS.x, ay + dy * t - FOCUS.y) < DISC_R + 40;
  };
  bright.forEach((a, i) => {
    let best = -1;
    let dist = Infinity;
    bright.forEach((b, j) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (j !== i && len < dist) {
        dist = len;
        best = j;
      }
    });
    if (best < 0 || dist > 340) return;
    const key = i < best ? `${i}-${best}` : `${best}-${i}`;
    const b = bright[best];
    if (seen.has(key) || nearDisc(a.x, a.y, b.x, b.y)) return;
    seen.add(key);
    const ux = (b.x - a.x) / dist;
    const uy = (b.y - a.y) / dist;
    d += `M${(a.x + ux * 9).toFixed(1)} ${(a.y + uy * 9).toFixed(1)}L${(b.x - ux * 9).toFixed(1)} ${(b.y - uy * 9).toFixed(1)}`;
  });
  return d;
})();

/** Night layer ①: background grid plus the quiet furniture (fades in early). */
function NightGrid(): ReactNode {
  return (
    <g>
      <defs>
        <radialGradient id="vs-grid-fade" cx={FOCUS.x} cy={FOCUS.y} r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0.2" stopColor="#000" />
          <stop offset="0.25" stopColor="#fff" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="vs-grid-mask">
          <rect y="-240" width="1440" height="1140" fill="url(#vs-grid-fade)" />
        </mask>
        <pattern id="vs-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" className={styles.nightGridLine} />
        </pattern>
      </defs>
      <rect y="-240" width="1440" height="1140" fill="url(#vs-grid)" mask="url(#vs-grid-mask)" />
      <g className={styles.nightLimb}>
        <path d={LIMB_PATH} />
        <path className={styles.nightLimbHaze} d={LIMB_PATH} transform="translate(0 7)" />
        <path className={styles.nightLimbTicks} d={LIMB_TICKS} />
        <g className={styles.nightLabel}>
          <text x="742" y="566">LIMB / R 6,371 KM</text>
        </g>
      </g>
    </g>
  );
}

/** Night layer ②: the filtered group (terraces, halo, disc, lens, grain). */
function NightCore(): ReactNode {
  return (
    <g>
      <defs>
        {/* Near-flat disc: a shallow tonal shift only, no specular highlight. */}
        <linearGradient id="vs-disc" x1="0.2" y1="0.1" x2="0.8" y2="0.95">
          <stop offset="0" stopColor="#e94a4c" />
          <stop offset="1" stopColor="#c8363d" />
        </linearGradient>
        {/* Regions start above y=0 so narrow layouts can reveal the plate's upper bleed. */}
        <filter id="vs-terrace-blur" x="0" y="-240" width="1440" height="1140" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <linearGradient id="vs-terrace-fade" x1="0" y1="0" x2="0" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0.5" stopColor="#fff" />
          <stop offset="0.86" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="vs-disc-clip">
          <circle cx={FOCUS.x} cy={FOCUS.y} r={DISC_R} />
        </clipPath>
        <mask id="vs-terrace-mask">
          <rect y="-240" width="1440" height="1140" fill="url(#vs-terrace-fade)" />
        </mask>
        <radialGradient id="vs-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e34549" stopOpacity="0.26" />
          <stop offset="0.45" stopColor="#e34549" stopOpacity="0.08" />
          <stop offset="1" stopColor="#e34549" stopOpacity="0" />
        </radialGradient>
        <filter id="vs-disc-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Upper-right terraces: blurred fills give a continuous gradient,
          thin contour arcs keep the curved edge as the readable mark. */}
      <g mask="url(#vs-terrace-mask)">
        <g filter="url(#vs-terrace-blur)">
          <g className={styles.terraceDrift}>
            {NIGHT_TERRACES.map((t) => (
              <path key={`tf-${t.level}`} d={t.d} className={styles[`terrace${t.level}`]} />
            ))}
          </g>
        </g>
      </g>

      <circle cx={FOCUS.x} cy={FOCUS.y} r="420" fill="url(#vs-halo)" />

      <circle cx={FOCUS.x} cy={FOCUS.y} r={DISC_R} fill="url(#vs-disc)" />
      {/* Overlap lens with the eccentric twin, then the twin's outline. */}
      {/* The clip stays on the wrapper so only the twin drifts, not the clip. */}
      <g clipPath="url(#vs-disc-clip)">
        <circle className={`${styles.discLens} ${styles.lensDrift}`} cx={FOCUS.x + TWIN.dx} cy={FOCUS.y + TWIN.dy} r={DISC_R} />
      </g>
      <circle cx={FOCUS.x} cy={FOCUS.y} r={DISC_R} fill="#000" filter="url(#vs-disc-grain)" opacity="0.42" />
    </g>
  );
}

/** Night layer ③: crosshair + tick ring (turns in as one layer). */
function NightTicks(): ReactNode {
  return (
    <g>
      <line className={styles.crosshair} x1="520" y1={FOCUS.y} x2="1440" y2={FOCUS.y} />
      <line className={styles.crosshair} x1={FOCUS.x} y1="-240" x2={FOCUS.x} y2="560" />

      {/* Tick ring and state dot rotate together so the gap keeps its dot. */}
      <g className={styles.tickSpin}>
        <g className={styles.tickRing}>
          <path d={NIGHT_TICKS_MINOR} className={styles.tickMinor} />
          <path d={NIGHT_TICKS_MAJOR} className={styles.tickMajor} />
        </g>
        <circle className={styles.stateDot} cx={STATE_DOT[0].toFixed(1)} cy={STATE_DOT[1].toFixed(1)} r="4" />
      </g>
    </g>
  );
}

/** Night layer ④: orbits, satellite and its pulse ring. */
function NightOrbits(): ReactNode {
  return (
    <g>
      <g className={styles.orbits} transform={`rotate(-16 ${FOCUS.x} ${FOCUS.y})`}>
        <ellipse data-hero-orbit="" cx={FOCUS.x} cy={FOCUS.y} rx="430" ry="112" />
        <ellipse className={styles.orbitSoft} cx={FOCUS.x} cy={FOCUS.y} rx="560" ry="168" />
        <ellipse className={styles.orbitFaint} cx={FOCUS.x} cy={FOCUS.y} rx="300" ry="64" />
        {/* Short bright segments travelling along two orbits. */}
        <ellipse data-hero-orbit="" className={styles.orbitComet} cx={FOCUS.x} cy={FOCUS.y} rx="430" ry="112" pathLength={1000} />
        <ellipse className={`${styles.orbitComet} ${styles.orbitCometSlow}`} cx={FOCUS.x} cy={FOCUS.y} rx="560" ry="168" pathLength={1000} />
        <g className={styles.satTrail}>
          {SAT_TRAIL.map(({d, o}) => (
            <path key={o} d={d} strokeOpacity={o} />
          ))}
        </g>
        <circle className={styles.satellite} cx={FOCUS.x - 404} cy={FOCUS.y - 38} r="5" data-hero-anchor="star" />
        <circle className={`${styles.satelliteRing} ${styles.pulse}`} cx={FOCUS.x - 404} cy={FOCUS.y - 38} r="13" />
      </g>
    </g>
  );
}

/** Night layer ⑤: pixels (4 step groups), plus marks, labels. */
function NightMarks(): ReactNode {
  return (
    <g>
      {/* Stars sit above the terraces/halo (they were buried in the grid layer). */}
      <g className={styles.nightStars} data-night-stars="">
        {/* Three distance bands from the pad: stars come on as an outward
            wave during launch and go out near-first under the day clip. */}
        {[0, 1, 2].map((band) => (
          <g data-star-group={band} key={band}>
            {band === 2 ? <path className={styles.nightLinks} d={NIGHT_LINKS} /> : null}
            {NIGHT_STARS.filter((star) => starBand(star) === band).map(({x, y, r, o, bright}) => (
              <g key={`${x}-${y}`}>
                <circle cx={x} cy={y} r={r} fillOpacity={o} />
                {bright ? <path d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`} /> : null}
              </g>
            ))}
          </g>
        ))}
      </g>
      <g className={styles.pixels}>
        {Array.from({length: NIGHT_PIXEL_GROUPS}, (_v, group) => (
          <g key={group} data-pixel-group={group}>
            {PIXELS.map(([x, y, s, tone], index) =>
              index % NIGHT_PIXEL_GROUPS !== group ? null : (
                <rect
                  key={`${x}-${y}`}
                  x={FOCUS.x + x}
                  y={FOCUS.y + y}
                  width={s}
                  height={s}
                  className={`${tone === 'light' ? styles.pixelLight : styles.pixelDark} ${index % 3 === 0 ? styles.flicker : ''}`}
                  style={{animationDelay: `${(index * 0.7) % 5}s`}}
                />
              ),
            )}
          </g>
        ))}
      </g>

      <g data-night-labels="">
        <g className={styles.plusMarks}>
          <path d={PLUS_MARKS.map(([x, y]) => `M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`).join('')} />
        </g>

        <g className={styles.nightLabel}>
          <text x="560" y="98">FIG.01 — OBSERVATION</text>
          <text x="560" y="114">GRID SYSTEMS ........ : 02</text>
          <text x="628" y="324">ORB / 0.42 · 16°</text>
          <text x="1412" y="96" transform="rotate(90 1412 96)">SIGNAL / ANIMA-01</text>
        </g>
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ Day */
/* Restored from 3e7732b (pre-redesign tiled atlas). */

const TILE_SIZE = 46;
const TILE_GAP = 1.32;

type TileKind = 'blue' | 'pale' | 'paper' | 'outline' | 'ink' | 'brass';

type DayTile = {
  /** Square already rotated 32deg about its centre. */
  d: string;
  kind: TileKind;
  opacity: number;
};

const TILE_ANGLE = (32 * Math.PI) / 180;

/* Rotation is baked into the geometry: a per-tile transform under the
 * tileField mask-image made Chrome composite every tile on its own layer. */
function tilePath(x: number, y: number, size: number): string {
  const half = size / 2;
  const cos = Math.cos(TILE_ANGLE);
  const sin = Math.sin(TILE_ANGLE);
  const corners: Array<[number, number]> = [[-half, -half], [half, -half], [half, half], [-half, half]];
  return `${corners
    .map(([dx, dy], index) => `${index ? 'L' : 'M'}${(x + dx * cos - dy * sin).toFixed(3)} ${(y + dx * sin + dy * cos).toFixed(3)}`)
    .join('')}Z`;
}

/* objectBoundingBox of a rotated square is a larger axis-aligned square; this
 * maps the gradient back onto the tile so it runs corner to corner as before. */
const TILE_GRADIENT = `translate(0.5 0.5) rotate(32) scale(${(1 / (Math.cos(TILE_ANGLE) + Math.sin(TILE_ANGLE))).toFixed(6)}) translate(-0.5 -0.5)`;

function buildDayTiles(): DayTile[] {
  const tiles: DayTile[] = [];
  const cols = 14;
  const rows = 7;
  const centerX = 1000;
  const centerY = 240;
  const rotation = (32 * Math.PI) / 180;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const gridX = (col - (cols - 1) / 2) * TILE_SIZE * TILE_GAP;
      const gridY = (row - (rows - 1) / 2) * TILE_SIZE * TILE_GAP;
      const x = centerX + gridX * Math.cos(rotation) - gridY * Math.sin(rotation);
      const y = centerY + gridX * Math.sin(rotation) + gridY * Math.cos(rotation);
      const hash = (col * 31 + row * 17 + col * row * 7) % 100;
      if (hash >= 70 && hash < 86) continue;
      let kind: TileKind = 'outline';
      if (hash < 14) kind = 'blue';
      else if (hash < 30) kind = 'pale';
      else if (hash < 46) kind = 'paper';
      else if (hash < 86) kind = 'outline';
      else if (hash < 94) kind = 'ink';
      else kind = 'brass';
      if (y < 110 && kind !== 'outline' && kind !== 'pale') kind = 'outline';
      const distance = Math.hypot(gridX, gridY);
      const opacity = Math.max(0.2, 1 - distance / 640);
      tiles.push({d: tilePath(x, y, kind === 'brass' ? TILE_SIZE * 0.46 : TILE_SIZE), kind, opacity});
    }
  }
  return tiles;
}

const dayTiles = buildDayTiles();

export const DAY_TILE_GROUPS = 7;

/* Deterministic split of the tiles into a few groups so the switch can toggle
 * whole groups with steps() instead of animating ~80 tiles. Groups are bands
 * of distance from the launch pad (seeded jitter keeps the band edges
 * ragged), so the steps read as a wave: the ignition shock blows them away
 * near-first, and they land back behind the opening day clip. */
const TILE_PAD = {x: 611.2, y: 310.8};
function tileCentre(d: string): [number, number] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [0, 0];
  let x = 0;
  let y = 0;
  for (let i = 0; i < 8; i += 2) {
    x += nums[i];
    y += nums[i + 1];
  }
  return [x / 4, y / 4];
}
function groupTiles(tiles: DayTile[]): {tiles: DayTile[]; dist: number}[] {
  let seed = 20260816;
  const keyed = tiles.map((tile) => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const [x, y] = tileCentre(tile.d);
    return {tile, dist: Math.hypot(x - TILE_PAD.x, y - TILE_PAD.y) + (seed / 4294967296 - 0.5) * 90};
  });
  keyed.sort((a, b) => a.dist - b.dist);
  const per = Math.ceil(keyed.length / DAY_TILE_GROUPS);
  return Array.from({length: DAY_TILE_GROUPS}, (_v, i) => {
    const band = keyed.slice(i * per, (i + 1) * per);
    // The band's leading edge: the wave reaches this distance first.
    return {tiles: band.map((k) => k.tile), dist: Math.round(band.length ? band[0].dist : 0)};
  });
}

const dayTileGroups = groupTiles(dayTiles);

const dayRouteMain: Array<[number, number]> = [
  [520, 190],
  [720, 140],
  [905, 225],
  [1105, 150],
  [1305, 235],
];

const dayRouteGhost: Array<[number, number]> = [
  [380, 300],
  [610, 250],
  [830, 330],
  [1050, 260],
  [1290, 340],
];

/* 36 guide ticks as one path (one element instead of 36 lines). Ticks 9-11
 * sit inside the launch pad arc below, so they are left out. */
const DAY_GUIDE_TICKS_PATH = Array.from({length: 36}, (_value, index) => {
  if (index >= 9 && index <= 11) return '';
  const angle = (index * 10 * Math.PI) / 180;
  const inner = index % 3 === 0 ? 156 : 163;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return `M${(640 + cos * inner).toFixed(3)} ${(150 + sin * inner).toFixed(3)}L${(640 + cos * 170).toFixed(3)} ${(150 + sin * 170).toFixed(3)}`;
}).join('');

/* Launch pad = night satellite after the orbit group's -16deg rotation. */
const PAD = {x: 611.2, y: 310.8, r: 44};
/** Large arc with a 70deg gap at the top (pad-local coordinates). */
const PAD_ARC_PATH = (() => {
  const at = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(Math.cos(rad) * PAD.r).toFixed(2)} ${(Math.sin(rad) * PAD.r).toFixed(2)}`;
  };
  return `M${at(-55)}A${PAD.r} ${PAD.r} 0 1 1 ${at(-125)}`;
})();
const PAD_CROSS_PATH = 'M-10 0H-4M4 0H10M0 -10V-4M0 4V10';
/** Countdown segments (actor only): 12 short arcs at r 54, clockwise from 12 o'clock. */
const COUNT_SEGMENTS = Array.from({length: 12}, (_v, i) => {
  const at = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(Math.cos(rad) * 54).toFixed(2)} ${(Math.sin(rad) * 54).toFixed(2)}`;
  };
  return `M${at(i * 30 + 4)}A54 54 0 0 1 ${at(i * 30 + 26)}`;
});
/** Lock-on brackets around the pad (actor only). */
const RETICLE_PATH = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  .map(([sx, sy]) => `M${sx * 30} ${sy * 20}V${sy * 30}H${sx * 20}`)
  .join('');

/* Faint terrain contours in the open field under the paper plate, around
 * the pad. Deterministic: fixed harmonics per level, smoothed with
 * midpoint quadratics. One static path, no animation. */
const SUMMIT = {x: 770, y: 520};
/** Point on contour `level` at angle `a` (radians), viewBox units. */
function contourPoint(level: number, a: number): [number, number] {
  const tilt = (-7 * Math.PI) / 180;
  const base = 34 + level * 30;
  const r = base * (1
    + 0.16 * Math.sin(2 * a + 0.7 + level * 0.22)
    + 0.09 * Math.sin(3 * a + 2.1 - level * 0.35)
    + 0.04 * Math.sin(5 * a + level));
  const x = Math.cos(a) * r * 1.35;
  const y = Math.sin(a) * r * 0.82;
  return [SUMMIT.x + x * Math.cos(tilt) - y * Math.sin(tilt), SUMMIT.y + x * Math.sin(tilt) + y * Math.cos(tilt)];
}
const DAY_CONTOURS = (() => {
  const levels: string[] = [];
  for (let level = 0; level < 6; level += 1) {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 64; i += 1) pts.push(contourPoint(level, (i / 64) * Math.PI * 2));
    const mid = (p: [number, number], q: [number, number]) => `${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
    let d = `M${mid(pts[pts.length - 1], pts[0])}`;
    pts.forEach((p, i) => {
      d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, pts[(i + 1) % pts.length])}`;
    });
    levels.push(`${d}Z`);
  }
  return levels;
})();

/* Survey furniture for the open field (static, part of the ocean layer):
 * contour heights knocked out of their lines, a ranging line from the pad
 * to the summit, a stepped block mosaic off the paper plate's corner, a
 * halftone shading patch, a hatched sector plate and two large crosses. */
const CONTOUR_HEIGHTS = [1, 3, 5].map((level) => {
  const [x, y] = contourPoint(level, Math.PI - 0.22);
  return {x: Math.round(x), y: Math.round(y), text: String(420 - level * 60)};
});
const SURVEY = (() => {
  const dx = SUMMIT.x - PAD.x;
  const dy = SUMMIT.y - PAD.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const from = [PAD.x + ux * (PAD.r + 8), PAD.y + uy * (PAD.r + 8)];
  const to = [SUMMIT.x - ux * 9, SUMMIT.y - uy * 9];
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  return {
    d: `M${from[0].toFixed(1)} ${from[1].toFixed(1)}L${to[0].toFixed(1)} ${to[1].toFixed(1)}`,
    // Label sits on the right of the line, reading downhill.
    label: {x: mid[0] + uy * 9, y: mid[1] - ux * 9, angle: (Math.atan2(dy, dx) * 180) / Math.PI},
  };
})();
const MOSAIC: Array<[number, number, 'paper' | 'pale']> = [
  [668, 462, 'pale'],
  [646, 462, 'paper'],
  [646, 484, 'paper'],
  [624, 484, 'pale'],
  [624, 506, 'paper'],
  [602, 528, 'paper'],
];

function toPoints(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/* Day-04 study: irregular pale blue wash blocks stacked under the lattice.
 * Seeded LCG so the layout is identical on every render and screenshot. */
type WashBlock = {x: number; y: number; width: number; height: number; tone: number; opacity: number};

function buildWashBlocks(): WashBlock[] {
  let seed = 20260816;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const blocks: WashBlock[] = [];
  for (let index = 0; index < 34; index += 1) {
    // Snap to the 48px lattice so block edges land on grid lines.
    const col = Math.floor(random() * 22) + 8;
    const row = Math.floor(random() * 11);
    const width = (Math.floor(random() * 5) + 2) * 48;
    const height = (Math.floor(random() * 4) + 1) * 48;
    blocks.push({
      x: col * 48,
      y: row * 48,
      width,
      height,
      tone: Math.floor(random() * 3),
      opacity: 0.18 + random() * 0.32,
    });
  }
  return blocks;
}

/* Left half keeps the faint scattered wash; the right half becomes terraces. */
const washBlocks = buildWashBlocks().filter((block) => block.x < 760);

/* Right half: stepped terraces drawn in the plate's -7deg frame, like
 * contour bands on a map. Each level is a stepped ellipse built from 24px
 * rows; higher levels are smaller and deeper blue (a progressive gradient). */
// The land fills the upper-right wedge: right of a coastline running from
// the top edge (~x 884) diagonally down to the bottom of the directory panel.
const LAND_STEP = 48; // matches the 48px lattice, so cells read as grid tiles
const LAND_LEVELS = 7;
const LAND_BAND = 64; // depth (in viewBox units) per terrace level
const LAND_ROTATE = -7; // parallel to the tilted plate
const LAND_PIVOT = {x: 960, y: 220};
const landCoast: Array<[number, number]> = [
  [884, -40],
  [899, 172],
  [978, 252],
  [1051, 339],
  [1123, 426],
  [1232, 499],
  [1304, 571],
  [1480, 600],
];

type LandRow = {x: number; y: number; width: number};

/** Signed depth inland: >0 right/above the coast, growing toward the corner. */
function landDepth(px: number, py: number): number {
  let best = Infinity;
  let sign = -1;
  for (let index = 0; index < landCoast.length - 1; index += 1) {
    const [ax, ay] = landCoast[index];
    const [bx, by] = landCoast[index + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    const distance = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (distance < best) {
      best = distance;
      // Cross product > 0 means the point is on the inland (upper-right) side.
      sign = dx * (py - ay) - dy * (px - ax) < 0 ? 1 : -1;
    }
  }
  return best * sign;
}

/** Smooth deterministic undulation so terrace edges wander like contours. */
function landNoise(u: number, v: number): number {
  return 46 * Math.sin(u * 0.013 + 1.3) * Math.cos(v * 0.016 + 0.4) + 22 * Math.sin((u + v) * 0.031 + 2.1);
}

/** Zones where one intermediate level is missing, so the colour jumps
 * directly from level n-1 to n+1 (e.g. blue 1 -> blue 3). */
function landSkip(u: number, v: number): boolean {
  return Math.sin(u * 0.009 + 0.7) * Math.cos(v * 0.012 + 1.9) > 0.42;
}

function buildLandTerraces(): LandRow[][] {
  const levels: LandRow[][] = Array.from({length: LAND_LEVELS}, () => []);
  const angle = (LAND_ROTATE * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Walk a grid in the rotated frame, map each cell centre back to viewBox
  // space, classify it, then merge same-level cells into horizontal runs.
  // Start on a multiple of 48 so cells align with the land lattice pattern.
  for (let v = -144; v < 720; v += LAND_STEP) {
    let runLevel = -1;
    let runStart = 0;
    const flush = (end: number) => {
      if (runLevel >= 0) levels[runLevel].push({x: runStart, y: v, width: end - runStart});
    };
    for (let u = 768; u <= 1600; u += LAND_STEP) {
      const cu = u + LAND_STEP / 2 - LAND_PIVOT.x;
      const cv = v + LAND_STEP / 2 - LAND_PIVOT.y;
      const px = LAND_PIVOT.x + cu * cos - cv * sin;
      const py = LAND_PIVOT.y + cu * sin + cv * cos;
      const depth = landDepth(px, py) + landNoise(u, v);
      let level = depth < 0 ? -1 : Math.min(LAND_LEVELS - 1, Math.floor(depth / LAND_BAND));
      if (level >= 1 && level < LAND_LEVELS - 1 && landSkip(u, v)) level += 1;
      if (level !== runLevel) {
        flush(u);
        runLevel = level;
        runStart = u;
      }
    }
    flush(1600 + LAND_STEP);
  }
  return levels;
}

const landTerraces = buildLandTerraces();

/* Each terrace level as one path of clockwise row rectangles (rows within and
 * across levels never overlap), instead of ~one <rect> per row. */
function rowsPath(rows: LandRow[]): string {
  return rows.map((row) => `M${row.x} ${row.y}h${row.width}v${LAND_STEP}h${-row.width}Z`).join('');
}
const LAND_LEVEL_PATHS = landTerraces.map(rowsPath);
const LAND_ALL_PATH = LAND_LEVEL_PATHS.join('');
const washToneClass = ['washA', 'washB', 'washC'] as const;

function DayAtlas(): ReactNode {
  return (
    <g className={styles.dayArt}>
      <defs>
        {/* Tiles are pre-rotated paths, so the gradient box is the rotated
            square's bounding box; TILE_GRADIENT maps it back onto the tile. */}
        <linearGradient gradientTransform={TILE_GRADIENT} id="vsDayBlue" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3474e8" />
          <stop offset="1" stopColor="#1d4aa6" />
        </linearGradient>
        <linearGradient gradientTransform={TILE_GRADIENT} id="vsDayPale" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e4ecf8" />
          <stop offset="1" stopColor="#b9cbe8" />
        </linearGradient>
        <linearGradient gradientTransform={TILE_GRADIENT} id="vsDayGray" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d5dce3" />
        </linearGradient>
        {/* Regular lattice with an X mark at every crossing (day-04 grid). */}
        <pattern id="vsDayLattice" height="48" patternUnits="userSpaceOnUse" width="48">
          <path className={styles.latticeLine} d="M0 0H48M0 0V48" />
          <path className={styles.latticeCross} d="M-3 -3L3 3M3 -3L-3 3" />
        </pattern>
        <linearGradient id="vsDayLatticeFade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.25" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <pattern id="vsDayLandLattice" height="48" patternUnits="userSpaceOnUse" width="48">
          <path className={styles.landLatticeLine} d="M0 0H48M0 0V48" />
          <path className={styles.landLatticeCross} d="M-3 -3L3 3M3 -3L-3 3" />
        </pattern>
        {/* Clip the white lattice to the land so it only appears over blue. */}
        <clipPath id="vsDayLandClip">
          <path d={LAND_ALL_PATH} />
        </clipPath>
        <mask id="vsDayLatticeMask">
          <rect fill="url(#vsDayLatticeFade)" height="560" width="1440" />
        </mask>
        {/* Halftone shading for the survey patch (soft elliptical falloff). */}
        <pattern id="vsDayDots" height="9" patternUnits="userSpaceOnUse" width="9">
          <circle className={styles.surveyDot} cx="4.5" cy="4.5" r="0.85" />
        </pattern>
        <radialGradient
          cx={SUMMIT.x + 60}
          cy={SUMMIT.y + 40}
          gradientTransform={`translate(${SUMMIT.x + 60} ${SUMMIT.y + 40}) scale(1.6 1) translate(${-(SUMMIT.x + 60)} ${-(SUMMIT.y + 40)})`}
          gradientUnits="userSpaceOnUse"
          id="vsDayDotsFade"
          r="150">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="vsDayDotsMask">
          <rect fill="url(#vsDayDotsFade)" height="340" width="560" x={SUMMIT.x - 220} y={SUMMIT.y - 130} />
        </mask>
        <pattern id="vsDayHatch" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="6">
          <path className={styles.surveyHatchLine} d="M0 0V6" />
        </pattern>
      </defs>
      <g className={styles.washField} mask="url(#vsDayLatticeMask)">
        {washBlocks.map((block, index) => (
          <rect
            className={styles[washToneClass[block.tone]]}
            // fill-opacity, not opacity: a fill-only rect looks the same, and
            // per-element opacity makes Chrome split the plate into layers.
            fillOpacity={block.opacity}
            height={block.height}
            key={index}
            width={block.width}
            x={block.x}
            y={block.y}
          />
        ))}
      </g>
      <g className={styles.landField} transform="rotate(-7 960 220)">
        {/* Cast shadow of the base terrace, offset like the plate wash. One
            path per level: rows never overlap, and separate paths keep the
            translucent shadow stacking exactly as the per-row rects did. */}
        <g className={styles.landShadow} transform="translate(14 16)">
          {LAND_LEVEL_PATHS.map((d, level) => <path d={d} key={level} />)}
        </g>
        {LAND_LEVEL_PATHS.map((d, level) => (
          <g className={styles[`land${level}`]} key={level}>
            <path d={d} />
          </g>
        ))}
        <rect
          clipPath="url(#vsDayLandClip)"
          fill="url(#vsDayLandLattice)"
          height="912"
          width="912"
          x="768"
          y="-144"
        />
      </g>
      <rect fill="url(#vsDayLattice)" height="560" mask="url(#vsDayLatticeMask)" width="1440" />
      <g className={styles.contours}>
        {DAY_CONTOURS.map((d, level) => (
          <path d={d} key={level} data-major={level % 3 === 2 ? '' : undefined} />
        ))}
      </g>
      <g className={styles.survey}>
        <rect fill="url(#vsDayDots)" height="340" mask="url(#vsDayDotsMask)" width="560" x={SUMMIT.x - 220} y={SUMMIT.y - 130} />
        {MOSAIC.map(([x, y, tone]) => (
          <rect className={tone === 'pale' ? styles.mosaicPale : styles.mosaicPaper} height="20" key={`${x}-${y}`} width="20" x={x} y={y} />
        ))}
        <path className={styles.surveyLine} d={SURVEY.d} />
        <text
          className={styles.surveyText}
          transform={`translate(${SURVEY.label.x.toFixed(1)} ${SURVEY.label.y.toFixed(1)}) rotate(${SURVEY.label.angle.toFixed(1)})`}
          textAnchor="middle">
          R 2.6 KM · 052°
        </text>
        <path className={styles.summit} d={`M${SUMMIT.x} ${SUMMIT.y - 5}L${SUMMIT.x + 4.5} ${SUMMIT.y + 3}H${SUMMIT.x - 4.5}Z`} />
        <text className={styles.surveyText} x={SUMMIT.x + 10} y={SUMMIT.y - 6}>
          ▲ 480
        </text>
        {CONTOUR_HEIGHTS.map(({x, y, text}) => (
          <text className={styles.contourHeight} key={text} x={x} y={y + 3} textAnchor="middle">
            {text}
          </text>
        ))}
        <rect className={styles.surveyPlate} fill="url(#vsDayHatch)" height="10" width="84" x="604" y="652" />
        <text className={styles.surveyText} x="604" y="644">
          SECTOR 04 / TERRAIN
        </text>
        <path className={styles.surveyCross} d="M556 454h18M565 445v18M876 668h18M885 659v18" />
      </g>
      <g className={styles.plateFrames}>
        <rect className={styles.plateFrameWash} x="718" y="84" width="520" height="300" transform="rotate(-7 978 234)" />
        <rect className={styles.plateFramePaper} x="700" y="70" width="520" height="300" transform="rotate(-7 960 220)" />
        <rect className={styles.plateFrameLine} x="1140" y="42" width="300" height="200" transform="rotate(4 1290 142)" />
      </g>
    </g>
  );
}

/** Day tile grid, split into seeded groups that vanish/appear in steps. */
function DayTiles(): ReactNode {
  return (
    <g className={styles.tileField}>
      {dayTileGroups.map((group, groupIndex) => (
        <g data-tile-group={groupIndex} data-tile-dist={group.dist} key={groupIndex}>
          {group.tiles.map((tile) => (
            <path
              className={styles[`tile${tile.kind.charAt(0).toUpperCase()}${tile.kind.slice(1)}`]}
              d={tile.d}
              key={tile.d}
              style={{'--tile-alpha': tile.opacity} as CSSProperties}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

/** Day guide circle study (the actor takes the circle over during a switch). */
function DayGuide(): ReactNode {
  return (
    <g className={styles.guideStudy}>
      <circle className={styles.guideCircle} cx="640" cy="150" r="170" />
      <path className={styles.guideArc} d="M640 -20 A170 170 0 0 1 810 150" />
      <path className={styles.guideTicks} d={DAY_GUIDE_TICKS_PATH} />
      {/* Launch pad: open arc on the night satellite's position, so the
          switch shrinks onto a mark that exists in both plates. */}
      <g className={styles.padArc} transform={`translate(${PAD.x} ${PAD.y})`}>
        <path d={PAD_ARC_PATH} />
        <path className={styles.padCross} d={PAD_CROSS_PATH} />
        {/* Quiet pad designation, lower-left of the arc. */}
        <path className={styles.padTick} d="M-34 34L-44 44H-58" />
        <text className={styles.padLabel} x="-62" y="47" textAnchor="end">
          PAD-01
        </text>
      </g>
    </g>
  );
}

/** Day lines, labels, routes and small marks. */
function DayLines(): ReactNode {
  return (
    <g>
      <polyline className={styles.routeGhost} points={toPoints(dayRouteGhost)} />
      <polyline className={styles.routeMain} points={toPoints(dayRouteMain)} />
      <polyline className={styles.routeCrawl} points={toPoints(dayRouteMain)} />
      <g>
        {dayRouteMain.map(([x, y], index) => (
          <g key={`${x}-${y}`}>
            <rect className={styles.nodeSquare} height="12" width="12" x={x - 6} y={y - 6} />
            <rect
              className={`${styles.nodeCore} ${styles.nodeBlink}`}
              height="5"
              width="5"
              x={x - 2.5}
              y={y - 2.5}
              style={{animationDelay: `${index * 1.2}s`}}
            />
          </g>
        ))}
      </g>
      <polyline className={styles.routeSurvey} points="905,225 960,300 1110,318 1250,290" />
      <g className={styles.monoLabel}>
        <text x="720" y="124" textAnchor="middle">[ 39.90°N, 116.40°E ]</text>
        <text x="1105" y="136" textAnchor="middle">[ 31.23°N, 121.47°E ]</text>
        <text x="520" y="176" textAnchor="middle">[ 22.54°N, 114.05°E ]</text>
      </g>
      {/* Small blue label plates pinned to route nodes. */}
      <g className={styles.tagPlates}>
        <rect height="16" width="44" x="928" y="234" />
        <text x="950" y="245" textAnchor="middle">A-03</text>
        <rect height="16" width="44" x="1328" y="243" />
        <text x="1350" y="254" textAnchor="middle">A-05</text>
        <path d="M905 231V242H928M1305 241V251H1328" />
      </g>
      {/* Plate "01" moved out: the hero altimeter now sits in that corner. */}
      <g className={styles.plateNumbers}>
        <text x="1356" y="112">02</text>
        <line x1="1356" x2="1396" y1="124" y2="124" />
        <text x="1298" y="306">03</text>
        <line x1="1298" x2="1338" y1="318" y2="318" />
      </g>
      <g className={styles.registration}>
        <line x1="60" x2="60" y1="60" y2="200" />
        <line x1="72" x2="72" y1="60" y2="160" />
        <path d="M54 300h12M60 294v12M134 340h12M140 334v12" />
      </g>
      <g className={styles.brassMarks}>
        {/* The 8px mark at (131, 86) belonged to plate "01"; removed with it. */}
        <rect height="6" width="6" x="1300" y="120" />
        <circle cx="905" cy="262" r="4" />
      </g>
    </g>
  );
}

const SVG_PROPS = {
  viewBox: '0 0 1440 900',
  preserveAspectRatio: 'xMidYMin slice',
  fill: 'none',
  focusable: 'false',
} as const;

/* Plate anchors in viewBox units, shared with the switch controller. */
export const HERO_ANCHORS = {
  /** Day guide circle centre and radius. */
  guide: {x: 640, y: 150, r: 170},
  /** Night satellite (white star) after the orbit group's -16deg rotation. */
  star: {x: 611.2, y: 310.8, r: 5},
  /** Night disc (red star). */
  disc: {x: FOCUS.x, y: FOCUS.y, r: DISC_R},
  /** Day launch pad arc (same centre as the star). */
  pad: PAD,
} as const;

/* Actor connectors in pad-local coordinates (origin = white star). Bold
 * lines are straight and sit on a regular 120deg triad: blue on 210/330/90
 * (survey squares in to the pad ring), red on the opposite triad 270/30/150
 * (from the star out to a mark). Faint lines carry the elbows instead. */
type Pt = [number, number];
type Connector = {points: Pt[]; end?: number};
/** Point at radius r along the direction of p (from the origin). */
const onRing = ([x, y]: Pt, r: number): Pt => {
  const k = r / Math.hypot(x, y);
  return [Number((x * k).toFixed(2)), Number((y * k).toFixed(2))];
};
/** Point at angle deg (SVG, clockwise from +x) and radius r. */
const polarPt = (deg: number, r: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [Number((Math.cos(a) * r).toFixed(2)), Number((Math.sin(a) * r).toFixed(2))];
};
const inward = (...path: Pt[]): Pt[] => [...path, onRing(path[path.length - 1], PAD.r + 2)];
const outward = (...path: Pt[]): Pt[] => [onRing(path[0], 8), ...path];
/* Bold lengths: blue squares at one radius, red marks at three. */
const BLUE_LEN = 143;
const RED_LEN = [133, 157, 100] as const;
const BLUE_LINKS: Connector[] = [210, 330, 90].map((deg) => ({points: inward(polarPt(deg, BLUE_LEN))}));
const RED_LINKS: Connector[] = [
  {points: outward(polarPt(270, RED_LEN[0])), end: 2.5},
  {points: outward(polarPt(30, RED_LEN[1])), end: 4.5},
  {points: outward(polarPt(150, RED_LEN[2])), end: 3.5},
];
/* Faint lines have their own directions and lengths (a little longer than
 * the bold set, well short of the edges); some take one elbow. Each belongs
 * to a phase and draws together with that phase's bold set: "day" with the
 * blue links, "night" with the red rays. One does not touch the star. */
const FAINT_LINES: Array<{points: Pt[]; tone: 'grey' | 'blue' | 'red'; phase: 'day' | 'night'}> = [
  {points: outward([-285, 50]), tone: 'blue', phase: 'day'},
  {points: outward([-60, -150], [-60, -270]), tone: 'grey', phase: 'day'},
  {points: outward([150, 110], [300, 110]), tone: 'blue', phase: 'day'},
  {points: outward([-106, 227]), tone: 'red', phase: 'night'},
  {points: [[-150, 30], [180, -150]], tone: 'grey', phase: 'night'},
  {points: outward([-170, -40], [-290, -40]), tone: 'red', phase: 'night'},
  {points: outward([250, -60], [250, -200]), tone: 'grey', phase: 'night'},
];
/* Leader lines with a caption, one per direction: red hangs off the top
 * ray's mark, blue off the upper-right survey square. */
const RED_TOP = polarPt(270, RED_LEN[0]);
const BLUE_UR = polarPt(330, BLUE_LEN);
const LEADERS = {
  red: {points: [RED_TOP, [RED_TOP[0] + 18, RED_TOP[1] - 18], [RED_TOP[0] + 182, RED_TOP[1] - 18]] as Pt[], text: 'ORBIT INSERTION / 799,000 KM'},
  blue: {points: [BLUE_UR, [BLUE_UR[0] + 18, BLUE_UR[1] - 18], [BLUE_UR[0] + 172, BLUE_UR[1] - 18]] as Pt[], text: 'TOUCHDOWN / PAD-01 · 325 M'},
};
const pts = (list: Pt[]) => list.map(([x, y]) => `${x},${y}`).join(' ');

/* Altitude ruler: log scale, one decade = AXIS_DECADE viewBox units, 325 m
 * at the origin. The tick pattern repeats far past the labelled range so it
 * still fills the hero after scrolling. */
export const AXIS_DECADE = 54;
const GROUND_M = 325;
const axisPos = (metres: number) => AXIS_DECADE * Math.log10(metres / GROUND_M);
const rulerTicks = (seg: (pos: number, kind: 0 | 1 | 2) => string) => {
  let d = '';
  for (let k = -10; k <= 25; k += 1) {
    for (let m = 1; m <= 9; m += 1) d += seg(axisPos(m * 10 ** k), m === 1 ? 0 : m === 5 ? 1 : 2);
  }
  return d;
};
/** Launch ruler: ticks cross the double rail (rails at y = +-3). */
const H_TICKS = rulerTicks((pos, kind) => {
  const size = [9, 5, 3][kind];
  return `M${pos.toFixed(1)} ${-size}V${size}`;
});
/** Landing ruler: majors cross the axis, the rest sit on its right. */
const V_TICKS = rulerTicks((pos, kind) => {
  const y = (-pos).toFixed(1);
  return kind === 0 ? `M-9 ${y}H9` : `M0 ${y}H${kind === 1 ? 6 : 4}`;
});
const LADDER_DECADES: Array<[number, string]> = [
  [1e3, '1 km'], [1e4, '10 km'], [1e5, '100 km'], [1e6, '10³ km'], [1e7, '10⁴ km'], [1e8, '10⁵ km'], [1e9, '10⁶ km'],
];
const LADDER_NAMES: Array<[number, string]> = [
  [GROUND_M, 'PAD'], [1e5, 'KÁRMÁN'], [3.6e7, 'GEO'], [3.844e8, 'MOON'], [7.99e8, 'ORBIT'],
];

/** Full-bleed axes + scrolling altitude ruler. Rendered once per scene (dark
 * ink in the clipped day scene, light in the night scene) so it reads on
 * both sides of the clip edge. Launch uses set "h", landing set "v". Arm
 * lengths are written by the controller. */
function HeroAxis({scene}: {scene: 'day' | 'night'}): ReactNode {
  return (
    <svg className={`${styles.diagramArt} ${styles.axisLayer}`} data-hero-axis={scene} {...SVG_PROPS}>
      <g transform={`translate(${PAD.x} ${PAD.y})`} data-axis="" className={styles.axis}>
        {/* Launch: double horizontal rail, ruler scrolls sideways, square origin. */}
        <g data-axis-set="h">
          {['l-3', 'l3', 'r-3', 'r3'].map((arm) => (
            <path key={arm} data-axis-arm={arm} pathLength="1" />
          ))}
          <g data-axis-ladder="h">
            <path className={styles.axisMinor} d={H_TICKS} />
            {LADDER_DECADES.map(([m, label]) => (
              <text key={label} x={(axisPos(m) + 3).toFixed(1)} y="24">
                {label}
              </text>
            ))}
            {/* Two rows so close names (MOON / ORBIT) don't collide. */}
            {LADDER_NAMES.map(([m, name], index) => (
              <text key={name} className={styles.axisName} x={(axisPos(m) + 3).toFixed(1)} y={index % 2 ? -29 : -16}>
                {name}
              </text>
            ))}
          </g>
          <rect className={styles.axisOrigin} x="-6" y="-6" width="12" height="12" />
        </g>
        {/* Landing: vertical ruler axis plus a plain horizontal axis (no
            ticks); cross at the origin with small gaps where the axes meet it. */}
        <g data-axis-set="v">
          {['u', 'd', 'hl', 'hr'].map((arm) => (
            <path key={arm} data-axis-arm={arm} pathLength="1" />
          ))}
          <g data-axis-ladder="v">
            <path className={styles.axisMinor} d={V_TICKS} />
            {LADDER_DECADES.map(([m, label]) => (
              <text key={label} x="14" y={(-axisPos(m) + 4).toFixed(1)}>
                {label}
              </text>
            ))}
            {LADDER_NAMES.map(([m, name]) => (
              <text key={name} className={styles.axisName} x="-14" y={(-axisPos(m) + 4).toFixed(1)} textAnchor="end">
                {name}
              </text>
            ))}
          </g>
          <path className={styles.axisCross} d="M-10 0H10M0 -10V10" />
        </g>
      </g>
    </svg>
  );
}

/** Light overlay used only while the hero switches theme. No filters. */
function HeroActor(): ReactNode {
  return (
    <svg className={`${styles.diagramArt} ${styles.actorLayer}`} data-hero-actor="" {...SVG_PROPS}>
      {/* Orbit trace: the main orbit drawn forward out of the pad. */}
      <g transform={`rotate(-16 ${FOCUS.x} ${FOCUS.y})`}>
        <path data-actor="trace" className={styles.actorTrace} d={ORBIT_TRACE_PATH} pathLength="1" />
      </g>
      {/* Fixed on the pad / white star: nothing travels, so the rig is static. */}
      <g data-actor="rig" transform={`translate(${PAD.x} ${PAD.y})`}>
        <circle data-actor="ripple" className={styles.actorRipple} r="60" />
        <circle data-actor="ripple" className={styles.actorRipple} r="60" />
        <path data-actor="reticle" className={styles.actorReticle} d={RETICLE_PATH} />
        {/* Ignition shock: one thin ring scaled far out (non-scaling stroke). */}
        <circle data-actor="shock" className={styles.actorShock} r="60" />
        {/* Countdown: 12 segments just outside the pad arc. */}
        {COUNT_SEGMENTS.map((d) => (
          <path data-actor="count" className={styles.actorCount} d={d} key={d} />
        ))}
        <path data-actor="ring" className={styles.actorRing} d={PAD_ARC_PATH} />
        {FAINT_LINES.map(({points, tone, phase}, index) => (
          <polyline key={`f${index}`} data-actor="faint" data-tone={tone} data-phase={phase} className={styles.actorFaint} points={pts(points)} pathLength="1" />
        ))}
        {BLUE_LINKS.map(({points}, index) => (
          <g key={`b${index}`}>
            <polyline data-actor="blue-line" className={styles.actorBlue} points={pts(points)} pathLength="1" />
            <rect data-actor="square" className={styles.actorSquare} x={points[0][0] - 5} y={points[0][1] - 5} width="10" height="10" />
          </g>
        ))}
        {RED_LINKS.map(({points, end = 3.5}, index) => {
          const [ex, ey] = points[points.length - 1];
          return (
            <g key={`r${index}`}>
              <polyline data-actor="red-line" className={styles.actorRed} points={pts(points)} pathLength="1" />
              <circle data-actor="red-end" className={styles.actorRedEnd} cx={ex} cy={ey} r={end} />
            </g>
          );
        })}
        {(['red', 'blue'] as const).map((tone) => {
          const {points, text} = LEADERS[tone];
          const ey = points[points.length - 1][1];
          return (
            <g key={tone}>
              <polyline data-actor={`leader-${tone}`} className={styles.actorLeader} data-tone={tone} points={pts(points)} pathLength="1" />
              <text data-actor={`caption-${tone}`} className={styles.actorCaption} x={points[1][0] + 4} y={ey - 8}>
                {text}
              </text>
            </g>
          );
        })}
        <circle data-actor="dot" className={styles.actorDot} r={HERO_ANCHORS.star.r} />
      </g>
    </svg>
  );
}

export default function VisualStudy({variant = 'field'}: VisualStudyProps): ReactNode {
  return (
    <div className={`${styles.backgroundArt} ${styles[variant]}`} aria-hidden="true" data-theme-art="" data-hero-art="">
      {/* Each scene is a stack of SVG layers so the switch can fade or move a
          whole layer (compositor-friendly) instead of individual shapes. */}
      <div className={`${styles.scene} ${styles.nightScene}`} data-art-mode="night" data-hero-scene="night">
        <svg className={`${styles.diagramArt} ${styles.nightPlate}`} data-hero-layer="n-grid" {...SVG_PROPS}>
          <NightGrid />
        </svg>
        <svg className={`${styles.diagramArt} ${styles.nightPlate}`} data-hero-layer="n-core" {...SVG_PROPS}>
          <NightCore />
        </svg>
        <svg className={`${styles.diagramArt} ${styles.nightPlate}`} data-hero-layer="n-ticks" {...SVG_PROPS}>
          <NightTicks />
        </svg>
        <svg className={`${styles.diagramArt} ${styles.nightPlate}`} data-hero-layer="n-orbits" {...SVG_PROPS}>
          <NightOrbits />
        </svg>
        <svg className={`${styles.diagramArt} ${styles.nightPlate}`} data-hero-layer="n-marks" {...SVG_PROPS}>
          <NightMarks />
        </svg>
        {/* Flat red star stand-in sits inside the night scene, under the
            axis, so the ruler stays readable across the disc. */}
        <svg className={`${styles.diagramArt} ${styles.actorLayer}`} data-hero-actor-disc="" {...SVG_PROPS}>
          <g data-actor="disc" className={styles.actorDisc}>
            <circle r={DISC_R} />
          </g>
        </svg>
        <HeroAxis scene="night" />
      </div>
      <div className={styles.colourLayer} data-hero-colour="" />
      <div className={`${styles.scene} ${styles.dayScene}`} data-art-mode="day" data-hero-scene="day">
        <svg className={styles.diagramArt} data-hero-layer="d-ocean" {...SVG_PROPS}>
          <DayAtlas />
        </svg>
        <svg className={styles.diagramArt} data-hero-layer="d-tiles" {...SVG_PROPS}>
          <DayTiles />
        </svg>
        <svg className={styles.diagramArt} data-hero-layer="d-lines" {...SVG_PROPS}>
          <DayLines />
        </svg>
        <svg className={styles.diagramArt} data-hero-layer="d-guide" {...SVG_PROPS}>
          <DayGuide />
        </svg>
        <HeroAxis scene="day" />
      </div>
      <HeroActor />
      <div className={styles.noiseLayer} />
    </div>
  );
}
