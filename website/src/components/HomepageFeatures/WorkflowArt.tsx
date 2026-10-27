import {useId, type ReactNode} from 'react';

import styles from './workflow-art.module.css';

type Pt = {x: number; y: number};

type Orbit = {rx: number; ry?: number; rot: number; tone: 'main' | 'dash' | 'faint'};

/** One observation plate. Every orbit is centred on the disc. */
type Plate = {
  w: number;
  h: number;
  c: Pt;
  r: number;
  /** orbits[0] is solved to pass through the satellite. */
  orbits: Orbit[];
  sat: Pt;
  /** Leader direction from the satellite: 1 = right, -1 = left. */
  lead: 1 | -1;
  plus: Pt[];
  stars: number;
  seed: number;
  /** Draw the leader + caption (skipped where the node grid leaves no free cell). */
  label: boolean;
  fit: 'slice' | 'meet';
};

// Background placement: the disc is anchored at the right edge (like the day construction
// study), half cropped and mostly hidden behind the output nodes, so it frames the board
// instead of competing with the 06 core node.
const WIDE: Plate = {
  w: 1200,
  h: 360,
  c: {x: 1150, y: 180},
  r: 150,
  orbits: [
    {rx: 520, rot: -12, tone: 'main'},
    {rx: 380, ry: 120, rot: 14, tone: 'dash'},
    {rx: 260, ry: 64, rot: -30, tone: 'faint'},
  ],
  // Free top-row cell above 08 (image encode).
  sat: {x: 850, y: 108},
  lead: 1,
  plus: [{x: 96, y: 60}, {x: 318, y: 52}, {x: 70, y: 300}, {x: 560, y: 304}],
  stars: 40,
  seed: 61,
  label: true,
  fit: 'slice',
};

const TALL: Plate = {
  w: 400,
  h: 780,
  c: {x: 400, y: 250},
  r: 150,
  orbits: [
    {rx: 320, rot: 10, tone: 'main'},
    {rx: 300, ry: 110, rot: -24, tone: 'dash'},
    {rx: 220, ry: 60, rot: 36, tone: 'faint'},
  ],
  // Centre gutter between 01 and 02, above the canvas connector.
  sat: {x: 200, y: 150},
  lead: -1,
  plus: [{x: 34, y: 34}, {x: 26, y: 612}, {x: 378, y: 706}],
  stars: 24,
  seed: 23,
  label: false,
  fit: 'meet',
};

const f = (v: number) => Math.round(v * 10) / 10;
const rad = (deg: number) => (deg * Math.PI) / 180;

function rotate(p: Pt, deg: number): Pt {
  const a = rad(deg);
  return {x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a)};
}

