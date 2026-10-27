import {useId, type ReactNode} from 'react';

import styles from './workflow-art.module.css';

const registrationPositions = [12, 31, 50, 69, 88];
const polarRadii = [8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92, 98];
const rayAngles = Array.from({length: 19}, (_value, index) => index * 10 - 90);
// Star centre in board percentages (x of width, y of height). CSS mirrors these as
// --star-x / --star-y so the stacked layout can move arcs and star together; the
// attributes are the no-CSS fallback.
const STAR_CX = '80%';
const STAR_CY = '-5%';
// Concentric arcs around the star (SVG % of the normalised diagonal). Each gap is ~1.25×
// the previous one (9 → 11 → 14 → 17.5), so the rings spread out as they fade.
const orbitArcs = [
  {radius: 24, opacity: 1},
  {radius: 33, opacity: 0.62},
  {radius: 44, opacity: 0.38},
  {radius: 58, opacity: 0.2},
  {radius: 75.5, opacity: 0.09},
];

// Star system SVG: 1 unit = board width / 1000, origin = star centre.
const DISC_R = 135;
/** Planet orbit: a narrow ellipse whose long axis runs from past the star down-left to the core node. */
const ORBIT = {cx: -65, cy: 69, rx: 270, ry: 85, rot: -34};
/** Planet position on the orbit (deg). 0 = upper-right apex, 180 = lower-left apex near the core node;
 *  0–180 is the near (lower) branch, 180–360 the far (upper) branch hidden behind the disc. */
const PLANET_DEG = 200;

const fx = (v: number) => Math.round(v * 10) / 10;

function orbitXY(deg: number): [number, number] {
  const t = (deg * Math.PI) / 180;
  const r = (ORBIT.rot * Math.PI) / 180;
  const x = ORBIT.rx * Math.cos(t);
  const y = ORBIT.ry * Math.sin(t);
  return [fx(ORBIT.cx + x * Math.cos(r) - y * Math.sin(r)), fx(ORBIT.cy + x * Math.sin(r) + y * Math.cos(r))];
}

/** Clockwise orbit arc from `from` to `to` degrees, split into ≤90° segments so flags stay unambiguous. */
function orbitArc(from: number, to: number): string {
  const steps = Math.max(1, Math.ceil((to - from) / 90));
  let d = `M${orbitXY(from).join(' ')}`;
  for (let i = 1; i <= steps; i += 1) {
    d += ` A${ORBIT.rx} ${ORBIT.ry} ${ORBIT.rot} 0 1 ${orbitXY(from + ((to - from) * i) / steps).join(' ')}`;
  }
  return d;
}

function StarSystem({uid}: {uid: string}): ReactNode {
  const clipId = `${uid}-disc`;
  const haloId = `${uid}-halo`;
  const behindId = `${uid}-behind`;
  const planet = orbitXY(PLANET_DEG);

  return (
    <svg className={styles.starSystem} viewBox="-500 -500 1000 1000" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <circle r={DISC_R} />
        </clipPath>
        <radialGradient id={haloId}>
          <stop className={styles.haloStop} offset="0.5" stopOpacity="0.07" />
          <stop className={styles.haloStop} offset="1" stopOpacity="0" />
        </radialGradient>
        {/* The far half of the orbit passes behind the star. */}
        <mask id={behindId} maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="2000" height="2000">
          <rect x="-1000" y="-1000" width="2000" height="2000" fill="white" />
          <circle r={DISC_R + 3} fill="black" />
        </mask>
      </defs>
      <circle r={fx(DISC_R * 1.9)} fill={`url(#${haloId})`} />
      <circle className={styles.disc} data-star-disc="" r={DISC_R} />
      {/* Shade sits lower-right so the lit crescent faces up-left, toward the board. */}
      <circle className={styles.lensShade} clipPath={`url(#${clipId})`} cx={fx(DISC_R * 0.72)} cy={fx(DISC_R * 0.34)} r={fx(DISC_R * 0.84)} />
      <path className={styles.planetOrbit} data-orbit-side="near" d={orbitArc(0, 180)} />
      <path className={styles.planetOrbit} data-orbit-side="far" d={orbitArc(180, 360)} mask={`url(#${behindId})`} />
      <path className={styles.comet} d={orbitArc(PLANET_DEG - 46, PLANET_DEG - 4)} />
      <circle className={styles.planetRing} cx={planet[0]} cy={planet[1]} r="4.6" />
      <circle className={styles.planet} data-planet="" cx={planet[0]} cy={planet[1]} r="1.8" />
    </svg>
  );
}

function NightStudy(): ReactNode {
  const maskId = `workflow-orbit-${useId().replace(/:/g, '')}`;
  const marksId = `${maskId}-marks`;

  return (
    <div className={styles.nightArt} data-workflow-art="night" data-art-mode="night">
      <svg className={styles.polarGrid} width="100%" height="100%" focusable="false">
        {polarRadii.map((radius) => <circle key={radius} cx="-8%" cy="78%" r={`${radius}%`} />)}
        <svg data-polar-origin="true" x="-8%" y="78%" width="1" height="1" overflow="visible" focusable="false">
          {rayAngles.map((angle) => (
            <line key={angle} data-polar-angle={angle} x1="0" y1="0" x2="4096" y2="0" transform={`rotate(${angle})`} />
          ))}
        </svg>
      </svg>
      <StarSystem uid={maskId} />
      <svg className={styles.orbitStudy} width="100%" height="100%" focusable="false">
        <defs>
          <g id={marksId}>
            {registrationPositions.map((position) => (
              <g key={position} className={styles.registrationMark}>
                <line x1={`${position}%`} x2={`${position}%`} y1="0" y2="18" />
                <line x1={`${position}%`} x2={`${position}%`} y1="46" y2="100%" />
                <svg x={`${position}%`} y="26" width="14" height="12" overflow="visible">
                  <path d="M-6 6 H6 M0 0 V12" />
                </svg>
              </g>
            ))}
          </g>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="white" />
            <use href={`#${marksId}`} stroke="black" strokeWidth="1" />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <g className={styles.orbitArcs}>
            {orbitArcs.map(({radius, opacity}) => (
              <circle key={radius} data-orbit-radius={radius} cx={STAR_CX} cy={STAR_CY} r={`${radius}%`} opacity={opacity} />
            ))}
          </g>
        </g>
        <g className={styles.registrationStudy}>
          <use href={`#${marksId}`} />
        </g>
      </svg>
      {/* Mirrors the day swatch strip: night palette roles (signal / ink / structure). */}
      <div className={styles.nightSwatches}><i /><i /><i /><span>06 / CORE STUDY</span></div>
      {/* One short observation caption beside the star, replacing the two hex dumps. */}
      <div className={`${styles.decorativeCopy} ${styles.nightCaption}`}>
        <span>FIG.06 — SAMPLER CORE</span>
        <span>ORBIT 270 / 85 · −34°</span>
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
