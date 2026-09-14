import type {ReactNode} from 'react';

import styles from './styles.module.css';

type VisualStudyProps = {
  variant?: 'field' | 'specimen';
};

/* Deterministic mark data. Every number below is fixed so screenshots and
 * reviews are reproducible; no random source is consulted at render time. */

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

const NIGHT_DISC = {cx: 1000, cy: 235, r: 165};

const nightTicks = Array.from({length: 72}, (_value, index) => {
  const angle = (index * 5 * Math.PI) / 180;
  const major = index % 6 === 0;
  const inner = major ? 190 : 201;
  return {
    x1: NIGHT_DISC.cx + Math.cos(angle) * inner,
    y1: NIGHT_DISC.cy + Math.sin(angle) * inner,
    x2: NIGHT_DISC.cx + Math.cos(angle) * 213,
    y2: NIGHT_DISC.cy + Math.sin(angle) * 213,
    major,
  };
});

const nightPixelsOrdered = Array.from({length: 16}, (_value, index) => {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {x: 64 + col * 15, y: 296 + row * 15, size: 8, opacity: 0.78};
});

const nightPixelsScatter = Array.from({length: 18}, (_value, index) => ({
  x: 152 + ((index * 53) % 178),
  y: 284 + ((index * 37) % 116),
  size: 3 + (index % 3) * 2,
  opacity: Math.max(0.18, 0.72 - index * 0.035),
}));

const nightRulerTicks = Array.from({length: 16}, (_value, index) => ({
  y: 140 + index * 16,
  length: index % 5 === 0 ? 12 : 6,
}));

function toPoints(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function DayAtlas(): ReactNode {
  return (
    <g className={styles.dayArt}>
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
      <g className={styles.monoLabel}>
        <text x="720" y="124" textAnchor="middle">[ 39.90N / 116.40E ]</text>
        <text x="1105" y="136" textAnchor="middle">[ 31.23N / 121.47E ]</text>
        <text x="520" y="176" textAnchor="middle">[ 22.54N / 114.05E ]</text>
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

function NightObservatory(): ReactNode {
  return (
    <g className={styles.nightArt}>
      <g className={styles.cardFrames}>
        <rect className={styles.cardDeep} height="250" rx="26" width="420" x="760" y="70" transform="rotate(-4 970 195)" />
        <rect className={styles.cardSoft} height="200" rx="22" width="300" x="1105" y="130" transform="rotate(3 1255 230)" />
        <rect className={styles.cardLine} height="170" rx="18" width="240" x="742" y="96" transform="rotate(-7 862 181)" />
      </g>
      <path
        className={styles.inkBlob}
        d="M790 130 C 830 84, 918 60, 992 82 S 1130 132, 1168 112 L 1186 208 C 1150 268, 1032 290, 946 262 S 812 226, 792 182 Z"
      />
      <g className={styles.echoDisc}>
        <circle cx="700" cy="130" r="34" />
        <circle className={styles.echoDiscRing} cx="700" cy="130" r="45" />
      </g>
      <circle className={styles.signalDisc} cx={NIGHT_DISC.cx} cy={NIGHT_DISC.cy} r={NIGHT_DISC.r} />
      <circle className={styles.discEdge} cx={NIGHT_DISC.cx} cy={NIGHT_DISC.cy} r={NIGHT_DISC.r - 14} />
      <g className={styles.tickRing}>
        {nightTicks.map((tick, index) => (
          <line className={tick.major ? styles.tickMajor : styles.tickMinor} key={index} x1={tick.x1} x2={tick.x2} y1={tick.y1} y2={tick.y2} />
        ))}
      </g>
      <g className={styles.orbitArcs}>
        <ellipse cx="1000" cy="235" rx="580" ry="120" strokeDasharray="720 280 520 925" transform="rotate(-16 1000 235)" />
        <ellipse className={styles.orbitArcSoft} cx="1000" cy="235" rx="430" ry="90" strokeDasharray="430 210 400 773" transform="rotate(18 1000 235)" />
      </g>
      <g className={styles.trajectory}>
        <line x1="60" x2="1380" y1="470" y2="150" />
        <line x1="240" x2="1240" y1="60" y2="540" />
        <circle className={styles.nodeDot} cx="720" cy="284" r="4" />
        <circle className={styles.nodeDot} cx="700" cy="120" r="4" />
        <path className={styles.plusMark} d="M314 388h12M320 382v12M1074 222h12M1080 216v12M614 240h12M620 234v12" />
      </g>
      <g className={styles.stateRing}>
        <circle cx="520" cy="160" r="42" />
        <circle cx="520" cy="160" r="31" />
        <path className={styles.stateRingGap} d="M520 118 A42 42 0 1 1 484 135" />
        <circle className={styles.stateRingDot} cx="484" cy="135" r="3.5" />
      </g>
      <g className={styles.nightLabel}>
        <text x="90" y="150">FIELD LOG ...... 04</text>
        <text x="90" y="166">ORBIT SYNC ... 76.2</text>
        <text x="90" y="182">DISC DRIFT .... 0.8</text>
        <text x="90" y="198">STATE ........ LIVE</text>
      </g>
      <g className={styles.seal}>
        <rect height="36" rx="9" width="36" x="782" y="300" transform="rotate(-6 800 318)" />
        <path d="M800 306 L812 318 800 330 788 318 Z M794 312 L806 324 M806 312 L794 324" transform="rotate(-6 800 318)" />
      </g>
      <g className={styles.pixelIslands}>
        {nightPixelsOrdered.map((pixel, index) => (
          <rect height={pixel.size} key={`o-${index}`} opacity={pixel.opacity} width={pixel.size} x={pixel.x} y={pixel.y} />
        ))}
        {nightPixelsScatter.map((pixel, index) => (
          <rect height={pixel.size} key={`s-${index}`} opacity={pixel.opacity} width={pixel.size} x={pixel.x} y={pixel.y} />
        ))}
      </g>
      <g className={styles.rulerTicks}>
        {nightRulerTicks.map((tick, index) => (
          <line key={index} x1="44" x2={44 + tick.length} y1={tick.y} y2={tick.y} />
        ))}
      </g>
      <circle className={styles.oliveDot} cx="648" cy="86" r="5" />
      <circle className={styles.oliveDot} cx="240" cy="140" r="4" />
      <circle className={styles.blueDot} cx="1330" cy="336" r="5" />
    </g>
  );
}

export default function VisualStudy({variant = 'field'}: VisualStudyProps): ReactNode {
  return (
    <div className={`${styles.backgroundArt} ${styles[variant]}`} aria-hidden="true">
      <svg className={styles.diagramArt} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice" fill="none" focusable="false">
        <DayAtlas />
        <NightObservatory />
      </svg>
      <div className={styles.noiseLayer} />
    </div>
  );
}