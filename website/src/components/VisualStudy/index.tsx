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

const FOCUS = {x: 1150, y: 230};

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

function buildStruts(): string {
  // Observatory ring stand-in: radial struts on the upper half of the dome.
  const parts: string[] = [];
  for (let deg = 196; deg <= 344; deg += 8) {
    const rad = (deg * Math.PI) / 180;
    const x0 = FOCUS.x + 296 * Math.cos(rad);
    const y0 = FOCUS.y + 296 * Math.sin(rad);
    const x1 = FOCUS.x + 322 * Math.cos(rad);
    const y1 = FOCUS.y + 322 * Math.sin(rad);
    parts.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`);
  }
  return parts.join('');
}

const NIGHT_TICKS = buildTicks();
const NIGHT_STRUTS = buildStruts();

/* Pixel island where the grid "breaks" over the disc edge (night-01). */
const PIXELS: [number, number, number, 'light' | 'dark'][] = [
  [968, 296, 8, 'light'], [978, 296, 4, 'light'], [968, 306, 4, 'dark'],
  [984, 304, 6, 'light'], [992, 314, 4, 'light'], [976, 316, 6, 'dark'],
  [1002, 322, 4, 'light'], [986, 324, 3, 'light'], [960, 318, 3, 'light'],
  [1010, 300, 3, 'dark'], [952, 286, 4, 'light'], [998, 334, 6, 'light'],
];

const PLUS_MARKS: [number, number][] = [
  [820, 120], [1420, 78], [1365, 470], [900, 430], [1260, 40],
];

function NightObservatory(): ReactNode {
  return (
    <g className={styles.nightArt}>
      <defs>
        <radialGradient id="vs-disc" cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#ff6a5c" />
          <stop offset="0.55" stopColor="#e34549" />
          <stop offset="1" stopColor="#a8242c" />
        </radialGradient>
        <radialGradient id="vs-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e34549" stopOpacity="0.26" />
          <stop offset="0.45" stopColor="#e34549" stopOpacity="0.08" />
          <stop offset="1" stopColor="#e34549" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vs-grid-fade" cx={FOCUS.x} cy={FOCUS.y} r="640" gradientUnits="userSpaceOnUse">
          <stop offset="0.28" stopColor="#000" />
          <stop offset="0.34" stopColor="#fff" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0.5" />
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

      {/* Halo and rim-lit observatory ring (placeholder for the optional Krea2 scene). */}
      <circle cx={FOCUS.x} cy={FOCUS.y} r="420" fill="url(#vs-halo)" />
      <g className={styles.structure}>
        <circle cx={FOCUS.x} cy={FOCUS.y} r="296" />
        <circle cx={FOCUS.x} cy={FOCUS.y} r="322" />
        <path d={NIGHT_STRUTS} />
        <path className={styles.structureRim} d="M1404.6 69.2A300 300 0 0 0 1238.3 -56.7" />
      </g>

      <line className={styles.crosshair} x1="640" y1={FOCUS.y} x2="1440" y2={FOCUS.y} />
      <line className={styles.crosshair} x1={FOCUS.x} y1="0" x2={FOCUS.x} y2="560" />

      <circle cx={FOCUS.x} cy={FOCUS.y} r={DISC_R} fill="url(#vs-disc)" />
      <circle cx={FOCUS.x} cy={FOCUS.y} r={DISC_R} fill="#000" filter="url(#vs-disc-grain)" opacity="0.5" />

      <g className={styles.tickRing}>
        {NIGHT_TICKS.map((tick) => (
          <path key={tick.d} d={tick.d} className={tick.major ? styles.tickMajor : styles.tickMinor} />
        ))}
      </g>
      <circle className={styles.stateDot} cx="961.3" cy="413.1" r="4" />

      <g className={styles.orbits} transform={`rotate(-16 ${FOCUS.x} ${FOCUS.y})`}>
        <ellipse cx={FOCUS.x} cy={FOCUS.y} rx="430" ry="112" />
        <ellipse className={styles.orbitSoft} cx={FOCUS.x} cy={FOCUS.y} rx="560" ry="168" />
        <ellipse className={styles.orbitFaint} cx={FOCUS.x} cy={FOCUS.y} rx="300" ry="64" />
        <circle className={styles.satellite} cx="746" cy="192" r="5" />
        <circle className={styles.satelliteRing} cx="746" cy="192" r="13" />
      </g>

      <g className={styles.pixels}>
        {PIXELS.map(([x, y, s, tone]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={s} height={s} className={tone === 'light' ? styles.pixelLight : styles.pixelDark} />
        ))}
      </g>

      <g className={styles.plusMarks}>
        {PLUS_MARKS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`} />
        ))}
      </g>

      <g className={styles.nightLabel}>
        <text x="724" y="98">FIG.01 — OBSERVATION</text>
        <text x="724" y="114">GRID SYSTEMS ........ : 02</text>
        <text x="768" y="318">ORB / 0.42 · 16°</text>
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
// Sits right of / below the plate so the terraces are not hidden by it.
const LAND_CENTER = {x: 1300, y: 360};
const LAND_STEP = 24;
const landLevels = [
  {rx: 330, ry: 230},
  {rx: 262, ry: 180},
  {rx: 200, ry: 136},
  {rx: 140, ry: 94},
  {rx: 82, ry: 54},
];

type LandRow = {x: number; y: number; width: number};

function buildLandLevel(level: number): LandRow[] {
  let seed = 7331 + level * 97;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const {rx, ry} = landLevels[level];
  // Shift inner levels slightly so the "peak" sits off-centre.
  const cx = LAND_CENTER.x + level * 14;
  const cy = LAND_CENTER.y - level * 8;
  const rows: LandRow[] = [];
  for (let y = cy - ry; y < cy + ry; y += LAND_STEP) {
    const dy = (y + LAND_STEP / 2 - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    // Snap both edges to the step grid with seeded jitter -> stepped coastline.
    const left = Math.round((cx - half + (random() - 0.5) * 40) / LAND_STEP) * LAND_STEP;
    const right = Math.round((cx + half + (random() - 0.5) * 40) / LAND_STEP) * LAND_STEP;
    if (right - left >= LAND_STEP) rows.push({x: left, y, width: right - left});
  }
  return rows;
}

const landTerraces = landLevels.map((_level, index) => buildLandLevel(index));
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
          {landTerraces[0].map((row, index) => (
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
        {dayRouteMain.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect className={styles.nodeSquare} height="12" width="12" x={x - 6} y={y - 6} />
            <rect className={styles.nodeCore} height="5" width="5" x={x - 2.5} y={y - 2.5} />
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