/** Point on a centred, rotated ellipse at parameter theta (radians). */
function onOrbit(c: Pt, rx: number, ry: number, rot: number, theta: number): Pt {
  const p = rotate({x: rx * Math.cos(theta), y: ry * Math.sin(theta)}, rot);
  return {x: c.x + p.x, y: c.y + p.y};
}

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function ObservationPlate({plate, className, uid}: {plate: Plate; className: string; uid: string}): ReactNode {
  const {w, h, c, r, sat, lead} = plate;
  const clipId = `${uid}-disc`;
  const haloId = `${uid}-halo`;

  // Solve the main orbit's ry so the satellite sits exactly on it.
  const [main, ...rest] = plate.orbits;
  const local = rotate({x: sat.x - c.x, y: sat.y - c.y}, -main.rot);
  const mainRy = Math.abs(local.y) / Math.sqrt(Math.max(0.05, 1 - (local.x / main.rx) ** 2));
  const theta = Math.atan2(local.y / mainRy, local.x / main.rx);
  const tail = onOrbit(c, main.rx, mainRy, main.rot, theta - 0.55 * lead);
  const head = onOrbit(c, main.rx, mainRy, main.rot, theta - 0.06 * lead);
  const comet = `M${f(tail.x)} ${f(tail.y)} A${f(main.rx)} ${f(mainRy)} ${main.rot} 0 ${lead > 0 ? 1 : 0} ${f(head.x)} ${f(head.y)}`;

  const rand = seeded(plate.seed);
  const stars = Array.from({length: plate.stars}, () => ({x: f(rand() * w), y: f(rand() * h), s: rand()}))
    // Keep the disc and its tick ring clear of dust.
    .filter((s) => Math.hypot(s.x - c.x, s.y - c.y) > r + 40);

  const tickR = r + 24;
  const tickCirc = 2 * Math.PI * tickR;
  const arm = r + 46;
  const gap = 10;
  const rangeR = r + 62;
  const ra = onOrbit(c, rangeR, rangeR, 0, rad(198));
  const rb = onOrbit(c, rangeR, rangeR, 0, rad(246));
  const jog = {x: sat.x + 16 * lead, y: sat.y + 16};
  const leadEnd = jog.x + 92 * lead;

  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={`xMidYMid ${plate.fit}`} focusable="false">
      <defs>
        <clipPath id={clipId}>
          <circle cx={c.x} cy={c.y} r={r} />
        </clipPath>
        <radialGradient id={haloId} cx={c.x} cy={c.y} r={r * 1.9} gradientUnits="userSpaceOnUse">
          <stop className={styles.haloStop} offset="0.5" stopOpacity="0.07" />
          <stop className={styles.haloStop} offset="1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className={styles.stars}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.s > 0.86 ? 1.3 : 0.75} opacity={f(0.25 + s.s * 0.4)} />
        ))}
      </g>
      <g className={styles.plusMarks}>
        {plate.plus.map((p) => <path key={`${p.x}-${p.y}`} d={`M${p.x - 4} ${p.y} H${p.x + 4} M${p.x} ${p.y - 4} V${p.y + 4}`} />)}
      </g>
      <circle cx={c.x} cy={c.y} r={r * 1.9} fill={`url(#${haloId})`} />
      <circle className={styles.disc} cx={c.x} cy={c.y} r={r} />
      <circle className={styles.lensShade} clipPath={`url(#${clipId})`} cx={c.x + r * 0.3} cy={c.y - r * 0.2} r={r * 0.96} />
      <circle className={styles.lensTwin} cx={c.x + r * 0.3} cy={c.y - r * 0.2} r={r * 0.96} />
      <circle className={styles.tickMinor} cx={c.x} cy={c.y} r={tickR} strokeDasharray={`1 ${f(tickCirc / 120 - 1)}`} />
      <circle className={styles.tickMajor} cx={c.x} cy={c.y} r={tickR} strokeDasharray={`1.6 ${f(tickCirc / 12 - 1.6)}`} />
      <path
        className={styles.crosshair}
        d={`M${c.x - arm} ${c.y} H${c.x - gap} M${c.x + gap} ${c.y} H${c.x + arm} M${c.x} ${c.y - arm} V${c.y - gap} M${c.x} ${c.y + gap} V${c.y + arm}`}
      />
      <path className={styles.rangeArc} d={`M${f(ra.x)} ${f(ra.y)} A${rangeR} ${rangeR} 0 0 1 ${f(rb.x)} ${f(rb.y)}`} />
      <g className={styles.orbits}>
        <ellipse className={styles.orbitMain} cx={c.x} cy={c.y} rx={main.rx} ry={f(mainRy)} transform={`rotate(${main.rot} ${c.x} ${c.y})`} />
        {rest.map((o) => (
          <ellipse
            key={`${o.rx}-${o.rot}`}
            className={o.tone === 'dash' ? styles.orbitDash : styles.orbitFaint}
            cx={c.x}
            cy={c.y}
            rx={o.rx}
            ry={o.ry}
            transform={`rotate(${o.rot} ${c.x} ${c.y})`}
          />
        ))}
      </g>
      <path className={styles.comet} d={comet} />
      {plate.label && (
        <>
          <path className={styles.leader} d={`M${sat.x + 5 * lead} ${sat.y + 5} L${jog.x} ${jog.y} H${leadEnd}`} />
          <text className={styles.leaderText} x={leadEnd} y={jog.y - 5} textAnchor={lead > 0 ? 'end' : 'start'}>SIGNAL / 06</text>
        </>
      )}
      <circle className={styles.satRing} cx={sat.x} cy={sat.y} r="8" />
      <circle className={styles.sat} cx={sat.x} cy={sat.y} r="3.2" />
    </svg>
  );
}

