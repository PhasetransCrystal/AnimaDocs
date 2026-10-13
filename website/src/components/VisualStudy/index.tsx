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

type Diamond = [number, number, number, 'blue' | 'pale' | 'outline' | 'ink'];

const ROUTE: [number, number][] = [
  [740, 318], [860, 262], [975, 288], [1080, 190], [1205, 214], [1330, 120],
];

const DIAMONDS: Diamond[] = [
  [860, 262, 30, 'blue'], [975, 288, 22, 'outline'], [1080, 190, 40, 'blue'],
  [1205, 214, 26, 'pale'], [1330, 120, 34, 'outline'],
  [1150, 300, 18, 'pale'], [1180, 330, 12, 'blue'], [1236, 296, 20, 'outline'],
  [1268, 330, 14, 'pale'], [1032, 128, 16, 'pale'], [1120, 112, 12, 'ink'],
  [930, 210, 14, 'pale'], [1290, 250, 10, 'blue'],
];

function diamondPath(x: number, y: number, s: number): string {
  const h = s / 2;
  return `M${x} ${y - h}L${x + h} ${y}L${x} ${y + h}L${x - h} ${y}Z`;
}

const DIAMOND_CLASS: Record<Diamond[3], string> = {
  blue: styles.diamondBlue,
  pale: styles.diamondPale,
  outline: styles.diamondOutline,
  ink: styles.diamondInk,
};

function DayAtlas(): ReactNode {
  const solid = ROUTE.slice(2).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('');
  const dashed = ROUTE.slice(0, 3).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('');
  return (
    <g className={styles.dayArt}>
      <defs>
        <pattern id="vs-lattice" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 0L40 40M40 0L0 40" className={styles.latticeLine} />
          <path d="M40 0H0V40" className={styles.latticeFrame} />
        </pattern>
      </defs>

      {/* Tilted coordinate plane. */}
      <g transform={`translate(${FOCUS.x - 40} ${FOCUS.y - 15}) rotate(-11) skewX(-14)`}>
        <rect className={styles.planePaper} x="-330" y="-150" width="660" height="300" />
        <rect x="-330" y="-150" width="660" height="300" fill="url(#vs-lattice)" />
        <path className={styles.planeAxis} d="M-330 0H330M0 -150V150" />
        <path className={styles.planeTicks} d={Array.from({length: 17}, (_, i) => `M${-320 + i * 40} -4V4`).join('')} />
        <rect className={styles.planeEdge} x="-330" y="-150" width="660" height="300" />
        <path className={styles.planeCorner} d="M-330 -130V-150H-310M310 150H330V130" />
      </g>

      <path className={styles.routeDashed} d={dashed} />
      <path className={styles.routeSolid} d={solid} />

      {DIAMONDS.map(([x, y, s, kind]) => (
        <path key={`${x}-${y}`} d={diamondPath(x, y, s)} className={DIAMOND_CLASS[kind]} />
      ))}

      {/* Bezier-style handles on two nodes (day-01). */}
      <g className={styles.handles}>
        <path d="M1046 214L1114 166" />
        <rect x="1042" y="210" width="8" height="8" />
        <rect x="1110" y="162" width="8" height="8" />
        <path d="M1296 140L1364 100" />
        <rect x="1292" y="136" width="8" height="8" />
        <rect x="1360" y="96" width="8" height="8" />
      </g>

      <g className={styles.nodes}>
        {ROUTE.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" />
        ))}
      </g>
      <rect className={styles.goldMark} x="734" y="312" width="12" height="12" />
      <circle className={styles.redRing} cx="1080" cy="190" r="34" />

      <g className={styles.registration}>
        <path d="M820 115H836M828 107V123" />
        <path d="M1404 300H1420M1412 292V308" />
        <path d="M1000 400H1016M1008 392V408" />
      </g>

      <g className={styles.dayLabel}>
        <text x="756" y="304">[ INDEX / 01 ]</text>
        <text x="1222" y="240">[ 38.49°N, 117.62°E ]</text>
        <text x="1400" y="84" textAnchor="end">[ ROUTE A-03 ]</text>
        <text x="724" y="98">(1) PLANE · (2) ROUTE · (3) TILE</text>
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
