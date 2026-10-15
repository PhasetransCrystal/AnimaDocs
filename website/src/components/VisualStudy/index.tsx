import type {ReactNode} from 'react';

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

const NIGHT_TICKS = buildTicks();
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

function NightObservatory(): ReactNode {
  return (
    <g className={styles.nightArt}>
      <defs>
        {/* Near-flat disc: a shallow tonal shift only, no specular highlight. */}
        <linearGradient id="vs-disc" x1="0.2" y1="0.1" x2="0.8" y2="0.95">
          <stop offset="0" stopColor="#e94a4c" />
          <stop offset="1" stopColor="#c8363d" />
        </linearGradient>
        <filter id="vs-terrace-blur" x="0" y="0" width="1440" height="900" filterUnits="userSpaceOnUse">
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
          <rect width="1440" height="900" fill="url(#vs-terrace-fade)" />
        </mask>
        <radialGradient id="vs-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e34549" stopOpacity="0.26" />
          <stop offset="0.45" stopColor="#e34549" stopOpacity="0.08" />
          <stop offset="1" stopColor="#e34549" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vs-grid-fade" cx={FOCUS.x} cy={FOCUS.y} r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0.2" stopColor="#000" />
          <stop offset="0.25" stopColor="#fff" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="vs-grid-mask">
          <rect width="1440" height="900" fill="url(#vs-grid-fade)" />
        </mask>
        <pattern id="vs-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" className={styles.nightGridLine} />
        </pattern>
        <filter id="vs-disc-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <rect width="1440" height="900" fill="url(#vs-grid)" mask="url(#vs-grid-mask)" />

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

      <line className={styles.crosshair} x1="520" y1={FOCUS.y} x2="1440" y2={FOCUS.y} />
      <line className={styles.crosshair} x1={FOCUS.x} y1="0" x2={FOCUS.x} y2="560" />

      <circle cx={FOCUS.x} cy={FOCUS.y} r={DISC_R} fill="url(#vs-disc)" />
      {/* Overlap lens with the eccentric twin, then the twin's outline. */}
      {/* The clip stays on the wrapper so only the twin drifts, not the clip. */}
      <g clipPath="url(#vs-disc-clip)">
        <circle className={`${styles.discLens} ${styles.lensDrift}`} cx={FOCUS.x + TWIN.dx} cy={FOCUS.y + TWIN.dy} r={DISC_R} />
      </g>
      <circle cx={FOCUS.x} cy={FOCUS.y} r={DISC_R} fill="#000" filter="url(#vs-disc-grain)" opacity="0.42" />

      {/* Tick ring and state dot rotate together so the gap keeps its dot. */}
      <g className={styles.tickSpin}>
        <g className={styles.tickRing}>
          {NIGHT_TICKS.map((tick) => (
            <path key={tick.d} d={tick.d} className={tick.major ? styles.tickMajor : styles.tickMinor} />
          ))}
        </g>
        <circle className={styles.stateDot} cx={STATE_DOT[0].toFixed(1)} cy={STATE_DOT[1].toFixed(1)} r="4" />
      </g>

      <g className={styles.orbits} transform={`rotate(-16 ${FOCUS.x} ${FOCUS.y})`}>
        <ellipse cx={FOCUS.x} cy={FOCUS.y} rx="430" ry="112" />
        <ellipse className={styles.orbitSoft} cx={FOCUS.x} cy={FOCUS.y} rx="560" ry="168" />
        <ellipse className={styles.orbitFaint} cx={FOCUS.x} cy={FOCUS.y} rx="300" ry="64" />
        {/* Short bright segments travelling along two orbits. */}
        <ellipse className={styles.orbitComet} cx={FOCUS.x} cy={FOCUS.y} rx="430" ry="112" pathLength={1000} />
        <ellipse className={`${styles.orbitComet} ${styles.orbitCometSlow}`} cx={FOCUS.x} cy={FOCUS.y} rx="560" ry="168" pathLength={1000} />
        <circle className={styles.satellite} cx={FOCUS.x - 404} cy={FOCUS.y - 38} r="5" />
        <circle className={`${styles.satelliteRing} ${styles.pulse}`} cx={FOCUS.x - 404} cy={FOCUS.y - 38} r="13" />
      </g>

      <g className={styles.pixels}>
        {PIXELS.map(([x, y, s, tone], index) => (
          <rect
            key={`${x}-${y}`}
            x={FOCUS.x + x}
            y={FOCUS.y + y}
            width={s}
            height={s}
            className={`${tone === 'light' ? styles.pixelLight : styles.pixelDark} ${index % 3 === 0 ? styles.flicker : ''}`}
            style={{animationDelay: `${(index * 0.7) % 5}s`}}
          />
        ))}
      </g>

      <g className={styles.plusMarks}>
        {PLUS_MARKS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`} />
        ))}
      </g>

      <g className={styles.nightLabel}>
        <text x="560" y="98">FIG.01 — OBSERVATION</text>
        <text x="560" y="114">GRID SYSTEMS ........ : 02</text>
        <text x="628" y="324">ORB / 0.42 · 16°</text>
        <text x="1412" y="96" transform="rotate(90 1412 96)">SIGNAL / ANIMA-01</text>
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
  x: number;
  y: number;
  size: number;
  kind: TileKind;
  opacity: number;
};

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
      tiles.push({x, y, size: kind === 'brass' ? TILE_SIZE * 0.46 : TILE_SIZE, kind, opacity});
    }
  }
  return tiles;
}

const dayTiles = buildDayTiles();

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

const dayGuideTicks = Array.from({length: 36}, (_value, index) => {
  const angle = (index * 10 * Math.PI) / 180;
  const inner = index % 3 === 0 ? 156 : 163;
  return {
    x1: 640 + Math.cos(angle) * inner,
    y1: 150 + Math.sin(angle) * inner,
    x2: 640 + Math.cos(angle) * 170,
    y2: 150 + Math.sin(angle) * 170,
  };
});

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
const washToneClass = ['washA', 'washB', 'washC'] as const;

function DayAtlas(): ReactNode {
  return (
    <g className={styles.dayArt}>
      <defs>
        <linearGradient id="vsDayBlue" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3474e8" />
          <stop offset="1" stopColor="#1d4aa6" />
        </linearGradient>
        <linearGradient id="vsDayPale" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e4ecf8" />
          <stop offset="1" stopColor="#b9cbe8" />
        </linearGradient>
        <linearGradient id="vsDayGray" x1="0" x2="1" y1="1" y2="0">
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
          {landTerraces.flat().map((row, index) => (
            <rect height={LAND_STEP} key={index} width={row.width} x={row.x} y={row.y} />
          ))}
        </clipPath>
        <mask id="vsDayLatticeMask">
          <rect fill="url(#vsDayLatticeFade)" height="560" width="1440" />
        </mask>
      </defs>
      <g className={styles.washField} mask="url(#vsDayLatticeMask)">
        {washBlocks.map((block, index) => (
          <rect
            className={styles[washToneClass[block.tone]]}
            height={block.height}
            key={index}
            opacity={block.opacity}
            width={block.width}
            x={block.x}
            y={block.y}
          />
        ))}
      </g>
      <g className={styles.landField} transform="rotate(-7 960 220)">
        {/* Cast shadow of the base terrace, offset like the plate wash. */}
        <g className={styles.landShadow} transform="translate(14 16)">
          {landTerraces.flat().map((row, index) => (
            <rect height={LAND_STEP} key={index} width={row.width} x={row.x} y={row.y} />
          ))}
        </g>
        {landTerraces.map((rows, level) => (
          <g className={styles[`land${level}`]} key={level}>
            {rows.map((row, index) => (
              <rect height={LAND_STEP} key={index} width={row.width} x={row.x} y={row.y} />
            ))}
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
      <g className={styles.plateFrames}>
        <rect className={styles.plateFrameWash} x="718" y="84" width="520" height="300" transform="rotate(-7 978 234)" />
        <rect className={styles.plateFramePaper} x="700" y="70" width="520" height="300" transform="rotate(-7 960 220)" />
        <rect className={styles.plateFrameLine} x="1140" y="42" width="300" height="200" transform="rotate(4 1290 142)" />
      </g>
      <g className={styles.tileField}>
        {dayTiles.map((tile, index) => (
          <rect
            className={styles[`tile${tile.kind.charAt(0).toUpperCase()}${tile.kind.slice(1)}`]}
            height={tile.size}
            key={index}
            opacity={tile.opacity}
            transform={`rotate(32 ${tile.x} ${tile.y})`}
            width={tile.size}
            x={tile.x - tile.size / 2}
            y={tile.y - tile.size / 2}
          />
        ))}
      </g>
      <g className={styles.guideStudy}>
        <circle className={styles.guideCircle} cx="640" cy="150" r="170" />
        <path className={styles.guideArc} d="M640 -20 A170 170 0 0 1 810 150" />
        <g className={styles.guideTicks}>
          {dayGuideTicks.map((tick, index) => <line key={index} {...tick} />)}
        </g>
      </g>
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
      <g className={styles.plateNumbers}>
        <text x="86" y="118">01</text>
        <line x1="86" x2="126" y1="130" y2="130" />
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
        <rect height="8" width="8" x="131" y="86" />
        <rect height="6" width="6" x="1300" y="120" />
        <circle cx="905" cy="262" r="4" />
      </g>
    </g>
  );
}

export default function VisualStudy({variant = 'field'}: VisualStudyProps): ReactNode {
  return (
    <div className={`${styles.backgroundArt} ${styles[variant]}`} aria-hidden="true">
      <svg
        className={styles.diagramArt}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMin slice"
        fill="none"
        focusable="false">
        <DayAtlas />
        <NightObservatory />
      </svg>
      <div className={styles.noiseLayer} />
    </div>
  );
}