function NightStudy(): ReactNode {
  const uid = `workflow-night-${useId().replace(/:/g, '')}`;

  return (
    <div className={styles.nightArt} data-workflow-art="night" data-art-mode="night">
      <ObservationPlate plate={WIDE} className={styles.plateWide} uid={`${uid}-w`} />
      <ObservationPlate plate={TALL} className={styles.plateTall} uid={`${uid}-t`} />
      <div className={`${styles.decorativeCopy} ${styles.nightLogSecondary}`}>
        <span>R00 00000000 / R01 7FF03C18</span>
        <span>R02 00001000 / R03 00000000</span>
        <span>SP  00FF7A20 / IP  00003F80</span>
        <span>[00] +0018 -&gt; 7FF0:03C0</span>
        <span>[01] +0020 -&gt; 0000:0000</span>
        <span>-------- / 0x00 / --------</span>
      </div>
    </div>
  );
}

function DayStudy(): ReactNode {
  return (
    <div className={styles.dayArt} data-workflow-art="day" data-art-mode="day">
      <div className={styles.draftingGrid} />
      <div className={styles.paperPlane} />
      <div className={styles.paperFold} />
      <svg className={styles.draftingRules} width="100%" height="100%" focusable="false">
        <line x1="0" y1="12%" x2="100%" y2="12%" />
        <line x1="0" y1="88%" x2="100%" y2="88%" />
        <line x1="3%" y1="0" x2="3%" y2="100%" />
        <line x1="97%" y1="0" x2="97%" y2="100%" />
      </svg>
      <svg className={styles.constructionStudy} viewBox="0 0 500 500" fill="none" focusable="false">
        <g className={styles.constructionLines}>
          <circle cx="250" cy="250" r="204" />
          <circle cx="250" cy="250" r="158" strokeDasharray="2 8" />
          <path d="M250 18 V88 M250 412 V482 M18 250 H88 M412 250 H482" />
          <path d="M60 164 H348 V398 H126 V92 H420" />
          <path d="M105 395 L395 105 M86 86 L414 414" />
        </g>
        <path className={styles.constructionAccent} d="M250 46 A204 204 0 0 1 454 250" />
        <path className={styles.constructionWash} d="M250 46 A204 204 0 0 1 454 250 H412 A162 162 0 0 0 250 88 Z" />
        <g className={styles.constructionPoints}>
          <rect x="246" y="42" width="8" height="8" />
          <rect x="450" y="246" width="8" height="8" />
          <rect x="122" y="88" width="8" height="8" />
        </g>
      </svg>
      <div className={styles.cornerMarks}><i /><i /><i /><i /></div>
      <div className={styles.daySwatches}><i /><i /><i /><span>03 / INPUT STUDY</span></div>
      <div className={`${styles.decorativeCopy} ${styles.dayAnnotation}`}>
        <span>PLATE 01 — IMAGE CONSTRUCTION</span>
        <span>MODEL / LATENT / CONDITIONING</span>
      </div>
      <div className={styles.dayMeasurement}><span>01</span><i /><span>09</span></div>
    </div>
  );
}

export default function WorkflowArt(): ReactNode {
  return (
    <div className={styles.backgroundArt} aria-hidden="true" data-theme-art="">
      <DayStudy />
      <NightStudy />
    </div>
  );
}
